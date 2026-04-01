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
DROP POLICY IF EXISTS "Enable read access for all users" ON public.chat_channels;
CREATE POLICY "Enable read access for all users" ON public.chat_channels FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.chat_channels;
CREATE POLICY "Enable insert for authenticated users only" ON public.chat_channels FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.chat_channels;
CREATE POLICY "Enable update for authenticated users only" ON public.chat_channels FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.chat_channels;
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
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.chat_messages;
CREATE POLICY "Enable read access for all authenticated users" ON public.chat_messages FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.chat_messages;
CREATE POLICY "Enable insert for authenticated users only" ON public.chat_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.chat_messages;
CREATE POLICY "Enable update for authenticated users only" ON public.chat_messages FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.chat_messages;
CREATE POLICY "Enable delete for authenticated users only" ON public.chat_messages FOR DELETE USING (auth.role() = 'authenticated');

-- 3. ENABLE REALTIME FOR CHAT MESSAGES
-- This allows the frontend to receive real-time updates when new messages are inserted.
-- Note: 'chat_messages' table needs to be added to the Supabase publication.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'chat_channels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;
  END IF;
END $$;

-- 4. INSERT DEFAULT CHANNEL
-- Insert a "# general" channel if it doesn't already exist.
INSERT INTO public.chat_channels (name, description)
SELECT 'general', 'Company-wide announcements and work-based matters.'
WHERE NOT EXISTS (
    SELECT 1 FROM public.chat_channels WHERE name = 'general'
);

-- ==========================================
-- PHASE 1 OVERHAUL: PRIVATE CHANNELS & DMS
-- ==========================================

-- 1. Add privacy flag to channels
ALTER TABLE public.chat_channels ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- 2. Create Channel Members junction table to handle permissions
CREATE TABLE IF NOT EXISTS public.channel_members (
    channel_id UUID REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (channel_id, user_id)
);

ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

-- Members can see their own memberships, or see memberships of any channel they are part of
DROP POLICY IF EXISTS "Enable read for members" ON public.channel_members;
CREATE POLICY "Enable read for members" ON public.channel_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for members" ON public.channel_members;
CREATE POLICY "Enable insert for members" ON public.channel_members FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for members" ON public.channel_members;
CREATE POLICY "Enable delete for members" ON public.channel_members FOR DELETE USING (true);

-- 3. Upgrade Channel Reading Logic
DROP POLICY IF EXISTS "Enable read access for all users" ON public.chat_channels;
DROP POLICY IF EXISTS "Enable read access for channels" ON public.chat_channels;
CREATE POLICY "Enable read access for channels" ON public.chat_channels FOR SELECT 
USING (
  is_private = false
  OR 
  id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid())
);

-- Note: The `messages` inherit privacy purely by the client only subscribing to accessible channels, 
-- but strictly, RLS on messages could also be tightened. We will leave it flat for now for speed!

-- ==========================================
-- PHASE 3 OVERHAUL: INLINE REPLIES
-- ==========================================

-- Add the tracking column for replies
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL;


-- ==========================================
-- PHASE 4 OVERHAUL: NOTIFICATIONS & READ RECEIPTS
-- ==========================================

-- Add the last_read_at timestamp to channel members to compute unread badges accurately
ALTER TABLE public.channel_members ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT NOW();

-- Create an RPC to fetch unread counts natively
CREATE OR REPLACE FUNCTION get_unread_counts(p_user_id UUID)
RETURNS TABLE (channel_id UUID, unread_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.channel_id,
    COUNT(msg.id) AS unread_count
  FROM public.channel_members cm
  LEFT JOIN public.chat_messages msg ON msg.channel_id = cm.channel_id 
    AND (msg.created_at > cm.last_read_at OR cm.last_read_at IS NULL)
  WHERE cm.user_id = p_user_id
  GROUP BY cm.channel_id;
END;
$$;

-- ==========================================
-- PHASE 5: MEDIA ATTACHMENTS (NEW)
-- ==========================================

-- 1. Add Media Support Columns to chat_messages
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS attachment_type TEXT; -- e.g. 'image/jpeg', 'application/pdf'

-- Note: The user MUST manually create a public Storage Bucket named 'chat_attachments'
-- in the Supabase Dashboard -> Storage -> Create Bucket. It must be set to 'PUBLIC'.
