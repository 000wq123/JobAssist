-- Migration 017: Persist skill analysis scores on the resume row
-- Allows the dashboard to show accurate Fähigkeiten completion without
-- relying on localStorage (which is cleared on logout).

ALTER TABLE resumes ADD COLUMN IF NOT EXISTS skill_analysis_json TEXT NULL;
