package main

import (
	"audius/pkg/indexer"
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

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
	logLevel := os.Getenv("LOG_LEVEL")

	if logLevel == "debug" {
		level.Set(slog.LevelDebug)
	}
	if logLevel == "info" {
		level.Set(slog.LevelInfo)
	}
	if logLevel == "error" {
		level.Set(slog.LevelError)
	}

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
