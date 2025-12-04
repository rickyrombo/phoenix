package api

import (
	"time"

	"github.com/creasty/defaults"
	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5"
)

func (s *Server) getFeedDistinct(c fiber.Ctx) error {
	var queryParams struct {
		UserID *int64  `query:"user_id"`
		Before *string `query:"before"`
		Limit  int     `query:"limit" default:"5"`
	}
	defaults.Set(&queryParams)

	if err := c.Bind().Query(&queryParams); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid query parameters",
		})
	}

	follows_filter := ""
	if queryParams.UserID != nil {
		follows_filter = "follows.user_id = @userId AND"
	}

	sql := `
	-- Return one row per entity_id (distinct) choosing the most recent
	-- row by block_number, using tx_hash as a tiebreaker. Then order
	-- the resulting set by block_number (newest first) and apply limit.
	SELECT
		sub.tx_hash,
		sub.user_id, 
		sub.entity_type, 
		sub.entity_id, 
		sub.action,
		sub.timestamp
	FROM (
		SELECT DISTINCT ON (manage_entity_txs.entity_id, manage_entity_txs.entity_type)
			manage_entity_txs.tx_hash,
			manage_entity_txs.user_id,
			manage_entity_txs.entity_type,
			manage_entity_txs.entity_id,
			manage_entity_txs.action,
			blocks.block_time AS timestamp,
			manage_entity_txs.block_number
		FROM manage_entity_txs
		JOIN follows ON follows.followed_user_id = manage_entity_txs.user_id
		JOIN blocks ON blocks.number = manage_entity_txs.block_number
		WHERE ` + follows_filter + `
			(
				(manage_entity_txs.entity_type = 'Track' AND manage_entity_txs.action = 'Create')
				OR (manage_entity_txs.entity_type = 'Track' AND manage_entity_txs.action = 'Repost')
			)
		ORDER BY 
			manage_entity_txs.entity_id, 
			manage_entity_txs.entity_type,
			manage_entity_txs.block_number DESC,
			manage_entity_txs.tx_hash DESC
	) AS sub
	WHERE (
		@before::TEXT IS NULL 
		OR (
			sub.block_number = (SELECT block_number FROM manage_entity_txs WHERE tx_hash = @before)
			AND sub.tx_hash < @before
		) 
		OR (
			sub.block_number < (SELECT block_number FROM manage_entity_txs WHERE tx_hash = @before)
		)
	)
	ORDER BY 
		sub.block_number DESC NULLS LAST,
		sub.tx_hash DESC NULLS LAST
	LIMIT @limit;
	`
	rows, err := s.pool.Query(c.RequestCtx(), sql, pgx.NamedArgs{
		"userId": queryParams.UserID,
		"before": queryParams.Before,
		"limit":  queryParams.Limit,
	})
	if err != nil {
		s.Logger.Error("Failed to fetch feed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch feed",
		})
	}

	type feedItem struct {
		TxHash     string    `json:"tx_hash"`
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

func (s *Server) getFeed(c fiber.Ctx) error {
	var queryParams struct {
		UserID *int64  `query:"user_id"`
		Before *string `query:"before"`
		Limit  int     `query:"limit" default:"5"`
	}
	defaults.Set(&queryParams)

	if err := c.Bind().Query(&queryParams); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid query parameters",
		})
	}

	follows_filter := ""
	if queryParams.UserID != nil {
		follows_filter = "JOIN follows ON follows.followed_user_id = manage_entity_txs.user_id AND follows.user_id = @userId"
	}

	sql := `
		SELECT
			manage_entity_txs.tx_hash,
			manage_entity_txs.user_id,
			manage_entity_txs.entity_type,
			manage_entity_txs.entity_id,
			manage_entity_txs.action,
			blocks.block_time AS timestamp
		FROM manage_entity_txs
		JOIN blocks ON blocks.number = manage_entity_txs.block_number
		` + follows_filter + `
		WHERE (
				(manage_entity_txs.entity_type = 'Track' AND manage_entity_txs.action = 'Create')
				OR (manage_entity_txs.entity_type = 'Track' AND manage_entity_txs.action = 'Repost')
			)
			AND (
				@before::TEXT IS NULL 
				OR (
					manage_entity_txs.block_number = (SELECT block_number FROM manage_entity_txs WHERE tx_hash = @before)
					AND manage_entity_txs.tx_hash < @before
				) 
				OR (
					manage_entity_txs.block_number < (SELECT block_number FROM manage_entity_txs WHERE tx_hash = @before)
				)
			)
		ORDER BY 
			manage_entity_txs.block_number DESC NULLS LAST,
			manage_entity_txs.tx_hash DESC NULLS LAST
		LIMIT @limit;
	`
	rows, err := s.pool.Query(c.RequestCtx(), sql, pgx.NamedArgs{
		"userId": queryParams.UserID,
		"before": queryParams.Before,
		"limit":  queryParams.Limit,
	})
	if err != nil {
		s.Logger.Error("Failed to fetch feed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch feed",
		})
	}

	type feedItem struct {
		TxHash     string    `json:"tx_hash"`
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

// fiber:context-methods migrated
