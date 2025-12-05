package indexer

import (
	"context"
	"encoding/json"
	"fmt"

	corev1 "github.com/OpenAudio/go-openaudio/pkg/api/core/v1"
	"github.com/jackc/pgx/v5"
)

func (d *Indexer) indexComment(ctx context.Context, sqlTx pgx.Tx, tx *corev1.ManageEntityLegacy, blockNumber int64) error {
	switch tx.Action {
	case Action_Create, Action_Update:
		return upsertComment(ctx, sqlTx, tx, blockNumber)
	case Action_Delete:
		return deleteComment(ctx, sqlTx, tx)
	case Action_React:
		return reactComment(ctx, sqlTx, tx, blockNumber)
	case Action_Unreact:
		return unreactComment(ctx, sqlTx, tx)
	case Action_Pin:
		return pinComment(ctx, sqlTx, tx, blockNumber)
	case Action_Unpin:
		return unpinComment(ctx, sqlTx, tx)
	default:
		return fmt.Errorf("unrecognized comment action %s", tx.Action)
	}
}

func upsertComment(ctx context.Context, sqlTx pgx.Tx, tx *corev1.ManageEntityLegacy, blockNumber int64) error {
	var metadataObj map[string]any
	if err := json.Unmarshal([]byte(tx.Metadata), &metadataObj); err != nil {
		return fmt.Errorf("invalid JSON metadata: %w", err)
	}

	sql := `
		WITH ins AS (
			INSERT INTO comments (
				comment_id,
				user_id,
				track_id,
				parent_comment_id,
				content,
				track_timestamp_s,
					block_number,
				created_at,
				updated_at
			)
			VALUES (
				@comment_id,
				@user_id,
				(@metadata::jsonb->'data'->>'entity_id')::int,
				(@metadata::jsonb->'data'->>'parent_comment_id')::int,
				@metadata::jsonb->'data'->>'body',
				(@metadata::jsonb->'data'->>'track_timestamp_s')::int,
				@block_number,
				NOW(),
				NOW()
			)
			ON CONFLICT (comment_id) DO NOTHING
			RETURNING track_id
		)
		INSERT INTO track_aggregates (
			track_id,
			comment_count,
			created_at,
			updated_at
		) 
		SELECT track_id, 1, NOW(), NOW() FROM ins
		ON CONFLICT (track_id) DO UPDATE SET
			comment_count = track_aggregates.comment_count + 1,
			updated_at = NOW()
		;
	`
	_, err := sqlTx.Exec(ctx, sql,
		pgx.NamedArgs{
			"comment_id":   tx.EntityId,
			"user_id":      tx.UserId,
			"metadata":     tx.Metadata,
			"block_number": blockNumber,
		},
	)
	if err != nil {
		return err
	}

	// Add all the mentions
	if data, ok := metadataObj["data"].(map[string]interface{}); ok {
		if mentions, ok := data["mentions"].([]interface{}); ok {
			// Remove any mentions that were removed in this update
			_, err = sqlTx.Exec(ctx, `
				DELETE FROM comment_mentions
				WHERE comment_id = @comment_id
				AND mentioned_user_id != ANY(@mentioned_user_ids)
			`, pgx.NamedArgs{
				"comment_id":         tx.EntityId,
				"mentioned_user_ids": mentions,
			})

			// Add all new mentions
			for i, m := range mentions {
				if i > 10 {
					break // Limit to first 10 mentions
				}

				mentionedUserId, ok := m.(int)
				if !ok {
					continue
				}
				_, err := sqlTx.Exec(ctx, `
					INSERT INTO comment_mentions (
						comment_id,
						mentioned_user_id,
						block_number,
						created_at
					) VALUES (
						@comment_id, 
						@mentioned_user_id, 
						@block_number, 
						NOW()
					)
					ON CONFLICT DO NOTHING
				`, pgx.NamedArgs{
					"comment_id":        tx.EntityId,
					"mentioned_user_id": mentionedUserId,
					"block_number":      blockNumber,
				})
				if err != nil {
					return err
				}
			}
		}
	}

	return err
}

func deleteComment(ctx context.Context, sqlTx pgx.Tx, tx *corev1.ManageEntityLegacy) error {
	sql := `
		DELETE FROM comments WHERE comment_id = @comment_id;
	`
	_, err := sqlTx.Exec(ctx, sql, pgx.NamedArgs{
		"comment_id": tx.EntityId,
	})
	return err
}

func reactComment(ctx context.Context, sqlTx pgx.Tx, tx *corev1.ManageEntityLegacy, blockNumber int64) error {
	sql := `
		INSERT INTO comment_reactions (
			comment_id,
			user_id,
			reaction,
			block_number,
			created_at,
			updated_at
		)
		VALUES (	
			@comment_id,
			@user_id,
			@reaction,
			@block_number,
			NOW(),
			NOW()
		) ON CONFLICT (comment_id, user_id) DO UPDATE SET
			reaction = EXCLUDED.reaction,
			block_number = EXCLUDED.block_number,
			updated_at = NOW()
	;`

	_, err := sqlTx.Exec(ctx, sql,
		pgx.NamedArgs{
			"comment_id":   tx.EntityId,
			"user_id":      tx.UserId,
			"reaction":     1, // Assuming '1' represents a 'like' reaction
			"block_number": blockNumber,
		},
	)
	return err
}

func unreactComment(ctx context.Context, sqlTx pgx.Tx, tx *corev1.ManageEntityLegacy) error {
	sql := `
		DELETE FROM comment_reactions 
		WHERE comment_id = @comment_id AND user_id = @user_id;
	`
	_, err := sqlTx.Exec(ctx, sql, pgx.NamedArgs{
		"comment_id": tx.EntityId,
		"user_id":    tx.UserId,
	})
	return err
}

func pinComment(ctx context.Context, sqlTx pgx.Tx, tx *corev1.ManageEntityLegacy, blockNumber int64) error {
	sql := `
		INSERT INTO comment_pins (
			track_id,
			comment_id,
			block_number,
			created_at,
			updated_at
		) VALUES (
			(@metadata::jsonb->'data'->>'entity_id')::int,
			@comment_id,
			@block_number,
			NOW(),
			NOW()
		)
		ON CONFLICT (track_id) DO UPDATE SET
			comment_id = EXCLUDED.comment_id,
			block_number = EXCLUDED.block_number,
			updated_at = NOW()
	;`
	_, err := sqlTx.Exec(ctx, sql,
		pgx.NamedArgs{
			"metadata":     tx.Metadata,
			"comment_id":   tx.EntityId,
			"block_number": blockNumber,
		},
	)
	return err
}

func unpinComment(ctx context.Context, sqlTx pgx.Tx, tx *corev1.ManageEntityLegacy) error {
	sql := `
		DELETE FROM comment_pins 
		WHERE track_id = (@metadata::jsonb->'data'->>'entity_id')::int;
	`
	_, err := sqlTx.Exec(ctx, sql,
		pgx.NamedArgs{
			"metadata": tx.Metadata,
		},
	)
	return err
}
