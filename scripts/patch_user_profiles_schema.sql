-- scripts/patch_user_profiles_schema.sql

-- 1. Add missing properties expected by the Account Management Dashboard and Edge Functions
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- 2. Migrate any existing 'is_active' data over to the new 'status' column if needed
UPDATE public.user_profiles 
SET status = CASE WHEN is_active = false THEN 'inactive' ELSE 'active' END
WHERE status IS NULL OR status = 'active';
