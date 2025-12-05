package api

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"connectrpc.com/connect"
	corev1 "github.com/OpenAudio/go-openaudio/pkg/api/core/v1"
	coreconfig "github.com/OpenAudio/go-openaudio/pkg/core/config"
	coreserver "github.com/OpenAudio/go-openaudio/pkg/core/server"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func (s *Server) sendTransaction(manageEntityTx *corev1.ManageEntityLegacy) (*connect.Response[corev1.SendTransactionResponse], error) {
	coreConfig := coreconfig.Config{
		AcdcEntityManagerAddress: "0x1Cd8a543596D499B9b6E7a6eC15ECd2B7857Fd64",
		AcdcChainID:              31524,
	}

	err := coreserver.SignManageEntity(&coreConfig, manageEntityTx, s.appSecret)
	if err != nil {
		return nil, fmt.Errorf("failed to sign transaction: %w", err)
	}

	sendReq := &corev1.SendTransactionRequest{
		Transaction: &corev1.SignedTransaction{
			Transaction: &corev1.SignedTransaction_ManageEntity{
				ManageEntity: manageEntityTx,
			},
		},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	response, err := s.sdk.Core.SendTransaction(ctx, connect.NewRequest(sendReq))
	if err != nil {
		return nil, fmt.Errorf("failed to send transaction: %w", err)
	}

	err = s.pollForTransactionHash(ctx, response.Msg.Transaction.Hash)
	if err != nil {
		return nil, fmt.Errorf("failed to poll for transaction hash: %w", err)
	}

	return response, nil
}

func (s *Server) pollForTransactionHash(ctx context.Context, txHash string) error {
	start := time.Now()
	defer func() {
		slog.Debug("Polled for transaction hash", "txHash", txHash, "duration", time.Since(start).String())
	}()
	ticker := time.NewTicker(250 * time.Millisecond)
	defer ticker.Stop()

	subCtx, cancel := context.WithTimeout(ctx, time.Second*5)
	defer cancel()

	exists, err := checkTxExists(subCtx, s.pool, txHash)
	if err != nil {
		return fmt.Errorf("failed to check transaction existence: %w", err)
	}
	if exists {
		return nil
	}

	for {
		select {
		case <-subCtx.Done():
			return fmt.Errorf("context cancelled while polling for transaction hash: %w", ctx.Err())
		case <-ticker.C:
			exists, err := checkTxExists(subCtx, s.pool, txHash)
			if err != nil {
				return fmt.Errorf("failed to check transaction existence: %w", err)
			}
			if exists {
				return nil
			}
		}
	}
}

func checkTxExists(ctx context.Context, pool *pgxpool.Pool, txHash string) (bool, error) {
	sql := `SELECT EXISTS (
		SELECT 1 FROM manage_entity_txs WHERE tx_hash = $1
	);`
	row := pool.QueryRow(ctx, sql, txHash)
	var exists bool
	err := row.Scan(&exists)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, err
	}
	return exists, nil
}
