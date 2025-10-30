-- Create table for REIT Knowledge Base items
CREATE TABLE public.reit_knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reit_id TEXT UNIQUE NOT NULL, -- Original card ID like 'reit-fundamentals-overview'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  section TEXT NOT NULL,
  category TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL,
  connections TEXT[] DEFAULT '{}',
  cross_tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.reit_knowledge_items ENABLE ROW LEVEL SECURITY;

-- Public read access (authenticated users can view active items)
CREATE POLICY "Anyone can view active REIT knowledge items"
  ON public.reit_knowledge_items
  FOR SELECT
  USING (is_active = true);

-- Super admins can view all items (including inactive)
CREATE POLICY "Super admins can view all REIT knowledge items"
  ON public.reit_knowledge_items
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can insert
CREATE POLICY "Super admins can insert REIT knowledge items"
  ON public.reit_knowledge_items
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can update
CREATE POLICY "Super admins can update REIT knowledge items"
  ON public.reit_knowledge_items
  FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can delete (soft delete preferred)
CREATE POLICY "Super admins can delete REIT knowledge items"
  ON public.reit_knowledge_items
  FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create updated_at trigger
CREATE TRIGGER update_reit_knowledge_items_updated_at
  BEFORE UPDATE ON public.reit_knowledge_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_reit_knowledge_items_reit_id ON public.reit_knowledge_items(reit_id);
CREATE INDEX idx_reit_knowledge_items_category ON public.reit_knowledge_items(category);
CREATE INDEX idx_reit_knowledge_items_is_active ON public.reit_knowledge_items(is_active);
CREATE INDEX idx_reit_knowledge_items_keywords ON public.reit_knowledge_items USING GIN(keywords);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.reit_knowledge_items;