-- Migration 014: Shift job-alert limit tracking from rolling-window to daily counters
-- on the users table so that alert deletion cannot reset quotas.

-- 1. Add new daily-counter columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_manual_run_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_creation_count   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_counts_reset_at  TIMESTAMP;

-- 2. Drop old rolling-window columns from users (replaced by daily counts above)
ALTER TABLE users DROP COLUMN IF EXISTS alert_refresh_count;
ALTER TABLE users DROP COLUMN IF EXISTS alert_refresh_window_start;

-- 3. Drop per-alert refresh tracking columns from job_alerts (now tracked on users only)
ALTER TABLE job_alerts DROP COLUMN IF EXISTS manual_refresh_count;
ALTER TABLE job_alerts DROP COLUMN IF EXISTS manual_refresh_window_start;
