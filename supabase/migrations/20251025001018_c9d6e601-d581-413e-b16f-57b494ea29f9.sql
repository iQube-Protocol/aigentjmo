-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create knyt_personas table
CREATE TABLE public.knyt_personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    profile_image_url TEXT,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.knyt_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own knyt persona"
ON public.knyt_personas FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own knyt persona"
ON public.knyt_personas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knyt persona"
ON public.knyt_personas FOR UPDATE
USING (auth.uid() = user_id);

-- Create qripto_personas table
CREATE TABLE public.qripto_personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    profile_image_url TEXT,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.qripto_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own qripto persona"
ON public.qripto_personas FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own qripto persona"
ON public.qripto_personas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own qripto persona"
ON public.qripto_personas FOR UPDATE
USING (auth.uid() = user_id);

-- Create user_connections table
CREATE TABLE public.user_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    service TEXT NOT NULL,
    connection_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, service)
);

ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connections"
ON public.user_connections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connections"
ON public.user_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections"
ON public.user_connections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections"
ON public.user_connections FOR DELETE
USING (auth.uid() = user_id);

-- Create invited_users table
CREATE TABLE public.invited_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    invited_by UUID,
    invitation_code TEXT UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    used_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.invited_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all invitations"
ON public.invited_users FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage invitations"
ON public.invited_users FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create user_interactions table
CREATE TABLE public.user_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    interaction_type TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own interactions"
ON public.user_interactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interactions"
ON public.user_interactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all interactions"
ON public.user_interactions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create conversation_summaries table
CREATE TABLE public.conversation_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    summary_text TEXT,
    conversation_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own summaries"
ON public.conversation_summaries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own summaries"
ON public.conversation_summaries FOR ALL
USING (auth.uid() = user_id);

-- Create database functions
CREATE OR REPLACE FUNCTION public.count_direct_signups()
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT COUNT(*) FROM auth.users;
$$;

CREATE OR REPLACE FUNCTION public.get_expiring_invitations()
RETURNS TABLE (
    id UUID,
    email TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT id, email, expires_at, created_at
  FROM public.invited_users
  WHERE expires_at IS NOT NULL 
    AND expires_at < (now() + INTERVAL '7 days')
    AND used_at IS NULL
  ORDER BY expires_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_invitation_expiration_stats()
RETURNS TABLE (
    total_expiring BIGINT,
    expired_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    COUNT(*) FILTER (WHERE expires_at < (now() + INTERVAL '7 days') AND used_at IS NULL) as total_expiring,
    COUNT(*) FILTER (WHERE expires_at < now() AND used_at IS NULL) as expired_count
  FROM public.invited_users
  WHERE expires_at IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.extend_invitation_expiration(invitation_id UUID, days INTEGER)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE public.invited_users
  SET expires_at = expires_at + (days || ' days')::INTERVAL
  WHERE id = invitation_id;
$$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_knyt_personas_updated_at
BEFORE UPDATE ON public.knyt_personas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qripto_personas_updated_at
BEFORE UPDATE ON public.qripto_personas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_connections_updated_at
BEFORE UPDATE ON public.user_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversation_summaries_updated_at
BEFORE UPDATE ON public.conversation_summaries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();