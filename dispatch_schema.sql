-- dispatch_schema.sql
-- 1. Create a dynamic 'crews' table so Dispatch Teams can be managed
CREATE TABLE IF NOT EXISTS public.crews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_name TEXT NOT NULL,
    color_code TEXT DEFAULT '#38bdf8',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turn on Public RLS for prototype access
ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all" ON public.crews FOR ALL USING (true);

-- Insert dummy editable crews mapping Service Fusion's styling
INSERT INTO public.crews (crew_name, color_code) VALUES
  ('Install Team Alpha', '#10b981'),
  ('Install Team Bravo', '#3b82f6'),
  ('Service Tech Joseph', '#f59e0b'),
  ('Service Tech Josh', '#8b5cf6'),
  ('Maintenance Crew 1', '#ec4899')
ON CONFLICT DO NOTHING;

-- 2. Expand Opportunities to handle Calendar Matrix state natively without changing tables
ALTER TABLE public.opportunities 
ADD COLUMN IF NOT EXISTS scheduled_date DATE,
ADD COLUMN IF NOT EXISTS scheduled_time_block TEXT,
ADD COLUMN IF NOT EXISTS assigned_crew_id UUID REFERENCES public.crews(id) ON DELETE SET NULL;
