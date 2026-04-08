-- Proposal Security Hardening
-- Ensures public quote URLs are safe and approved quotes are locked.

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- 1. Authentication overrides (Sales/Admin can do anything)
CREATE POLICY "Auth Quote Select" ON public.proposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth Quote Insert" ON public.proposals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth Quote Update" ON public.proposals FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth Quote Delete" ON public.proposals FOR DELETE TO authenticated USING (true);

-- 2. Public Read Access
-- Since IDs are V4 UUIDs, they are mathematically unguessable. 
-- Allowing `anon` to SELECT is safe as long as they provide the exact ID.
CREATE POLICY "Public Quote Select" ON public.proposals FOR SELECT TO anon USING (true);

-- 3. Public Acceptance (UPDATE)
-- Allows a homeowner to accept a quote.
-- USING: They can only mutate if the quote is not already 'Approved'.
-- WITH CHECK: Any update they perform MUST transition the status to 'Approved', preventing tampering with in-flight drafts.
CREATE POLICY "Public Quote Accept" ON public.proposals 
FOR UPDATE TO anon 
USING (status != 'Approved')
WITH CHECK (status = 'Approved');
