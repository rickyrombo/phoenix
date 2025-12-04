package api

import (
	"fmt"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5"
)

func (s *Server) getTracks(c fiber.Ctx) error {
	var queryParams struct {
		Ids []int `query:"id"`
	}
	if err := c.Bind().Query(&queryParams); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid query parameters",
		})
	}

	sql := `
		SELECT
			tracks.track_id,
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
			preview_cid,
			track_saves.user_id IS NOT NULL AS is_saved,
			track_reposts.user_id IS NOT NULL AS is_reposted
		FROM tracks
		JOIN track_aggregates ON track_aggregates.track_id = tracks.track_id
		LEFT JOIN waveforms track_waveforms ON track_waveforms.cid = tracks.track_cid
		LEFT JOIN waveforms preview_waveforms ON preview_waveforms.cid = tracks.preview_cid
		LEFT JOIN track_saves ON track_saves.track_id = tracks.track_id AND track_saves.user_id = NULLIF(@currentUserId, 0)
		LEFT JOIN track_reposts ON track_reposts.track_id = tracks.track_id AND track_reposts.user_id = NULLIF(@currentUserId, 0)
		WHERE tracks.track_id = ANY(@ids)
			AND is_unlisted = FALSE
			AND stem_of IS NULL
		;
	`
	rows, err := s.pool.Query(c.RequestCtx(), sql, pgx.NamedArgs{
		"ids":           queryParams.Ids,
		"currentUserId": s.getCurrentUserID(c),
	})
	if err != nil {
		s.logger.Error("Failed to fetch tracks", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch tracks",
		})
	}
	type trackRow struct {
		TrackID         int       `json:"track_id"`
		Title           string    `json:"title"`
		Description     *string   `json:"description"`
		CoverArtSizes   *string   `json:"-"`
		Genre           *string   `json:"genre"`
		Mood            *string   `json:"mood"`
		BPM             *float32  `json:"bpm"`
		MusicalKey      *string   `json:"musical_key"`
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
		IsSaved         bool      `json:"is_saved"`
		IsReposted      bool      `json:"is_reposted"`
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
		stream, err := s.getStreamMirrors(c.RequestCtx(), tr.TrackCID, nil, &tr.TrackID)
		if err != nil {
			return fmt.Errorf("failed to get stream mirrors for track %d: %w", tr.TrackID, err)
		}

		var coverArt *ImageMirrors
		if tr.CoverArtSizes != nil {
			coverArt, err = s.getImageMirrors(c.RequestCtx(), *tr.CoverArtSizes)
			if err != nil {
				return fmt.Errorf("failed to get cover art mirrors for track %d: %w", tr.TrackID, err)
			}
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

// fiber:context-methods migrated
