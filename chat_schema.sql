-- Pilar Home: Chat / Slack-style Messaging Schema

-- 0. USERS TABLE (Required for AuthContext and Messaging)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY, -- Maps to auth.users id visually, or can just be an explicit UUID
    email TEXT,
    name TEXT,
    role TEXT DEFAULT 'Sales Rep',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- Temporary policies to allow the app to read/write users correctly during migration
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
CREATE POLICY "Enable read access for all users" ON public.users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.users;
CREATE POLICY "Enable insert access for all users" ON public.users FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update access for all users" ON public.users;
CREATE POLICY "Enable update access for all users" ON public.users FOR UPDATE USING (true) WITH CHECK (true);

-- 1. CHAT CHANNELS TABLE
CREATE TABLE IF NOT EXISTS public.chat_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turn on row level security
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users full access to channels for now
CREATE POLICY "Enable read access for all users" ON public.chat_channels FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users only" ON public.chat_channels FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON public.chat_channels FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON public.chat_channels FOR DELETE USING (auth.role() = 'authenticated');

-- 2. CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- References existing users table
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turn on row level security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users full access to messages for now
CREATE POLICY "Enable read access for all authenticated users" ON public.chat_messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users only" ON public.chat_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON public.chat_messages FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON public.chat_messages FOR DELETE USING (auth.role() = 'authenticated');

-- 3. ENABLE REALTIME FOR CHAT MESSAGES
-- This allows the frontend to receive real-time updates when new messages are inserted.
-- Note: 'chat_messages' table needs to be added to the Supabase publication.
BEGIN;
  -- Add the tables to the supabase_realtime publication
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;
COMMIT;

-- 4. INSERT DEFAULT CHANNEL
-- Insert a "# general" channel if it doesn't already exist.
INSERT INTO public.chat_channels (name, description)
SELECT 'general', 'Company-wide announcements and work-based matters.'
WHERE NOT EXISTS (
    SELECT 1 FROM public.chat_channels WHERE name = 'general'
);
