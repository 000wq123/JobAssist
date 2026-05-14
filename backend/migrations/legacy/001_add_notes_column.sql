-- Migration: Add notes column to jobs table
-- This migration adds a text column to store user notes on job applications

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS notes TEXT NULL;
