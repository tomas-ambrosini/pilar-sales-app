-- Phase 1: Real-Time Location Infrastructure
-- Create the high-performance location tracking table

CREATE TABLE IF NOT EXISTS public.technician_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technician_id TEXT NOT NULL,
    service_call_id UUID, -- Optional: Tie the location ping to a specific active job
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    heading NUMERIC,
    speed NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast lookups by technician or active job
CREATE INDEX IF NOT EXISTS idx_tech_loc_technician ON public.technician_locations(technician_id);
CREATE INDEX IF NOT EXISTS idx_tech_loc_service_call ON public.technician_locations(service_call_id);

-- Add secure tracking tokens to dispatch tables
-- These are used to generate the /tracker/:token URLs instead of exposing UUIDs
ALTER TABLE public.service_calls ADD COLUMN IF NOT EXISTS tracking_token TEXT UNIQUE;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS tracking_token TEXT UNIQUE;

-- Enable Row Level Security (RLS)
ALTER TABLE public.technician_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert their own location (in a real app, verify technician_id = auth.uid())
CREATE POLICY "Technicians can insert their own locations" 
ON public.technician_locations FOR INSERT 
WITH CHECK (true);

-- Policy: Technicians can update their own location
CREATE POLICY "Technicians can update their own locations" 
ON public.technician_locations FOR UPDATE 
USING (true);

-- Policy: Anyone with the tracking token can view the location (handled via the app securely joining)
-- For the sake of the MVP, we allow public read of the locations, but restrict in production.
CREATE POLICY "Public can read technician locations" 
ON public.technician_locations FOR SELECT 
USING (true);

-- ENBALE REALTIME
-- This is critical for the WebSocket connections to work
BEGIN;
  -- Add the table to the supabase_realtime publication
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.technician_locations;
COMMIT;
