package main

import (
	"log/slog"
	"os"
	"phoenix/pkg/api"

	_ "github.com/joho/godotenv/autoload"
)

func main() {

	databaseURL := os.Getenv("DATABASE_URL")
	audiusURL := os.Getenv("AUDIUS_URL")
	delegatePrivateKey := os.Getenv("DELEGATE_PRIVATE_KEY")
	apiSecret := os.Getenv("AUDIUS_API_SECRET")
	logLevel := os.Getenv("LOG_LEVEL")
	appKey := os.Getenv("AUDIUS_API_KEY")
	environment := os.Getenv("ENVIRONMENT")
	if environment == "" {
		environment = "production"
	}

	level := &slog.LevelVar{}
	if logLevel == "debug" {
		level.Set(slog.LevelDebug)
	}
	if logLevel == "info" {
		level.Set(slog.LevelInfo)
	}
	if logLevel == "error" {
		level.Set(slog.LevelError)
	}
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: level,
	})))

	cfg := &api.Config{
		DatabaseURL:        databaseURL,
		AudiusURL:          audiusURL,
		AppKey:             appKey,
		AppSecret:          apiSecret,
		DelegatePrivateKey: delegatePrivateKey,
		Environment:        environment,
	}
	server, err := api.NewServer(cfg)
	if err != nil {
		slog.Error("Failed to create API server", "error", err)
		return
	}
	if err := server.Start(); err != nil {
		slog.Error("Failed to start API server", "error", err)
	}
	defer server.Shutdown()
}
