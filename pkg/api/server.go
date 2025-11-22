package api

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/OpenAudio/go-openaudio/pkg/sdk"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Config struct {
	DatabaseURL        string
	AudiusURL          string
	DelegatePrivateKey string
	Logger             *slog.Logger
}

type Server struct {
	*fiber.App
	pool   *pgxpool.Pool
	sdk    *sdk.OpenAudioSDK
	Logger *slog.Logger
}

func NewServer(cfg *Config) (*Server, error) {
	app := fiber.New()

	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sdk := sdk.NewOpenAudioSDK(cfg.AudiusURL)

	privkey, err := crypto.HexToECDSA(cfg.DelegatePrivateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to parse delegate private key: %w", err)
	}
	sdk.SetPrivKey(privkey)

	server := &Server{
		App:    app,
		pool:   pool,
		sdk:    sdk,
		Logger: cfg.Logger,
	}

	app.Get("/feed", server.getFeed)
	app.Get("/tracks", server.getTracks)
	app.Get("/users", server.GetUsers)

	return server, nil
}

func (s *Server) GetUsers(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"users": "List of users",
	})
}

func (s *Server) Start() error {
	s.Logger.Info("Starting API server...")
	return s.Listen(":8000")
}

func (s *Server) Shutdown() error {
	s.Logger.Info("Shutting down API server...")
	s.pool.Close()
	return s.App.Shutdown()
}
