
-- Fix RLS policies for invited_users to work with actual admin roles
DROP POLICY IF EXISTS "Admins can view all invitations" ON invited_users;
DROP POLICY IF EXISTS "Admins can manage invitations" ON invited_users;

-- Create new policies that check for super_admin or uber_admin
CREATE POLICY "Super and uber admins can view all invitations"
ON invited_users
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'uber_admin'::app_role)
);

CREATE POLICY "Super and uber admins can manage invitations"
ON invited_users
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'uber_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'uber_admin'::app_role)
);

-- Do the same for email_batches table
DROP POLICY IF EXISTS "Admins can view all email batches" ON email_batches;
DROP POLICY IF EXISTS "Admins can manage email batches" ON email_batches;

CREATE POLICY "Super and uber admins can view email batches"
ON email_batches
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'uber_admin'::app_role)
);

CREATE POLICY "Super and uber admins can manage email batches"
ON email_batches
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'uber_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'uber_admin'::app_role)
);
