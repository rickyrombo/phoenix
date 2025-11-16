package models

import (
	"time"
)

// Track represents an Audius track from the discovery provider
type Track struct {
	ID             string    `json:"id"`
	Title          string    `json:"title"`
	ArtistName     string    `json:"artist_name"`
	ArtistID       string    `json:"artist_id"`
	Duration       int       `json:"duration"`
	Genre          string    `json:"genre"`
	Mood           string    `json:"mood"`
	ReleaseDate    time.Time `json:"release_date"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	PlayCount      int       `json:"play_count"`
	FavoriteCount  int       `json:"favorite_count"`
	RepostCount    int       `json:"repost_count"`
	Permalink      string    `json:"permalink"`
	ArtworkURL     string    `json:"artwork_url"`
	Description    string    `json:"description"`
	Tags           []string  `json:"tags"`
	IsStreamable   bool      `json:"is_streamable"`
	IsDownloadable bool      `json:"is_downloadable"`
	IndexedAt      time.Time `json:"indexed_at"`
	LastUpdated    time.Time `json:"last_updated"`
}

// Artist represents an Audius artist
type Artist struct {
	ID                string    `json:"id"`
	Name              string    `json:"name"`
	Handle            string    `json:"handle"`
	FollowerCount     int       `json:"follower_count"`
	TrackCount        int       `json:"track_count"`
	ProfilePictureURL string    `json:"profile_picture_url"`
	Bio               string    `json:"bio"`
	IndexedAt         time.Time `json:"indexed_at"`
	LastUpdated       time.Time `json:"last_updated"`
}

// Stats represents indexer statistics
type Stats struct {
	TotalTracks        int       `json:"total_tracks"`
	TotalArtists       int       `json:"total_artists"`
	LastIndexedTime    time.Time `json:"last_indexed_time"`
	TotalTracksIndexed int       `json:"total_tracks_indexed"`
}

// IndexerState represents the state of the indexing process
type IndexerState struct {
	ID                  int       `json:"id"`
	LastIndexedTrackID  string    `json:"last_indexed_track_id"`
	LastIndexedTime     time.Time `json:"last_indexed_time"`
	TotalTracksIndexed  int       `json:"total_tracks_indexed"`
	UpdatedAt           time.Time `json:"updated_at"`
}
