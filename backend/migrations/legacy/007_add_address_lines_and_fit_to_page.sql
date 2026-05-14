-- Migration 007: Add address_lines (multiple Aufenthaltsorte) and fit_to_page flag
ALTER TABLE resume_data ADD COLUMN IF NOT EXISTS address_lines JSONB DEFAULT '[]'::jsonb;
ALTER TABLE resume_data ADD COLUMN IF NOT EXISTS fit_to_page BOOLEAN DEFAULT FALSE;
