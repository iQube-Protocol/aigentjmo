
import { JMOREITKnowledgeItem } from './types';
import { JMO_REIT_KNOWLEDGE_DATA } from './knowledge-data';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export class JMOREITKnowledgeBase {
  private static instance: JMOREITKnowledgeBase;
  private knowledgeItems: JMOREITKnowledgeItem[] = [];
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private realtimeChannel: RealtimeChannel | null = null;

  private constructor() {
    // Initialize async
    this.initPromise = this.initializeKnowledgeBase();
  }

  public static getInstance(): JMOREITKnowledgeBase {
    if (!JMOREITKnowledgeBase.instance) {
      JMOREITKnowledgeBase.instance = new JMOREITKnowledgeBase();
    }
    return JMOREITKnowledgeBase.instance;
  }

  private async initializeKnowledgeBase() {
    try {
      // Fetch from database first
      const dbItems = await this.fetchFromDatabase();
      
      if (dbItems && dbItems.length > 0) {
        this.knowledgeItems = dbItems;
      } else {
        // Fall back to hardcoded data if database is empty
        console.log('No REIT KB items in database, using hardcoded data');
        this.knowledgeItems = [...JMO_REIT_KNOWLEDGE_DATA];
      }
      
      // Set up realtime subscription
      this.setupRealtimeSubscription();
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing REIT KB:', error);
      // Fall back to hardcoded data on error
      this.knowledgeItems = [...JMO_REIT_KNOWLEDGE_DATA];
      this.isInitialized = true;
    }
  }

  private async fetchFromDatabase(): Promise<JMOREITKnowledgeItem[]> {
    const { data, error } = await supabase
      .from('reit_knowledge_items')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching REIT KB from database:', error);
      return [];
    }

    // Transform database records to knowledge items
    return (data || []).map(item => ({
      id: item.reit_id,
      title: item.title,
      content: item.content,
      section: item.section,
      category: item.category as any,
      keywords: item.keywords || [],
      timestamp: item.timestamp || new Date().toISOString(),
      source: item.source,
      connections: item.connections || [],
      crossTags: item.cross_tags || []
    }));
  }

  private setupRealtimeSubscription() {
    this.realtimeChannel = supabase
      .channel('reit_knowledge_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reit_knowledge_items'
        },
        () => {
          // Refresh data when changes occur
          this.refreshFromDatabase();
        }
      )
      .subscribe();
  }

  public async refreshFromDatabase(): Promise<void> {
    const dbItems = await this.fetchFromDatabase();
    if (dbItems && dbItems.length > 0) {
      this.knowledgeItems = dbItems;
    }
  }

  public async ensureInitialized(): Promise<void> {
    if (!this.isInitialized && this.initPromise) {
      await this.initPromise;
    }
  }

  public addKnowledgeItems(items: JMOREITKnowledgeItem[]) {
    this.knowledgeItems.push(...items);
  }

  public async addItem(item: Omit<JMOREITKnowledgeItem, 'timestamp'>): Promise<boolean> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('reit_knowledge_items')
        .insert({
          reit_id: item.id,
          title: item.title,
          content: item.content,
          section: item.section,
          category: item.category,
          keywords: item.keywords || [],
          source: item.source,
          connections: item.connections || [],
          cross_tags: item.crossTags || [],
          created_by: userData?.user?.id,
          updated_by: userData?.user?.id
        });

      if (error) {
        console.error('Error adding REIT KB item:', error);
        return false;
      }

      await this.refreshFromDatabase();
      return true;
    } catch (error) {
      console.error('Error in addItem:', error);
      return false;
    }
  }

  public async updateItem(id: string, updates: Partial<JMOREITKnowledgeItem>): Promise<boolean> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // First check if this is a seed record
      const { data: existingRecord } = await supabase
        .from('reit_knowledge_items')
        .select('is_seed_record, approval_status')
        .eq('reit_id', id)
        .single();

      const updateData: any = {
        updated_by: userData?.user?.id
      };

      if (updates.title) updateData.title = updates.title;
      if (updates.content) updateData.content = updates.content;
      if (updates.section) updateData.section = updates.section;
      if (updates.category) updateData.category = updates.category;
      if (updates.keywords) updateData.keywords = updates.keywords;
      if (updates.source) updateData.source = updates.source;
      if (updates.connections) updateData.connections = updates.connections;
      if (updates.crossTags) updateData.cross_tags = updates.crossTags;

      // If it's a seed record, mark as draft (requires approval)
      if (existingRecord?.is_seed_record) {
        updateData.approval_status = 'draft';
        console.log('🔒 Seed record edited - marked as draft, requires approval');
      }

      const { error } = await supabase
        .from('reit_knowledge_items')
        .update(updateData)
        .eq('reit_id', id);

      if (error) {
        console.error('Error updating REIT KB item:', error);
        return false;
      }

      await this.refreshFromDatabase();
      
      // Show appropriate toast based on record type
      if (existingRecord?.is_seed_record) {
        const { toast } = await import('sonner');
        toast.info('Changes saved as draft', {
          description: 'Submit for uber admin approval to update QubeBase'
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error in updateItem:', error);
      return false;
    }
  }

  /**
   * Get count of draft changes pending submission
   */
  public async getDraftCount(): Promise<number> {
    try {
      const { count } = await supabase
        .from('reit_knowledge_items')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'draft');
      
      return count || 0;
    } catch (error) {
      console.error('Error getting draft count:', error);
      return 0;
    }
  }

  /**
   * Submit draft changes for approval
   */
  public async submitDraftsForApproval(recordIds: string[]): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('naka-reit-kb-submit-changes', {
        body: { record_ids: recordIds }
      });

      if (error) {
        console.error('Error submitting for approval:', error);
        return false;
      }

      if (data.success) {
        const { toast } = await import('sonner');
        toast.success('Changes submitted for approval', {
          description: `${data.submissions.length} items pending uber admin review`
        });
        await this.refreshFromDatabase();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error in submitDraftsForApproval:', error);
      return false;
    }
  }

  public async deleteItem(id: string): Promise<boolean> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Check if user is uber_admin (only they can delete seed records)
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userData?.user?.id || '')
        .eq('role', 'uber_admin')
        .single();

      const { data: existingRecord } = await supabase
        .from('reit_knowledge_items')
        .select('is_seed_record')
        .eq('reit_id', id)
        .single();

      if (existingRecord?.is_seed_record && !roleData) {
        console.error('Only uber admins can delete seed records');
        const { toast } = await import('sonner');
        toast.error('Permission denied', {
          description: 'Only uber admins can delete seed records'
        });
        return false;
      }
      
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('reit_knowledge_items')
        .update({
          is_active: false,
          updated_by: userData?.user?.id
        })
        .eq('reit_id', id);

      if (error) {
        console.error('Error deleting REIT KB item:', error);
        return false;
      }

      await this.refreshFromDatabase();
      return true;
    } catch (error) {
      console.error('Error in deleteItem:', error);
      return false;
    }
  }

  public cleanup() {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
    }
  }

  public searchKnowledge(query: string): JMOREITKnowledgeItem[] {
    const queryLower = query.toLowerCase();
    const searchTerms = queryLower.split(' ');
    
    return this.knowledgeItems.filter(item => {
      const searchableText = `${item.title} ${item.content} ${item.keywords.join(' ')} ${item.crossTags?.join(' ') || ''}`.toLowerCase();
      return searchTerms.some(term => 
        searchableText.includes(term) ||
        item.keywords.some(keyword => keyword.toLowerCase().includes(term)) ||
        item.crossTags?.some(tag => tag.toLowerCase().includes(term))
      );
    }).sort((a, b) => {
      // Sort by relevance - items with more keyword matches first
      const aMatches = searchTerms.filter(term => 
        `${a.title} ${a.content} ${a.keywords.join(' ')} ${a.crossTags?.join(' ') || ''}`.toLowerCase().includes(term)
      ).length;
      const bMatches = searchTerms.filter(term => 
        `${b.title} ${b.content} ${b.keywords.join(' ')} ${b.crossTags?.join(' ') || ''}`.toLowerCase().includes(term)
      ).length;
      return bMatches - aMatches;
    });
  }

  public getAllKnowledge(): JMOREITKnowledgeItem[] {
    return this.knowledgeItems;
  }

  public getKnowledgeByCategory(category: JMOREITKnowledgeItem['category']): JMOREITKnowledgeItem[] {
    return this.knowledgeItems.filter(item => item.category === category);
  }

  /**
   * Get knowledge items that should appear in other knowledge base tabs based on crossTags
   */
  public getKnowledgeByCrossTag(tag: string): JMOREITKnowledgeItem[] {
    return this.knowledgeItems.filter(item => 
      item.crossTags?.some(t => t.toLowerCase() === tag.toLowerCase())
    );
  }
}
