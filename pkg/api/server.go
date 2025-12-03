package api

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/OpenAudio/go-openaudio/pkg/sdk"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Config struct {
	DatabaseURL        string
	AudiusURL          string
	DelegatePrivateKey string
	AppKey             string
	Logger             *slog.Logger
}

type Server struct {
	*fiber.App
	pool   *pgxpool.Pool
	sdk    *sdk.OpenAudioSDK
	AppKey string
	Logger *slog.Logger
}

func NewServer(cfg *Config) (*Server, error) {

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
		pool:   pool,
		sdk:    sdk,
		AppKey: cfg.AppKey,
		Logger: cfg.Logger,
	}

	app := fiber.New(
		fiber.Config{
			ErrorHandler: server.handleError,
		},
	)
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:5173,https://phoenix.rickyrombo.com",
		AllowCredentials: true,
	}))
	app.Get("/feed", server.getFeed)
	app.Get("/tracks", server.getTracks)
	app.Get("/tracks/:id/comments", server.getComments)
	app.Get("/users", server.getUsers)
	app.Post("/login", server.login)
	app.Get("/auth/status", server.authStatus)
	app.Post("/auth/logout", server.logout)

	server.App = app

	return server, nil
}

func (s *Server) handleError(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError

	var e *fiber.Error
	if errors.As(err, &e) {
		code = e.Code
	}

	s.Logger.Error("Request error",
		"error", err,
		"path", c.Path(),
		"method", c.Method(),
		"code", code,
	)

	return c.Status(code).JSON(fiber.Map{
		"error": err.Error(),
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
