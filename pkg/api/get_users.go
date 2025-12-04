package api

import (
	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5"
)

func (s *Server) getUsers(c fiber.Ctx) error {
	var queryParams struct {
		Ids []int `query:"id"`
	}
	if err := c.Bind().Query(&queryParams); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid query parameters",
		})
	}

	sql := `
		SELECT
			users.user_id,
			name,
			handle,
			bio,
			location,
			profile_picture_sizes,
			cover_photo_sizes,
			artist_pick_track_id,
			instagram_handle,
			twitter_handle,
			website,
			donation,
			is_verified,
			track_count,
			playlist_count,
			follower_count,
			following_count,
			repost_count,
			track_save_count
		FROM users
		JOIN user_aggregates USING (user_id)
		WHERE user_id = ANY(@ids)
		;
	`
	rows, err := s.pool.Query(c.RequestCtx(), sql, pgx.NamedArgs{
		"ids": queryParams.Ids,
	})
	if err != nil {
		return err
	}

	type userRow struct {
		UserID              int     `json:"user_id"`
		Name                string  `json:"name"`
		Handle              string  `json:"handle"`
		Bio                 *string `json:"bio,omitempty"`
		Location            *string `json:"location,omitempty"`
		ProfilePictureSizes *string `json:"-"`
		CoverPhotoSizes     *string `json:"-"`
		ArtistPickTrackID   *int    `json:"artist_pick_track_id,omitempty"`
		InstagramHandle     *string `json:"instagram_handle,omitempty"`
		TwitterHandle       *string `json:"twitter_handle,omitempty"`
		Website             *string `json:"website,omitempty"`
		Donation            *string `json:"donation,omitempty"`
		IsVerified          bool    `json:"is_verified"`
		TrackCount          int     `json:"track_count"`
		PlaylistCount       int     `json:"playlist_count"`
		FollowerCount       int     `json:"follower_count"`
		FollowingCount      int     `json:"following_count"`
		RepostCount         int     `json:"repost_count"`
		TrackSaveCount      int     `json:"track_save_count"`
	}

	userRows, err := pgx.CollectRows(rows, pgx.RowToStructByName[userRow])
	if err != nil {
		return err
	}

	type user struct {
		userRow
		ProfilePicture *ImageMirrors     `json:"profile_picture,omitempty"`
		CoverPhoto     *WideImageMirrors `json:"cover_photo,omitempty"`
	}
	users := make([]user, 0, len(userRows))
	for _, u := range userRows {
		var profilePicture *ImageMirrors
		if u.ProfilePictureSizes != nil {
			profilePicture, err = s.getImageMirrors(c.RequestCtx(), *u.ProfilePictureSizes)
			if err != nil {
				return err
			}
		}

		var coverPhoto *WideImageMirrors
		if u.CoverPhotoSizes != nil {
			coverPhoto, err = s.getWideImageMirrors(c.RequestCtx(), *u.CoverPhotoSizes)
			if err != nil {
				return err
			}
		}

		users = append(users, user{
			userRow:        u,
			ProfilePicture: profilePicture,
			CoverPhoto:     coverPhoto,
		})
	}

	return c.JSON(fiber.Map{
		"data": users,
	})
}

// fiber:context-methods migrated
