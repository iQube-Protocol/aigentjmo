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

-- Drop and recreate get_invitation_expiration_stats with correct return type
DROP FUNCTION IF EXISTS public.get_invitation_expiration_stats();
CREATE FUNCTION public.get_invitation_expiration_stats()
RETURNS TABLE(
  total_active bigint,
  total_expired bigint,
  expiring_soon_7_days bigint,
  expiring_soon_3_days bigint,
  expiring_today bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    COUNT(*) FILTER (
      WHERE used_at IS NULL AND (expires_at IS NULL OR expires_at >= now())
    ) AS total_active,
    COUNT(*) FILTER (
      WHERE used_at IS NULL AND expires_at IS NOT NULL AND expires_at < now()
    ) AS total_expired,
    COUNT(*) FILTER (
      WHERE used_at IS NULL AND expires_at IS NOT NULL 
        AND expires_at < (now() + INTERVAL '7 days')
        AND expires_at >= now()
    ) AS expiring_soon_7_days,
    COUNT(*) FILTER (
      WHERE used_at IS NULL AND expires_at IS NOT NULL 
        AND expires_at < (now() + INTERVAL '3 days')
        AND expires_at >= now()
    ) AS expiring_soon_3_days,
    COUNT(*) FILTER (
      WHERE used_at IS NULL AND expires_at IS NOT NULL 
        AND expires_at::date = now()::date
    ) AS expiring_today
  FROM public.invited_users;
$function$;

-- Drop and recreate get_expiring_invitations to accept days_ahead and return richer data
DROP FUNCTION IF EXISTS public.get_expiring_invitations();
CREATE FUNCTION public.get_expiring_invitations(days_ahead integer DEFAULT 7)
RETURNS TABLE(
  id uuid,
  email text,
  persona_type text,
  expires_at timestamptz,
  created_at timestamptz,
  days_until_expiry integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    iu.id,
    iu.email,
    iu.persona_type,
    iu.expires_at,
    iu.created_at,
    GREATEST(CEIL(EXTRACT(EPOCH FROM (iu.expires_at - now())) / 86400)::int, 0) AS days_until_expiry
  FROM public.invited_users iu
  WHERE iu.expires_at IS NOT NULL
    AND iu.used_at IS NULL
    AND iu.expires_at < (now() + make_interval(days => days_ahead))
  ORDER BY iu.expires_at ASC;
$function$;

-- Replace extend_invitation_expiration to support bulk operations by email list
DROP FUNCTION IF EXISTS public.extend_invitation_expiration(uuid, integer);
CREATE FUNCTION public.extend_invitation_expiration(email_list text[], extend_days integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_updated integer := 0;
BEGIN
  IF email_list IS NULL THEN
    UPDATE public.invited_users
    SET expires_at = COALESCE(expires_at, now()) + (extend_days || ' days')::interval
    WHERE used_at IS NULL AND expires_at IS NOT NULL AND expires_at < now();
    GET DIAGNOSTICS v_updated = ROW_COUNT;
  ELSE
    UPDATE public.invited_users
    SET expires_at = COALESCE(expires_at, now()) + (extend_days || ' days')::interval
    WHERE email = ANY(email_list) AND used_at IS NULL;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
  END IF;

  RETURN json_build_object('updated_count', v_updated, 'success', true);
END;
$function$;