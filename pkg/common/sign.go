package common

import (
	"bytes"
	"crypto/ecdsa"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
)

func SignStreamRequest(privKey *ecdsa.PrivateKey, cid string, trackID *int, userID *int) (string, error) {
	data := map[string]interface{}{
		"cid":       cid,
		"timestamp": time.Now().Unix() * 1000,
	}
	if trackID != nil {
		data["track_id"] = *trackID
	}
	if userID != nil {
		data["user_id"] = *userID
	}

	signature, err := signData(privKey, data)
	if err != nil {
		return "", fmt.Errorf("failed to sign data: %w", err)
	}

	messageBytes, err := json.Marshal(data)
	if err != nil {
		return "", fmt.Errorf("failed to marshal message")
	}

	param := map[string]string{
		"signature": signature,
		"data":      string(messageBytes),
	}
	paramBytes, err := json.Marshal(param)
	if err != nil {
		return "", fmt.Errorf("failed to marshal param: %w", err)
	}

	return string(paramBytes), nil
}

func signData(privKey *ecdsa.PrivateKey, data map[string]interface{}) (string, error) {
	message := func(data map[string]interface{}) string {
		var b bytes.Buffer
		_ = json.NewEncoder(&b).Encode(data)
		return strings.TrimRight(b.String(), "\n")
	}(data)

	hash := crypto.Keccak256([]byte(message))
	prefix := fmt.Sprintf("\x19Ethereum Signed Message:\n%d", len(hash))
	prefixedMessage := append([]byte(prefix), hash...)
	finalHash := crypto.Keccak256(prefixedMessage)

	signature, err := crypto.Sign(finalHash, privKey)
	if err != nil {
		return "", err
	}

	signatureHex := hexutil.Encode(signature)
	return signatureHex, nil
}
