package api

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
)

func (s *Server) getFeed(c *fiber.Ctx) error {
	sql := `
		SELECT
			manage_entity_txs.user_id,
			entity_type,
			entity_id,
			action,
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
	rows, err := s.pool.Query(c.Context(), sql, pgx.NamedArgs{
		"userId": 1454798, // Placeholder user ID
		"limit":  20,      // Placeholder limit
		"offset": 0,       // Placeholder offset
	})
	if err != nil {
		s.Logger.Error("Failed to fetch feed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch feed",
		})
	}

	type feedItem struct {
		UserID     int64     `json:"user_id"`
		EntityType string    `json:"entity_type"`
		EntityID   int64     `json:"entity_id"`
		Action     string    `json:"action"`
		Timestamp  time.Time `json:"timestamp"`
	}
	feed, err := pgx.CollectRows(rows, pgx.RowToStructByName[feedItem])
	if err != nil {
		s.Logger.Error("Failed to parse feed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to parse feed",
		})
	}

	return c.JSON(fiber.Map{
		"data": feed,
	})
}
