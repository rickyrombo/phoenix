package indexer

import (
	"context"
	"fmt"

	corev1 "github.com/OpenAudio/go-openaudio/pkg/api/core/v1"
	"github.com/jackc/pgx/v5"
)

func (d *Indexer) indexWallet(ctx context.Context, sqlTx pgx.Tx, tx *corev1.ManageEntityLegacy, blockNumber int64) error {
	switch tx.Action {
	case Action_Create:
		return addUserWallet(ctx, sqlTx, tx, blockNumber)
	case Action_Delete:
		return removeUserWallet(ctx, sqlTx, tx)
	default:
		return fmt.Errorf("unrecognized wallet action %s", tx.Action)
	}
}

func addUserWallet(ctx context.Context, sqlTx pgx.Tx, tx *corev1.ManageEntityLegacy, blockNumber int64) error {
	sql := `
		INSERT INTO user_wallets (
			user_id,
			wallet,
			curve,
			block_number,
			created_at,
			updated_at
		) VALUES (
			@userId,
			@metadata:jsonb->'data'->>'wallet_address',
			CASE WHEN @metadata:jsonb->'data'->>'chain' = 'sol' THEN 'ed25519' ELSE 'secp256k1' END,
			@blockNumber,
			NOW(),
			NOW()
		) ON CONFLICT (wallet) DO UPDATE SET
			user_id = EXCLUDED.user_id,
			block_number = EXCLUDED.block_number,
			updated_at = NOW()
		WHERE user_wallets.block_number <= EXCLUDED.block_number
	`
	_, err := sqlTx.Exec(ctx, sql, pgx.NamedArgs{
		"userId":      tx.UserId,
		"metadata":    tx.Metadata,
		"blockNumber": blockNumber,
	})
	if err != nil {
		return fmt.Errorf("failed to insert user_wallet: %w", err)
	}
	return nil
}

func removeUserWallet(ctx context.Context, sqlTx pgx.Tx, tx *corev1.ManageEntityLegacy) error {
	sql := `
		DELETE FROM user_wallets
		WHERE wallet = @wallet AND user_id = @userId
	`
	_, err := sqlTx.Exec(ctx, sql, pgx.NamedArgs{
		"wallet": tx.Metadata,
		"userId": tx.UserId,
	})
	if err != nil {
		return fmt.Errorf("failed to delete user_wallet: %w", err)
	}
	return nil
}
