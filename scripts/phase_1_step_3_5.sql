-- phase_1_step_3_5.sql
-- 1. Add direct authenticated ownership for RLS on Work Orders
ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS assigned_tech_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- 2. Add structural logic bridge to the Crews metadata table
ALTER TABLE public.crews
ADD COLUMN IF NOT EXISTS linked_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;
