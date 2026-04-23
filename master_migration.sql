-- SUPABASE DATABASE MIGRATION SCRIPT
-- RUN THIS ENTIRE SCRIPT IN THE SUPABASE SQL EDITOR

-- 1. Create Invoices Table (Keeping this as it was correct for deposits)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id TEXT REFERENCES public.proposals(id) ON DELETE CASCADE,
    customer_id TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT,
    status TEXT DEFAULT 'Paid',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Re-create Work Orders Table WITH CORRECT LEGACY COLUMNS
-- The previous migration accidentally wiped required relational columns.
DROP TABLE IF EXISTS public.work_orders CASCADE;
CREATE TABLE public.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_number TEXT UNIQUE,
    proposal_id TEXT REFERENCES public.proposals(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
    customer_id TEXT, -- Legacy support
    status TEXT DEFAULT 'Unscheduled',
    urgency_level TEXT DEFAULT 'Medium',
    execution_payload JSONB DEFAULT '{}'::jsonb,
    scheduled_date TEXT,
    scheduled_time_block TEXT,
    dispatch_notes TEXT,
    assigned_crew_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Set up RLS Policies (Safe defaults for MVP)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.invoices;
CREATE POLICY "Enable all access for authenticated users" ON public.invoices FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.work_orders;
CREATE POLICY "Enable all access for authenticated users" ON public.work_orders FOR ALL USING (auth.role() = 'authenticated');

-- 4. FORCE SCHEMA CACHE RELOAD
-- This ensures PostgREST detects the new foreign keys instantly
NOTIFY pgrst, 'reload schema';
