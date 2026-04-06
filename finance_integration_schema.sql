-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id VARCHAR(50) PRIMARY KEY,
    work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE,
    household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
    customer VARCHAR(255) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    payment_method VARCHAR(100),
    paid_at TIMESTAMP WITH TIME ZONE,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Allow public read access to invoices
CREATE POLICY "Allow public read access to invoices" ON public.invoices
    FOR SELECT USING (true);

-- Allow public insert access to invoices
CREATE POLICY "Allow public insert access to invoices" ON public.invoices
    FOR INSERT WITH CHECK (true);

-- Allow public update access to invoices
CREATE POLICY "Allow public update access to invoices" ON public.invoices
    FOR UPDATE USING (true);

-- Allow public delete access to invoices
CREATE POLICY "Allow public delete access to invoices" ON public.invoices
    FOR DELETE USING (true);
