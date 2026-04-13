-- Phase 12: Controlled Promo Code System

-- Create promo_codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    discount_percent NUMERIC(5,2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit >= 1),
    times_used INTEGER NOT NULL DEFAULT 0 CHECK (times_used >= 0),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Admins can manage promos (Insert/Update)
CREATE POLICY "Admins can manage promos" ON public.promo_codes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('super_admin', 'admin')
        )
    );

-- Everyone can read promos to validate
CREATE POLICY "Anyone can read promos" ON public.promo_codes
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Normalize promo code on insert/update
CREATE OR REPLACE FUNCTION normalize_promo_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.code := TRIM(UPPER(NEW.code));
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_normalize_promo_code ON public.promo_codes;
CREATE TRIGGER trigger_normalize_promo_code
    BEFORE INSERT OR UPDATE ON public.promo_codes
    FOR EACH ROW
    EXECUTE FUNCTION normalize_promo_code();

-- Alter proposals table to store promo snapshot
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposals' AND column_name='applied_promo_code') THEN
        ALTER TABLE public.proposals ADD COLUMN applied_promo_code TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposals' AND column_name='applied_discount_percent') THEN
        ALTER TABLE public.proposals ADD COLUMN applied_discount_percent NUMERIC(5,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposals' AND column_name='applied_promo_code_id') THEN
        ALTER TABLE public.proposals ADD COLUMN applied_promo_code_id UUID REFERENCES public.promo_codes(id);
    END IF;
END $$;

-- Trigger to safely increment times_used when proposal gets approved
CREATE OR REPLACE FUNCTION increment_promo_usage_on_approval()
RETURNS TRIGGER AS $$
DECLARE
    promo_record RECORD;
BEGIN
    -- Check if status changed from something else TO 'Approved'
    IF NEW.status = 'Approved' AND (OLD.status IS NULL OR OLD.status != 'Approved') THEN
        
        -- If proposal has an applied promo
        IF NEW.applied_promo_code_id IS NOT NULL THEN
            
            -- Lock the promo record to prevent race conditions
            SELECT * INTO promo_record 
            FROM public.promo_codes 
            WHERE id = NEW.applied_promo_code_id 
            FOR UPDATE;
            
            -- Validate expiration boundaries at exact time of approval
            IF promo_record.starts_at IS NOT NULL AND promo_record.starts_at > now() THEN
                RAISE EXCEPTION 'This promo code is not active yet.';
            END IF;
            
            IF promo_record.expires_at IS NOT NULL AND promo_record.expires_at < now() THEN
                RAISE EXCEPTION 'This promo code has expired.';
            END IF;

            IF promo_record.is_active = false THEN
                RAISE EXCEPTION 'This promo code is no longer active.';
            END IF;

            -- Validate usage limits
            IF promo_record.usage_limit IS NOT NULL AND promo_record.times_used >= promo_record.usage_limit THEN
                RAISE EXCEPTION 'Promo code usage limit reached.';
            END IF;
            
            -- Safe to increment
            UPDATE public.promo_codes 
            SET times_used = times_used + 1 
            WHERE id = NEW.applied_promo_code_id;
            
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_promo_usage ON public.proposals;
CREATE TRIGGER trigger_increment_promo_usage
    BEFORE UPDATE ON public.proposals
    FOR EACH ROW
    EXECUTE FUNCTION increment_promo_usage_on_approval();

