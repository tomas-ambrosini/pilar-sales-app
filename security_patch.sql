-- 1. Secure CRM tables by restricting ALL access to logged-in users only
DROP POLICY IF EXISTS "Enable all access" ON public.activity_logs;
CREATE POLICY "Enable all access" ON public.activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access" ON public.addresses;
CREATE POLICY "Enable all access" ON public.addresses FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access" ON public.contacts;
CREATE POLICY "Enable all access" ON public.contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access" ON public.households;
CREATE POLICY "Enable all access" ON public.households FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access" ON public.opportunities;
CREATE POLICY "Enable all access" ON public.opportunities FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all" ON public.crews;
CREATE POLICY "Allow public all" ON public.crews FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all" ON public.equipment_catalog;
CREATE POLICY "Allow public all" ON public.equipment_catalog FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all" ON public.labor_rates;
CREATE POLICY "Allow public all" ON public.labor_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all" ON public.margin_settings;
CREATE POLICY "Allow public all" ON public.margin_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fix open Technician Locations policy
DROP POLICY IF EXISTS "Technicians can insert their own locations" ON public.technician_locations;
CREATE POLICY "Technicians can insert their own locations" ON public.technician_locations FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Technicians can update their own locations" ON public.technician_locations;
CREATE POLICY "Technicians can update their own locations" ON public.technician_locations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 2. Revoke execution of sensitive functions from unauthenticated users
REVOKE EXECUTE ON FUNCTION public.notify_all_users(uuid, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_unread_counts(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.prevent_role_escalation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trigger_quote_accepted() FROM anon;
