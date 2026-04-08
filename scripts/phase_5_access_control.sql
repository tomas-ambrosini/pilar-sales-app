-- Phase 5: Access Control & Security Schema
-- This script hardens the user_profiles table for internal Pilar Admin operations

-- 1. Add status and password enforcement flags safely
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='status') THEN
        ALTER TABLE user_profiles ADD COLUMN status TEXT DEFAULT 'active' NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='must_change_password') THEN
        ALTER TABLE user_profiles ADD COLUMN must_change_password BOOLEAN DEFAULT false NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='username') THEN
        ALTER TABLE user_profiles ADD COLUMN username TEXT UNIQUE;
    END IF;
END $$;

-- 2. Constrain the roles
-- Before adding constraint, ensure data matches 
UPDATE user_profiles SET role = 'SALES' WHERE role IS NULL OR role NOT IN ('ADMIN', 'SALES');

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_role_check'
    ) THEN
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check CHECK (role IN ('ADMIN', 'SALES'));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_status_check'
    ) THEN
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_status_check CHECK (status IN ('active', 'inactive'));
    END IF;
END $$;

-- 3. Harden RLS for User Profiles
-- Since this is an internal system, only authenticated users can read profiles (useful for the Account Management page).
-- But ONLY Admins and the secure Edge Function can update statuses/roles.
-- Standard users can ONLY update their own name/username, but NOT their role or status.

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user profiles" ON user_profiles;
CREATE POLICY "Authenticated users can view profiles" 
ON user_profiles FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public can insert profiles" ON user_profiles;
-- We do NOT allow inserts from the public client anymore. Edge Functions acting as Service Role will bypass RLS.
-- Therefore, we don't need a public INSERT policy for user_profiles. 

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update non-privileged fields on their own profile" 
ON user_profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Note: To prevent a user from setting `role = 'ADMIN'` during their own profile update, 
-- we would typically use a trigger. But relying on the Edge Function for Admin updates 
-- and keeping UI isolated works for this MVP. For strict defense, a trigger is best:

CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- If the current user is NOT an Admin (we check their prior DB role or claims)
    -- they cannot change their own role or status.
    IF (OLD.role != 'ADMIN' AND auth.uid() = OLD.id) THEN
        NEW.role = OLD.role;
        NEW.status = OLD.status;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_role_security ON user_profiles;
CREATE TRIGGER enforce_role_security
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_role_escalation();

-- Note on Edge Functions:
-- The Edge Function will operate using the 'service_role' key, which bypasses RLS entirely.
-- This means the Admin Dashboard can ping the Edge function to Create/Edit users, and the 
-- Edge function handles the raw DB writes securely without exposing the permissions to the client.
