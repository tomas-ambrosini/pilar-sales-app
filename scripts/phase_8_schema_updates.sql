-- Run this in your Supabase SQL Editor to natively attach Walter's SKU numbers and inventory tracking to your catalog.

ALTER TABLE public.labor_rates ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.labor_rates ADD COLUMN IF NOT EXISTS in_stock_quantity INTEGER DEFAULT 0;
