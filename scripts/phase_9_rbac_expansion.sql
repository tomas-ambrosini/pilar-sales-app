-- Migration: Phase 9 - RBAC Tiers Enhancement
-- Elevates ADMIN to SUPER_ADMIN and injects the MANAGER role

-- 1. Drop existing check constraints affecting roles
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- 2. Migrate existing Admins to Super Admin
UPDATE public.user_profiles 
SET role = 'SUPER_ADMIN' 
WHERE role = 'ADMIN';

-- 3. Install new 3-tier Role constraint
-- We will enforce explicit roles of SUPER_ADMIN, MANAGER, and SALES
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('SUPER_ADMIN', 'MANAGER', 'SALES'));

-- By default, any edge case records mapped weirdly should be knocked down to Sales
UPDATE public.user_profiles 
SET role = 'SALES' 
WHERE role NOT IN ('SUPER_ADMIN', 'MANAGER', 'SALES');
