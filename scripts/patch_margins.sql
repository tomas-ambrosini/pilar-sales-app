DROP POLICY IF EXISTS "Settings Updatable" ON public.margin_settings;
CREATE POLICY "Settings Updatable" ON public.margin_settings 
FOR UPDATE TO authenticated 
USING (public.get_auth_role() IN ('ADMIN', 'SUPER_ADMIN'));
