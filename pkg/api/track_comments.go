package api

import (
	"audius/pkg/indexer"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	corev1 "github.com/OpenAudio/go-openaudio/pkg/api/core/v1"
	"github.com/ethereum/go-ethereum/common"
	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5"
)

func (s *Server) getTrackComments(c fiber.Ctx) error {
	reqLogger := getRequestLogger(c)
	var routeParams struct {
		TrackID int `uri:"id"`
	}
	if err := c.Bind().URI(&routeParams); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid route parameters"})
	}

	sql := `
		SELECT
			c.comment_id,
			c.user_id,
			c.content,
			c.track_timestamp_s,
			u.name AS user_name,
			u.profile_picture_sizes,
			JSON_AGG(JSON_BUILD_OBJECT(
				'comment_id', children.comment_id,
				'user_id', children.user_id,
				'content', children.content,
				'track_timestamp_s', children.track_timestamp_s,
				'user_name', cu.name,
				'user_profile_picture_sizes', cu.profile_picture_sizes
			)) AS children
		FROM comments c
		JOIN users u ON u.user_id = c.user_id
		LEFT JOIN comments children ON children.parent_comment_id = c.comment_id
		LEFT JOIN users cu ON cu.user_id = children.user_id
		WHERE c.track_id = @trackId
			AND c.parent_comment_id IS NULL
		GROUP BY c.comment_id, u.user_id, u.name, u.profile_picture_sizes
		ORDER BY c.track_timestamp_s NULLS FIRST, c.created_at ASC
	`

	rows, err := s.pool.Query(c.RequestCtx(), sql, pgx.NamedArgs{"trackId": routeParams.TrackID})
	if err != nil {
		reqLogger.Error("Failed to fetch comments", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch comments"})
	}

	type commentRow struct {
		CommentID           int          `json:"comment_id"`
		UserID              int          `json:"user_id"`
		Content             string       `json:"content"`
		TrackTimestampS     *int         `json:"track_timestamp_s"`
		UserName            string       `json:"user_name"`
		ProfilePictureSizes *string      `json:"-"`
		Children            []commentRow `json:"-"`
	}

	commentRows, err := pgx.CollectRows(rows, pgx.RowToStructByName[commentRow])
	if err != nil {
		return fmt.Errorf("failed to parse comments: %w", err)
	}

	type commentResp struct {
		commentRow
		ProfilePicture *ImageMirrors `json:"user_profile_picture,omitempty"`
		Thread         []commentResp `json:"thread,omitempty"`
	}

	out := make([]commentResp, 0, len(commentRows))
	for _, cr := range commentRows {
		var avatarURL *ImageMirrors
		if cr.ProfilePictureSizes != nil {
			avatarURL, err = s.getImageMirrors(c.RequestCtx(), *cr.ProfilePictureSizes)
			if err != nil {
				reqLogger.Error("Failed to get image mirrors", "error", err)
			}
		}

		var children []commentResp
		for _, child := range cr.Children {
			var childAvatarURL *ImageMirrors
			if child.ProfilePictureSizes != nil {
				childAvatarURL, err = s.getImageMirrors(c.RequestCtx(), *child.ProfilePictureSizes)
				if err != nil {
					reqLogger.Error("Failed to get image mirrors", "error", err)
				}
			}
			children = append(children, commentResp{
				commentRow:     child,
				ProfilePicture: childAvatarURL,
				Thread:         nil, // You may want to recursively process children here
			})
		}

		out = append(out, commentResp{
			commentRow:     cr,
			ProfilePicture: avatarURL,
			Thread:         children,
		})
	}

	return c.JSON(fiber.Map{"data": out})
}

func (s *Server) postTrackComment(c fiber.Ctx) error {
	reqLogger := getRequestLogger(c)
	var routeParams struct {
		TrackID int `uri:"id"`
	}
	if err := c.Bind().URI(&routeParams); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid route parameters"})
	}

	var body struct {
		Content         string `json:"content"`
		TrackTimestampS *int   `json:"track_timestamp_s"`
		ParentCommentID *int   `json:"parent_comment_id"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	userID := s.getCurrentUserID(c)

	nonce := time.Now().UnixNano()
	nonceBytes := make([]byte, 32)
	copy(nonceBytes, []byte(strconv.FormatInt(nonce, 10)))

	type Metadata struct {
		TrackID         int    `json:"entity_id"`
		ParentCommentID *int   `json:"parent_comment_id,omitempty"`
		Body            string `json:"body"`
		TrackTimestampS *int   `json:"track_timestamp_s,omitempty"`
	}
	metadata := Metadata{
		TrackID:         routeParams.TrackID,
		ParentCommentID: body.ParentCommentID,
		Body:            body.Content,
		TrackTimestampS: body.TrackTimestampS,
	}

	metadataBytes, err := json.Marshal(struct {
		Data Metadata `json:"data"`
	}{
		Data: metadata,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to marshal metadata"})
	}

	id, err := s.getUnclaimedCommentId(c)
	if err != nil {
		reqLogger.Error("Failed to get unclaimed comment ID", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to comment on track",
		})
	}

	createCommentTx := &corev1.ManageEntityLegacy{
		Signer:     common.HexToAddress(s.appKey).String(),
		UserId:     int64(userID),
		EntityId:   int64(id),
		Action:     indexer.Action_Create,
		EntityType: indexer.Entity_Comment,
		Nonce:      strconv.FormatInt(nonce, 10),
		Metadata:   string(metadataBytes), // You may want to include comment metadata here
	}

	response, err := s.sendTransaction(createCommentTx)
	if err != nil {
		reqLogger.Error("Failed to send track unsave transaction", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to comment on track",
		})
	}

	return c.JSON(fiber.Map{
		"success":          true,
		"transaction_hash": response.Msg.GetTransaction().GetHash(),
	})
}
