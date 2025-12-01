package api

import (
	"context"
	"crypto/ed25519"
	"encoding/json"
	"errors"
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

func (s *Server) login(c *fiber.Ctx) error {
	type loginRequest struct {
		Message   string `json:"message"`
		Signature string `json:"signature"`
	}

	var req loginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	messageBytes, err := base58.Decode(req.Message)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid message encoding",
		})
	}

	signatureBytes, err := base58.Decode(req.Signature)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid signature encoding",
		})
	}

	var signInInput solanaSignInInput
	if err := json.Unmarshal(messageBytes, &signInInput); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid sign-in message format",
		})
	}

	if signInInput.Address == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Wallet address is required in sign-in message",
		})
	}

	publicKeyBytes, err := base58.Decode(signInInput.Address)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid wallet address encoding",
		})
	}

	publicKey := ed25519.PublicKey(publicKeyBytes)
	valid := ed25519.Verify(publicKey, messageBytes, signatureBytes)
	if !valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid signature",
		})
	}

	if err := validateSolanaSignInInput(signInInput); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("Invalid sign-in message content: %v", err),
		})
	}

	userId, err := s.verifyWalletLink(c.Context(), signInInput.Address)
	if err != nil {
		return err
	}

	if err := s.verifyWalletGrant(c.Context(), userId); err != nil {
		return err
	}

	return c.JSON(fiber.Map{
		"success": true,
		"wallet":  signInInput.Address,
		"message": "Signature verified successfully",
	})
}

func validateSolanaSignInInput(signInInput solanaSignInInput) error {
	if signInInput.Domain != "localhost:8000" {
		return fmt.Errorf("invalid domain: %s", signInInput.Domain)
	}

	if signInInput.Statement != "Sign this message to authenticate with Phoenix" {
		return fmt.Errorf("invalid statement: %s", signInInput.Statement)
	}

	if signInInput.Version != "1" {
		return fmt.Errorf("invalid version: %s", signInInput.Version)
	}

	if signInInput.ChainId != "1" {
		return fmt.Errorf("invalid chain ID: %s", signInInput.ChainId)
	}

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

	if signInInput.ExpirationTime != "" {
		return fmt.Errorf("expirationTime must be empty")
	}

	expirationTime, err := time.Parse(time.RFC3339, signInInput.ExpirationTime)
	if err != nil {
		return fmt.Errorf("invalid expirationTime format: %v", err)
	}

	if time.Now().After(expirationTime) {
		return fmt.Errorf("sign-in message has expired")
	}
	return nil
}

var ErrNotGranted = errors.New("not_granted")
var ErrNotLinked = errors.New("not_linked")

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
		SELECT user_id FROM user_wallets WHERE wallet_address = @walletAddress
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
