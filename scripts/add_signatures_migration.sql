-- RUN THIS IN YOUR SUPABASE SQL EDITOR
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS customer_signature TEXT,
ADD COLUMN IF NOT EXISTS signed_by TEXT,
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE;

-- Force the API cache to recognize the new columns immediately
NOTIFY pgrst, 'reload schema';
