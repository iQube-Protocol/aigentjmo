-- Create approval queue table for REIT KB changes
CREATE TABLE public.reit_kb_approval_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to local record
  local_record_id UUID NOT NULL REFERENCES reit_knowledge_items(id) ON DELETE CASCADE,
  qubebase_doc_id UUID,
  
  -- Change tracking
  change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'delete')),
  
  -- Snapshot of proposed changes
  proposed_data JSONB NOT NULL,
  original_data JSONB,
  
  -- Workflow metadata
  submitted_by UUID NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  approval_status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  reviewer_notes TEXT,
  
  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_approval_queue_status ON reit_kb_approval_queue(approval_status);
CREATE INDEX idx_approval_queue_submitted_by ON reit_kb_approval_queue(submitted_by);
CREATE INDEX idx_approval_queue_local_record ON reit_kb_approval_queue(local_record_id);

-- Enable RLS
ALTER TABLE public.reit_kb_approval_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for approval queue
CREATE POLICY "Super admins view own submissions"
ON reit_kb_approval_queue FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) 
  AND submitted_by = auth.uid()
);

CREATE POLICY "Uber admins view all submissions"
ON reit_kb_approval_queue FOR SELECT
USING (has_role(auth.uid(), 'uber_admin'::app_role));

CREATE POLICY "Super admins can submit"
ON reit_kb_approval_queue FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  AND submitted_by = auth.uid()
);

CREATE POLICY "Uber admins can review"
ON reit_kb_approval_queue FOR UPDATE
USING (has_role(auth.uid(), 'uber_admin'::app_role));

-- Add new columns to reit_knowledge_items
ALTER TABLE reit_knowledge_items
ADD COLUMN is_seed_record BOOLEAN DEFAULT false,
ADD COLUMN qubebase_doc_id UUID,
ADD COLUMN last_synced_at TIMESTAMPTZ,
ADD COLUMN approval_status TEXT DEFAULT 'approved' 
  CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected')),
ADD COLUMN pending_approval_id UUID REFERENCES reit_kb_approval_queue(id),
ADD COLUMN approved_at TIMESTAMPTZ,
ADD COLUMN approved_by UUID;

CREATE INDEX idx_reit_kb_approval_status ON reit_knowledge_items(approval_status);
CREATE INDEX idx_reit_kb_is_seed ON reit_knowledge_items(is_seed_record);

-- Drop existing RLS policies for reit_knowledge_items to replace them
DROP POLICY IF EXISTS "Anyone can view active REIT knowledge items" ON reit_knowledge_items;
DROP POLICY IF EXISTS "Super admins can view all REIT knowledge items" ON reit_knowledge_items;
DROP POLICY IF EXISTS "Super admins can insert REIT knowledge items" ON reit_knowledge_items;
DROP POLICY IF EXISTS "Super admins can update REIT knowledge items" ON reit_knowledge_items;
DROP POLICY IF EXISTS "Super admins can delete REIT knowledge items" ON reit_knowledge_items;

-- New RLS policies for reit_knowledge_items with approval workflow
CREATE POLICY "View approved seed records"
ON reit_knowledge_items FOR SELECT
USING (
  is_active = true 
  AND approval_status = 'approved'
);

CREATE POLICY "Admins view all records"
ON reit_knowledge_items FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'uber_admin'::app_role)
);

CREATE POLICY "Super admins can edit all records"
ON reit_knowledge_items FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'uber_admin'::app_role)
);

CREATE POLICY "Super admins can insert new records"
ON reit_knowledge_items FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'uber_admin'::app_role)
);

CREATE POLICY "Uber admins can delete"
ON reit_knowledge_items FOR DELETE
USING (has_role(auth.uid(), 'uber_admin'::app_role));

-- Add trigger for updating updated_at on approval queue
CREATE TRIGGER update_reit_kb_approval_queue_updated_at
BEFORE UPDATE ON reit_kb_approval_queue
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();