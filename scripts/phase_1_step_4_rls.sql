-- phase_1_step_4_rls.sql
-- ==========================================
-- 0. HELPER FUNCTION & BACKFILL
-- ==========================================

-- Bypasses infinite recursion by performing the role check outside the policy context
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

-- Ensure historic opportunities do not vanish when RLS is active.
-- Assigns legacy rows to the first available ADMIN account.
UPDATE public.opportunities 
SET assigned_salesperson_id = (SELECT id FROM public.user_profiles WHERE role = 'ADMIN' LIMIT 1)
WHERE assigned_salesperson_id IS NULL;


-- ==========================================
-- 1. SETTINGS & PRICING
-- ==========================================
ALTER TABLE public.equipment_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.margin_settings ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "Settings Selectable" ON public.equipment_catalog FOR SELECT TO authenticated USING (public.get_auth_role() IN ('ADMIN', 'DISPATCH', 'SALES'));
CREATE POLICY "Settings Selectable" ON public.labor_rates FOR SELECT TO authenticated USING (public.get_auth_role() IN ('ADMIN', 'DISPATCH', 'SALES'));
CREATE POLICY "Settings Selectable" ON public.margin_settings FOR SELECT TO authenticated USING (public.get_auth_role() IN ('ADMIN', 'DISPATCH', 'SALES'));

-- INSERT
CREATE POLICY "Settings Insertable" ON public.equipment_catalog FOR INSERT TO authenticated WITH CHECK (public.get_auth_role() = 'ADMIN');
CREATE POLICY "Settings Insertable" ON public.labor_rates FOR INSERT TO authenticated WITH CHECK (public.get_auth_role() = 'ADMIN');
CREATE POLICY "Settings Insertable" ON public.margin_settings FOR INSERT TO authenticated WITH CHECK (public.get_auth_role() = 'ADMIN');

-- UPDATE (incl. soft-delete)
CREATE POLICY "Settings Updatable" ON public.equipment_catalog FOR UPDATE TO authenticated USING (public.get_auth_role() = 'ADMIN');
CREATE POLICY "Settings Updatable" ON public.labor_rates FOR UPDATE TO authenticated USING (public.get_auth_role() = 'ADMIN');
CREATE POLICY "Settings Updatable" ON public.margin_settings FOR UPDATE TO authenticated USING (public.get_auth_role() = 'ADMIN');


-- ==========================================
-- 2. USER PROFILES
-- ==========================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles Selectable" ON public.user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Profiles Insertable" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (public.get_auth_role() = 'ADMIN');
CREATE POLICY "Profiles Updatable" ON public.user_profiles FOR UPDATE TO authenticated USING (public.get_auth_role() = 'ADMIN' OR id = auth.uid());


-- ==========================================
-- 3. FINANCIALS
-- ==========================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "Finance Selectable" ON public.payments FOR SELECT TO authenticated USING (public.get_auth_role() IN ('ADMIN', 'DISPATCH', 'SALES'));
CREATE POLICY "Finance Selectable" ON public.invoices FOR SELECT TO authenticated USING (public.get_auth_role() IN ('ADMIN', 'DISPATCH', 'SALES'));

-- INSERT
CREATE POLICY "Finance Insertable" ON public.payments FOR INSERT TO authenticated WITH CHECK (public.get_auth_role() IN ('ADMIN', 'DISPATCH', 'SALES'));
CREATE POLICY "Finance Insertable" ON public.invoices FOR INSERT TO authenticated WITH CHECK (public.get_auth_role() IN ('ADMIN', 'DISPATCH', 'SALES'));

-- UPDATE (incl. soft-delete)
CREATE POLICY "Finance Updatable" ON public.payments FOR UPDATE TO authenticated USING (public.get_auth_role() IN ('ADMIN', 'DISPATCH', 'SALES'));
CREATE POLICY "Finance Updatable" ON public.invoices FOR UPDATE TO authenticated USING (public.get_auth_role() IN ('ADMIN', 'DISPATCH', 'SALES'));


-- ==========================================
-- 4. OPPORTUNITIES
-- ==========================================
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Opportunities Selectable" ON public.opportunities FOR SELECT TO authenticated USING (
    public.get_auth_role() IN ('ADMIN', 'DISPATCH') OR assigned_salesperson_id = auth.uid()
);

CREATE POLICY "Opportunities Insertable" ON public.opportunities FOR INSERT TO authenticated WITH CHECK (
    public.get_auth_role() IN ('ADMIN', 'DISPATCH', 'SALES')
);

CREATE POLICY "Opportunities Updatable" ON public.opportunities FOR UPDATE TO authenticated USING (
    public.get_auth_role() IN ('ADMIN', 'DISPATCH') OR assigned_salesperson_id = auth.uid()
);


-- ==========================================
-- 5. WORK ORDERS
-- ==========================================
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Work Orders Selectable" ON public.work_orders FOR SELECT TO authenticated USING (
    public.get_auth_role() IN ('ADMIN', 'DISPATCH', 'SALES') OR assigned_tech_user_id = auth.uid()
);

CREATE POLICY "Work Orders Insertable" ON public.work_orders FOR INSERT TO authenticated WITH CHECK (
    public.get_auth_role() IN ('ADMIN', 'DISPATCH')
);

CREATE POLICY "Work Orders Updatable" ON public.work_orders FOR UPDATE TO authenticated USING (
    public.get_auth_role() IN ('ADMIN', 'DISPATCH') OR assigned_tech_user_id = auth.uid()
);
