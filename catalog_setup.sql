-- Run this in your Supabase SQL Editor to establish the Catalog and Settings tables

CREATE TABLE equipment_catalog (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  brand text NOT NULL,
  series text,
  tons numeric,
  seer numeric,
  condenser_model text,
  ahu_model text,
  system_cost numeric NOT NULL,
  retail_price numeric,
  created_at timestamp with time zone default now()
);

CREATE TABLE labor_rates (
  id text PRIMARY KEY,
  item_name text NOT NULL,
  cost numeric NOT NULL,
  category text, -- e.g., 'Install', 'Subcontract', 'Permit'
  is_active boolean DEFAULT true
);

CREATE TABLE margin_settings (
  id integer PRIMARY KEY DEFAULT 1,
  gross_margin numeric DEFAULT 0.40,
  overhead numeric DEFAULT 0.30,
  net_profit numeric DEFAULT 0.10,
  service_reserve numeric DEFAULT 0.05
);

-- Enable public read/write access for the prototype 
ALTER TABLE equipment_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all" ON equipment_catalog FOR ALL USING (true);

ALTER TABLE labor_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all" ON labor_rates FOR ALL USING (true);

ALTER TABLE margin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all" ON margin_settings FOR ALL USING (true);

-- Insert starting margins and some default labor rates
INSERT INTO margin_settings (id, gross_margin, overhead, net_profit, service_reserve)
VALUES (1, 0.40, 0.30, 0.10, 0.05) ON CONFLICT (id) DO NOTHING;

INSERT INTO labor_rates (id, item_name, cost, category) VALUES
  ('ahu', 'Install Air Handler Unit (AHU)', 381.81, 'Labor'),
  ('condenser', 'Install Condenser Unit', 363.63, 'Labor'),
  ('permit', 'City Permit & Handling', 250.00, 'Permit'),
  ('slab', 'Concrete Slab 36 X 36', 18.18, 'Materials')
ON CONFLICT (id) DO NOTHING;
