-- Phase 10: Proposal Comments System

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.proposal_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id TEXT NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes for fast lookup by proposal inline
CREATE INDEX IF NOT EXISTS idx_proposal_comments_proposal_id ON public.proposal_comments(proposal_id, created_at ASC);

-- 3. Enable RLS
ALTER TABLE public.proposal_comments ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Everyone authenticated can view comments on proposals
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.proposal_comments;
CREATE POLICY "Enable read access for all authenticated users"
ON public.proposal_comments FOR SELECT
USING (auth.role() = 'authenticated');

-- Everyone authenticated can post comments
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.proposal_comments;
CREATE POLICY "Enable insert for authenticated users only"
ON public.proposal_comments FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

-- Only the creator can update or delete their comment
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.proposal_comments;
CREATE POLICY "Enable update for users based on user_id"
ON public.proposal_comments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.proposal_comments;
CREATE POLICY "Enable delete for users based on user_id"
ON public.proposal_comments FOR DELETE
USING (auth.uid() = user_id);

-- 5. Add to realtime publications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'proposal_comments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.proposal_comments;
  END IF;
END $$;
