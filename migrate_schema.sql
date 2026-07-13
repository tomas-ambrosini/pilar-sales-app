CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address_id UUID REFERENCES public.addresses(id) ON DELETE CASCADE,
    unit_number TEXT,
    system_type TEXT,
    brand TEXT,
    model_number TEXT,
    serial_number TEXT,
    tonnage TEXT,
    seer TEXT,
    description TEXT,
    history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on units" ON public.units;
CREATE POLICY "Enable ALL for authenticated users on units" ON public.units
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.service_calls ADD COLUMN IF NOT EXISTS address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS service_address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL;

