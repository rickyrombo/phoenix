package indexer

import (
	"context"
	"fmt"

	corev1 "github.com/OpenAudio/go-openaudio/pkg/api/core/v1"
	"github.com/jackc/pgx/v5"
)

func (d *Indexer) indexGrant(ctx context.Context, sqlTx pgx.Tx, tx *corev1.ManageEntityLegacy, blockNumber int64) error {
	switch tx.Action {
	case Action_Create:
		return createGrant(ctx, sqlTx, tx, blockNumber)
	case Action_Delete, Action_Reject:
		return deleteGrant(ctx, sqlTx, tx)
	case Action_Approve:
		return approveGrant(ctx, sqlTx, tx, blockNumber)
	default:
		return fmt.Errorf("unrecognized grant action %s", tx.Action)
	}
}

func createGrant(ctx context.Context, sqlTx pgx.Tx, tx *corev1.ManageEntityLegacy, blockNumber int64) error {
	sql := `
		INSERT INTO grants (
			user_id,
			address,
			block_number,
			created_at,
			updated_at
		) VALUES (
			@userId,
			@metadata::jsonb->>'grantee_address',
			@blockNumber,
			NOW(),
			NOW()
		) ON CONFLICT (user_id, address) DO UPDATE SET
			block_number = EXCLUDED.block_number,
			updated_at = NOW()
		WHERE grants.block_number <= EXCLUDED.block_number
	`
	_, err := sqlTx.Exec(ctx, sql, pgx.NamedArgs{
		"userId":      tx.UserId,
		"metadata":    tx.Metadata,
		"blockNumber": blockNumber,
	})
	return err
}

func deleteGrant(ctx context.Context, sqlTx pgx.Tx, tx *corev1.ManageEntityLegacy) error {
	sql := `
		DELETE FROM grants
		WHERE user_id = @userId AND address = @metadata::jsonb->>'grantee_address'
	`
	_, err := sqlTx.Exec(ctx, sql, pgx.NamedArgs{
		"userId":   tx.UserId,
		"metadata": tx.Metadata,
	})
	return err
}

func approveGrant(ctx context.Context, sqlTx pgx.Tx, tx *corev1.ManageEntityLegacy, blockNumber int64) error {
	sql := `
		UPDATE grants SET
			approved = TRUE,
			block_number = @blockNumber,
			updated_at = NOW()
		WHERE user_id = @userId AND address = @metadata::jsonb->>'grantee_address'
	`
	_, err := sqlTx.Exec(ctx, sql, pgx.NamedArgs{
		"userId":      tx.UserId,
		"metadata":    tx.Metadata,
		"blockNumber": blockNumber,
	})
	return err
}
