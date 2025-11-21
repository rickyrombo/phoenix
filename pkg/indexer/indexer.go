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
				d.logger.Info("Indexed block", "blockNumber", blockNumber)
			}
			blockNumber++
		}
	}
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
			d.addToRetryQueue(ctx, tx, err.Error())
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

func (d *Indexer) addToRetryQueue(ctx context.Context, tx *corev1.Transaction, errMsg string) {
	txJson, err := protojson.Marshal(tx.Transaction)
	if err != nil {
		d.logger.Error("Failed to marshal transaction for retry queue", "error", err)
		return
	}
	sql := `
		INSERT INTO retry_queue (signature, transaction, error)
		VALUES ($1, $2, $3)
		ON CONFLICT (signature) DO UPDATE SET 
			transaction = EXCLUDED.transaction,
			error = EXCLUDED.error,
			updated_at = NOW()
		;
	`
	_, err = d.pool.Exec(ctx, sql, tx.Transaction.GetSignature(), string(txJson), errMsg)
	if err != nil {
		d.logger.Error("Failed to insert failed transaction into retry queue", "error", err)
	}
}
