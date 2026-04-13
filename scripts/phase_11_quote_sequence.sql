-- Phase 11: Auto-Incrementing Quote Numbers
-- Establishes a globally sequential quote numbering system formatted as P<YEAR>-######-TEST

-- 1. Add the column to the proposals table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposals' AND column_name='proposal_number') THEN
        ALTER TABLE public.proposals ADD COLUMN proposal_number TEXT;
    END IF;
END $$;

-- 2. Create the global sequence starting at 1
CREATE SEQUENCE IF NOT EXISTS public.proposal_number_seq START 1;

-- 3. Create the function that generates the formatted string on insert
CREATE OR REPLACE FUNCTION public.generate_proposal_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Format: P<YEAR>-<6_DIGIT_SEQUENCE>-TEST
    -- Example: P2026-000001-TEST
    -- Only assign if it wasn't manually passed in
    IF NEW.proposal_number IS NULL THEN
        NEW.proposal_number := 'P' || 
                               to_char(CURRENT_TIMESTAMP, 'YYYY') || 
                               '-' || 
                               lpad(nextval('public.proposal_number_seq')::text, 6, '0') || 
                               '-TEST';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach the trigger to the proposals table
DROP TRIGGER IF EXISTS trigger_generate_proposal_number ON public.proposals;
CREATE TRIGGER trigger_generate_proposal_number
BEFORE INSERT ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.generate_proposal_number();

-- 5. Establish uniqueness on the column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_proposals_proposal_number' AND n.nspname = 'public'
    ) THEN
        CREATE UNIQUE INDEX idx_proposals_proposal_number ON public.proposals(proposal_number) WHERE proposal_number IS NOT NULL;
    END IF;
END $$;
