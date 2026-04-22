-- 1. Create Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE,
    customer_id UUID,
    invoice_type TEXT DEFAULT 'Deposit',
    status TEXT DEFAULT 'Unpaid',
    total_contract_amount NUMERIC(10, 2) DEFAULT 0,
    deposit_collected NUMERIC(10, 2) DEFAULT 0,
    balance_due NUMERIC(10, 2) DEFAULT 0,
    payment_method TEXT,
    payment_reference TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to manage invoices (adjust to your RLS needs)
CREATE POLICY "Enable all for authenticated users" ON public.invoices FOR ALL USING (auth.role() = 'authenticated');

-- 2. Create Work Orders Table
CREATE TABLE IF NOT EXISTS public.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE,
    customer_id UUID,
    status TEXT DEFAULT 'Pending Scheduling',
    scheduled_date TIMESTAMP WITH TIME ZONE,
    assigned_techs JSONB DEFAULT '[]'::jsonb,
    job_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for work_orders
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to manage work orders
CREATE POLICY "Enable all for authenticated users" ON public.work_orders FOR ALL USING (auth.role() = 'authenticated');
