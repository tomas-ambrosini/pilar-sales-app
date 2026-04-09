-- scripts/phase_9_notifications.sql
-- ==========================================
-- MVP Notification System Phase 9
-- ==========================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for highly performant notification drawer queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_is_read ON public.notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications (type);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Select own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Update own notification read state" ON public.notifications;
DROP POLICY IF EXISTS "Insert notifications via system" ON public.notifications;

-- 1. Users can only fetch their own notifications
CREATE POLICY "Select own notifications" ON public.notifications 
FOR SELECT USING (user_id = auth.uid());

-- 2. Users can only update their own notifications (specifically read status)
CREATE POLICY "Update own notification read state" ON public.notifications 
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Enforce column-level immutability for the update policy so they can't change message contents
REVOKE UPDATE ON public.notifications FROM authenticated;
GRANT UPDATE (is_read, read_at) ON public.notifications TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.notifications TO authenticated;

-- 3. Controlled Inserts: Any authenticated user can technically insert a notification 
--    (e.g., triggering a chat mention), but it's restricted to authenticated users.
CREATE POLICY "Insert notifications via system" ON public.notifications 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime broadcasting for the frontend so Bell badge pulses instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- ==========================================
-- SQL TRIGGER: QUOTE ACCEPTED
-- Automatically runs under SECURITY DEFINER bypassing RLS
-- ==========================================
CREATE OR REPLACE FUNCTION trigger_quote_accepted()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if status changed to 'Approved'
    IF NEW.status = 'Approved' AND OLD.status IS DISTINCT FROM 'Approved' THEN
        -- Safely notify the salesperson who created the proposal
        IF NEW.created_by IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, type, entity_type, entity_id, title, message, link)
            VALUES (
                NEW.created_by,
                'quote_accepted',
                'proposal',
                NEW.id,
                'Quote Accepted! 🎉',
                'Your proposal #' || COALESCE(NEW.proposal_number::text, 'ID') || ' has been approved by the customer.',
                '/proposals'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_quote_accepted ON public.proposals;
CREATE TRIGGER on_quote_accepted
AFTER UPDATE OF status ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION trigger_quote_accepted();


-- ==========================================
-- SQL HELPER: ADMIN NOTICE (BROADCAST)
-- ==========================================
CREATE OR REPLACE FUNCTION notify_all_users(
    p_actor_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_link TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.notifications (user_id, actor_id, type, entity_type, title, message, link)
    SELECT id, p_actor_id, 'admin_notice', 'system', p_title, p_message, p_link
    FROM public.user_profiles
    WHERE id != p_actor_id; -- Broadcast to everyone else
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
