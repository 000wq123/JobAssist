-- Add user preferences for currency, location, and language
ALTER TABLE users ADD COLUMN currency VARCHAR(10) DEFAULT 'USD' NOT NULL;
ALTER TABLE users ADD COLUMN location VARCHAR(255) DEFAULT 'United States' NOT NULL;
ALTER TABLE users ADD COLUMN language VARCHAR(10) DEFAULT 'en' NOT NULL;
