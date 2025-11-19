package indexer

import (
	"context"
	"encoding/json"
	"fmt"

	corev1 "github.com/OpenAudio/go-openaudio/pkg/api/core/v1"
	"github.com/jackc/pgx/v5"
)

func (d *Indexer) indexUserManageEntity(ctx context.Context, sqlTx pgx.Tx, tx *corev1.ManageEntityLegacy, blockNumber int64) error {
	switch tx.Action {
	case "Create", "Update":
		return upsertUser(ctx, sqlTx, tx, blockNumber)
	case "Delete":
		return deleteUser(ctx, sqlTx, int(tx.EntityId))

	default:
		d.logger.Warn("Unknown user action", "action", tx.Action)
	}
	return nil
}

var knownUserFields = map[string]bool{
	"user_id":               true,
	"name":                  true,
	"handle":                true,
	"wallet":                true,
	"bio":                   true,
	"location":              true,
	"profile_picture":       true,
	"profile_picture_sizes": true,
	"cover_photo":           true,
	"cover_photo_sizes":     true,
	"is_deactivated":        true,
	"is_verified":           true,
	"allow_ai_attribution":  true,
	"events":                true,
	"playlist_library":      true,
	"website":               true,
	"artist_pick_track_id":  true,
	"instagram_handle":      true,
	"tiktok_handle":         true,
	"twitter_handle":        true,
	"donation":              true,
}

func upsertUser(ctx context.Context, sqlTx pgx.Tx, tx *corev1.ManageEntityLegacy, blockNumber int64) error {
	// Validate no unknown fields
	var metadataObj map[string]any
	if err := json.Unmarshal([]byte(tx.Metadata), &metadataObj); err != nil {
		return fmt.Errorf("invalid JSON metadata: %w", err)
	}

	data, ok := metadataObj["data"].(map[string]any)
	if ok {
		for key := range data {
			if !knownUserFields[key] {
				return fmt.Errorf("unknown field in user metadata: %s", key)
			}
		}
	}

	_, err := sqlTx.Exec(ctx, `
		INSERT INTO users (
			id,
			block_number,
			name,
			handle,
			wallet,
			bio,
			location,
			profile_picture_sizes,
			cover_photo_sizes,
			is_deactivated,
			is_verified,
			events,
			website,
			artist_pick_track_id,
			instagram_handle,
			tiktok_handle,
			twitter_handle,
			donation,
			created_at,
			updated_at
		) VALUES (
		 	@id,
            @blockNumber,
            @metadata::jsonb->'data'->>'name',
            @metadata::jsonb->'data'->>'handle',
            COALESCE(@metadata::jsonb->'data'->>'wallet', @signer),
            @metadata::jsonb->'data'->>'bio',
            @metadata::jsonb->'data'->>'location',
            COALESCE(@metadata::jsonb->'data'->>'profile_picture_sizes', @metadata::jsonb->'data'->>'profile_picture'),
            COALESCE(@metadata::jsonb->'data'->>'cover_photo_sizes', @metadata::jsonb->'data'->>'cover_photo'),
            COALESCE((@metadata::jsonb->'data'->>'is_deactivated')::BOOLEAN, false),
            COALESCE((@metadata::jsonb->'data'->>'is_verified')::BOOLEAN, false),
            @metadata::jsonb->'data'->'events',
			@metadata::jsonb->'data'->>'website',
			(@metadata::jsonb->'data'->>'artist_pick_track_id')::INT,
			@metadata::jsonb->'data'->>'instagram_handle',
			@metadata::jsonb->'data'->>'tiktok_handle',
			@metadata::jsonb->'data'->>'twitter_handle',
			@metadata::jsonb->'data'->>'donation',
            NOW(),
            NOW()
		) ON CONFLICT (id) DO UPDATE SET
			block_number = EXCLUDED.block_number,
			name = CASE WHEN @metadata::jsonb->'data' ? 'name' THEN EXCLUDED.name ELSE users.name END,
			handle = CASE WHEN @metadata::jsonb->'data' ? 'handle' THEN EXCLUDED.handle ELSE users.handle END,
			wallet = CASE WHEN @metadata::jsonb->'data' ? 'wallet' THEN EXCLUDED.wallet ELSE users.wallet END,
			bio = CASE WHEN @metadata::jsonb->'data' ? 'bio' THEN EXCLUDED.bio ELSE users.bio END,
			location = CASE WHEN @metadata::jsonb->'data' ? 'location' THEN EXCLUDED.location ELSE users.location END,
			profile_picture_sizes = CASE 
				WHEN @metadata::jsonb->'data' ? 'profile_picture_sizes' THEN EXCLUDED.profile_picture_sizes 
				WHEN @metadata::jsonb->'data' ? 'profile_picture' THEN EXCLUDED.profile_picture_sizes
				ELSE users.profile_picture_sizes 
			END,
			cover_photo_sizes = CASE 
				WHEN @metadata::jsonb->'data' ? 'cover_photo_sizes' THEN EXCLUDED.cover_photo_sizes 
				WHEN @metadata::jsonb->'data' ? 'cover_photo' THEN EXCLUDED.cover_photo_sizes
				ELSE users.cover_photo_sizes 
			END,
			is_deactivated = CASE WHEN @metadata::jsonb->'data' ? 'is_deactivated' THEN EXCLUDED.is_deactivated ELSE users.is_deactivated END,
			is_verified = CASE WHEN @metadata::jsonb->'data' ? 'is_verified' THEN EXCLUDED.is_verified ELSE users.is_verified END,
			events = CASE WHEN @metadata::jsonb->'data' ? 'events' THEN EXCLUDED.events ELSE users.events END,
			website = CASE WHEN @metadata::jsonb->'data' ? 'website' THEN EXCLUDED.website ELSE users.website END,
			artist_pick_track_id = CASE WHEN @metadata::jsonb->'data' ? 'artist_pick_track_id' THEN EXCLUDED.artist_pick_track_id ELSE users.artist_pick_track_id END,
			instagram_handle = CASE WHEN @metadata::jsonb->'data' ? 'instagram_handle' THEN EXCLUDED.instagram_handle ELSE users.instagram_handle END,
			tiktok_handle = CASE WHEN @metadata::jsonb->'data' ? 'tiktok_handle' THEN EXCLUDED.tiktok_handle ELSE users.tiktok_handle END,
			twitter_handle = CASE WHEN @metadata::jsonb->'data' ? 'twitter_handle' THEN EXCLUDED.twitter_handle ELSE users.twitter_handle END,
			donation = CASE WHEN @metadata::jsonb->'data' ? 'donation' THEN EXCLUDED.donation ELSE users.donation END,
			updated_at = NOW()
		WHERE users.block_number <= EXCLUDED.block_number
	`, pgx.NamedArgs{
		"id":          int(tx.EntityId),
		"blockNumber": blockNumber,
		"metadata":    tx.Metadata,
		"signer":      tx.Signer,
	})
	if err != nil {
		return fmt.Errorf("failed to upsert user: %w", err)
	}

	_, err = sqlTx.Exec(ctx, `
		INSERT INTO playlist_libraries (
			user_id,
			block_number,
			library,
			created_at,
			updated_at
		) VALUES (
		 	@id,
			@blockNumber,
			@metadata::jsonb->'data'->'playlist_library'->'contents',
			NOW(),
			NOW()
		) ON CONFLICT (user_id) DO UPDATE SET
			library = EXCLUDED.library,
			updated_at = NOW()
		WHERE playlist_libraries.block_number <= EXCLUDED.block_number
	`, pgx.NamedArgs{
		"id":          int(tx.EntityId),
		"blockNumber": blockNumber,
		"metadata":    tx.Metadata,
	}, int(tx.EntityId))
	if err != nil {
		return fmt.Errorf("failed to upsert playlist library: %w", err)
	}

	return nil
}

func deleteUser(ctx context.Context, sqlTx pgx.Tx, id int) error {
	_, err := sqlTx.Exec(ctx, `
		DELETE FROM users WHERE id = $1;
	`, id)
	return err
}
