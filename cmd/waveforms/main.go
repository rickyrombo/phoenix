package main

import (
	"audius/pkg/workers/waveforms"
	"context"
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

	if logLevel == "debug" {
		level.Set(slog.LevelDebug)
	}
	if logLevel == "info" {
		level.Set(slog.LevelInfo)
	}
	if logLevel == "error" {
		level.Set(slog.LevelError)
	}

	config := &waveforms.Config{
		BatchSize: 50,
		Buckets:   750,
		DatabaseURL: databaseURL,
		AudiusURL: audiusURL,
		DelegatePrivateKey: delegatePrivateKey,
		Logger:    logger,
	}

	
	j, err := waveforms.NewJob(config)
	if err != nil {
		logger.Error("failed to create job", "error", err)
		return
	}

	ctx := context.Background()
	cid := "baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4"
	err = j.ProcessCID(ctx, cid)
	if err != nil {
		logger.Error("failed to process waveform", "error", err)
	}
}