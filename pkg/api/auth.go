package api

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
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
		Token         string            `json:"token"`
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
		if err == ErrNotLinked && req.Token != "" {
			userId, err = s.linkWalletToUser(c.Context(), req.Message.Address, req.Token)
			if err != nil {
				return err
			}
		} else {
			return err
		}
	}

	if err := s.verifyWalletGrant(c.Context(), userId); err != nil {
		if err == ErrNotGranted && req.Token != "" {
			err = s.verifyToken(c.Context(), req.Token)
			if err != nil {
				return fmt.Errorf("failed to verify token: %w", err)
			}
		} else {
			return err
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    fiber.Map{"user_id": userId},
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

var ErrNotLinked = fiber.NewError(fiber.StatusUnauthorized, "not_linked")

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

func (s Server) linkWalletToUser(ctx context.Context, walletAddress, token string) (int, error) {
	if err := s.verifyToken(ctx, token); err != nil {
		return 0, fmt.Errorf("failed to verify token: %w", err)
	}
	payload, err := parseTokenPayload(token)
	if err != nil {
		return 0, fmt.Errorf("failed to parse token payload: %w", err)
	}

	// TODO: actually link wallet w/ chain
	sql := `
		INSERT INTO user_wallets (user_id, wallet, curve, block_number)
		SELECT user_id, @walletAddress, 'ed25519', 0
		FROM users
		WHERE handle = @handle
		RETURNING user_id
	`
	var userID int
	err = s.pool.QueryRow(ctx, sql, pgx.NamedArgs{
		"handle":        payload.Handle,
		"walletAddress": walletAddress,
	}).Scan(&userID)

	if err != nil {
		return 0, fmt.Errorf("failed to link wallet to user: %w", err)
	}

	return userID, nil
}

type TokenPayload struct {
	ApiKey   string `json:"apiKey"`
	Email    string `json:"email"`
	Handle   string `json:"handle"`
	Iat      int64  `json:"iat"`
	Name     string `json:"name"`
	Sub      string `json:"sub"`
	UserID   string `json:"userId"`
	Verified bool   `json:"verified"`
}

func parseTokenPayload(token string) (*TokenPayload, error) {
	// Break JWT into parts
	tokenParts := strings.Split(token, ".")
	if len(tokenParts) != 3 {
		return nil, fmt.Errorf("invalid format")
	}

	base64Payload := tokenParts[1]

	// Decode the payload
	paddedPayload := base64Payload
	if len(paddedPayload)%4 != 0 {
		paddedPayload += strings.Repeat("=", 4-len(paddedPayload)%4)
	}
	stringifiedPayload, err := base64.URLEncoding.DecodeString(paddedPayload)
	if err != nil {
		return nil, fmt.Errorf("failed to decode payload: %w", err)
	}

	var payload TokenPayload
	if err := json.Unmarshal(stringifiedPayload, &payload); err != nil {
		return nil, fmt.Errorf("failed to unmarshal payload: %w", err)
	}
	return &payload, nil
}

func (s *Server) verifyToken(ctx context.Context, token string) error {
	// 1. Break JWT into parts
	tokenParts := strings.Split(token, ".")
	if len(tokenParts) != 3 {
		return fmt.Errorf("invalid format")
	}

	base64Header := tokenParts[0]
	base64Payload := tokenParts[1]
	base64Signature := tokenParts[2]

	// 2. Decode the signature
	// Add padding if needed for base64 decoding
	paddedSignature := base64Signature
	if len(paddedSignature)%4 != 0 {
		paddedSignature += strings.Repeat("=", 4-len(paddedSignature)%4)
	}

	signatureDecoded, err := base64.URLEncoding.DecodeString(paddedSignature)
	if err != nil {
		return fmt.Errorf("failed to decode signature: %w", err)
	}

	// Convert decoded bytes to string (hex string) and then decode hex to bytes
	signatureHex := string(signatureDecoded)
	signatureBytes := common.FromHex(signatureHex)

	// 3. Recover wallet from signature using ethereum message recovery
	message := fmt.Sprintf("%s.%s", base64Header, base64Payload)

	// Create the ethereum signed message format
	encodedToRecover := []byte(message)
	prefixedMessage := []byte(fmt.Sprintf("\x19Ethereum Signed Message:\n%d%s", len(encodedToRecover), encodedToRecover))
	finalHash := crypto.Keccak256Hash(prefixedMessage)

	if len(signatureBytes) != 65 {
		return fmt.Errorf("signature length %d, expected 65", len(signatureBytes))
	}
	// Ethereum signatures are 65 bytes long, with the last byte being the recovery ID.
	// The recovery ID is 0 or 1, and is used to determine which public key was used to sign the message.
	// The recovery ID is 27 or 28, and is used to determine which public key was used to sign the message.
	// We need to subtract 27 from the recovery ID to get the correct public key.
	if signatureBytes[64] >= 27 {
		signatureBytes[64] -= 27
	}

	publicKey, err := crypto.SigToPub(finalHash.Bytes(), signatureBytes)
	if err != nil {
		return fmt.Errorf("failed to recover pubkey: %w", err)
	}

	recoveredAddr := crypto.PubkeyToAddress(*publicKey)
	walletLower := strings.ToLower(recoveredAddr.Hex())

	// 4. Check that the api key matches
	payload, err := parseTokenPayload(token)
	if err != nil {
		return fmt.Errorf("failed to parse payload: %w", err)
	}

	if s.AppKey != payload.ApiKey {
		return fmt.Errorf("api key mismatch")
	}

	// 5. Check that user from payload matches the user from the wallet from the signature
	sql := `
		SELECT wallet
		FROM users
		JOIN user_wallets USING (user_id)
		WHERE LOWER(users.handle) = @handle
	`
	rows, err := s.pool.Query(ctx, sql, pgx.NamedArgs{
		"handle": payload.Handle,
	})
	if err != nil {
		return fmt.Errorf("failed to query wallets for handle: %w", err)
	}

	handles, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return fmt.Errorf("failed to query wallets for handle: %w", err)
	}

	for _, wallet := range handles {
		if strings.ToLower(wallet) == walletLower {
			// Match found
			return nil
		}
	}

	return fmt.Errorf("wallet %s doesn't match user handle %s", walletLower, payload.Handle)
}
