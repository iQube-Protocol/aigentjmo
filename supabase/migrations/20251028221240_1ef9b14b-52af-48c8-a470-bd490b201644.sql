-- Add persona_type column to user_name_preferences to support per-persona preferences
ALTER TABLE public.user_name_preferences
ADD COLUMN persona_type text CHECK (persona_type IN ('knyt', 'qripto'));

-- Update existing records to default to 'knyt' (or you can set based on your needs)
UPDATE public.user_name_preferences
SET persona_type = 'knyt'
WHERE persona_type IS NULL;

-- Make persona_type NOT NULL after setting default values
ALTER TABLE public.user_name_preferences
ALTER COLUMN persona_type SET NOT NULL;

-- Drop old unique constraint if exists and create new composite unique constraint
-- This ensures one preference record per user per persona
DO $$ 
BEGIN
  -- Try to drop the constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_name_preferences_user_id_key'
  ) THEN
    ALTER TABLE public.user_name_preferences 
    DROP CONSTRAINT user_name_preferences_user_id_key;
  END IF;
END $$;

-- Add composite unique constraint for user_id + persona_type
ALTER TABLE public.user_name_preferences
ADD CONSTRAINT user_name_preferences_user_id_persona_type_key 
UNIQUE (user_id, persona_type);