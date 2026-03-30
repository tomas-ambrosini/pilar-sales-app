-- Add proposal_data JSONB column to the opportunities table
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS proposal_data JSONB;
