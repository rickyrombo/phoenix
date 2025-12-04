package api

import (
	"strconv"
	"time"

	corev1 "github.com/OpenAudio/go-openaudio/pkg/api/core/v1"
	"github.com/ethereum/go-ethereum/common"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/session"

	"audius/pkg/indexer"
)

// postTrackSave handles POST /tracks/:trackId/save
// Saves (favorites) a track to the authenticated user's library
func (s *Server) postTrackSave(c fiber.Ctx) error {
	sess := session.FromContext(c).Session

	authenticated := sess.Get("authenticated")
	if authenticated != true {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Authentication required",
		})
	}

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
		Action:     indexer.Action_Save,
		EntityType: indexer.Entity_Track,
		Nonce:      strconv.FormatInt(nonce, 10),
		Metadata:   "",
	}

	response, err := s.sendTransaction(manageEntityTx)
	if err != nil {
		s.logger.Error("Failed to send track save transaction", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to save track",
		})
	}

	return c.JSON(fiber.Map{
		"success":          true,
		"transaction_hash": response.Msg.GetTransaction().GetHash(),
	})
}

// deleteTrackSave handles DELETE /tracks/:trackId/save
// Removes a track from the authenticated user's library
func (s *Server) deleteTrackSave(c fiber.Ctx) error {
	sess := session.FromContext(c).Session

	authenticated := sess.Get("authenticated")
	if authenticated != true {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Authentication required",
		})
	}

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
		Action:     indexer.Action_Unsave,
		EntityType: indexer.Entity_Track,
		Nonce:      strconv.FormatInt(nonce, 10),
		Metadata:   "",
	}

	response, err := s.sendTransaction(manageEntityTx)
	if err != nil {
		s.logger.Error("Failed to send track unsave transaction", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to unsave track",
		})
	}

	return c.JSON(fiber.Map{
		"success":          true,
		"transaction_hash": response.Msg.GetTransaction().GetHash(),
	})
}
