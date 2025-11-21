package api

import (
	"context"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Config struct {
	DatabaseURL string
}

type Server struct {
	*fiber.App
	pool *pgxpool.Pool
}

func NewServer(cfg *Config) (*Server, error) {
	app := fiber.New()

	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	server := &Server{
		App:  app,
		pool: pool,
	}

	app.Get("/feed", server.getFeed)

	return server, nil
}

func (s *Server) getFeed(c *fiber.Ctx) error {
	sql := `
		SELECT
			manage_entity_txs.user_id,
			entity_type,
			entity_id,
			action,
			metadata,
			blocks.block_time AS timestamp
		FROM manage_entity_txs
		JOIN follows ON follows.followed_user_id = manage_entity_txs.user_id
		JOIN blocks ON blocks.number = manage_entity_txs.block_number
		WHERE follows.user_id = @userId
			AND (
				(entity_type = 'Track' AND action = 'Create')
				OR (entity_type = 'Track' AND action = 'Repost')
			)
		ORDER BY manage_entity_txs.block_number DESC
		;
	`
	s.pool.Query(c.Context(), sql, pgx.NamedArgs{
		"userId": 1,  // Placeholder user ID
		"limit":  20, // Placeholder limit
		"offset": 0,  // Placeholder offset
	})

	return c.JSON(fiber.Map{
		"feed": "This is your feed",
	})
}
