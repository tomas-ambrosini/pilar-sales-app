-- Phase 9: Proposal Presentation Layer
-- Adds a JSONB matrix storage row directly to the proposals table

ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS proposal_data JSONB;
