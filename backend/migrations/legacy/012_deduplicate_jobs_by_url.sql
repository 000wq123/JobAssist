-- Migration 012: Remove duplicate saved jobs, keeping the most recently created per user+url
-- Only affects jobs that have a URL (jobs without a URL cannot be deduplicated this way)
DELETE FROM jobs
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id, url) id
    FROM jobs
    WHERE url IS NOT NULL
    ORDER BY user_id, url, created_at DESC
)
AND url IS NOT NULL;

-- Optional: prevent future duplicates
-- ALTER TABLE jobs ADD CONSTRAINT uq_jobs_user_url UNIQUE (user_id, url);
