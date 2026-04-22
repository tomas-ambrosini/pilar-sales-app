-- Add missing columns to invoices table if they don't already exist
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS customer_id UUID,
ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'Deposit',
ADD COLUMN IF NOT EXISTS total_contract_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_collected NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_due NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

-- Add missing columns to work_orders table if they don't already exist
ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS customer_id UUID,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending Scheduling',
ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS assigned_techs JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS job_notes TEXT;

-- Force Supabase's API cache to refresh
NOTIFY pgrst, 'reload schema';
