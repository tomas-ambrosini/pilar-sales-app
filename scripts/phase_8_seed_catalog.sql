-- Phase 8: Seed Walter's Detailed Catalog into Service & Materials Table

-- 1. Ensure `sku` column exists on labor_rates so we can map Walter's exact SKU numbers
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='labor_rates' AND column_name='sku') THEN
        ALTER TABLE labor_rates ADD COLUMN sku TEXT;
    END IF;
END $$;

-- 2. Insert items directly into the labor_rates table under the 'Material' Category.
-- We use unique constraint on item_name (or just TRUNCATE/DELETE first if we want a clean slate, but let's just insert missing ones).
-- Since we don't have constraints, we'll just aggressively insert them.

INSERT INTO public.labor_rates (category, sku, item_name, cost)
VALUES 
    /* 1000 SERIES: Indoor Unit Parts */
    ('Material', '1000', 'Indoor Unit (AHU/wall unit)', 0.00),
    ('Material', '1001', 'Stand', 0.00),
    ('Material', '1002', 'Aux Drain Pan', 0.00),
    ('Material', '1003', 'Unit Float Switch', 0.00),
    ('Material', '1004', 'Pan Float Switch', 0.00),
    ('Material', '1005', 'PVC Drain Line 3/4" (per ft)', 0.00),
    ('Material', '1006', 'PVC Drain Line 1-1/4" (per ft)', 0.00),
    ('Material', '1007', 'Condensate Pump (110V)', 0.00),
    ('Material', '1008', 'Condensate Pump (220V)', 0.00),
    ('Material', '1009', 'Electrical Disconnect', 0.00),
    ('Material', '1010', 'Electrical Breaker', 0.00),
    ('Material', '1011', 'Whip', 0.00),
    ('Material', '1012', 'CPVC Drain Line 1/2"', 0.00),
    ('Material', '1013', 'CPVC Drain Line 3/4"', 0.00),
    ('Material', '1014', 'PVC Fittings', 0.00),
    ('Material', '1015', 'CPVC Fittings', 0.00),
    ('Material', '1016', 'Copper Pipe', 0.00),
    ('Material', '1017', 'Refrigerant Line Fittings', 0.00),
    ('Material', '1018', 'Armaflex', 0.00),

    /* 2000 SERIES: Outdoor Unit Parts */
    ('Material', '2000', 'Outdoor Unit (CU)', 0.00),
    ('Material', '2001', 'Concrete Slab', 0.00),
    ('Material', '2002', 'Concrete Slab (Minisplit)', 0.00),
    ('Material', '2003', 'Tie Down', 0.00),
    ('Material', '2004', 'Electrical Disconnect', 0.00),
    ('Material', '2005', 'Roof Stand', 0.00),
    ('Material', '2006', 'Wall Stand', 0.00),
    ('Material', '2007', 'Electrical Breaker', 0.00),
    ('Material', '2008', 'Line Cover', 0.00),
    ('Material', '2009', 'Whip', 0.00),
    ('Material', '2010', 'Drier', 0.00),
    ('Material', '2011', 'Armaflex', 0.00),
    ('Material', '2012', 'Refrigerant Line Fittings', 0.00),
    ('Material', '2013', 'Copper Pipe', 0.00),
    ('Material', '2014', 'Refrigerant', 0.00),
    ('Material', '2015', 'Refrigerant Lock Caps', 0.00),

    /* 3000 SERIES: Ductwork */
    ('Material', '3000', 'Ductwork Base', 0.00),
    ('Material', '3001', 'Fiberglass Sheet (1")', 0.00),
    ('Material', '3002', 'Fiberglass Sheet (1.5")', 0.00),
    ('Material', '3003', 'Fiberglass Sheet (2")', 0.00),
    ('Material', '3004', 'Linear Supply Difuser Boot - 2 slots (18")', 0.00),
    ('Material', '3005', 'Linear Supply Difuser Boot - 2 slots (24")', 0.00),
    ('Material', '3006', 'Linear Supply Difuser Boot - 2 slots (36")', 0.00),
    ('Material', '3007', 'Insulated Register Box (8" x 8")', 0.00),
    ('Material', '3008', 'Insulated Register Box (6" x 6")', 0.00),
    ('Material', '3009', 'Boot (18" x 18")', 0.00),
    ('Material', '3010', 'Boot (12" x 12")', 0.00),
    ('Material', '3011', 'Register Box (8" x 8")', 0.00),
    ('Material', '3012', 'Linear Supply Grill - 2 slots (18")', 0.00),
    ('Material', '3013', 'Linear Supply Grill - 2 slots (24")', 0.00),
    ('Material', '3014', 'Linear Supply Grill - 2 slots (36")', 0.00),
    ('Material', '3015', 'Return Grill (12" x 12")', 0.00),
    ('Material', '3016', 'Return Grill (18" x 18")', 0.00),
    ('Material', '3017', 'Return Grill (20" x 20")', 0.00),
    ('Material', '3018', 'Flex Duct (4")', 0.00),
    ('Material', '3019', 'Flex Duct (6")', 0.00),
    ('Material', '3020', 'Flex Duct (8")', 0.00),
    ('Material', '3021', 'Flex Duct (10")', 0.00),
    ('Material', '3022', 'Flex Duct (12")', 0.00),
    ('Material', '3023', 'Collar #4', 0.00),
    ('Material', '3024', 'Collar #6', 0.00),
    ('Material', '3025', 'Collar #8', 0.00),
    ('Material', '3026', 'Collar #10', 0.00),
    ('Material', '3027', 'Collar #12', 0.00),
    ('Material', '3028', 'Hanger Strap', 0.00),
    ('Material', '3029', 'Aluminum Tape', 0.00),
    ('Material', '3030', 'Grey Tape', 0.00),
    ('Material', '3031', 'Mastic (Duct Pasting)', 0.00),
    ('Material', '3032', 'Brush', 0.00),

    /* 4000 SERIES: AHU+CU Combined */
    ('Material', '4000', 'AHU+CU Base', 0.00),
    ('Material', '4001', 'Refrigerant Line 3/8" (per ft)', 0.00),
    ('Material', '4002', 'Refrigerant Line 7/8" (per ft)', 0.00),
    ('Material', '4003', 'Refrigerant Line 3/4" (per ft)', 0.00),
    ('Material', '4004', 'Thermostat Wire', 0.00),
    ('Material', '4005', 'Armaflex', 0.00),
    ('Material', '4006', 'PVC 6" Pipe', 0.00),
    ('Material', '4007', 'PVC 6" Fittings', 0.00),
    ('Material', '4008', 'Line Cover', 0.00);
