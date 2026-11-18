-- TRO member login protection.
-- Apply only to the dedicated tro-members D1 database.

CREATE TABLE IF NOT EXISTS member_login_attempts (
    email_hash TEXT PRIMARY KEY,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_member_login_attempts_locked
ON member_login_attempts(locked_until);
