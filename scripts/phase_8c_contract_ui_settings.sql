-- Migration: Phase 8c - Contract Settings Finishing Pass
-- Goal: Add branding fields, section titles, and create a brand-assets bucket

-- 1. Extend Contract Templates Table
ALTER TABLE public.contract_templates ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.contract_templates ADD COLUMN IF NOT EXISTS brand_name TEXT DEFAULT 'PILAR HOME';
ALTER TABLE public.contract_templates ADD COLUMN IF NOT EXISTS title_legal_section TEXT DEFAULT 'Exclusions / Legal:';
ALTER TABLE public.contract_templates ADD COLUMN IF NOT EXISTS title_unit_section TEXT DEFAULT 'Unit Info';

-- 2. Create the Storage Bucket for Brand Assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Bucket RLS Policies for brand-assets
-- Allow public access to view assets
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'brand-assets');

-- Allow authenticated admins to upload assets
CREATE POLICY "Admin Upload Access" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'brand-assets' 
  AND auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'admin')
);

-- Allow authenticated admins to delete assets
CREATE POLICY "Admin Delete Access" ON storage.objects
FOR DELETE USING (
  bucket_id = 'brand-assets'
  AND auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'admin')
);
