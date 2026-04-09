-- Phase 8: Chat System Modernization & Alignment

-- 1. Remove old inconsistent structure safely
DROP TABLE IF EXISTS public.chat_reactions CASCADE;
DROP TABLE IF EXISTS public.channel_members CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_channels CASCADE;

-- 2. Create Chat Channels
CREATE TABLE public.chat_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    channel_type TEXT DEFAULT 'group' CHECK (channel_type IN ('group','direct')),
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Chat Messages
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    -- Additional columns necessary for UI functionality preservation
    attachment_url TEXT,
    attachment_type TEXT,
    reply_to_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL
);

-- 4. Create Channel Members
CREATE TABLE public.channel_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Additional column necessary for Unread logic
    last_read_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(channel_id, user_id)
);

-- 5. Create Chat Reactions
CREATE TABLE public.chat_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(message_id, user_id, emoji)
);

-- INDEXES
CREATE INDEX idx_chat_channels_type ON public.chat_channels(channel_type);
CREATE INDEX idx_chat_messages_channel ON public.chat_messages(channel_id, created_at);
CREATE INDEX idx_channel_members_user ON public.channel_members(user_id);
CREATE INDEX idx_channel_members_channel ON public.channel_members(channel_id);

-- RLS: ENABLE
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

-- RLS: chat_channels
DROP POLICY IF EXISTS "Select channels" ON public.chat_channels;
CREATE POLICY "Select channels" ON public.chat_channels FOR SELECT USING (
  -- Users can select channels they are members of 
  id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()) OR
  -- Or any group channel (acting like public rooms) - matching original logic roughly
  channel_type = 'group'
);

DROP POLICY IF EXISTS "Insert channels" ON public.chat_channels;
CREATE POLICY "Insert channels" ON public.chat_channels FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND created_by = auth.uid()
);

-- RLS: channel_members
DROP POLICY IF EXISTS "Select members" ON public.channel_members;
CREATE POLICY "Select members" ON public.channel_members FOR SELECT USING (
  channel_id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()) OR
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "Insert members" ON public.channel_members;
CREATE POLICY "Insert members" ON public.channel_members FOR INSERT WITH CHECK (
  user_id = auth.uid() OR
  channel_id IN (SELECT id FROM public.chat_channels WHERE created_by = auth.uid())
);

DROP POLICY IF EXISTS "Update members" ON public.channel_members;
CREATE POLICY "Update members" ON public.channel_members FOR UPDATE USING (
  user_id = auth.uid()
) WITH CHECK (
  user_id = auth.uid()
);

-- RLS: chat_messages
DROP POLICY IF EXISTS "Select messages" ON public.chat_messages;
CREATE POLICY "Select messages" ON public.chat_messages FOR SELECT USING (
  channel_id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()) OR
  channel_id IN (SELECT id FROM public.chat_channels WHERE channel_type = 'group')
);

DROP POLICY IF EXISTS "Insert messages" ON public.chat_messages;
CREATE POLICY "Insert messages" ON public.chat_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  (channel_id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()) OR
   channel_id IN (SELECT id FROM public.chat_channels WHERE channel_type = 'group'))
);

DROP POLICY IF EXISTS "Update messages" ON public.chat_messages;
CREATE POLICY "Update messages" ON public.chat_messages FOR UPDATE USING (
  sender_id = auth.uid()
) WITH CHECK (
  sender_id = auth.uid()
);

DROP POLICY IF EXISTS "Delete messages" ON public.chat_messages;
CREATE POLICY "Delete messages" ON public.chat_messages FOR DELETE USING (
  sender_id = auth.uid()
);

-- RLS: chat_reactions
DROP POLICY IF EXISTS "Select reactions" ON public.chat_reactions;
CREATE POLICY "Select reactions" ON public.chat_reactions FOR SELECT USING (
  message_id IN (SELECT id FROM public.chat_messages) -- implicitly checks message policy
);

DROP POLICY IF EXISTS "Insert reactions" ON public.chat_reactions;
CREATE POLICY "Insert reactions" ON public.chat_reactions FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "Delete reactions" ON public.chat_reactions;
CREATE POLICY "Delete reactions" ON public.chat_reactions FOR DELETE USING (
  user_id = auth.uid()
);

-- REALTIME PUBLICATION
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_channels') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_reactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;
  END IF;
END $$;

-- UTILITY: UNREAD COUNTS RPC
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
  WHERE cm.user_id = p_user_id AND msg.sender_id != p_user_id
  GROUP BY cm.channel_id;
END;
$$;
