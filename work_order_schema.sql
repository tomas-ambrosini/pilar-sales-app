-- work_order_schema.sql

-- 1. Create a custom sequence for auto-incrementing Work Order numbers (e.g. WO-1001, WO-1002)
CREATE SEQUENCE IF NOT EXISTS work_order_seq START 1000;

-- 2. Create the main Work Orders table
CREATE TABLE IF NOT EXISTS public.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_number TEXT NOT NULL DEFAULT ('WO-' || nextval('work_order_seq')),
    
    -- Relationships
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
    
    -- Operational State
    status TEXT DEFAULT 'Unscheduled' CHECK (status IN (
        'Unscheduled', 
        'Scheduled', 
        'En Route', 
        'In Progress', 
        'Permit Pending', 
        'Pending Inspection', 
        'Failed Inspection', 
        'Completed', 
        'Closed'
    )),
    urgency_level TEXT DEFAULT 'Normal',
    
    -- Logistics
    scheduled_date DATE,
    scheduled_time_block TEXT,
    assigned_crew_id UUID REFERENCES public.crews(id) ON DELETE SET NULL,
    
    -- Field Execution Data (Strictly technical/operational, NO FINANCIALS)
    execution_payload JSONB DEFAULT '{}'::jsonb,
    dispatch_notes TEXT,
    
    -- Closing Deliverables
    completion_photos JSONB DEFAULT '[]'::jsonb,
    technician_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turn on Public RLS for prototype access (Allow all reads/writes)
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all on work_orders" ON public.work_orders FOR ALL USING (true);

-- 3. Add an auto-updated timestamp trigger
CREATE OR REPLACE FUNCTION update_work_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_work_orders_updated_at ON public.work_orders;
CREATE TRIGGER trg_work_orders_updated_at
BEFORE UPDATE ON public.work_orders
FOR EACH ROW
EXECUTE FUNCTION update_work_order_timestamp();
