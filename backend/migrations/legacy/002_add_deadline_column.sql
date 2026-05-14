-- Migration: Add deadline column to jobs table
-- This migration adds a timestamp column to store application deadlines

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deadline TIMESTAMP NULL;
