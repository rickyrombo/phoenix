package api

import (
	"context"
	"crypto/ed25519"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/mr-tron/base58/base58"
)

type solanaSignInInput struct {
	Domain         string   `json:"domain"`
	Address        string   `json:"address"`
	Statement      string   `json:"statement"`
	URI            string   `json:"uri"`
	Version        string   `json:"version"`
	ChainId        string   `json:"chainId"`
	Nonce          string   `json:"nonce"`
	IssuedAt       string   `json:"issuedAt"`
	ExpirationTime string   `json:"expirationTime"`
	NotBefore      string   `json:"notBefore"`
	RequestId      string   `json:"requestId"`
	Resources      []string `json:"resources"`
}

func (s *solanaSignInInput) Prepare() string {
	sb := fmt.Sprintf("%s wants you to sign in with your Solana account:\n%s\n", s.Domain, s.Address)
	if s.Statement != "" {
		sb += fmt.Sprintf("\n%s\n", s.Statement)
	}
	if s.URI != "" {
		sb += fmt.Sprintf("\nURI: %s", s.URI)
	}
	if s.Version != "" {
		sb += fmt.Sprintf("\nVersion: %s", s.Version)
	}
	if s.ChainId != "" {
		sb += fmt.Sprintf("\nChain ID: %s", s.ChainId)
	}
	if s.Nonce != "" {
		sb += fmt.Sprintf("\nNonce: %s", s.Nonce)
	}
	if s.IssuedAt != "" {
		sb += fmt.Sprintf("\nIssued At: %s", s.IssuedAt)
	}
	if s.ExpirationTime != "" {
		sb += fmt.Sprintf("\nExpiration Time: %s", s.ExpirationTime)
	}
	if s.NotBefore != "" {
		sb += fmt.Sprintf("\nNot Before: %s", s.NotBefore)
	}
	if s.RequestId != "" {
		sb += fmt.Sprintf("\nRequest ID: %s", s.RequestId)
	}
	if len(s.Resources) > 0 {
		sb += "\nResources:"
		for _, resource := range s.Resources {
			sb += fmt.Sprintf("\n- %s", resource)
		}
	}
	return sb
}

func (s *Server) login(c *fiber.Ctx) error {
	type loginRequest struct {
		Message       solanaSignInInput `json:"message"`
		SignedMessage string            `json:"signed_message"`
		Signature     string            `json:"signature"`
	}

	var req loginRequest
	if err := c.BodyParser(&req); err != nil {
		s.Logger.Error("Failed to parse login request body", "error", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	messageBytes, err := base58.Decode(req.SignedMessage)
	if err != nil {
		s.Logger.Error("Failed to decode message", "error", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid message encoding",
		})
	}

	signatureBytes, err := base58.Decode(req.Signature)
	if err != nil {
		s.Logger.Error("Failed to decode signature", "error", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid signature encoding",
		})
	}

	if req.Message.Address == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Wallet address is required in sign-in message",
		})
	}

	publicKeyBytes, err := base58.Decode(req.Message.Address)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid wallet address encoding",
		})
	}

	message := req.Message.Prepare()
	if message != string(messageBytes) {
		s.Logger.Error("Sign-in message content does not match signed message", "expected", message, "actual", string(messageBytes))
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Sign-in message content does not match signed message",
		})
	}

	publicKey := ed25519.PublicKey(publicKeyBytes)
	valid := ed25519.Verify(publicKey, messageBytes, signatureBytes)
	if !valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid signature",
		})
	}

	if err := validateSolanaSignInInput(req.Message); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("Invalid sign-in message content: %v", err),
		})
	}

	userId, err := s.verifyWalletLink(c.Context(), req.Message.Address)
	if err != nil {
		return err
	}

	if err := s.verifyWalletGrant(c.Context(), userId); err != nil {
		return err
	}

	return c.JSON(fiber.Map{
		"success": true,
		"wallet":  req.Message.Address,
		"message": "Signature verified successfully",
	})
}

func validateSolanaSignInInput(signInInput solanaSignInInput) error {
	if signInInput.Domain != "phoenix.rickyrombo.com" {
		return fmt.Errorf("invalid domain: %s", signInInput.Domain)
	}

	if signInInput.Statement != "Sign this message to authenticate with Phoenix" {
		return fmt.Errorf("invalid statement: %s", signInInput.Statement)
	}

	// TODO: Store nonce and verify unused
	if signInInput.Nonce == "" {
		return fmt.Errorf("nonce is required")
	}

	if signInInput.IssuedAt == "" {
		return fmt.Errorf("issuedAt is required")
	}

	issuedAt, err := time.Parse(time.RFC3339, signInInput.IssuedAt)
	if err != nil {
		return fmt.Errorf("invalid issuedAt format: %v", err)
	}

	if time.Since(issuedAt) > 5*time.Minute {
		return fmt.Errorf("sign-in message has expired")
	}

	return nil
}

var ErrNotGranted = fiber.NewError(fiber.StatusUnauthorized, "not_granted")
var ErrNotLinked = fiber.NewError(fiber.StatusUnauthorized, "not_linked")

func (s Server) verifyWalletGrant(ctx context.Context, userId int) error {
	sql := `
		SELECT EXISTS
		(
			SELECT 1 FROM grants 
			WHERE user_id = @userID
			AND address = @appAddress
		)
	`
	var granted bool
	err := s.pool.QueryRow(ctx, sql, pgx.NamedArgs{
		"userID":     userId,
		"appAddress": s.AppKey,
	}).Scan(&granted)

	if err != nil {
		return err
	}

	if !granted {
		return ErrNotGranted
	}
	return nil
}

func (s Server) verifyWalletLink(ctx context.Context, walletAddress string) (int, error) {
	sql := `
		SELECT user_id FROM user_wallets WHERE wallet = @walletAddress
	`
	var userID int
	err := s.pool.QueryRow(ctx, sql, pgx.NamedArgs{
		"walletAddress": walletAddress,
	}).Scan(&userID)

	if err == pgx.ErrNoRows {
		return 0, ErrNotLinked
	}

	if err != nil {
		return 0, err
	}

	return userID, nil
}
