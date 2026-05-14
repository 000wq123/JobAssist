-- Migration 016: Backend hardening — FK constraints, ondelete, timezone-aware columns
-- This migration is idempotent and safe to re-run.

-- 1. Add FK + CASCADE to usage_tracking.user_id (if not already present)
--    PostgreSQL does not support IF NOT EXISTS for constraints natively,
--    so we use a DO block to check first.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'usage_tracking_user_id_fkey'
          AND table_name = 'usage_tracking'
    ) THEN
        ALTER TABLE usage_tracking
            ADD CONSTRAINT usage_tracking_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Update ondelete policy on existing FKs to CASCADE / SET NULL
--    Drop old constraint then re-add with the correct policy.

-- user_profiles.user_id → CASCADE
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'user_profiles_user_id_fkey'
          AND table_name = 'user_profiles'
    ) THEN
        ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_user_id_fkey;
    END IF;
    ALTER TABLE user_profiles
        ADD CONSTRAINT user_profiles_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

-- resumes.user_id → CASCADE
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'resumes_user_id_fkey'
          AND table_name = 'resumes'
    ) THEN
        ALTER TABLE resumes DROP CONSTRAINT resumes_user_id_fkey;
    END IF;
    ALTER TABLE resumes
        ADD CONSTRAINT resumes_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

-- jobs.user_id → CASCADE
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'jobs_user_id_fkey'
          AND table_name = 'jobs'
    ) THEN
        ALTER TABLE jobs DROP CONSTRAINT jobs_user_id_fkey;
    END IF;
    ALTER TABLE jobs
        ADD CONSTRAINT jobs_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

-- jobs.resume_id → SET NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'jobs_resume_id_fkey'
          AND table_name = 'jobs'
    ) THEN
        ALTER TABLE jobs DROP CONSTRAINT jobs_resume_id_fkey;
    END IF;
    ALTER TABLE jobs
        ADD CONSTRAINT jobs_resume_id_fkey
        FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL;
END $$;

-- 3. Convert DateTime columns to TIMESTAMP WITH TIME ZONE (idempotent — no-op if already timestamptz)
ALTER TABLE users          ALTER COLUMN created_at            TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE users          ALTER COLUMN daily_counts_reset_at TYPE TIMESTAMPTZ USING daily_counts_reset_at AT TIME ZONE 'UTC';
ALTER TABLE refresh_tokens ALTER COLUMN created_at            TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE subscriptions  ALTER COLUMN created_at            TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE subscriptions  ALTER COLUMN updated_at            TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
ALTER TABLE resumes        ALTER COLUMN created_at            TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE user_profiles  ALTER COLUMN created_at            TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE user_profiles  ALTER COLUMN updated_at            TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
