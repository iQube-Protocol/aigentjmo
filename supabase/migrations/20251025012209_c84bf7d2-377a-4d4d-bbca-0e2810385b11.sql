-- Create email_batches table for tracking batch invitation operations
CREATE TABLE IF NOT EXISTS public.email_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id text UNIQUE NOT NULL,
  total_emails integer NOT NULL DEFAULT 0,
  emails_sent integer DEFAULT 0,
  emails_failed integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_batches ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage batches
CREATE POLICY "Admins can manage email batches"
ON public.email_batches
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all batches
CREATE POLICY "Admins can view all email batches"
ON public.email_batches
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_email_batches_updated_at
BEFORE UPDATE ON public.email_batches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_email_batches_batch_id ON public.email_batches (batch_id);
CREATE INDEX IF NOT EXISTS idx_email_batches_status ON public.email_batches (status);
CREATE INDEX IF NOT EXISTS idx_email_batches_created_at ON public.email_batches (created_at DESC);