-- phase_8_proposal_security.sql
-- Run this in the Supabase SQL Editor to enforce strict Proposal Access Control

-- 1. Ensure `created_by` column exists (it is verified to exist, but ensures constraint safety)
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. Force ROW LEVEL SECURITY
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing permissive policies if they exist (cleanup)
DROP POLICY IF EXISTS "Allow public all" ON public.proposals;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on proposals" ON public.proposals;

-- =========================================================================================
-- SELECT (Visibility) Policies
-- =========================================================================================

-- LEGACY FALLBACK: Allow anyone to view orphaned/legacy proposals to prevent breaking history
CREATE POLICY "Allow reading legacy proposals with no owner" ON public.proposals
FOR SELECT TO authenticated
USING (created_by IS NULL);

-- SALES SELECT: Can only see their exact own proposals
CREATE POLICY "Sales can view own proposals" ON public.proposals
FOR SELECT TO authenticated
USING (
  (created_by = auth.uid()) AND 
  ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'SALES')
);

-- MANAGER / SUPER_ADMIN SELECT: Can see ALL finalized proposals, but ONLY THEIR OWN drafts
CREATE POLICY "Managers and Admins can view finalized or own drafts" ON public.proposals
FOR SELECT TO authenticated
USING (
  ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('MANAGER', 'SUPER_ADMIN')) AND
  ((status != 'Draft') OR (created_by = auth.uid()))
);

-- =========================================================================================
-- INSERT Policies
-- =========================================================================================

-- ALL ROLES INSERT: Any authenticated user can create a proposal, but they MUST assign themselves as owner
CREATE POLICY "Users can create their own proposals" ON public.proposals
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
);

-- =========================================================================================
-- UPDATE Policies
-- =========================================================================================

-- OWNER UPDATE: The creator can always update their own proposal (Draft or otherwise)
CREATE POLICY "Creators can update own proposals" ON public.proposals
FOR UPDATE TO authenticated
USING (created_by = auth.uid());

-- MANAGER / SUPER_ADMIN UPDATE: Can update finalized proposals (e.g. mark as Lost), but NEVER someone else's Draft
CREATE POLICY "Managers and Admins can update finalized proposals" ON public.proposals
FOR UPDATE TO authenticated
USING (
  ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('MANAGER', 'SUPER_ADMIN')) AND
  (status != 'Draft') AND 
  (created_by != auth.uid()) -- Prevents overlapping with the Creator policy
);

-- =========================================================================================
-- DELETE Policies
-- =========================================================================================

-- OWNER DELETE: The creator can delete their own proposals (Usually only done when Draft)
CREATE POLICY "Creators can delete own proposals" ON public.proposals
FOR DELETE TO authenticated
USING (created_by = auth.uid());

-- SUPER_ADMIN / MANAGER DELETE: Allows pipeline cleanup
CREATE POLICY "Management can delete proposals" ON public.proposals
FOR DELETE TO authenticated
USING (
  ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('MANAGER', 'SUPER_ADMIN'))
);
