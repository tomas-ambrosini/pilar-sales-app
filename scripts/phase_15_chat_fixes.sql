-- Phase 15: Chat Channels Hardening

-- 1. Reassign messages from duplicate channels to the oldest surviving channel
WITH duplicates AS (
    SELECT name, array_agg(id ORDER BY created_at ASC) as ids
    FROM public.chat_channels
    GROUP BY name
    HAVING count(*) > 1
)
UPDATE public.chat_messages
SET channel_id = duplicates.ids[1]
FROM duplicates
WHERE public.chat_messages.channel_id = ANY(duplicates.ids[2:]);

-- 2. Delete the duplicate channels (cascade handles their respective channel_members rows)
WITH duplicates AS (
    SELECT name, array_agg(id ORDER BY created_at ASC) as ids
    FROM public.chat_channels
    GROUP BY name
    HAVING count(*) > 1
)
DELETE FROM public.chat_channels
WHERE id IN (
    SELECT unnest(ids[2:]) FROM duplicates
);

-- 3. Apply the UNIQUE constraint on the name column
ALTER TABLE public.chat_channels DROP CONSTRAINT IF EXISTS chat_channels_name_key;
ALTER TABLE public.chat_channels ADD CONSTRAINT chat_channels_name_key UNIQUE (name);
