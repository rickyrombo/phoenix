package api

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
)

func (s *Server) getFeed(c *fiber.Ctx) error {
	var queryParams struct {
		UserID int64 `query:"user_id"`
		Limit  int   `query:"limit"`
		Offset int   `query:"offset"`
	}
	if err := c.QueryParser(&queryParams); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid query parameters",
		})
	}

	sql := `
	-- Return one row per entity_id (distinct) choosing the most recent
	-- row by block_number, using block_time as a tiebreaker. Then order
	-- the resulting set by block_number (newest first) and apply limit/offset.
	SELECT 
		sub.user_id, 
		sub.entity_type, 
		sub.entity_id, 
		sub.action,
		sub.timestamp
	FROM (
		SELECT DISTINCT ON (manage_entity_txs.entity_id, manage_entity_txs.entity_type)
			manage_entity_txs.user_id,
			manage_entity_txs.entity_type,
			manage_entity_txs.entity_id,
			manage_entity_txs.action,
			blocks.block_time AS timestamp,
			manage_entity_txs.block_number
		FROM manage_entity_txs
		JOIN follows ON follows.followed_user_id = manage_entity_txs.user_id
		JOIN blocks ON blocks.number = manage_entity_txs.block_number
		JOIN users ON users.user_id = manage_entity_txs.user_id
		WHERE follows.user_id = @userId
			AND (
				(manage_entity_txs.entity_type = 'Track' AND manage_entity_txs.action = 'Create')
				OR (manage_entity_txs.entity_type = 'Track' AND manage_entity_txs.action = 'Repost')
			)
		ORDER BY 
			manage_entity_txs.entity_id, 
			manage_entity_txs.entity_type,
			manage_entity_txs.block_number DESC
	) AS sub
	ORDER BY 
		sub.block_number DESC NULLS LAST,
		sub.timestamp DESC NULLS LAST
	LIMIT @limit OFFSET @offset;
	`
	rows, err := s.pool.Query(c.Context(), sql, pgx.NamedArgs{
		"userId": queryParams.UserID,
		"limit":  queryParams.Limit,
		"offset": queryParams.Offset,
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
