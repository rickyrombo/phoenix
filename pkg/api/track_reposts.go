package api

import (
	"strconv"
	"time"

	corev1 "github.com/OpenAudio/go-openaudio/pkg/api/core/v1"
	"github.com/ethereum/go-ethereum/common"
	"github.com/gofiber/fiber/v3"

	"phoenix/pkg/indexer"
)

// postTrackRepost handles POST /tracks/:trackId/repost
// Reposts a track to the authenticated user's profile
func (s *Server) postTrackRepost(c fiber.Ctx) error {
	reqLogger := getRequestLogger(c)

	userID := s.getCurrentUserID(c)

	trackID := fiber.Params(c, "trackId", 0)
	if trackID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Track ID is required",
		})
	}

	nonce := time.Now().UnixNano()
	nonceBytes := make([]byte, 32)
	copy(nonceBytes, []byte(strconv.FormatInt(nonce, 10)))

	manageEntityTx := &corev1.ManageEntityLegacy{
		Signer:     common.HexToAddress(s.appKey).String(),
		UserId:     int64(userID),
		EntityId:   int64(trackID),
		Action:     indexer.Action_Repost,
		EntityType: indexer.Entity_Track,
		Nonce:      strconv.FormatInt(nonce, 10),
		Metadata:   "",
	}

	response, err := s.sendTransaction(manageEntityTx)
	if err != nil {
		reqLogger.Error("Failed to send track repost transaction", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to repost track",
		})
	}

	return c.JSON(fiber.Map{
		"success":          true,
		"transaction_hash": response.Msg.GetTransaction().GetHash(),
	})
}

// deleteTrackRepost handles DELETE /tracks/:trackId/repost
// Removes a track repost from the authenticated user's profile
func (s *Server) deleteTrackRepost(c fiber.Ctx) error {
	reqLogger := getRequestLogger(c)

	userID := s.getCurrentUserID(c)

	trackID := fiber.Params(c, "trackId", 0)
	if trackID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Track ID is required",
		})
	}

	nonce := time.Now().UnixNano()
	nonceBytes := make([]byte, 32)
	copy(nonceBytes, []byte(strconv.FormatInt(nonce, 10)))

	manageEntityTx := &corev1.ManageEntityLegacy{
		Signer:     common.HexToAddress(s.appKey).String(),
		UserId:     int64(userID),
		EntityId:   int64(trackID),
		Action:     indexer.Action_Unrepost,
		EntityType: indexer.Entity_Track,
		Nonce:      strconv.FormatInt(nonce, 10),
		Metadata:   "",
	}

	response, err := s.sendTransaction(manageEntityTx)
	if err != nil {
		reqLogger.Error("Failed to send track unrepost transaction", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to unrepost track",
		})
	}

	return c.JSON(fiber.Map{
		"success":          true,
		"transaction_hash": response.Msg.GetTransaction().GetHash(),
	})
}
