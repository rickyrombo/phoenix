package api

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
)

func (s *Server) getTracks(c *fiber.Ctx) error {
	var queryParams struct {
		Ids []int `query:"id"`
	}
	if err := c.QueryParser(&queryParams); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid query parameters",
		})
	}

	sql := `
		SELECT
			track_id,
			title,
			description,
			cover_art_sizes,
			genre,
			mood,
			bpm,
			musical_key,
			duration,			
			owner_id,
			play_count,
			comment_count,
			save_count,
			repost_count,
			track_waveforms.peaks AS track_waveform,
			preview_waveforms.peaks AS preview_waveform,
			track_cid,
			preview_cid
		FROM tracks
		JOIN track_aggregates USING (track_id)
		LEFT JOIN waveforms track_waveforms ON track_waveforms.cid = tracks.track_cid
		LEFT JOIN waveforms preview_waveforms ON preview_waveforms.cid = tracks.preview_cid
		WHERE track_id = ANY(@ids)
		;
	`
	rows, err := s.pool.Query(c.Context(), sql, pgx.NamedArgs{
		"ids": queryParams.Ids,
	})
	if err != nil {
		s.Logger.Error("Failed to fetch tracks", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch tracks",
		})
	}
	type trackRow struct {
		TrackID         int       `json:"track_id"`
		Title           string    `json:"title"`
		Description     string    `json:"description"`
		CoverArtSizes   string    `json:"-"`
		Genre           string    `json:"genre"`
		Mood            string    `json:"mood"`
		BPM             float32   `json:"bpm"`
		MusicalKey      string    `json:"musical_key"`
		Duration        int       `json:"duration"`
		OwnerID         int       `json:"owner_id"`
		PlayCount       int64     `json:"play_count"`
		CommentCount    int64     `json:"comment_count"`
		SaveCount       int64     `json:"save_count"`
		RepostCount     int64     `json:"repost_count"`
		TrackWaveform   []float32 `json:"-"`
		PreviewWaveform []float32 `json:"-"`
		TrackCID        string    `json:"-"`
		PreviewCID      *string   `json:"-"`
	}
	trackRows, err := pgx.CollectRows(rows, pgx.RowToStructByName[trackRow])
	if err != nil {
		return fmt.Errorf("failed to parse tracks: %w", err)
	}

	type trackResponse struct {
		trackRow
		Stream   *StreamMirrors `json:"stream"`
		CoverArt *ImageMirrors  `json:"cover_art"`
		Waveform []float32      `json:"waveform"`
	}
	tracks := make([]trackResponse, 0, len(trackRows))
	for _, tr := range trackRows {
		stream, err := s.getStreamMirrors(c.Context(), tr.TrackCID, nil, &tr.TrackID)
		if err != nil {
			return fmt.Errorf("failed to get stream mirrors for track %d: %w", tr.TrackID, err)
		}

		coverArt, err := s.getImageMirrors(c.Context(), tr.CoverArtSizes)
		if err != nil {
			return fmt.Errorf("failed to get cover art mirrors for track %d: %w", tr.TrackID, err)
		}

		tracks = append(tracks, trackResponse{
			trackRow: tr,
			Stream:   stream,
			CoverArt: coverArt,
			Waveform: tr.TrackWaveform,
		})
	}

	return c.JSON(fiber.Map{
		"data": tracks,
	})
}
