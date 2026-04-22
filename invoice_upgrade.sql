-- RUN THIS IN YOUR SUPABASE SQL EDITOR
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'Invoice',
ADD COLUMN IF NOT EXISTS total_contract_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS deposit_collected NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS balance_due NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

-- Force the API cache to recognize the new columns immediately
NOTIFY pgrst, 'reload schema';
