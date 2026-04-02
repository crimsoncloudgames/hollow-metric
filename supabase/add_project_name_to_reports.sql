-- Add project_name column to reports table to associate audits with a user's project
ALTER TABLE reports ADD COLUMN IF NOT EXISTS project_name text;
