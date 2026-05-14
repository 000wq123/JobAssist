-- Migration 013: Remove duplicate saved jobs with no URL, keeping the most recently created per user+company+role
DELETE FROM jobs
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id, lower(company), lower(role)) id
    FROM jobs
    WHERE url IS NULL
    ORDER BY user_id, lower(company), lower(role), created_at DESC
)
AND url IS NULL;
