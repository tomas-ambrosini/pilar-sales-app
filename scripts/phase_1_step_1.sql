-- 1. Create the user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'SALES' CHECK (role IN ('ADMIN', 'SALES', 'DISPATCH', 'SUBCONTRACTOR')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add soft delete flags safely across operational tables
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 3. Create the payments table to track financial ledger
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES public.work_orders(id),
    amount NUMERIC(10, 2) NOT NULL,
    payment_type TEXT DEFAULT 'DEPOSIT' CHECK (payment_type IN ('DEPOSIT', 'PROGRESS', 'FINAL')),
    payment_method TEXT,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CLEARED', 'FAILED', 'REFUNDED')),
    transaction_ref TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
