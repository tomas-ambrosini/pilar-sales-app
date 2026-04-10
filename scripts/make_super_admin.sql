-- Run this in your Supabase SQL Editor
UPDATE public.user_profiles
SET role = 'ADMIN'
WHERE username IN ('papiwalti', 'walter@pilarservices');

UPDATE public.user_profiles
SET role = 'ADMIN'
WHERE email IN ('walter@pilarservices.com');
