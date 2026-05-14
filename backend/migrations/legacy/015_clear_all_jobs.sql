-- Migration 015: Delete all saved jobs for all users (data reset)
TRUNCATE TABLE jobs RESTART IDENTITY CASCADE;
