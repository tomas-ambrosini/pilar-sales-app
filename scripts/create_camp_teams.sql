-- Supabase SQL Migration to create the Camp Teams for the World Cup Points Tracker

CREATE TABLE IF NOT EXISTS public.camp_teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    color_hex TEXT NOT NULL,
    points INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.camp_teams ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view
CREATE POLICY "Allow authenticated read access on camp_teams"
    ON public.camp_teams FOR SELECT
    TO authenticated
    USING (true);

-- Allow all authenticated users to update (since the UI will be hidden for others anyway)
CREATE POLICY "Allow authenticated update access on camp_teams"
    ON public.camp_teams FOR UPDATE
    TO authenticated
    USING (true);

-- Allow all authenticated users to insert (for the initial population script)
CREATE POLICY "Allow authenticated insert access on camp_teams"
    ON public.camp_teams FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Populate the initial 16 teams if empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.camp_teams LIMIT 1) THEN
        INSERT INTO public.camp_teams (name, color_hex, points) VALUES
        ('USA', '#0A3161', 0),            -- Dark Blue (USA Colors)
        ('Argentina', '#75AADB', 0),      -- Light Blue
        ('Brazil', '#009B3A', 0),         -- Green
        ('Colombia', '#FCD116', 0),       -- Yellow
        ('England', '#F3F4F6', 0),        -- White (Off-white for visibility)
        ('France', '#002395', 0),         -- Dark Blue
        ('Spain', '#AA151B', 0),          -- Red
        ('Germany', '#8B4513', 0),        -- Brown
        ('Egypt', '#C09300', 0),          -- Gold
        ('South Africa', '#111827', 0),   -- Black
        ('Ghana', '#F97316', 0),          -- Orange
        ('Morocco', '#006233', 0),        -- Dark Green
        ('Japan', '#F472B6', 0),          -- Pink
        ('South Korea', '#6B7280', 0),    -- Grey
        ('New Zealand', '#D8BFD8', 0),    -- Light Purple
        ('Australia', '#800080', 0);      -- Purple
    END IF;
END $$;
