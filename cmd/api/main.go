package main

import (
	"audius/pkg/api"
	"log/slog"
	"os"

	_ "github.com/joho/godotenv/autoload"
)

func main() {
	level := &slog.LevelVar{}
	level.Set(slog.LevelInfo)
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: level,
	}))

	databaseURL := os.Getenv("DATABASE_URL")
	audiusURL := os.Getenv("AUDIUS_URL")
	delegatePrivateKey := os.Getenv("DELEGATE_PRIVATE_KEY")
	logLevel := os.Getenv("LOG_LEVEL")
	appKey := os.Getenv("AUDIUS_API_KEY")

	if logLevel == "debug" {
		level.Set(slog.LevelDebug)
	}
	if logLevel == "info" {
		level.Set(slog.LevelInfo)
	}
	if logLevel == "error" {
		level.Set(slog.LevelError)
	}

	cfg := &api.Config{
		DatabaseURL:        databaseURL,
		AudiusURL:          audiusURL,
		AppKey:             appKey,
		Logger:             logger,
		DelegatePrivateKey: delegatePrivateKey,
	}
	server, err := api.NewServer(cfg)
	if err != nil {
		logger.Error("Failed to create API server", "error", err)
		return
	}
	if err := server.Start(); err != nil {
		logger.Error("Failed to start API server", "error", err)
	}
	defer server.Shutdown()
}
