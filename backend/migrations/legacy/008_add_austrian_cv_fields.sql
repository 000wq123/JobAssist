-- Migration 008: Add Austrian CV fields
ALTER TABLE resume_data ADD COLUMN IF NOT EXISTS staatsbuergerschaft VARCHAR(100);
ALTER TABLE resume_data ADD COLUMN IF NOT EXISTS familienstand VARCHAR(50);
ALTER TABLE resume_data ADD COLUMN IF NOT EXISTS fuehrerschein VARCHAR(50);
ALTER TABLE resume_data ADD COLUMN IF NOT EXISTS religion VARCHAR(100);

-- Set default language to 'de' for all existing rows
UPDATE resume_data SET language = 'de' WHERE language = 'en';
