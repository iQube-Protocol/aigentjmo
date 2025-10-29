-- Add First-Name and Last-Name columns to persona tables

-- Add columns to knyt_personas
ALTER TABLE public.knyt_personas 
ADD COLUMN IF NOT EXISTS "First-Name" TEXT,
ADD COLUMN IF NOT EXISTS "Last-Name" TEXT;

-- Add columns to qripto_personas
ALTER TABLE public.qripto_personas 
ADD COLUMN IF NOT EXISTS "First-Name" TEXT,
ADD COLUMN IF NOT EXISTS "Last-Name" TEXT;

-- Update existing rows to populate First-Name from email if empty
UPDATE public.knyt_personas 
SET "First-Name" = COALESCE("First-Name", SPLIT_PART("Email", '@', 1))
WHERE "First-Name" IS NULL AND "Email" IS NOT NULL;

UPDATE public.qripto_personas 
SET "First-Name" = COALESCE("First-Name", SPLIT_PART("Email", '@', 1))
WHERE "First-Name" IS NULL AND "Email" IS NOT NULL;