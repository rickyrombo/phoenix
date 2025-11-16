package main

import (
	"audius/pkg/indexer"
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/joho/godotenv"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	err := godotenv.Load()
	if err != nil {
		logger.Error("Failed to load .env")
		return
	}
	databaseURL := os.Getenv("DATABASE_URL")
	audiusURL := os.Getenv("AUDIUS_URL")

	cfg := &indexer.Config{
		DatabaseURL: databaseURL,
		AudiusURL:   audiusURL,
		Logger:      logger,
	}

	idx, err := indexer.New(cfg)
	if err != nil {
		logger.Error("Failed to create indexer", "error", err)
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		sig := <-sigChan
		logger.Info("Received signal, shutting down...", "signal", sig)
		cancel()
	}()

	logger.Info("Starting Audius Indexer...")
	if err := idx.Run(ctx); err != nil && err != context.Canceled {
		logger.Error("Indexer error", "error", err)
		return
	}

	logger.Info("Indexer shut down successfully")
}
