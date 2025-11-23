package api

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
)

func (s *Server) getComments(c *fiber.Ctx) error {
	var routeParams struct {
		TrackID int `params:"id"`
	}
	if err := c.ParamsParser(&routeParams); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid route parameters"})
	}

	sql := `
		SELECT
			c.comment_id,
			c.user_id,
			c.content,
			c.track_timestamp_s,
			u.name AS user_name,
			u.profile_picture_sizes
		FROM comments c
		JOIN users u ON u.user_id = c.user_id
		WHERE c.track_id = @trackId
		ORDER BY c.track_timestamp_s NULLS LAST, c.created_at ASC
	`

	rows, err := s.pool.Query(c.Context(), sql, pgx.NamedArgs{"trackId": routeParams.TrackID})
	if err != nil {
		s.Logger.Error("Failed to fetch comments", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch comments"})
	}

	type commentRow struct {
		CommentID           int     `json:"comment_id"`
		UserID              int     `json:"user_id"`
		Content             string  `json:"content"`
		TrackTimestampS     *int    `json:"track_timestamp_s"`
		UserName            string  `json:"user_name"`
		ProfilePictureSizes *string `json:"-"`
	}

	commentRows, err := pgx.CollectRows(rows, pgx.RowToStructByName[commentRow])
	if err != nil {
		return fmt.Errorf("failed to parse comments: %w", err)
	}

	type commentResp struct {
		commentRow
		ProfilePicture *string `json:"user_profile_picture,omitempty"`
	}

	out := make([]commentResp, 0, len(commentRows))
	for _, cr := range commentRows {
		var avatarURL *string
		if cr.ProfilePictureSizes != nil {
			img, err := s.getImageMirrors(c.Context(), *cr.ProfilePictureSizes)
			if err == nil && img != nil {
				avatarURL = &img.Small
			}
		}

		out = append(out, commentResp{
			commentRow:     cr,
			ProfilePicture: avatarURL,
		})
	}

	return c.JSON(fiber.Map{"data": out})
}
