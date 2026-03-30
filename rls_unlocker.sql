-- PILAR HOME: QUICK RLS UNLOCKER
-- Supabase is currently blocking the frontend from inserting new Customers and Deals because 
-- Row Level Security (RLS) is strict by default. Run this in your Supabase SQL Editor:

-- 1. Households
DROP POLICY IF EXISTS "Enable all access" ON public.households;
CREATE POLICY "Enable all access" ON public.households FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. Addresses
DROP POLICY IF EXISTS "Enable all access" ON public.addresses;
CREATE POLICY "Enable all access" ON public.addresses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Contacts
DROP POLICY IF EXISTS "Enable all access" ON public.contacts;
CREATE POLICY "Enable all access" ON public.contacts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. Opportunities (Sales Pipeline)
DROP POLICY IF EXISTS "Enable all access" ON public.opportunities;
CREATE POLICY "Enable all access" ON public.opportunities FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. Activity Logs (The Graveyard Tracker)
DROP POLICY IF EXISTS "Enable all access" ON public.activity_logs;
CREATE POLICY "Enable all access" ON public.activity_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
