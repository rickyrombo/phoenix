-- =========================
--       SESSIONS
-- =========================

-- Table for Fiber session storage
CREATE TABLE IF NOT EXISTS fiber_storage (
    k VARCHAR(64) PRIMARY KEY,
    v BYTEA NOT NULL,
    e BIGINT NOT NULL DEFAULT 0
);

-- Index for expiry to efficiently clean up expired sessions
CREATE INDEX IF NOT EXISTS idx_fiber_storage_expiry ON fiber_storage(e);

-- Comment explaining the table
COMMENT ON TABLE fiber_storage IS 'Stores user sessions for Fiber middleware. Sessions can be revoked by deleting rows.';
