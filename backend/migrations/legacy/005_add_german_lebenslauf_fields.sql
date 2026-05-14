-- Migration 005: Add German Lebenslauf fields to resume_data
-- Adds birth_info and nationality for German-standard CVs

ALTER TABLE resume_data
  ADD COLUMN IF NOT EXISTS birth_info VARCHAR(255),
  ADD COLUMN IF NOT EXISTS nationality VARCHAR(100);
