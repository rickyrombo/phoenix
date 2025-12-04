package api

import (
	"context"
	"fmt"
	"time"

	"connectrpc.com/connect"
	corev1 "github.com/OpenAudio/go-openaudio/pkg/api/core/v1"
	coreconfig "github.com/OpenAudio/go-openaudio/pkg/core/config"
	coreserver "github.com/OpenAudio/go-openaudio/pkg/core/server"
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

	return response, nil
}
