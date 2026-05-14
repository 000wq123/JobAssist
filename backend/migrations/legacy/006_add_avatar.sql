-- Migration 006: Add avatar column to user_profiles
-- Stores profile photo as a base64 data URL

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar TEXT;
