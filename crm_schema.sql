-- Pilar Home CRM: Master Schema Initialization
-- Drop tables if they exist to allow clean resets during development (USE WITH CAUTION IN PROD)

-- 1. ADDRESSES TABLE
-- Stores physical locations independently.
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    street_address TEXT NOT NULL,
    unit TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip TEXT NOT NULL,
    address_type TEXT DEFAULT 'Service', -- e.g., 'Service', 'Billing'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HOUSEHOLDS TABLE
-- The primary property/entity. Equipment history and Jobs tie here.
CREATE TABLE IF NOT EXISTS public.households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_name TEXT NOT NULL, -- e.g., "The Miller Residence"
    service_address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    billing_address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    active_maintenance_agreement BOOLEAN DEFAULT FALSE,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CONTACTS TABLE
-- The human beings associated with a Household.
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT DEFAULT 'Decision Maker', -- e.g., 'Decision Maker', 'Spouse', 'Tenant'
    primary_phone TEXT,
    secondary_phone TEXT,
    email TEXT,
    do_not_contact BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. OPPORTUNITIES TABLE
-- A qualified lead that requires a Site Survey and a Proposal.
CREATE TABLE IF NOT EXISTS public.opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
    lead_source TEXT,
    urgency_level TEXT DEFAULT 'Medium',
    issue_description TEXT,
    status TEXT DEFAULT 'New Lead', -- Pipeline stage: New Lead, Contacted, Survey Scheduled, Proposal Sent
    assigned_salesperson_id UUID, -- References an auth.users id eventually
    site_survey_data JSONB DEFAULT '{}'::jsonb, -- dynamic measurements, panel amps, duct sizes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. JOBS / WORK ORDERS TABLE
-- An approved proposal that is now in execution.
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
    job_number TEXT UNIQUE, -- e.g., 'WO-1044'
    status TEXT DEFAULT 'Pending Setup', -- Pipeline stage: Pending Setup, Scheduling, Execution, Review
    total_value DECIMAL(10, 2) DEFAULT 0,
    scope_payload JSONB NOT NULL, -- A locked snapshot of the equipment and add-ons sold
    assigned_crew_id UUID,
    scheduled_date TIMESTAMPTZ,
    deposit_collected DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ACTIVITY LOG TABLE
-- Timeline entries for a household.
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- e.g., 'Call', 'Proposal Sent', 'Note'
    description TEXT NOT NULL,
    created_by_user_id UUID,
    is_pinned_alert BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enabling RLS allows the frontend client to securely read/write data 
-- assuming the user is authenticated via Supabase Auth.
-- =========================================================================

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- For demo purposes: Allow all authenticated users to read/write.
-- In production, policies should restrict based on `auth.uid()`.

-- Addresses RLS
CREATE POLICY "Enable ALL for authenticated users on addresses" ON public.addresses
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Households RLS    
CREATE POLICY "Enable ALL for authenticated users on households" ON public.households
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Contacts RLS
CREATE POLICY "Enable ALL for authenticated users on contacts" ON public.contacts
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Opportunities RLS
CREATE POLICY "Enable ALL for authenticated users on opportunities" ON public.opportunities
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Jobs RLS
CREATE POLICY "Enable ALL for authenticated users on jobs" ON public.jobs
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Activity Logs RLS
CREATE POLICY "Enable ALL for authenticated users on activity_logs" ON public.activity_logs
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
