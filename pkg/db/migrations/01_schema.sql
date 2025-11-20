CREATE TABLE IF NOT EXISTS blocks (
    number BIGINT PRIMARY KEY,
    hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_blocks_hash ON blocks(hash);

CREATE TABLE IF NOT EXISTS tracks (
    id INT PRIMARY KEY,
    block_number BIGINT NOT NULL,
    
    -- Core metadata
    title TEXT NOT NULL,
    description TEXT,
    duration INTEGER,
    genre TEXT,
    mood TEXT,
    tags TEXT[],
    bpm NUMERIC(6,2),
    musical_key TEXT,
    isrc TEXT,
    iswc TEXT,
    license TEXT,
    
    -- Owner and dates
    owner_id INTEGER NOT NULL,
    release_date TIMESTAMP WITH TIME ZONE,
    
    -- CIDs and file info
    track_cid TEXT,
    preview_cid TEXT,
    orig_file_cid TEXT,
    orig_filename TEXT,
    cover_art_sizes TEXT,
    audio_upload_id TEXT,
    
    -- Flags
    is_unlisted BOOLEAN DEFAULT false,
    is_downloadable BOOLEAN DEFAULT false,
    is_stream_gated BOOLEAN DEFAULT false,
    is_download_gated BOOLEAN DEFAULT false,
    is_scheduled_release BOOLEAN DEFAULT false,
    is_original_available BOOLEAN DEFAULT false,
    is_custom_bpm BOOLEAN DEFAULT false,
    is_custom_musical_key BOOLEAN DEFAULT false,
    comments_disabled BOOLEAN DEFAULT false,
    
    -- DDEX
    ddex_app TEXT,
    ddex_release_ids JSONB,
    
    -- Gating conditions (keep as JSONB for flexibility)
    stream_conditions JSONB,
    download_conditions JSONB,

    -- Parent track fields
    remix_of JSONB,
    stem_of JSONB,
    
    -- Field visibility (keep as JSONB)
    field_visibility JSONB,
    
    -- Other
    parental_warning_type TEXT,
    preview_start_seconds INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tracks_owner_id ON tracks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre);
CREATE INDEX IF NOT EXISTS idx_tracks_release_date ON tracks(release_date);
CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_tracks_tags ON tracks USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_tracks_is_unlisted ON tracks(is_unlisted) WHERE is_unlisted = false;

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY,
    block_number BIGINT NOT NULL,
    
    -- Core metadata
    name TEXT NOT NULL,
    handle TEXT NOT NULL UNIQUE,
    wallet TEXT NOT NULL UNIQUE,
    bio TEXT,
    location TEXT,
    profile_picture_sizes TEXT,
    cover_photo_sizes TEXT,
    artist_pick_track_id INT,

    -- Social links
    instagram_handle TEXT,
    tiktok_handle TEXT,
    twitter_handle TEXT,
    website TEXT,
    donation TEXT,
    
    -- Flags
    is_deactivated BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,

    -- Events
    events JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_handle ON users(handle);
CREATE INDEX IF NOT EXISTS idx_users_is_deactivated ON users(is_deactivated) WHERE is_deactivated = false;
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified) WHERE is_verified = true;

CREATE TABLE IF NOT EXISTS playlist_libraries (
    user_id INT PRIMARY KEY,
    block_number BIGINT NOT NULL,
    library JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE playlist_libraries IS 'Stores the personal playlist library for each user as a JSONB object.';

CREATE TABLE IF NOT EXISTS retry_queue (
    signature TEXT PRIMARY KEY,
    transaction JSONB NOT NULL,
    error TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS waveforms (
    cid TEXT PRIMARY KEY,
    track_id INT,
    peaks REAL[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);