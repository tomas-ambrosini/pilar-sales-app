-- Migration: Phase 9 - RBAC 3-Tier Hierarchy
-- Roles: ADMIN (founders), MANAGER (office leads), SALES (reps)

-- 1. Drop existing check constraint
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- 2. Normalize any legacy SUPER_ADMIN values back to ADMIN
UPDATE public.user_profiles 
SET role = 'ADMIN' 
WHERE role IN ('SUPER_ADMIN', 'ADMIN');

-- 3. Install new 3-tier constraint
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('ADMIN', 'MANAGER', 'SALES'));

-- 4. Catch any orphaned records
UPDATE public.user_profiles 
SET role = 'SALES' 
WHERE role NOT IN ('ADMIN', 'MANAGER', 'SALES');
