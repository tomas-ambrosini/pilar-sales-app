-- Phase 16: Advanced Chat (Private Groups & Channel Deletion)

-- 1. Update the channel_type constraint to allow 'private'
ALTER TABLE public.chat_channels DROP CONSTRAINT IF EXISTS chat_channels_channel_type_check;
ALTER TABLE public.chat_channels ADD CONSTRAINT chat_channels_channel_type_check CHECK (channel_type IN ('group', 'direct', 'private'));

-- 2. Add RLS policy for Channel Deletion
-- Only the creator of the channel can delete it.
DROP POLICY IF EXISTS "Delete channels" ON public.chat_channels;
CREATE POLICY "Delete channels" ON public.chat_channels FOR DELETE USING (
  created_by = auth.uid()
);

-- Note: The existing "Select channels" policy already works correctly for private channels:
-- id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()) OR channel_type = 'group'
-- If channel_type is 'private', the second condition fails, so it falls back to the first condition,
-- which requires the user to explicitly be in channel_members.
