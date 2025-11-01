import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { X, Plus, Save, Eye } from 'lucide-react';
import { JMOREITKnowledgeItem } from '@/services/jmo-reit-knowledge-base/types';
import { jmoReitKB } from '@/services/jmo-reit-knowledge-base';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

interface REITCardEditorProps {
  isOpen: boolean;
  onClose: () => void;
  item?: JMOREITKnowledgeItem;
  mode: 'create' | 'edit';
}

const CATEGORIES = [
  'reit-basics',
  'reit-structure',
  'operator-iqubes',
  'shareholder-iqubes',
  'lender-iqubes',
  'reitqube-architecture',
  'defi-integration',
  'token-economics',
  'compliance',
  'strategic-positioning'
] as const;

export function REITCardEditor({ isOpen, onClose, item, mode }: REITCardEditorProps) {
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    content: '',
    section: '',
    category: 'reit-basics' as typeof CATEGORIES[number],
    keywords: [] as string[],
    source: '',
    connections: [] as string[],
    crossTags: [] as string[]
  });
  const [keywordInput, setKeywordInput] = useState('');
  const [connectionInput, setConnectionInput] = useState('');
  const [crossTagInput, setCrossTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('edit');

  useEffect(() => {
    if (item && mode === 'edit') {
      setFormData({
        id: item.id,
        title: item.title,
        content: item.content,
        section: item.section,
        category: item.category,
        keywords: item.keywords || [],
        source: item.source,
        connections: item.connections || [],
        crossTags: item.crossTags || []
      });
    } else {
      setFormData({
        id: '',
        title: '',
        content: '',
        section: '',
        category: 'reit-basics',
        keywords: [],
        source: '',
        connections: [],
        crossTags: []
      });
    }
  }, [item, mode, isOpen]);

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()]
      }));
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const handleAddConnection = () => {
    if (connectionInput.trim() && !formData.connections.includes(connectionInput.trim())) {
      setFormData(prev => ({
        ...prev,
        connections: [...prev.connections, connectionInput.trim()]
      }));
      setConnectionInput('');
    }
  };

  const handleRemoveConnection = (connection: string) => {
    setFormData(prev => ({
      ...prev,
      connections: prev.connections.filter(c => c !== connection)
    }));
  };

  const handleAddCrossTag = () => {
    if (crossTagInput.trim() && !formData.crossTags.includes(crossTagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        crossTags: [...prev.crossTags, crossTagInput.trim()]
      }));
      setCrossTagInput('');
    }
  };

  const handleRemoveCrossTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      crossTags: prev.crossTags.filter(t => t !== tag)
    }));
  };

  const syncToQubeBase = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('naka-kb-sync-reit', {
        body: { force_update: true }
      });

      if (error) throw error;

      toast.success('Successfully synced to QubeBase Core Hub');
      return true;
    } catch (error) {
      console.error('Error syncing to QubeBase:', error);
      toast.error('Failed to sync to QubeBase. Local changes were saved.');
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.id.trim()) {
      toast.error('Card ID is required');
      return;
    }
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('Content is required');
      return;
    }
    if (!formData.section.trim()) {
      toast.error('Section is required');
      return;
    }
    if (!formData.source.trim()) {
      toast.error('Source is required');
      return;
    }

    setIsSaving(true);

    try {
      let success = false;

      if (mode === 'create') {
        success = await jmoReitKB.addItem({
          id: formData.id,
          title: formData.title,
          content: formData.content,
          section: formData.section,
          category: formData.category,
          keywords: formData.keywords,
          source: formData.source,
          connections: formData.connections,
          crossTags: formData.crossTags
        });
      } else {
        success = await jmoReitKB.updateItem(formData.id, {
          title: formData.title,
          content: formData.content,
          section: formData.section,
          category: formData.category,
          keywords: formData.keywords,
          source: formData.source,
          connections: formData.connections,
          crossTags: formData.crossTags
        });
      }

      if (success) {
        toast.success(`REIT card ${mode === 'create' ? 'created' : 'updated'} successfully`);
        
        // Sync to QubeBase
        await syncToQubeBase();
        
        onClose();
      } else {
        toast.error(`Failed to ${mode === 'create' ? 'create' : 'update'} REIT card`);
      }
    } catch (error) {
      console.error('Error saving REIT card:', error);
      toast.error('An error occurred while saving');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New REIT Card' : 'Edit REIT Card'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full">
            <TabsTrigger value="edit" className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex-1">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="id">Card ID *</Label>
                  <Input
                    id="id"
                    value={formData.id}
                    onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                    placeholder="reit-example-card"
                    disabled={mode === 'edit'}
                  />
                </div>

                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter card title"
                  />
                </div>

                <div>
                  <Label htmlFor="content">Content * (Markdown supported)</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter card content in Markdown format"
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="section">Section *</Label>
                    <Input
                      id="section"
                      value={formData.section}
                      onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value }))}
                      placeholder="REIT Fundamentals"
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="source">Source *</Label>
                  <Input
                    id="source"
                    value={formData.source}
                    onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                    placeholder="JMO REIT Strategy Document v1.0"
                  />
                </div>

                <div>
                  <Label>Keywords</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                      placeholder="Add keyword and press Enter"
                    />
                    <Button type="button" onClick={handleAddKeyword} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.keywords.map(keyword => (
                      <Badge key={keyword} variant="secondary">
                        {keyword}
                        <button onClick={() => handleRemoveKeyword(keyword)} className="ml-2">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Connections (Related card IDs)</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={connectionInput}
                      onChange={(e) => setConnectionInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddConnection())}
                      placeholder="Add connection and press Enter"
                    />
                    <Button type="button" onClick={handleAddConnection} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.connections.map(connection => (
                      <Badge key={connection} variant="outline">
                        {connection}
                        <button onClick={() => handleRemoveConnection(connection)} className="ml-2">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Cross Tags</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={crossTagInput}
                      onChange={(e) => setCrossTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCrossTag())}
                      placeholder="Add cross tag and press Enter"
                    />
                    <Button type="button" onClick={handleAddCrossTag} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.crossTags.map(tag => (
                      <Badge key={tag} variant="outline">
                        {tag}
                        <button onClick={() => handleRemoveCrossTag(tag)} className="ml-2">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <h2>{formData.title || 'Untitled Card'}</h2>
                <div className="text-sm text-muted-foreground mb-4">
                  <strong>Section:</strong> {formData.section || 'N/A'} | 
                  <strong> Category:</strong> {formData.category} | 
                  <strong> Source:</strong> {formData.source || 'N/A'}
                </div>
                <ReactMarkdown>{formData.content || '*No content*'}</ReactMarkdown>
                {formData.keywords.length > 0 && (
                  <div className="mt-4">
                    <strong>Keywords:</strong>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.keywords.map(keyword => (
                        <Badge key={keyword} variant="secondary">{keyword}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving || isSyncing}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isSyncing}>
            {isSaving ? 'Saving...' : isSyncing ? 'Syncing...' : 'Save & Sync'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
