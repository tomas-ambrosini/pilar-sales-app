-- Placeholder Catalog Schema Scaffold

CREATE TABLE IF NOT EXISTS public.equipment_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand TEXT NOT NULL,
    model TEXT,
    tier TEXT CHECK (tier IN ('Good', 'Better', 'Best')),
    display_name TEXT,
    description TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    tonnage NUMERIC(3,1),
    seer NUMERIC(4,1),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with dummy placeholders if empty
INSERT INTO public.equipment_catalog (brand, tier, display_name, description, price, tonnage, seer) 
SELECT 'Pilar Default', 'Good', 'Standard 14-SEER System', 'Reliable entry-level system.', 4500.00, 3.0, 14.0
WHERE NOT EXISTS (SELECT 1 FROM public.equipment_catalog WHERE tier = 'Good');

INSERT INTO public.equipment_catalog (brand, tier, display_name, description, price, tonnage, seer) 
SELECT 'Pilar Default', 'Better', 'High-Efficiency 16-SEER System', 'Quiet and efficient mid-tier system.', 6000.00, 3.0, 16.0
WHERE NOT EXISTS (SELECT 1 FROM public.equipment_catalog WHERE tier = 'Better');

INSERT INTO public.equipment_catalog (brand, tier, display_name, description, price, tonnage, seer) 
SELECT 'Pilar Default', 'Best', 'Premium 18-SEER System', 'Ultra-quiet variable speed system.', 8500.00, 3.0, 18.0
WHERE NOT EXISTS (SELECT 1 FROM public.equipment_catalog WHERE tier = 'Best');
