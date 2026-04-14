-- scripts/phase_8_contract_templates.sql
-- Run this in the Supabase SQL Editor to provision the Admin Templates Architecture

-- 1. Create the template configuration table
CREATE TABLE IF NOT EXISTS public.contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name TEXT NOT NULL UNIQUE,
    company_name TEXT NOT NULL,
    company_address TEXT,
    company_phone TEXT,
    company_email TEXT,
    terms TEXT[] NOT NULL DEFAULT '{}',
    materials TEXT[] NOT NULL DEFAULT '{}',
    company_signature_name TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Insert the Default Template (Mirroring the exact config we just built)
INSERT INTO public.contract_templates (
    template_name, 
    company_name, 
    company_address, 
    company_phone, 
    company_email, 
    terms, 
    materials, 
    company_signature_name, 
    is_active
) VALUES (
    'Standard HVAC Replacement',
    'Pilar Home Services Inc.',
    '123 Corporate Blvd, Ste 100',
    'Miami, FL 33132',
    'Lic #CAC18192348',
    ARRAY[
        'STANDARD WARRANTY: Pilar Services Inc. provides a 1-year comprehensive labor warranty on all new installations. Liability for circumstantial property damage due to pre-existing conditions is expressly waived.',
        'EPA COMPLIANCE: All refrigerant handling strictly follows Section 608 of the Clean Air Act. Equipment sizing is based on Manual J calculations standard to Florida Building Code.',
        'AUTHORIZATION: By digital acceptance, the authorizing party represents authority to contract improvements on the specified property. A mechanic''s lien may be executed for failure to remit final payment.'
    ],
    ARRAY['Removal / Disposal', 'Refrigerant', 'Permitting'],
    'Pilar Home Services',
    true
) ON CONFLICT (template_name) DO NOTHING;

-- 3. Enable RLS and setup Access Policies
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users (Sales team) to READ the active templates
CREATE POLICY "Allow authenticated users to read active templates"
ON public.contract_templates
FOR SELECT
TO authenticated
USING (is_active = true);

-- Allow admins ONLY to update or insert templates
CREATE POLICY "Allow admins to manage templates"
ON public.contract_templates
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND user_profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND user_profiles.role = 'admin'
    )
);
