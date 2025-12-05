package api

import (
	"context"
	"crypto/ecdsa"
	"crypto/tls"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/gofiber/fiber/v3/extractors"
	"github.com/gofiber/fiber/v3/middleware/requestid"

	"github.com/OpenAudio/go-openaudio/pkg/sdk"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/csrf"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/session"
	"github.com/gofiber/storage/postgres/v3"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Config struct {
	DatabaseURL        string
	AudiusURL          string
	DelegatePrivateKey string
	AppSecret          string
	AppKey             string
	Environment        string // "development" or "production"
}

type Server struct {
	*fiber.App
	pool        *pgxpool.Pool
	sdk         *sdk.OpenAudioSDK
	appKey      string
	appSecret   *ecdsa.PrivateKey
	environment string
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

	apiKey, err := crypto.HexToECDSA(cfg.AppSecret)
	if err != nil {
		return nil, fmt.Errorf("failed to parse API secret: %w", err)
	}

	// Configure PostgreSQL session storage
	storage := postgres.New(postgres.Config{
		ConnectionURI: cfg.DatabaseURL,
		Table:         "fiber_storage",
		Reset:         false,
	})

	// Configure session store
	sessionStore := session.NewStore(session.Config{
		Storage:        storage,
		IdleTimeout:    30 * 24 * time.Hour, // 30 days
		Extractor:      extractors.FromCookie("session"),
		CookieSecure:   true,
		CookieHTTPOnly: true,
		CookieSameSite: "Lax",
	})

	server := &Server{
		pool:        pool,
		sdk:         sdk,
		appKey:      cfg.AppKey,
		appSecret:   apiKey,
		environment: cfg.Environment,
	}

	app := fiber.New(
		fiber.Config{ErrorHandler: server.handleError},
	)

	app.Use(requestid.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"https://localhost:5173", "https://phoenix.rickyrombo.com"},
		AllowCredentials: true,
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "X-CSRF-Token"},
	}))

	// Session middleware - ensures all requests get a session (including unauthed)
	app.Use(session.New(session.Config{
		Storage:        storage,
		IdleTimeout:    30 * 24 * time.Hour, // 30 days
		Extractor:      extractors.FromCookie("session"),
		CookieSecure:   true,
		CookieHTTPOnly: true,
		CookieSameSite: "Lax",
	}))

	// CSRF protection middleware
	csrfMiddleware := csrf.New(csrf.Config{
		Extractor:         extractors.FromHeader("X-CSRF-Token"),
		CookieName:        "__Host-csrf",
		CookieSameSite:    "Lax",
		CookieSecure:      true,
		CookieHTTPOnly:    true,
		CookieSessionOnly: true,
		IdleTimeout:       30 * 24 * time.Hour, // 30 days
		Storage:           storage,
		Session:           sessionStore,
		TrustedOrigins:    []string{"https://localhost:5173", "https://phoenix.rickyrombo.com"},
	})

	app.Use(logger.New(logger.Config{
		LoggerFunc: func(c fiber.Ctx, data *logger.Data, cfg *logger.Config) error {
			rl := getRequestLogger(c)

			userId := 0
			sess := session.FromContext(c).Session
			if sess != nil && sess.Get("authenticated") == true {
				userId = sess.Get("user_id").(int)
			}

			if data.ChainErr == nil {
				// Structured logging of request metadata
				rl.Info("http_request",
					"ip", c.IP(),
					"user_id", userId,
					"method", c.Method(),
					"path", c.Path(),
					"status", c.Response().StatusCode(),
					"latency", fmt.Sprintf("%v", data.Stop.Sub(data.Start)),
				)
				return nil
			}

			// Structured logging of request metadata
			rl.Error("http_request",
				"ip", c.IP(),
				"user_id", userId,
				"method", c.Method(),
				"path", c.Path(),
				"status", c.Response().StatusCode(),
				"latency", fmt.Sprintf("%v", data.Stop.Sub(data.Start)),
				"error", data.ChainErr.Error(),
			)
			return nil
		},
	}))

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

	app.Post("/tracks/:trackId/save", requireAuth, csrfMiddleware, server.postTrackSave)
	app.Delete("/tracks/:trackId/save", requireAuth, csrfMiddleware, server.deleteTrackSave)

	app.Post("/tracks/:trackId/repost", requireAuth, csrfMiddleware, server.postTrackRepost)
	app.Delete("/tracks/:trackId/repost", requireAuth, csrfMiddleware, server.deleteTrackRepost)

	server.App = app

	return server, nil
}

func getRequestLogger(c fiber.Ctx) *slog.Logger {
	return slog.Default().With("request_id", requestid.FromContext(c))
}

func (s *Server) handleError(c fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError

	var e *fiber.Error
	if errors.As(err, &e) {
		code = e.Code
	}

	return c.Status(code).JSON(fiber.Map{
		"error": err.Error(),
	})
}

func (s *Server) Start() error {
	// Use HTTPS in development with self-signed certificates
	if s.environment == "development" {
		certFile := "certs/cert.pem"
		keyFile := "certs/key.pem"

		// Check if certificates exist
		if _, err := os.Stat(certFile); os.IsNotExist(err) {
			slog.Error("Certificate files not found. Please run: go run cmd/gencerts/main.go")
			return fmt.Errorf("certificate files not found in certs/ directory")
		}

		// Load certificate
		cert, err := tls.LoadX509KeyPair(certFile, keyFile)
		if err != nil {
			return fmt.Errorf("failed to load certificates: %w", err)
		}

		// Create TLS config
		tlsConfig := &tls.Config{
			Certificates: []tls.Certificate{cert},
		}

		// Create TLS listener
		ln, err := tls.Listen("tcp", "127.0.0.1:8000", tlsConfig)
		if err != nil {
			return fmt.Errorf("failed to create TLS listener: %w", err)
		}

		return s.Listener(ln)
	}

	// Production: use regular HTTP (assuming reverse proxy handles TLS)
	return s.Listen(":8000")
}

func (s *Server) Shutdown() error {
	slog.Info("Shutting down API server...")
	s.pool.Close()
	return s.App.Shutdown()
}
