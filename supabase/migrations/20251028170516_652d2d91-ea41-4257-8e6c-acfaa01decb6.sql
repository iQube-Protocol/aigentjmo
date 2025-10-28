-- Add uber_admin role for dele@metame.com (estate-wide admin)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'uber_admin'::app_role
FROM auth.users
WHERE email = 'dele@metame.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Add super_admin role for nakamoto@jaredmooss.com (site admin)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
WHERE email = 'nakamoto@jaredmooss.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Add index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON public.user_roles(user_id, role);