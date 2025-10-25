-- Extend app_role enum to include additional roles used in code
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'uber_admin';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add missing columns to invited_users to match application expectations
ALTER TABLE public.invited_users 
  ADD COLUMN IF NOT EXISTS persona_type text,
  ADD COLUMN IF NOT EXISTS persona_data jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS email_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS batch_id text,
  ADD COLUMN IF NOT EXISTS send_attempts integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS signup_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Backfill invited_at from created_at when null
UPDATE public.invited_users 
SET invited_at = created_at 
WHERE invited_at IS NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_invited_users_email ON public.invited_users (email);
CREATE INDEX IF NOT EXISTS idx_invited_users_persona_type ON public.invited_users (persona_type);
CREATE INDEX IF NOT EXISTS idx_invited_users_expires_at ON public.invited_users (expires_at);

-- Add Email field expected by reconciliation code on personas
ALTER TABLE public.knyt_personas ADD COLUMN IF NOT EXISTS "Email" text;
ALTER TABLE public.qripto_personas ADD COLUMN IF NOT EXISTS "Email" text;

-- Add missing columns to user_interactions used by conversation service
ALTER TABLE public.user_interactions 
  ADD COLUMN IF NOT EXISTS query text,
  ADD COLUMN IF NOT EXISTS response text;

-- Create table for user_name_preferences used by connection-service
CREATE TABLE IF NOT EXISTS public.user_name_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_first_name text,
  preferred_last_name text,
  name_source text DEFAULT 'custom',
  linkedin_first_name text,
  linkedin_last_name text,
  twitter_username text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.user_name_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage their own name preferences" 
  ON public.user_name_preferences
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger to maintain updated_at
DO $$ BEGIN
  CREATE TRIGGER update_user_name_preferences_updated_at
  BEFORE UPDATE ON public.user_name_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;