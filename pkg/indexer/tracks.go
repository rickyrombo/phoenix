package indexer

import (
	"context"
	"encoding/json"
	"fmt"

	corev1 "github.com/OpenAudio/go-openaudio/pkg/api/core/v1"
	"github.com/jackc/pgx/v5"
)

func (d *Indexer) indexTrack(ctx context.Context, sqlTx pgx.Tx, tx *corev1.ManageEntityLegacy, blockNumber int64) error {
	switch tx.Action {
	case Action_Create, Action_Update:
		return upsertTrack(ctx, sqlTx, int(tx.EntityId), tx.Metadata, blockNumber)
	case Action_Delete:
		return deleteTrack(ctx, sqlTx, int(tx.EntityId))
	case Action_Save:
		return saveTrack(ctx, sqlTx, int(tx.UserId), int(tx.EntityId), blockNumber)
	case Action_Unsave:
		return unsaveTrack(ctx, sqlTx, int(tx.UserId), int(tx.EntityId))
	case Action_Repost:
		return repostTrack(ctx, sqlTx, int(tx.UserId), int(tx.EntityId), blockNumber)
	case Action_Unrepost:
		return unrepostTrack(ctx, sqlTx, int(tx.UserId), int(tx.EntityId))
	case Action_Download:
		return downloadTrack(ctx, sqlTx, int(tx.UserId), int(tx.EntityId), blockNumber)
	default:
		return fmt.Errorf("unrecognized track action %s", tx.Action)
	}
}

var knownTrackFields = map[string]bool{
	"track_id":                   true,
	"title":                      true,
	"description":                true,
	"duration":                   true,
	"genre":                      true,
	"mood":                       true,
	"tags":                       true,
	"bpm":                        true,
	"musical_key":                true,
	"isrc":                       true,
	"iswc":                       true,
	"license":                    true,
	"owner_id":                   true,
	"release_date":               true,
	"track_cid":                  true,
	"preview_cid":                true,
	"orig_file_cid":              true,
	"orig_filename":              true,
	"cover_art_sizes":            true,
	"audio_upload_id":            true,
	"is_unlisted":                true,
	"is_downloadable":            true,
	"is_stream_gated":            true,
	"is_download_gated":          true,
	"is_scheduled_release":       true,
	"is_original_available":      true,
	"is_custom_bpm":              true,
	"is_custom_musical_key":      true,
	"comments_disabled":          true,
	"ddex_app":                   true,
	"ddex_release_ids":           true,
	"stream_conditions":          true,
	"download_conditions":        true,
	"remix_of":                   true,
	"stem_of":                    true,
	"field_visibility":           true,
	"track_segments":             true,
	"parental_warning_type":      true,
	"audio_analysis_error_count": true,
	"preview_start_seconds":      true,
	"ai_attribution_user_id":     true,
}

func upsertTrack(ctx context.Context, sqlTx pgx.Tx, trackId int, metadata string, blockNumber int64) error {
	// Validate no unknown fields
	var metadataObj map[string]any
	if err := json.Unmarshal([]byte(metadata), &metadataObj); err != nil {
		return fmt.Errorf("invalid JSON metadata: %w", err)
	}

	data, ok := metadataObj["data"].(map[string]any)
	if ok {
		for key := range data {
			if !knownTrackFields[key] {
				return fmt.Errorf("unknown field in track metadata: %s", key)
			}
		}
	}

	_, err := sqlTx.Exec(ctx, `
		WITH ins AS (
			INSERT INTO tracks (
				track_id,
				title,
				description,
				duration,
				genre,
				mood,
				tags,
				bpm,
				musical_key,
				isrc,
				iswc,
				license,
				owner_id,
				release_date,
				track_cid,
				preview_cid,
				orig_file_cid,
				orig_filename,
				cover_art_sizes,
				audio_upload_id,
				is_unlisted,
				is_downloadable,
				is_stream_gated,
				is_download_gated,
				is_scheduled_release,
				is_original_available,
				is_custom_bpm,
				is_custom_musical_key,
				comments_disabled,
				ddex_app,
				ddex_release_ids,
				stream_conditions,
				download_conditions,
				remix_of,
				stem_of,
				field_visibility,
				parental_warning_type,
				preview_start_seconds,
				ai_attribution_user_id,
				block_number,
				created_at,
				updated_at
			)
			VALUES (
				@track_id,
				@metadata::jsonb->'data'->>'title',
				@metadata::jsonb->'data'->>'description',
				NULLIF(@metadata::jsonb->'data'->>'duration', '')::INTEGER,
				@metadata::jsonb->'data'->>'genre',
				@metadata::jsonb->'data'->>'mood',
				string_to_array(@metadata::jsonb->'data'->>'tags', ','),
				NULLIF(@metadata::jsonb->'data'->>'bpm', '')::NUMERIC,
				@metadata::jsonb->'data'->>'musical_key',
				@metadata::jsonb->'data'->>'isrc',
				@metadata::jsonb->'data'->>'iswc',
				@metadata::jsonb->'data'->>'license',
				(@metadata::jsonb->'data'->>'owner_id')::INTEGER,
				NULLIF(@metadata::jsonb->'data'->>'release_date', '')::TIMESTAMP WITH TIME ZONE,
				@metadata::jsonb->'data'->>'track_cid',
				@metadata::jsonb->'data'->>'preview_cid',
				@metadata::jsonb->'data'->>'orig_file_cid',
				@metadata::jsonb->'data'->>'orig_filename',
				@metadata::jsonb->'data'->>'cover_art_sizes',
				@metadata::jsonb->'data'->>'audio_upload_id',
				COALESCE((@metadata::jsonb->'data'->>'is_unlisted')::BOOLEAN, false),
				COALESCE((@metadata::jsonb->'data'->>'is_downloadable')::BOOLEAN, false),
				COALESCE((@metadata::jsonb->'data'->>'is_stream_gated')::BOOLEAN, false),
				COALESCE((@metadata::jsonb->'data'->>'is_download_gated')::BOOLEAN, false),
				COALESCE((@metadata::jsonb->'data'->>'is_scheduled_release')::BOOLEAN, false),
				COALESCE((@metadata::jsonb->'data'->>'is_original_available')::BOOLEAN, false),
				COALESCE((@metadata::jsonb->'data'->>'is_custom_bpm')::BOOLEAN, false),
				COALESCE((@metadata::jsonb->'data'->>'is_custom_musical_key')::BOOLEAN, false),
				COALESCE((@metadata::jsonb->'data'->>'comments_disabled')::BOOLEAN, false),
				@metadata::jsonb->'data'->>'ddex_app',
				@metadata::jsonb->'data'->'ddex_release_ids',
				@metadata::jsonb->'data'->'stream_conditions',
				@metadata::jsonb->'data'->'download_conditions',
				@metadata::jsonb->'data'->'remix_of',
				@metadata::jsonb->'data'->'stem_of',
				@metadata::jsonb->'data'->'field_visibility',
				@metadata::jsonb->'data'->>'parental_warning_type',
				(@metadata::jsonb->'data'->>'ai_attribution_user_id')::INTEGER,
				NULLIF(@metadata::jsonb->'data'->>'preview_start_seconds', '')::INTEGER,
				@blockNumber,
				NOW(),
				NOW()
			)
			ON CONFLICT (track_id) DO UPDATE SET
				title = CASE WHEN @metadata::jsonb->'data' ? 'title' THEN EXCLUDED.title ELSE tracks.title END,
				description = CASE WHEN @metadata::jsonb->'data' ? 'description' THEN EXCLUDED.description ELSE tracks.description END,
				duration = CASE WHEN @metadata::jsonb->'data' ? 'duration' THEN EXCLUDED.duration ELSE tracks.duration END,
				genre = CASE WHEN @metadata::jsonb->'data' ? 'genre' THEN EXCLUDED.genre ELSE tracks.genre END,
				mood = CASE WHEN @metadata::jsonb->'data' ? 'mood' THEN EXCLUDED.mood ELSE tracks.mood END,
				tags = CASE WHEN @metadata::jsonb->'data' ? 'tags' THEN EXCLUDED.tags ELSE tracks.tags END,
				bpm = CASE WHEN @metadata::jsonb->'data' ? 'bpm' THEN EXCLUDED.bpm ELSE tracks.bpm END,
				musical_key = CASE WHEN @metadata::jsonb->'data' ? 'musical_key' THEN EXCLUDED.musical_key ELSE tracks.musical_key END,
				isrc = CASE WHEN @metadata::jsonb->'data' ? 'isrc' THEN EXCLUDED.isrc ELSE tracks.isrc END,
				iswc = CASE WHEN @metadata::jsonb->'data' ? 'iswc' THEN EXCLUDED.iswc ELSE tracks.iswc END,
				license = CASE WHEN @metadata::jsonb->'data' ? 'license' THEN EXCLUDED.license ELSE tracks.license END,
				owner_id = CASE WHEN @metadata::jsonb->'data' ? 'owner_id' THEN EXCLUDED.owner_id ELSE tracks.owner_id END,
				release_date = CASE WHEN @metadata::jsonb->'data' ? 'release_date' THEN EXCLUDED.release_date ELSE tracks.release_date END,
				track_cid = CASE WHEN @metadata::jsonb->'data' ? 'track_cid' THEN EXCLUDED.track_cid ELSE tracks.track_cid END,
				preview_cid = CASE WHEN @metadata::jsonb->'data' ? 'preview_cid' THEN EXCLUDED.preview_cid ELSE tracks.preview_cid END,
				orig_file_cid = CASE WHEN @metadata::jsonb->'data' ? 'orig_file_cid' THEN EXCLUDED.orig_file_cid ELSE tracks.orig_file_cid END,
				orig_filename = CASE WHEN @metadata::jsonb->'data' ? 'orig_filename' THEN EXCLUDED.orig_filename ELSE tracks.orig_filename END,
				cover_art_sizes = CASE WHEN @metadata::jsonb->'data' ? 'cover_art_sizes' THEN EXCLUDED.cover_art_sizes ELSE tracks.cover_art_sizes END,
				audio_upload_id = CASE WHEN @metadata::jsonb->'data' ? 'audio_upload_id' THEN EXCLUDED.audio_upload_id ELSE tracks.audio_upload_id END,
				is_unlisted = CASE WHEN @metadata::jsonb->'data' ? 'is_unlisted' THEN EXCLUDED.is_unlisted ELSE tracks.is_unlisted END,
				is_downloadable = CASE WHEN @metadata::jsonb->'data' ? 'is_downloadable' THEN EXCLUDED.is_downloadable ELSE tracks.is_downloadable END,
				is_stream_gated = CASE WHEN @metadata::jsonb->'data' ? 'is_stream_gated' THEN EXCLUDED.is_stream_gated ELSE tracks.is_stream_gated END,
				is_download_gated = CASE WHEN @metadata::jsonb->'data' ? 'is_download_gated' THEN EXCLUDED.is_download_gated ELSE tracks.is_download_gated END,
				is_scheduled_release = CASE WHEN @metadata::jsonb->'data' ? 'is_scheduled_release' THEN EXCLUDED.is_scheduled_release ELSE tracks.is_scheduled_release END,
				is_original_available = CASE WHEN @metadata::jsonb->'data' ? 'is_original_available' THEN EXCLUDED.is_original_available ELSE tracks.is_original_available END,
				is_custom_bpm = CASE WHEN @metadata::jsonb->'data' ? 'is_custom_bpm' THEN EXCLUDED.is_custom_bpm ELSE tracks.is_custom_bpm END,
				is_custom_musical_key = CASE WHEN @metadata::jsonb->'data' ? 'is_custom_musical_key' THEN EXCLUDED.is_custom_musical_key ELSE tracks.is_custom_musical_key END,
				comments_disabled = CASE WHEN @metadata::jsonb->'data' ? 'comments_disabled' THEN EXCLUDED.comments_disabled ELSE tracks.comments_disabled END,
				ddex_app = CASE WHEN @metadata::jsonb->'data' ? 'ddex_app' THEN EXCLUDED.ddex_app ELSE tracks.ddex_app END,
				ddex_release_ids = CASE WHEN @metadata::jsonb->'data' ? 'ddex_release_ids' THEN EXCLUDED.ddex_release_ids ELSE tracks.ddex_release_ids END,
				stream_conditions = CASE WHEN @metadata::jsonb->'data' ? 'stream_conditions' THEN EXCLUDED.stream_conditions ELSE tracks.stream_conditions END,
				download_conditions = CASE WHEN @metadata::jsonb->'data' ? 'download_conditions' THEN EXCLUDED.download_conditions ELSE tracks.download_conditions END,
				remix_of = CASE WHEN @metadata::jsonb->'data' ? 'remix_of' THEN EXCLUDED.remix_of ELSE tracks.remix_of END,
				stem_of = CASE WHEN @metadata::jsonb->'data' ? 'stem_of' THEN EXCLUDED.stem_of ELSE tracks.stem_of END,
				field_visibility = CASE WHEN @metadata::jsonb->'data' ? 'field_visibility' THEN EXCLUDED.field_visibility ELSE tracks.field_visibility END,
				parental_warning_type = CASE WHEN @metadata::jsonb->'data' ? 'parental_warning_type' THEN EXCLUDED.parental_warning_type ELSE tracks.parental_warning_type END,
				preview_start_seconds = CASE WHEN @metadata::jsonb->'data' ? 'preview_start_seconds' THEN EXCLUDED.preview_start_seconds ELSE tracks.preview_start_seconds END,
				ai_attribution_user_id = CASE WHEN @metadata::jsonb->'data' ? 'ai_attribution_user_id' THEN EXCLUDED.ai_attribution_user_id ELSE tracks.ai_attribution_user_id END,
				block_number = EXCLUDED.block_number,
				updated_at = NOW()
			WHERE tracks.block_number <= EXCLUDED.block_number
			RETURNING owner_id
		)
		INSERT INTO user_aggregates (
			user_id,
			track_count,
			created_at,
			updated_at
		)
		SELECT owner_id, 1, NOW(), NOW() FROM ins
		ON CONFLICT (user_id) DO UPDATE SET
			track_count = user_aggregates.track_count + 1,
			updated_at = NOW()
		;
	`, pgx.NamedArgs{
		"track_id":    trackId,
		"metadata":    metadata,
		"blockNumber": blockNumber,
	})
	return err
}

func deleteTrack(ctx context.Context, sqlTx pgx.Tx, id int) error {
	_, err := sqlTx.Exec(ctx, `
		DELETE FROM tracks WHERE track_id = $1
	`, id)
	return err
}

func saveTrack(ctx context.Context, sqlTx pgx.Tx, userID int, trackID int, blockNumber int64) error {
	_, err := sqlTx.Exec(ctx, `
        WITH ins AS (
            INSERT INTO track_saves (user_id, track_id, block_number, created_at, updated_at)
            VALUES (@userID, @trackID, @blockNumber, NOW(), NOW())
            ON CONFLICT (user_id, track_id) DO UPDATE SET
                block_number = EXCLUDED.block_number,
                updated_at = EXCLUDED.updated_at
            WHERE track_saves.block_number <= EXCLUDED.block_number
            RETURNING track_id
        )
        INSERT INTO track_aggregates (track_id, save_count, created_at, updated_at)
        SELECT track_id, 1, NOW(), NOW() FROM ins
        ON CONFLICT (track_id) DO UPDATE SET
            save_count = track_aggregates.save_count + 1,
            updated_at = NOW()
    `, pgx.NamedArgs{
		"userID":      userID,
		"trackID":     trackID,
		"blockNumber": blockNumber,
	})
	return err
}

func unsaveTrack(ctx context.Context, sqlTx pgx.Tx, userID int, trackID int) error {
	_, err := sqlTx.Exec(ctx, `
        WITH del AS (
            DELETE FROM track_saves
            WHERE user_id = @userID AND track_id = @trackID
            RETURNING track_id
        )
        UPDATE track_aggregates
        SET save_count = GREATEST(save_count - 1, 0),
            updated_at = NOW()
        WHERE track_id IN (SELECT track_id FROM del)
    `, pgx.NamedArgs{
		"userID":  userID,
		"trackID": trackID,
	})
	return err
}

func repostTrack(ctx context.Context, sqlTx pgx.Tx, userID int, trackID int, blockNumber int64) error {
	_, err := sqlTx.Exec(ctx, `
		WITH ins AS (
			INSERT INTO track_reposts (user_id, track_id, block_number, created_at, updated_at)
			VALUES (@userID, @trackID, @blockNumber, NOW(), NOW())	
			ON CONFLICT (user_id, track_id) DO UPDATE SET
				block_number = EXCLUDED.block_number,
				updated_at = NOW()
			WHERE track_reposts.block_number <= EXCLUDED.block_number
			RETURNING track_id
		)
		INSERT INTO track_aggregates (track_id, repost_count, created_at, updated_at)
		SELECT track_id, 1, NOW(), NOW() FROM ins
		ON CONFLICT (track_id) DO UPDATE SET
			repost_count = track_aggregates.repost_count + 1,
			updated_at = NOW()
	`, pgx.NamedArgs{
		"userID":      userID,
		"trackID":     trackID,
		"blockNumber": blockNumber,
	})
	if err != nil {
		return err
	}

	return nil
}

func unrepostTrack(ctx context.Context, sqlTx pgx.Tx, userID int, trackID int) error {
	_, err := sqlTx.Exec(ctx, `
        WITH del AS (
            DELETE FROM track_reposts
            WHERE user_id = @userID AND track_id = @trackID
            RETURNING track_id
        )
        INSERT INTO track_aggregates (track_id, repost_count, created_at, updated_at)
        SELECT track_id, 0, NOW(), NOW() FROM del
        ON CONFLICT (track_id) DO UPDATE SET
            repost_count = GREATEST(track_aggregates.repost_count - 1, 0),
            updated_at = NOW()
    `, pgx.NamedArgs{
		"userID":  userID,
		"trackID": trackID,
	})
	return err
}

func downloadTrack(ctx context.Context, sqlTx pgx.Tx, userID int, trackID int, blockNumber int64) error {
	_, err := sqlTx.Exec(ctx, `
        WITH ins AS (
            INSERT INTO track_downloads (user_id, track_id, block_number, created_at, updated_at)
            VALUES (@userID, @trackID, @blockNumber, NOW(), NOW())
            ON CONFLICT (user_id, track_id) DO UPDATE SET
                block_number = EXCLUDED.block_number,
                updated_at = EXCLUDED.updated_at
            WHERE track_downloads.block_number <= EXCLUDED.block_number
            RETURNING track_id
        )
        INSERT INTO track_aggregates (track_id, download_count, created_at, updated_at)
        SELECT track_id, 1, NOW(), NOW() FROM ins
        ON CONFLICT (track_id) DO UPDATE SET
            download_count = track_aggregates.download_count + 1,
            updated_at = NOW()
    `, pgx.NamedArgs{
		"userID":      userID,
		"trackID":     trackID,
		"blockNumber": blockNumber,
	})
	return err
}
