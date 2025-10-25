-- Create user_roles table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') THEN
    CREATE TABLE public.user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        role app_role NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        UNIQUE (user_id, role)
    );
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create security definer function to check roles (using app_role enum)
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
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Users can view their own roles') THEN
    CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Admins can view all roles') THEN
    CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Admins can insert roles') THEN
    CREATE POLICY "Admins can insert roles"
    ON public.user_roles FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Admins can delete roles') THEN
    CREATE POLICY "Admins can delete roles"
    ON public.user_roles FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Create knyt_personas table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'knyt_personas') THEN
    CREATE TABLE public.knyt_personas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE,
        profile_image_url TEXT,
        display_name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    ALTER TABLE public.knyt_personas ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create qripto_personas table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'qripto_personas') THEN
    CREATE TABLE public.qripto_personas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE,
        profile_image_url TEXT,
        display_name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    ALTER TABLE public.qripto_personas ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create user_connections table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_connections') THEN
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
  END IF;
END $$;

-- Create invited_users table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invited_users') THEN
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
  END IF;
END $$;

-- Create user_interactions table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_interactions') THEN
    CREATE TABLE public.user_interactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        interaction_type TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create conversation_summaries table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversation_summaries') THEN
    CREATE TABLE public.conversation_summaries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        summary_text TEXT,
        conversation_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create RLS policies for all tables
DO $$
BEGIN
  -- knyt_personas policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'knyt_personas' AND policyname = 'Users can view their own knyt persona') THEN
    CREATE POLICY "Users can view their own knyt persona"
    ON public.knyt_personas FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'knyt_personas' AND policyname = 'Users can insert their own knyt persona') THEN
    CREATE POLICY "Users can insert their own knyt persona"
    ON public.knyt_personas FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'knyt_personas' AND policyname = 'Users can update their own knyt persona') THEN
    CREATE POLICY "Users can update their own knyt persona"
    ON public.knyt_personas FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  -- qripto_personas policies  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'qripto_personas' AND policyname = 'Users can view their own qripto persona') THEN
    CREATE POLICY "Users can view their own qripto persona"
    ON public.qripto_personas FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'qripto_personas' AND policyname = 'Users can insert their own qripto persona') THEN
    CREATE POLICY "Users can insert their own qripto persona"
    ON public.qripto_personas FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'qripto_personas' AND policyname = 'Users can update their own qripto persona') THEN
    CREATE POLICY "Users can update their own qripto persona"
    ON public.qripto_personas FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  -- user_connections policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_connections' AND policyname = 'Users can view their own connections') THEN
    CREATE POLICY "Users can view their own connections"
    ON public.user_connections FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_connections' AND policyname = 'Users can insert their own connections') THEN
    CREATE POLICY "Users can insert their own connections"
    ON public.user_connections FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_connections' AND policyname = 'Users can update their own connections') THEN
    CREATE POLICY "Users can update their own connections"
    ON public.user_connections FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_connections' AND policyname = 'Users can delete their own connections') THEN
    CREATE POLICY "Users can delete their own connections"
    ON public.user_connections FOR DELETE
    USING (auth.uid() = user_id);
  END IF;

  -- invited_users policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invited_users' AND policyname = 'Admins can view all invitations') THEN
    CREATE POLICY "Admins can view all invitations"
    ON public.invited_users FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invited_users' AND policyname = 'Admins can manage invitations') THEN
    CREATE POLICY "Admins can manage invitations"
    ON public.invited_users FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  -- user_interactions policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_interactions' AND policyname = 'Users can view their own interactions') THEN
    CREATE POLICY "Users can view their own interactions"
    ON public.user_interactions FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_interactions' AND policyname = 'Users can insert their own interactions') THEN
    CREATE POLICY "Users can insert their own interactions"
    ON public.user_interactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_interactions' AND policyname = 'Admins can view all interactions') THEN
    CREATE POLICY "Admins can view all interactions"
    ON public.user_interactions FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  -- conversation_summaries policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversation_summaries' AND policyname = 'Users can view their own summaries') THEN
    CREATE POLICY "Users can view their own summaries"
    ON public.conversation_summaries FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversation_summaries' AND policyname = 'Users can manage their own summaries') THEN
    CREATE POLICY "Users can manage their own summaries"
    ON public.conversation_summaries FOR ALL
    USING (auth.uid() = user_id);
  END IF;
END $$;

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

-- Add triggers for updated_at (drop first if they exist)
DROP TRIGGER IF EXISTS update_knyt_personas_updated_at ON public.knyt_personas;
CREATE TRIGGER update_knyt_personas_updated_at
BEFORE UPDATE ON public.knyt_personas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_qripto_personas_updated_at ON public.qripto_personas;
CREATE TRIGGER update_qripto_personas_updated_at
BEFORE UPDATE ON public.qripto_personas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_connections_updated_at ON public.user_connections;
CREATE TRIGGER update_user_connections_updated_at
BEFORE UPDATE ON public.user_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversation_summaries_updated_at ON public.conversation_summaries;
CREATE TRIGGER update_conversation_summaries_updated_at
BEFORE UPDATE ON public.conversation_summaries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();