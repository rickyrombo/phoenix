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
	case Action_Create, Action_Update:
		return upsertUser(ctx, sqlTx, tx, blockNumber)
	case Action_Delete:
		return deleteUser(ctx, sqlTx, int(tx.EntityId))
	case Action_Follow:
		return followUser(ctx, sqlTx, int(tx.UserId), int(tx.EntityId), blockNumber, tx.Signature)
	case Action_Unfollow:
		return unfollowUser(ctx, sqlTx, int(tx.UserId), int(tx.EntityId), blockNumber, tx.Signature)
	case Action_Subscribe:
		return subscribeUser(ctx, sqlTx, int(tx.UserId), int(tx.EntityId), blockNumber, tx.Signature)
	case Action_Unsubscribe:
		return unsubscribeUser(ctx, sqlTx, int(tx.UserId), int(tx.EntityId), blockNumber, tx.Signature)

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
			bio,
			location,
			profile_picture_sizes,
			cover_photo_sizes,
			is_deactivated,
			is_verified,
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
            @metadata::jsonb->'data'->>'bio',
            @metadata::jsonb->'data'->>'location',
            COALESCE(@metadata::jsonb->'data'->>'profile_picture_sizes', @metadata::jsonb->'data'->>'profile_picture'),
            COALESCE(@metadata::jsonb->'data'->>'cover_photo_sizes', @metadata::jsonb->'data'->>'cover_photo'),
            COALESCE((@metadata::jsonb->'data'->>'is_deactivated')::BOOLEAN, false),
            COALESCE((@metadata::jsonb->'data'->>'is_verified')::BOOLEAN, false),
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

	// Upsert playlist library if present
	if _, ok := metadataObj["data"].(map[string]any)["playlist_library"]; ok {
		_, err = sqlTx.Exec(ctx, `
			INSERT INTO playlist_libraries (
				user_id,
				library,
				block_number,
				tx_hash,
				created_at,
				updated_at
			) VALUES (
				@id,
				@metadata::jsonb->'data'->'playlist_library'->'contents',
				@blockNumber,
				@txHash,
				NOW(),
				NOW()
			) ON CONFLICT (user_id) DO UPDATE SET
				library = EXCLUDED.library,
				updated_at = NOW()
			WHERE playlist_libraries.block_number <= EXCLUDED.block_number
		`, pgx.NamedArgs{
			"id":          int(tx.EntityId),
			"metadata":    tx.Metadata,
			"blockNumber": blockNumber,
			"txHash":      tx.Signature,
		}, int(tx.EntityId))
		if err != nil {
			return fmt.Errorf("failed to upsert playlist library: %w", err)
		}
	}

	// Unlike current indexer, store the wallet separately and make it 1:many
	if data, ok := metadataObj["data"].(map[string]any); ok {
		if wallet, ok := data["wallet"].(string); ok && wallet != "" {
			_, err = sqlTx.Exec(ctx, `
				INSERT INTO user_wallets (
					user_id,
					wallet,
					block_number,
					tx_hash,
					created_at,
					updated_at
				) VALUES (
					@id,
					@wallet,
					@blockNumber,
					@txHash,
					NOW(),
					NOW()
				) ON CONFLICT (wallet) DO UPDATE SET
				 	user_id = EXCLUDED.user_id,
					block_number = EXCLUDED.block_number,
					tx_hash = EXCLUDED.tx_hash,
					updated_at = NOW()
				WHERE user_wallets.block_number <= EXCLUDED.block_number
			`, pgx.NamedArgs{
				"id":          int(tx.EntityId),
				"wallet":      wallet,
				"blockNumber": blockNumber,
				"txHash":      tx.Signature,
			})
			if err != nil {
				return fmt.Errorf("failed to upsert user wallet: %w", err)
			}
		}
	}

	return nil
}

func deleteUser(ctx context.Context, sqlTx pgx.Tx, id int) error {
	_, err := sqlTx.Exec(ctx, `
		DELETE FROM users WHERE id = $1;
	`, id)
	return err
}

func followUser(ctx context.Context, sqlTx pgx.Tx, userId int, followedUserId int, blockNumber int64, txHash string) error {
	_, err := sqlTx.Exec(ctx, `
		INSERT INTO follows (user_id, followed_user_id, block_number, tx_hash, created_at, updated_at)
		VALUES (@userId, @followedUserId, @blockNumber, @txHash, NOW(), NOW())
		ON CONFLICT (user_id, followed_user_id) DO UPDATE SET
			block_number = EXCLUDED.block_number,
			tx_hash = EXCLUDED.tx_hash,
			updated_at = NOW()
		WHERE follows.block_number <= EXCLUDED.block_number
	`, pgx.NamedArgs{
		"userId":         userId,
		"followedUserId": followedUserId,
		"blockNumber":    blockNumber,
		"txHash":         txHash,
	})
	if err != nil {
		return err
	}

	_, err = sqlTx.Exec(ctx, `
		INSERT INTO user_aggregates (user_id, follower_count, updated_at)
		VALUES (@followedUserId, 1, NOW())
		ON CONFLICT (user_id) DO UPDATE SET
			follower_count = user_aggregates.follower_count + 1,
			updated_at = NOW()
	`, pgx.NamedArgs{
		"followedUserId": followedUserId,
	})
	if err != nil {
		return err
	}

	return nil
}

func unfollowUser(ctx context.Context, sqlTx pgx.Tx, userId int, unfollowedUserId int, blockNumber int64, txHash string) error {
	_, err := sqlTx.Exec(ctx, `
		DELETE FROM follows WHERE user_id = @userId AND followed_user_id = @unfollowedUserId;
	`, pgx.NamedArgs{
		"userId":           userId,
		"unfollowedUserId": unfollowedUserId,
	})
	if err != nil {
		return err
	}

	_, err = sqlTx.Exec(ctx, `
		INSERT INTO user_aggregates (user_id, follower_count, updated_at)
		VALUES (@unfollowedUserId, 0, NOW())
		ON CONFLICT (user_id) DO UPDATE SET
			follower_count = GREATEST(user_aggregates.follower_count - 1, 0),
			updated_at = NOW()
	`, pgx.NamedArgs{
		"unfollowedUserId": unfollowedUserId,
	})
	if err != nil {
		return err
	}

	return nil
}

func subscribeUser(ctx context.Context, sqlTx pgx.Tx, userId int, subscribedUserId int, blockNumber int64, txHash string) error {
	_, err := sqlTx.Exec(ctx, `
		INSERT INTO subscriptions (user_id, subscribed_user_id, block_number, tx_hash, created_at)
		VALUES (@userId, @subscribedUserId, @blockNumber, @txHash, NOW())
		ON CONFLICT (user_id, subscribed_user_id) DO UPDATE SET
			block_number = EXCLUDED.block_number,
			tx_hash = EXCLUDED.tx_hash,
			updated_at = NOW()
		WHERE subscriptions.block_number <= EXCLUDED.block_number
	`, pgx.NamedArgs{
		"userId":           userId,
		"subscribedUserId": subscribedUserId,
		"blockNumber":      blockNumber,
		"txHash":           txHash,
	})
	if err != nil {
		return err
	}

	return nil
}

func unsubscribeUser(ctx context.Context, sqlTx pgx.Tx, userId int, unsubscribedUserId int, blockNumber int64, txHash string) error {
	_, err := sqlTx.Exec(ctx, `
		DELETE FROM subscriptions WHERE user_id = @userId AND subscribed_user_id = @unsubscribedUserId;
	`, pgx.NamedArgs{
		"userId":             userId,
		"unsubscribedUserId": unsubscribedUserId,
	})
	if err != nil {
		return err
	}

	return nil
}
