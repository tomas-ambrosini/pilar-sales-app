-- scripts/phase_6_ownership.sql
-- Adds ownership tracking to proposals

-- 1. Add created_by column mapped to user_profiles
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.user_profiles(id) DEFAULT auth.uid();

-- 2. Backfill existing proposals to be owned by an Admin if null
DO $$
DECLARE
   admin_id UUID;
BEGIN
   SELECT id INTO admin_id FROM public.user_profiles WHERE role = 'ADMIN' LIMIT 1;
   IF admin_id IS NOT NULL THEN
       UPDATE public.proposals SET created_by = admin_id WHERE created_by IS NULL;
   END IF;
END $$;
