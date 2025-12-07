package indexer

import (
	"context"
	"strconv"

	corev1 "github.com/OpenAudio/go-openaudio/pkg/api/core/v1"
	"github.com/jackc/pgx/v5"
)

func (d *Indexer) indexTrackPlay(ctx context.Context, sqlTx pgx.Tx, tx *corev1.TrackPlay, blockNumber int64) error {
	// handle anon listens
	var userId *int64
	parsedUserId, err := strconv.ParseInt(tx.UserId, 10, 64)
	if err != nil || parsedUserId == 0 {
		userId = nil
	} else {
		userId = &parsedUserId
	}

	trackId, err := strconv.ParseInt(tx.TrackId, 10, 64)
	if err != nil || trackId == 0 {
		// Skip plays that don't record the track ID
		return nil
	}

	sql := `
		WITH ins AS (
			INSERT INTO track_plays (
				track_id,
				listener_id,
				user_id,
				city,
				region,
				country,
				timestamp,
				block_number
			) VALUES (
				@track_id,
				@listener_id,
				@user_id,
				@city,
				@region,
				@country,
				@timestamp,
				@block_number
			)
			ON CONFLICT DO NOTHING
			RETURNING track_id, user_id, timestamp
		), track_plays_agg_daily_update AS (
			INSERT INTO track_plays_daily (track_id, day, play_count)
			SELECT track_id, DATE_TRUNC('day', timestamp), 1
			FROM ins
			ON CONFLICT (track_id, day) DO UPDATE
			SET play_count = track_plays_daily.play_count + 1
		), track_plays_users_aggregate_daily_update AS (
			INSERT INTO track_plays_users_aggregate (track_id, user_id, play_count)
			SELECT track_id, user_id, 1
			FROM ins WHERE user_id IS NOT NULL
			ON CONFLICT (track_id, user_id) DO UPDATE
			SET play_count = track_plays_users_aggregate.play_count + 1
		), track_plays_users_daily_update AS (
			INSERT INTO track_plays_users_daily (track_id, user_id, day, play_count)
			SELECT track_id, user_id, DATE_TRUNC('day', timestamp), 1
			FROM ins WHERE user_id IS NOT NULL
			ON CONFLICT (track_id, user_id, day) DO UPDATE
			SET play_count = track_plays_users_daily.play_count + 1
		)
		INSERT INTO track_aggregates (track_id, play_count)
		SELECT track_id, 1 FROM ins
		ON CONFLICT (track_id) DO UPDATE SET
			play_count = track_aggregates.play_count + 1
		;
	`

	_, err = sqlTx.Exec(ctx, sql,
		pgx.NamedArgs{
			"track_id":     trackId,
			"listener_id":  tx.UserId,
			"user_id":      userId,
			"timestamp":    tx.Timestamp.AsTime(),
			"city":         tx.City,
			"region":       tx.Region,
			"country":      tx.Country,
			"block_number": blockNumber,
		},
	)
	if err != nil {
		return err
	}
	return nil
}
