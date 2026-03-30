-- dispatch_details_schema.sql
-- Inject notes field into the main unified Opportunities pipeline

ALTER TABLE public.opportunities 
ADD COLUMN IF NOT EXISTS dispatch_notes TEXT;
