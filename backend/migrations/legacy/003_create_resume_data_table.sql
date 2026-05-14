-- Migration: Create resume_data table
-- This migration creates the table for storing user resume information

CREATE TABLE IF NOT EXISTS resume_data (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    location VARCHAR(255),
    professional_summary TEXT,
    work_experience JSONB,
    education JSONB,
    skills JSONB,
    certifications JSONB,
    template_id INTEGER DEFAULT 1,
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_resume_data_user_id ON resume_data(user_id);
