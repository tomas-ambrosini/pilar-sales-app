-- phase_2_step_1_proposals_schema.sql
-- ==========================================
-- MVP Safe Proposals Schema Migration
-- ==========================================

-- 1. Add database-controlled sequence ID safely without touching existing primary keys
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS proposal_number BIGSERIAL UNIQUE;

-- 2. Add relational structure and timestamps safely
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS associated_opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Backup: Ensure JSONB exists natively if it was defined weirdly previously, else ignore
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS proposal_data JSONB;

-- ==========================================
-- BACKFILL HISTORICAL DATA
-- ==========================================
-- Safely hoist the buried opportunity IDs directly out of the legacy JSONB blob
UPDATE public.proposals
SET associated_opportunity_id = (proposal_data->>'associated_opportunity_id')::uuid
WHERE associated_opportunity_id IS NULL AND proposal_data->>'associated_opportunity_id' IS NOT NULL;
