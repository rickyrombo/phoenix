package indexer

import (
	"audius/pkg/db"
	"context"
	"fmt"
	"log/slog"
	"time"

	"connectrpc.com/connect"
	corev1 "github.com/OpenAudio/go-openaudio/pkg/api/core/v1"
	"github.com/OpenAudio/go-openaudio/pkg/sdk"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
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
	sql := `
		SELECT MAX(number) FROM ` + db.Table_Blocks + ` LIMIT 1;
	`
	var dbBlockNumber *int64
	var blockNumber int64
	err := d.pool.QueryRow(ctx, sql).Scan(&dbBlockNumber)
	if err != nil && err != pgx.ErrNoRows {
		return fmt.Errorf("failed to query indexer state: %w", err)
	}

	if dbBlockNumber == nil {
		d.logger.Warn("No blocks found in database, fetching current block height from node...")
		nodeInfo, err := d.sdk.Core.GetNodeInfo(context.Background(), connect.NewRequest(&corev1.GetNodeInfoRequest{}))
		if err != nil {
			return fmt.Errorf("failed to get node info: %w", err)
		}
		blockNumber = nodeInfo.Msg.CurrentHeight
		d.logger.Info("Starting from current block height", "blockHeight", blockNumber)
	} else {
		d.logger.Info("Resuming from last indexed block", "blockHeight", blockNumber)
		blockNumber = *dbBlockNumber + 1
	}

	for {
		select {
		case <-ctx.Done():
			d.logger.Info("Indexer shutting down...")
			return ctx.Err()
		default:
			blockNumber = d.indexBlock(ctx, blockNumber)
		}
	}
}

func (d *Indexer) indexBlock(ctx context.Context, blockNumber int64) (nextBlockNumber int64) {
	d.logger.Info("Indexing block...", "blockNumber", blockNumber)

	block, err := d.sdk.Core.GetBlock(context.Background(), connect.NewRequest(&corev1.GetBlockRequest{
		Height: blockNumber,
	}))
	if err != nil {
		d.logger.Error("Failed to fetch block", "blockNumber", blockNumber, "error", err)
		return blockNumber
	}

	if block.Msg.Block.Height < 0 {
		d.logger.Info("No block found, sleeping...", "blockNumber", blockNumber)
		time.Sleep(1 * time.Second)
		return blockNumber
	}

	dbTx, err := d.pool.Begin(ctx)
	if err != nil {
		d.logger.Error("Failed to begin database transaction", "error", err)
		return blockNumber
	}
	defer dbTx.Rollback(ctx)

	for _, tx := range block.Msg.Block.Transactions {
		// Process each transaction here
		_ = tx // Placeholder to avoid unused variable error
	}

	sql := `
		INSERT INTO ` + db.Table_Blocks + ` (number, hash) VALUES ($1, $2)
		ON CONFLICT DO NOTHING;
	`
	_, err = dbTx.Exec(ctx, sql, block.Msg.Block.Height, block.Msg.Block.Hash)
	if err != nil {
		d.logger.Error("Failed to insert block into database", "blockNumber", blockNumber, "error", err)
		return blockNumber
	}

	err = dbTx.Commit(ctx)
	if err != nil {
		d.logger.Error("Failed to commit database transaction", "error", err)
		return blockNumber
	}

	d.logger.Info("Successfully indexed block", "blockNumber", blockNumber, "blockHash", block.Msg.Block.Hash)
	return blockNumber + 1
}

func (d *Indexer) Close() {
	d.pool.Close()
}
