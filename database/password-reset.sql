ALTER TABLE users
ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS password_reset_otps (
    user_id BIGINT PRIMARY KEY
        REFERENCES users(id) ON DELETE CASCADE,
    otp_hash CHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts SMALLINT NOT NULL DEFAULT 0
        CHECK (attempts >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
