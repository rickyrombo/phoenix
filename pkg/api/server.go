package api

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/OpenAudio/go-openaudio/pkg/sdk"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/csrf"
	"github.com/gofiber/fiber/v2/middleware/session"
	"github.com/gofiber/storage/postgres/v3"
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
	pool     *pgxpool.Pool
	sdk      *sdk.OpenAudioSDK
	AppKey   string
	Logger   *slog.Logger
	sessions *session.Store
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

	// Configure PostgreSQL session storage
	storage := postgres.New(postgres.Config{
		ConnectionURI: cfg.DatabaseURL,
		Table:         "fiber_storage",
		Reset:         false,
	})

	// Configure session store
	sessionStore := session.New(session.Config{
		Storage:        storage,
		Expiration:     30 * 24 * time.Hour, // 30 days
		KeyLookup:      "cookie:session",
		CookieSecure:   true,
		CookieHTTPOnly: true,
		CookieSameSite: "Lax",
	})

	server := &Server{
		pool:     pool,
		sdk:      sdk,
		AppKey:   cfg.AppKey,
		Logger:   cfg.Logger,
		sessions: sessionStore,
	}

	app := fiber.New(
		fiber.Config{
			ErrorHandler: server.handleError,
		},
	)
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:5173,https://phoenix.rickyrombo.com",
		AllowCredentials: true,
		AllowHeaders:     "Origin, Content-Type, Accept, X-CSRF-Token",
	}))

	// CSRF protection middleware
	csrfMiddleware := csrf.New(csrf.Config{
		KeyLookup:      "header:X-CSRF-Token",
		CookieName:     "__Host-csrf",
		CookieSameSite: "Lax",
		CookieSecure:   true,
		CookieHTTPOnly: true,
		Expiration:     30 * 24 * time.Hour, // 30 days
		Storage:        storage,
		Session:        sessionStore,
		SessionKey:     "csrf_token",
	})

	// Routes that don't require CSRF validation (GET requests)
	app.Get("/auth/status", server.authStatus)
	app.Get("/auth/csrf", csrfMiddleware, server.getCsrfToken)
	app.Get("/feed", server.getFeed)
	app.Get("/tracks", server.getTracks)
	app.Get("/tracks/:id/comments", server.getComments)
	app.Get("/users", server.getUsers)

	// Routes that require CSRF validation (state-changing POST requests)
	app.Post("/login", csrfMiddleware, server.login)
	app.Post("/auth/logout", csrfMiddleware, server.logout)

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
