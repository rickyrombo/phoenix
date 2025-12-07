-- =========================
--        BLOCKS
-- =========================

CREATE TABLE IF NOT EXISTS blocks (
    number BIGINT PRIMARY KEY,
    hash TEXT NOT NULL UNIQUE,
    block_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_blocks_hash ON blocks(hash);

CREATE TABLE IF NOT EXISTS retry_queue (
    signature TEXT PRIMARY KEY,
    transaction JSONB NOT NULL,
    error TEXT NOT NULL,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS manage_entity_txs (
    tx_hash TEXT PRIMARY KEY,
    user_id INT,
    entity_type TEXT NOT NULL,
    entity_id INT NOT NULL,
    action TEXT NOT NULL,
    metadata JSONB,
    signer TEXT,
    signature TEXT,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_manage_entity_txs_user_id ON manage_entity_txs(user_id);
CREATE INDEX IF NOT EXISTS idx_manage_entity_txs_entity_type_action ON manage_entity_txs(entity_type, action);
CREATE INDEX IF NOT EXISTS idx_manage_entity_txs_entity_id ON manage_entity_txs(entity_id);
CREATE INDEX IF NOT EXISTS idx_manage_entity_txs_block_number ON manage_entity_txs(block_number DESC, tx_hash DESC);


-- =========================
--        TRACKS
-- =========================

CREATE TABLE IF NOT EXISTS tracks (
    track_id INT PRIMARY KEY,
    
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
    ai_attribution_user_id INT,
    
    -- Timestamps
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tracks_owner_id ON tracks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre);
CREATE INDEX IF NOT EXISTS idx_tracks_release_date ON tracks(release_date);
CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_tracks_tags ON tracks USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_tracks_is_unlisted ON tracks(is_unlisted) WHERE is_unlisted = false;

CREATE TABLE IF NOT EXISTS track_aggregates (
    track_id INT PRIMARY KEY,
    play_count BIGINT DEFAULT 0,
    save_count BIGINT DEFAULT 0,
    repost_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    download_count BIGINT DEFAULT 0,
    share_count BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS waveforms (
    cid TEXT PRIMARY KEY,
    peaks REAL[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS track_saves (
    user_id INT NOT NULL,
    track_id INT NOT NULL,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, track_id)
);
CREATE INDEX IF NOT EXISTS idx_track_saves_track_id ON track_saves(track_id);

CREATE TABLE IF NOT EXISTS track_reposts (
    user_id INT NOT NULL,
    track_id INT NOT NULL,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, track_id)
);
CREATE INDEX IF NOT EXISTS idx_track_reposts_track_id ON track_reposts(track_id);

CREATE TABLE IF NOT EXISTS track_downloads (
    user_id INT NOT NULL,
    track_id INT NOT NULL,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, track_id)
);

CREATE TABLE IF NOT EXISTS track_shares (
    user_id INT NOT NULL,
    track_id INT NOT NULL,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, track_id)
);
CREATE INDEX IF NOT EXISTS idx_track_shares_track_id ON track_shares(track_id);

-- =========================
--        USERS
-- =========================

CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY,
    
    -- Core metadata
    name TEXT NOT NULL,
    handle TEXT NOT NULL UNIQUE,
    bio TEXT,
    location TEXT,
    profile_picture_sizes TEXT,
    cover_photo_sizes TEXT,
    artist_pick_track_id INT,
    payout_wallet TEXT,

    -- Social links
    instagram_handle TEXT,
    tiktok_handle TEXT,
    twitter_handle TEXT,
    website TEXT,
    donation TEXT,
    
    -- Flags
    is_deactivated BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    profile_type TEXT,
    
    -- Timestamps
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_handle ON users(handle);
CREATE INDEX IF NOT EXISTS idx_users_is_deactivated ON users(is_deactivated) WHERE is_deactivated = false;
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified) WHERE is_verified = true;

CREATE TABLE IF NOT EXISTS user_aggregates (
    user_id INT PRIMARY KEY,
    track_count BIGINT DEFAULT 0,
    playlist_count BIGINT DEFAULT 0,
    follower_count BIGINT DEFAULT 0,
    following_count BIGINT DEFAULT 0,
    repost_count BIGINT DEFAULT 0,
    track_save_count BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playlist_libraries (
    user_id INT PRIMARY KEY,
    library JSONB,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE playlist_libraries IS 'Stores the personal playlist library for each user as a JSONB object.';

CREATE TABLE IF NOT EXISTS user_wallets (
    wallet TEXT PRIMARY KEY,
    curve TEXT NOT NULL, -- secp256k1 or ed25519
    user_id INT NOT NULL,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);

CREATE TABLE IF NOT EXISTS follows (
    user_id INT NOT NULL,
    followed_user_id INT NOT NULL,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, followed_user_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_followed_user_id ON follows(followed_user_id);

CREATE TABLE IF NOT EXISTS subscriptions (
    user_id INT NOT NULL,
    subscribed_user_id INT NOT NULL,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, subscribed_user_id)
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscribed_user_id ON subscriptions(subscribed_user_id);

-- =========================
--       COMMENTS
-- =========================

CREATE TABLE IF NOT EXISTS comments (
    comment_id INT PRIMARY KEY,
    user_id INT NOT NULL,
    track_id INT NOT NULL,
    parent_comment_id INT,
    content TEXT NOT NULL,
    track_timestamp_s INT,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_track_id ON comments(track_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON comments(parent_comment_id);

CREATE TABLE IF NOT EXISTS comment_mentions (
    comment_id INT NOT NULL,
    mentioned_user_id INT NOT NULL,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (comment_id, mentioned_user_id)
);

CREATE TABLE IF NOT EXISTS comment_reactions (
    comment_id INT NOT NULL,
    user_id INT NOT NULL,
    reaction SMALLINT NOT NULL DEFAULT 1,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (comment_id, user_id)
);

CREATE TABLE comment_pins (
    track_id INT PRIMARY KEY,
    comment_id INT NOT NULL,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================
--       PLAYLISTS
-- =========================

CREATE TABLE IF NOT EXISTS playlists (
    playlist_id INT PRIMARY KEY,
    
    -- Core metadata
    title TEXT NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT false,
    is_album BOOLEAN DEFAULT false,
    cover_art_sizes TEXT,
    tracks JSONB,
    owner_id INTEGER NOT NULL,
    upc TEXT,
    
    -- Timestamps
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_playlists_owner_id ON playlists(owner_id);
CREATE INDEX IF NOT EXISTS idx_playlists_title ON playlists USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_playlists_is_private ON playlists(is_private);
CREATE INDEX IF NOT EXISTS idx_playlists_is_album ON playlists(is_album) WHERE is_album = true;
CREATE INDEX IF NOT EXISTS idx_playlists_tracks_gin ON playlists USING gin (tracks);

CREATE TABLE IF NOT EXISTS playlist_aggregates (
    playlist_id INT PRIMARY KEY,
    play_count BIGINT DEFAULT 0,
    save_count BIGINT DEFAULT 0,
    repost_count BIGINT DEFAULT 0,
    share_count BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playlist_saves (
    user_id INT NOT NULL,
    playlist_id INT NOT NULL,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, playlist_id)
);
CREATE INDEX IF NOT EXISTS idx_playlist_saves_playlist_id ON playlist_saves(playlist_id);

CREATE TABLE IF NOT EXISTS playlist_reposts (
    user_id INT NOT NULL,
    playlist_id INT NOT NULL,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, playlist_id)
);
CREATE INDEX IF NOT EXISTS idx_playlist_reposts_playlist_id ON playlist_reposts(playlist_id);

CREATE TABLE IF NOT EXISTS playlist_shares (
    user_id INT NOT NULL,
    playlist_id INT NOT NULL,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, playlist_id)
);
CREATE INDEX IF NOT EXISTS idx_playlist_shares_playlist_id ON playlist_shares(playlist_id);

-- =========================
--        GRANTS
-- =========================

CREATE TABLE IF NOT EXISTS grants (
    user_id INT NOT NULL,
    address TEXT NOT NULL,
    approved BOOLEAN,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, address)
);
CREATE INDEX IF NOT EXISTS idx_grants_approved ON grants(approved) WHERE approved = true;
CREATE INDEX IF NOT EXISTS idx_grants_address ON grants(address);

-- =========================
--       SESSIONS
-- =========================

CREATE TABLE IF NOT EXISTS fiber_storage (
    k VARCHAR(64) PRIMARY KEY,
    v BYTEA NOT NULL,
    e BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_fiber_storage_expiry ON fiber_storage(e);
COMMENT ON TABLE fiber_storage IS 'Stores user sessions for Fiber middleware. Sessions can be revoked by deleting rows.';

--- =========================
--       PLAYS
-- =========================
CREATE TABLE IF NOT EXISTS track_plays (
    track_id INT NOT NULL,
    listener_id TEXT NOT NULL,
    user_id INT,
    city TEXT,
    region TEXT,
    country TEXT,
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (track_id, listener_id, block_number)
);
CREATE INDEX IF NOT EXISTS idx_track_plays_user_id ON track_plays(user_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS track_plays_daily (
    track_id INT NOT NULL,
    day DATE,
    play_count BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (track_id, day)
);

CREATE TABLE IF NOT EXISTS track_plays_users_aggregate (
    track_id INT NOT NULL,
    user_id INT NOT NULL,
    play_count BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (track_id, user_id)
);

CREATE TABLE IF NOT EXISTS track_plays_users_daily (
    track_id INT NOT NULL,
    user_id INT NOT NULL,
    day DATE,
    play_count BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (track_id, user_id, day)
);
CREATE INDEX IF NOT EXISTS idx_track_plays_users_daily_user_id ON track_plays_users_daily(user_id, day DESC);
