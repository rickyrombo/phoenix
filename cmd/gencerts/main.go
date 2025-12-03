package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"math/big"
	"os"
	"time"
)

func main() {
	certFile := "certs/cert.pem"
	keyFile := "certs/key.pem"

	// Create certs directory if it doesn't exist
	if err := os.MkdirAll("certs", 0755); err != nil {
		fmt.Printf("Failed to create certs directory: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("Generating self-signed certificate for development...")

	if err := generateSelfSignedCert(certFile, keyFile); err != nil {
		fmt.Printf("Failed to generate certificate: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("✓ Certificate generated successfully!")
	fmt.Printf("  Certificate: %s\n", certFile)
	fmt.Printf("  Private Key: %s\n", keyFile)
	fmt.Println()
	fmt.Println("⚠️  Your browser will warn about this certificate. You'll need to:")
	fmt.Println("   1. Click 'Advanced' or 'Show details'")
	fmt.Println("   2. Click 'Proceed to localhost (unsafe)' or similar")
	fmt.Println("   3. This is safe for local development")
}

func generateSelfSignedCert(certFile string, keyFile string) error {
	// Generate RSA private key
	priv, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return fmt.Errorf("failed to generate private key: %w", err)
	}

	// Create certificate template
	notBefore := time.Now()
	notAfter := notBefore.Add(365 * 24 * time.Hour) // Valid for 1 year

	serialNumber, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	if err != nil {
		return fmt.Errorf("failed to generate serial number: %w", err)
	}

	template := x509.Certificate{
		SerialNumber: serialNumber,
		Subject: pkix.Name{
			Organization: []string{"Audius Development"},
			CommonName:   "localhost",
		},
		NotBefore:             notBefore,
		NotAfter:              notAfter,
		KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
	}

	// Create self-signed certificate
	derBytes, err := x509.CreateCertificate(rand.Reader, &template, &template, &priv.PublicKey, priv)
	if err != nil {
		return fmt.Errorf("failed to create certificate: %w", err)
	}

	// Write certificate to file
	certOut, err := os.Create(certFile)
	if err != nil {
		return fmt.Errorf("failed to create certificate file: %w", err)
	}
	defer certOut.Close()

	if err := pem.Encode(certOut, &pem.Block{Type: "CERTIFICATE", Bytes: derBytes}); err != nil {
		return fmt.Errorf("failed to write certificate: %w", err)
	}

	// Write private key to file
	keyOut, err := os.Create(keyFile)
	if err != nil {
		return fmt.Errorf("failed to create key file: %w", err)
	}
	defer keyOut.Close()

	privBytes, err := x509.MarshalPKCS8PrivateKey(priv)
	if err != nil {
		return fmt.Errorf("failed to marshal private key: %w", err)
	}

	if err := pem.Encode(keyOut, &pem.Block{Type: "PRIVATE KEY", Bytes: privBytes}); err != nil {
		return fmt.Errorf("failed to write private key: %w", err)
	}

	return nil
}
