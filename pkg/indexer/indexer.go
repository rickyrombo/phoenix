package indexer

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"connectrpc.com/connect"
	corev1 "github.com/OpenAudio/go-openaudio/pkg/api/core/v1"
	"github.com/OpenAudio/go-openaudio/pkg/sdk"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/protobuf/encoding/protojson"
)

// Config holds indexer configuration
type Config struct {
	DatabaseURL string
	AudiusURL   string
	Logger      *slog.Logger
}

// Indexer handles track indexing from Audius
type Indexer struct {
	sdk    *sdk.OpenAudioSDK
	pool   *pgxpool.Pool
	logger *slog.Logger
}

type BlockNotFound struct{}

func (e *BlockNotFound) Error() string {
	return "block not found"
}

// New creates a new indexer instance
func New(cfg *Config) (*Indexer, error) {
	connConfig, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database URL: %w", err)
	}

	pool, err := pgxpool.NewWithConfig(context.Background(), connConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	openAudioSdk := sdk.NewOpenAudioSDK(cfg.AudiusURL)

	if cfg.Logger == nil {
		return nil, fmt.Errorf("logger cannot be nil")
	}

	return &Indexer{
		sdk:    openAudioSdk,
		pool:   pool,
		logger: cfg.Logger.With("component", "Indexer"),
	}, nil
}

func (d *Indexer) Run(ctx context.Context) error {
	d.logger.Info("Starting indexer...")

	// err := d.Retry(ctx)
	// if err != nil {
	// 	return fmt.Errorf("failed to process retry queue: %w", err)
	// }

	var blockNumber int64

	var dbBlockNumber *int64
	err := d.pool.QueryRow(ctx, `
		SELECT MAX(number) FROM blocks LIMIT 1;
	`).Scan(&dbBlockNumber)
	if err != nil && err != pgx.ErrNoRows {
		return fmt.Errorf("failed to query indexer state: %w", err)
	}

	if dbBlockNumber == nil {
		d.logger.Info("No previous indexed blocks found, starting from block 1")
		blockNumber = 1
		// d.logger.Warn("No blocks found in database, fetching current block height from node...")
		// nodeInfo, err := d.sdk.Core.GetNodeInfo(context.Background(), connect.NewRequest(&corev1.GetNodeInfoRequest{}))
		// if err != nil {
		// 	return fmt.Errorf("failed to get node info: %w", err)
		// }
		// blockNumber = nodeInfo.Msg.CurrentHeight
		// d.logger.Info("Starting from current block height", "blockHeight", blockNumber)
	} else {
		blockNumber = *dbBlockNumber + 1
		d.logger.Info("Resuming from last indexed block", "blockHeight", blockNumber)
	}

	start := time.Now()
	startBlock := blockNumber
	for {
		select {
		case <-ctx.Done():
			d.logger.Info("Indexer shutting down...")
			return ctx.Err()
		default:
			err := d.indexBlock(ctx, blockNumber)
			if err != nil {
				if _, ok := err.(*BlockNotFound); ok {
					time.Sleep(1 * time.Second)
					continue
				}
				d.logger.Error("Failed to index block", "blockNumber", blockNumber, "error", err)
				time.Sleep(1 * time.Second)
				continue
			}
			if blockNumber%1000 == 0 {
				blockCount := blockNumber - startBlock
				d.logger.Info("Indexed blocks",
					"count", blockCount,
					"start", startBlock,
					"end", blockNumber,
					"duration", (time.Since(start)).String(),
					"avg_duration", (time.Since(start) / time.Duration(blockCount)).String(),
				)
				start = time.Now()
				startBlock = blockNumber
			}
			blockNumber++
		}
	}
}

func (d *Indexer) Retry(ctx context.Context) error {
	d.logger.Info("Starting retry processor...")
	errorCount := 0
	successCount := 0
	for {
		select {
		case <-ctx.Done():
			d.logger.Info("Retry processor shutting down...")
			return ctx.Err()
		default:
		}

		sql := `
			SELECT signature, transaction, block_number
			FROM retry_queue
			ORDER BY created_at ASC
			LIMIT 100 OFFSET @offset;
		`
		type RetryItem struct {
			Signature   string
			Transaction string
			BlockNumber int64
		}

		rows, err := d.pool.Query(ctx, sql, pgx.NamedArgs{
			"offset": errorCount,
		})
		if err != nil {
			return fmt.Errorf("failed to query retry queue: %w", err)
		}

		items, err := pgx.CollectRows(rows, pgx.RowToStructByName[RetryItem])
		if err != nil {
			return fmt.Errorf("failed to collect retry queue rows: %w", err)
		}

		if len(items) == 0 {
			break
		}

		for i := range items {
			var tx corev1.Transaction
			err := protojson.Unmarshal([]byte(items[i].Transaction), &tx)
			if err != nil {
				d.logger.Error("Failed to unmarshal transaction from retry queue", "signature", items[i].Signature, "error", err)
				errorCount++
				continue
			}

			err = d.indexTransaction(ctx, &tx, items[i].BlockNumber)
			if err != nil {
				d.logger.Error("Failed to re-index transaction from retry queue", "signature", items[i].Signature, "error", err)
				errorCount++
				continue
			}

			_, err = d.pool.Exec(ctx, `
				DELETE FROM retry_queue WHERE signature = @signature;
			`, pgx.NamedArgs{
				"signature": items[i].Signature,
			})
			if err != nil {
				d.logger.Error("Failed to delete transaction from retry queue", "signature", items[i].Signature, "error", err)
				errorCount++
				continue
			}
			successCount++
		}
	}
	d.logger.Info("Retry processor finished", "successCount", successCount, "errorCount", errorCount)
	return nil
}

func (d *Indexer) indexBlock(ctx context.Context, blockNumber int64) error {
	block, err := d.sdk.Core.GetBlock(context.Background(), connect.NewRequest(&corev1.GetBlockRequest{
		Height: blockNumber,
	}))
	if err != nil {
		d.logger.Error("Failed to fetch block", "blockNumber", blockNumber, "error", err)
		return err
	}

	if block.Msg.Block.Height < 0 {
		return &BlockNotFound{}
	}

	for _, tx := range block.Msg.Block.Transactions {
		err = d.indexTransaction(ctx, tx, block.Msg.Block.Height)
		if err != nil {
			d.logger.Error("Failed to index transaction", "error", err, "blockNumber", block.Msg.Block.Height, "txHash", tx.Hash)
			d.addToRetryQueue(ctx, tx, err.Error(), block.Msg.Block.Height)
			continue
		}
	}

	sql := `
		INSERT INTO blocks (number, hash, block_time) 
		VALUES (@number, @hash, @block_time)
		ON CONFLICT DO NOTHING;
	`
	_, err = d.pool.Exec(ctx, sql, pgx.NamedArgs{
		"number":     block.Msg.Block.Height,
		"hash":       block.Msg.Block.Hash,
		"block_time": block.Msg.Block.Timestamp.AsTime(),
	})
	if err != nil {
		return fmt.Errorf("failed to insert block into database: %w", err)
	}

	return nil
}

func (d *Indexer) Close() {
	d.pool.Close()
}

func (d *Indexer) indexTransaction(ctx context.Context, tx *corev1.Transaction, blockNumber int64) error {
	dbTx, err := d.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin database transaction: %w", err)
	}
	defer dbTx.Rollback(ctx)

	switch tx.Transaction.Transaction.(type) {
	case *corev1.SignedTransaction_ManageEntity:
		err := d.indexManageEntityTransaction(ctx, dbTx, tx, blockNumber)
		if err != nil {
			return fmt.Errorf("failed to index ManageEntity tx: %w", err)
		}
	case *corev1.SignedTransaction_Plays:
		err := d.indexPlaysTransaction(ctx, dbTx, tx, blockNumber)
		if err != nil {
			return fmt.Errorf("failed to index Plays tx: %w", err)
		}
	}

	err = dbTx.Commit(ctx)
	if err != nil {
		return fmt.Errorf("failed to commit database transaction: %w", err)
	}

	return nil
}

func (d *Indexer) indexManageEntityTransaction(ctx context.Context, sqlTx pgx.Tx, tx *corev1.Transaction, blockNumber int64) error {
	entity := tx.Transaction.GetManageEntity()

	var err error
	switch entity.EntityType {
	case Entity_Track:
		err = d.indexTrack(ctx, sqlTx, entity, blockNumber)
	case Entity_User:
		err = d.indexUser(ctx, sqlTx, entity, blockNumber)
	case Entity_Comment:
		err = d.indexComment(ctx, sqlTx, entity, blockNumber)
	case Entity_Playlist:
		err = d.indexPlaylist(ctx, sqlTx, entity, blockNumber)
	case Entity_AssociatedWallet:
		err = d.indexWallet(ctx, sqlTx, entity, blockNumber)
	case Entity_Grant:
		err = d.indexGrant(ctx, sqlTx, entity, blockNumber)
	case Entity_Notification:
		// do nothing for notifications for now
	default:
		err = fmt.Errorf("unknown entity type: %s", entity.EntityType)
	}
	if err != nil {
		d.logger.Error("Failed to index entity",
			"error", err,
			"entityType", entity.EntityType,
			"action", entity.Action,
			"userId", entity.UserId,
			"entityId", entity.EntityId,
			"metadata", entity.Metadata,
			"signer", entity.Signer,
			"signature", entity.Signature,
		)
		return fmt.Errorf("failed to index entity: %w", err)
	}

	sql := `
		INSERT INTO manage_entity_txs (
			tx_hash,
			user_id,
			entity_type, 
			entity_id,
			action,
			block_number,
			metadata,
			signer,
			signature,
			created_at,
			updated_at
		)
		VALUES (
			@txHash,
			@userId,
			@entityType,
			@entityId,
			@action,
			@blockNumber,
			@metadata::jsonb,
			@signer,
			@signature,
			NOW(),
			NOW()
		)
		ON CONFLICT (tx_hash) DO NOTHING
	;
	`
	var metadata *string
	if entity.Metadata != "" {
		metadata = &entity.Metadata
	}
	_, err = sqlTx.Exec(ctx, sql, pgx.NamedArgs{
		"txHash":      tx.Hash,
		"userId":      entity.UserId,
		"entityId":    entity.EntityId,
		"entityType":  entity.EntityType,
		"action":      entity.Action,
		"metadata":    metadata,
		"signer":      entity.Signer,
		"signature":   entity.Signature,
		"blockNumber": blockNumber,
	})
	if err != nil {
		return fmt.Errorf("failed to insert manage_entity_tx: %w", err)
	}

	return nil
}

func (d *Indexer) indexPlaysTransaction(ctx context.Context, sqlTx pgx.Tx, tx *corev1.Transaction, blockNumber int64) error {
	play := tx.Transaction.GetPlays()

	for _, trackPlay := range play.Plays {
		err := d.indexTrackPlay(ctx, sqlTx, trackPlay, blockNumber)
		if err != nil {
			d.addToRetryQueue(ctx, tx, err.Error(), blockNumber)
			return fmt.Errorf("failed to index play: %w", err)
		}
	}

	return nil
}

func (d *Indexer) addToRetryQueue(ctx context.Context, tx *corev1.Transaction, errMsg string, blockNumber int64) {
	txJson, err := protojson.Marshal(tx)
	if err != nil {
		d.logger.Error("Failed to marshal transaction for retry queue", "error", err)
		return
	}

	sql := `
		INSERT INTO retry_queue (signature, transaction, error, block_number)
		VALUES (@signature, @transaction, @error, @block_number)
		ON CONFLICT (signature) DO UPDATE SET 
			transaction = EXCLUDED.transaction,
			error = EXCLUDED.error,
			block_number = EXCLUDED.block_number,
			updated_at = NOW()
		;
	`

	_, err = d.pool.Exec(ctx, sql, pgx.NamedArgs{
		"signature":    tx.Transaction.GetSignature(),
		"transaction":  string(txJson),
		"error":        errMsg,
		"block_number": blockNumber,
	})
	if err != nil {
		d.logger.Error("Failed to insert failed transaction into retry queue", "error", err)
	}
}
