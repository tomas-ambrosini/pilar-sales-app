-- PILAR HOME CATALOG EXPANSION
-- Run this in your Supabase SQL Editor to append the missing aesthetic / specification columns
-- previously used to power the beautiful visual Catalog.

ALTER TABLE public.equipment_catalog ADD COLUMN IF NOT EXISTS type TEXT; -- 'AC', 'Furnace', 'Heat Pump'
ALTER TABLE public.equipment_catalog ADD COLUMN IF NOT EXISTS badge TEXT; -- 'Ultra Premium', 'Economy', 'Best Value'
ALTER TABLE public.equipment_catalog ADD COLUMN IF NOT EXISTS image_class TEXT;
ALTER TABLE public.equipment_catalog ADD COLUMN IF NOT EXISTS afue TEXT;
ALTER TABLE public.equipment_catalog ADD COLUMN IF NOT EXISTS btu TEXT;
ALTER TABLE public.equipment_catalog ADD COLUMN IF NOT EXISTS decibels TEXT;
ALTER TABLE public.equipment_catalog ADD COLUMN IF NOT EXISTS hspf TEXT;

-- Safely ensure Policies are unbound for the Application (Anon write access for Editor mode)
DROP POLICY IF EXISTS "Allow public all" ON public.equipment_catalog;
CREATE POLICY "Allow public all" ON public.equipment_catalog FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
