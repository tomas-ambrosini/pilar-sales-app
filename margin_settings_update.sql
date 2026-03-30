-- Alter margin_settings table to add dynamic robust columns
ALTER TABLE public.margin_settings 
ADD COLUMN IF NOT EXISTS sales_tax numeric DEFAULT 0.07,
ADD COLUMN IF NOT EXISTS best_margin numeric DEFAULT 0.45,
ADD COLUMN IF NOT EXISTS better_margin numeric DEFAULT 0.40,
ADD COLUMN IF NOT EXISTS good_margin numeric DEFAULT 0.35,
ADD COLUMN IF NOT EXISTS service_reserve numeric DEFAULT 0.05;

-- Update the primary settings row (id 1) with production Pilar defaults
UPDATE public.margin_settings 
SET 
  sales_tax = 0.07,
  best_margin = 0.45,
  better_margin = 0.40,
  good_margin = 0.35,
  service_reserve = 0.05
WHERE id = 1;
