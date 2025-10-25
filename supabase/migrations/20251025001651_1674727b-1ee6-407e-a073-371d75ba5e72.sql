-- Fix security warnings by setting search_path on all functions

-- Fix count_direct_signups function
CREATE OR REPLACE FUNCTION public.count_direct_signups()
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) FROM auth.users;
$$;

-- Fix get_expiring_invitations function
CREATE OR REPLACE FUNCTION public.get_expiring_invitations()
RETURNS TABLE (
    id UUID,
    email TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, email, expires_at, created_at
  FROM public.invited_users
  WHERE expires_at IS NOT NULL 
    AND expires_at < (now() + INTERVAL '7 days')
    AND used_at IS NULL
  ORDER BY expires_at ASC;
$$;

-- Fix get_invitation_expiration_stats function
CREATE OR REPLACE FUNCTION public.get_invitation_expiration_stats()
RETURNS TABLE (
    total_expiring BIGINT,
    expired_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(*) FILTER (WHERE expires_at < (now() + INTERVAL '7 days') AND used_at IS NULL) as total_expiring,
    COUNT(*) FILTER (WHERE expires_at < now() AND used_at IS NULL) as expired_count
  FROM public.invited_users
  WHERE expires_at IS NOT NULL;
$$;

-- Fix extend_invitation_expiration function
CREATE OR REPLACE FUNCTION public.extend_invitation_expiration(invitation_id UUID, days INTEGER)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.invited_users
  SET expires_at = expires_at + (days || ' days')::INTERVAL
  WHERE id = invitation_id;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;