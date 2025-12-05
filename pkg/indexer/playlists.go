package indexer

import (
	"context"
	"fmt"

	corev1 "github.com/OpenAudio/go-openaudio/pkg/api/core/v1"
	"github.com/jackc/pgx/v5"
)

func (d *Indexer) indexPlaylist(ctx context.Context, sqlTx pgx.Tx, tx *corev1.ManageEntityLegacy, blockNumber int64) error {
	switch tx.Action {
	case Action_Create, Action_Update:
		return upsertPlaylist(ctx, sqlTx, tx, blockNumber)
	case Action_Delete:
		return deletePlaylist(ctx, sqlTx, int(tx.EntityId))
	case Action_Save:
		return savePlaylist(ctx, sqlTx, int(tx.UserId), int(tx.EntityId), blockNumber)
	case Action_Unsave:
		return unsavePlaylist(ctx, sqlTx, int(tx.UserId), int(tx.EntityId), blockNumber)
	case Action_Repost:
		return repostPlaylist(ctx, sqlTx, int(tx.UserId), int(tx.EntityId), blockNumber)
	case Action_Unrepost:
		return unrepostPlaylist(ctx, sqlTx, int(tx.UserId), int(tx.EntityId))
	case Action_Share:
		return sharePlaylist(ctx, sqlTx, int(tx.UserId), int(tx.EntityId), blockNumber)
	default:
		return fmt.Errorf("unrecognized playlist action %s", tx.Action)
	}
}

func upsertPlaylist(ctx context.Context, sqlTx pgx.Tx, tx *corev1.ManageEntityLegacy, blockNumber int64) error {
	sql := `
		INSERT INTO playlists (
			playlist_id,
			owner_id,
			title,
			description,
			is_private,
			is_album,
			cover_art_sizes,
			tracks,
			block_number,
			created_at,
			updated_at
		) VALUES (
		 	@playlistId,
			@ownerId,
			@metadata::jsonb->'data'->>'playlist_name',
			@metadata::jsonb->'data'->>'description',
			@metadata::jsonb->'data'->>'is_private' = 'true',
			@metadata::jsonb->'data'->>'is_album' = 'true',
			@metadata::jsonb->'data'->>'cover_art_sizes',
			@metadata::jsonb->'data'->'playlist_contents',
			@blockNumber,
			NOW(),
			NOW()
		)
		ON CONFLICT (playlist_id) DO UPDATE SET
			owner_id = EXCLUDED.owner_id,
			title = CASE WHEN @metadata::jsonb->'data' ? 'playlist_name' THEN EXCLUDED.title ELSE playlists.title END,
			description = CASE WHEN @metadata::jsonb->'data' ? 'description' THEN EXCLUDED.description ELSE playlists.description END,
			is_private = CASE WHEN @metadata::jsonb->'data' ? 'is_private' THEN EXCLUDED.is_private ELSE playlists.is_private END,
			is_album = CASE WHEN @metadata::jsonb->'data' ? 'is_album' THEN EXCLUDED.is_album ELSE playlists.is_album END,
			cover_art_sizes = CASE WHEN @metadata::jsonb->'data' ? 'cover_art_sizes' THEN EXCLUDED.cover_art_sizes ELSE playlists.cover_art_sizes END,
			tracks = CASE WHEN @metadata::jsonb->'data' ? 'playlist_contents' THEN EXCLUDED.tracks ELSE playlists.tracks END,
			block_number = EXCLUDED.block_number,
			updated_at = NOW()
	`
	_, err := sqlTx.Exec(ctx, sql, pgx.NamedArgs{
		"playlistId":  tx.EntityId,
		"ownerId":     tx.UserId,
		"metadata":    tx.Metadata,
		"blockNumber": blockNumber,
	})
	return err
}

func deletePlaylist(ctx context.Context, sqlTx pgx.Tx, playlistId int) error {
	sql := `
		DELETE FROM playlists WHERE playlist_id = @playlistId;
	`
	_, err := sqlTx.Exec(ctx, sql, pgx.NamedArgs{
		"playlistId": playlistId,
	})
	return err
}

func savePlaylist(ctx context.Context, sqlTx pgx.Tx, userID int, playlistID int, blockNumber int64) error {
	_, err := sqlTx.Exec(ctx, `
        WITH ins AS (
            INSERT INTO playlist_saves (user_id, playlist_id, block_number, created_at, updated_at)
            VALUES (@userID, @playlistID, @blockNumber, NOW(), NOW())
            ON CONFLICT (user_id, playlist_id) DO NOTHING
            RETURNING playlist_id
        )
        INSERT INTO playlist_aggregates (playlist_id, save_count, created_at, updated_at)
        SELECT playlist_id, 1, NOW(), NOW() FROM ins
        ON CONFLICT (playlist_id) DO UPDATE SET
            save_count = playlist_aggregates.save_count + 1,
            updated_at = NOW()
    `, pgx.NamedArgs{
		"userID":      userID,
		"playlistID":  playlistID,
		"blockNumber": blockNumber,
	})
	return err
}

func unsavePlaylist(ctx context.Context, sqlTx pgx.Tx, userID int, playlistID int, blockNumber int64) error {
	_, err := sqlTx.Exec(ctx, `
		WITH del AS (
			DELETE FROM playlist_saves 
			WHERE user_id = @userID AND playlist_id = @playlistID
			RETURNING playlist_id
		)
		UPDATE playlist_aggregates
		SET save_count = GREATEST(save_count - 1, 0), updated_at = NOW()
		WHERE playlist_id IN (SELECT playlist_id FROM del);
	`, pgx.NamedArgs{
		"userID":      userID,
		"playlistID":  playlistID,
		"blockNumber": blockNumber,
	})
	return err
}

func repostPlaylist(ctx context.Context, sqlTx pgx.Tx, userID int, playlistID int, blockNumber int64) error {
	_, err := sqlTx.Exec(ctx, `
		WITH ins AS (
			INSERT INTO playlist_reposts (user_id, playlist_id, block_number, created_at, updated_at)
			VALUES (@userID, @playlistID, @blockNumber, NOW(), NOW())	
			ON CONFLICT (user_id, playlist_id) DO NOTHING
			RETURNING playlist_id
		)
		INSERT INTO playlist_aggregates (playlist_id, repost_count, created_at, updated_at)
		SELECT playlist_id, 1, NOW(), NOW() FROM ins
		ON CONFLICT (playlist_id) DO UPDATE SET
			repost_count = playlist_aggregates.repost_count + 1,
			updated_at = NOW()
	`, pgx.NamedArgs{
		"userID":      userID,
		"playlistID":  playlistID,
		"blockNumber": blockNumber,
	})
	if err != nil {
		return err
	}

	return nil
}

func unrepostPlaylist(ctx context.Context, sqlTx pgx.Tx, userID int, playlistID int) error {
	_, err := sqlTx.Exec(ctx, `
        WITH del AS (
            DELETE FROM playlist_reposts
            WHERE user_id = @userID AND playlist_id = @playlistID
            RETURNING playlist_id
        )
        INSERT INTO playlist_aggregates (playlist_id, repost_count, created_at, updated_at)
        SELECT playlist_id, 0, NOW(), NOW() FROM del
        ON CONFLICT (playlist_id) DO UPDATE SET
            repost_count = GREATEST(playlist_aggregates.repost_count - 1, 0),
            updated_at = NOW()
    `, pgx.NamedArgs{
		"userID":     userID,
		"playlistID": playlistID,
	})
	return err
}

func sharePlaylist(ctx context.Context, sqlTx pgx.Tx, userID int, playlistID int, blockNumber int64) error {
	_, err := sqlTx.Exec(ctx, `
		WITH ins AS (
			INSERT INTO playlist_shares (user_id, playlist_id, block_number, created_at, updated_at)
			VALUES (@userID, @playlistID, @blockNumber, NOW(), NOW())
			ON CONFLICT (user_id, playlist_id) DO NOTHING
			RETURNING playlist_id
		)
		INSERT INTO playlist_aggregates (playlist_id, share_count, created_at, updated_at)
		SELECT playlist_id, 1, NOW(), NOW() FROM ins
		ON CONFLICT (playlist_id) DO UPDATE SET
			share_count = playlist_aggregates.share_count + 1,
			updated_at = NOW()
	`, pgx.NamedArgs{
		"userID":      userID,
		"playlistID":  playlistID,
		"blockNumber": blockNumber,
	})
	return err
}
