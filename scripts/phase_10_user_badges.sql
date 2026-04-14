-- Migration: Phase 10 - User Badges System
-- Stores manually-awarded badges. Auto badges are computed client-side.

CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  badge_key TEXT NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT now(),
  awarded_by UUID REFERENCES public.user_profiles(id),
  note TEXT,
  UNIQUE(user_id, badge_key)
);

-- RLS
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Everyone can read badges
CREATE POLICY "Authenticated users can view badges"
ON public.user_badges FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can insert/delete badges (service role bypasses for Edge Functions)
CREATE POLICY "Admins can manage badges"
ON public.user_badges FOR ALL
USING (
  auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'ADMIN')
);
