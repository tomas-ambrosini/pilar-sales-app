-- Phase 6/7: Multi-Location Architecture Upgrade
-- This script reverses the traditional 1-to-1 Household/Address constraint
-- allowing a single Customer Account (Household) to seamlessly own multiple Properties (Addresses).

BEGIN;

-- 1. Create a natural Foreign Key linking Address rows back to the primary Household (Account)
ALTER TABLE public.addresses 
ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE CASCADE;

-- 2. Create the ultra-flexible JSON payload to safely store isolated Home Details per property
ALTER TABLE public.addresses 
ADD COLUMN IF NOT EXISTS property_details JSONB DEFAULT '{}'::jsonb;

-- 2.5 Add a flag to visually separate the customer's personal home vs their rental/managed units
ALTER TABLE public.addresses 
ADD COLUMN IF NOT EXISTS is_primary_residence BOOLEAN DEFAULT FALSE;

-- 3. Live Data Migration Strategy: 
-- Non-destructively map all existing legacy Addresses to their owning Household IDs 
-- by reversing the constraint path from households.service_address_id
UPDATE public.addresses a
SET household_id = h.id, is_primary_residence = TRUE
FROM public.households h
WHERE h.service_address_id = a.id;

-- Note: We retain public.households.service_address_id structurally to handle 
-- legacy fallbacks during the core transition window without instantly breaking the CRM endpoints.

COMMIT;
