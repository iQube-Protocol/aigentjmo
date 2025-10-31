
import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { iQubesKB } from '@/services/iqubes-knowledge-base';
import { coynKB } from '@/services/coyn-knowledge-base';
import { jmoReitKB } from '@/services/jmo-reit-knowledge-base';
import { TENANT_CONFIG } from '@/config/tenant';
import KnowledgeBaseSearch from './components/KnowledgeBaseSearch';
import KnowledgeList from './components/KnowledgeList';
import KnowledgeItemDialog from './components/KnowledgeItemDialog';
import SyncREITKBButton from './components/SyncREITKBButton';
import { REITCardEditor } from '@/components/admin/REITCardEditor';
import { useAdminCheck } from '@/hooks/use-admin-check';
import { useIsMobile } from '@/hooks/use-mobile';

const iQubesKnowledgeBase = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [isInitialized, setIsInitialized] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0);
  const { isAdmin } = useAdminCheck();
  const isMobile = useIsMobile();
  
  // Check if this is the JMO tenant
  const isJMOTenant = TENANT_CONFIG.tenantId === 'aigent-jmo';

  // Initialize knowledge bases (only REIT KB needs async init)
  useEffect(() => {
    const initializeKnowledgeBases = async () => {
      try {
        console.log('🔄 Initializing knowledge bases...');
        if (isJMOTenant) {
          await jmoReitKB.ensureInitialized();
        }
        console.log('✅ Knowledge bases initialized');
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Error initializing knowledge bases:', error);
        setIsInitialized(true); // Still show UI even if there's an error
      }
    };

    initializeKnowledgeBases();
  }, [isJMOTenant, forceRefresh]);

  // Get all knowledge items (only after initialization)
  const iQubesItems = isInitialized ? iQubesKB.getAllKnowledge() : [];
  const coynItems = isInitialized ? coynKB.getAllKnowledge() : [];
  const reitItems = (isInitialized && isJMOTenant) ? jmoReitKB.getAllKnowledge() : [];

  // Filter items based on search
  const filteredIQubesItems = searchTerm ? iQubesKB.searchKnowledge(searchTerm) : iQubesItems;
  const filteredCOYNItems = searchTerm ? coynKB.searchKnowledge(searchTerm) : coynItems;
  const filteredREITItems = (isJMOTenant && searchTerm) ? jmoReitKB.searchKnowledge(searchTerm) : reitItems;

  // Calculate the count for the "All" tab
  const allTabCount = isJMOTenant 
    ? (searchTerm ? filteredIQubesItems.length + filteredCOYNItems.length + filteredREITItems.length : iQubesItems.length + coynItems.length + reitItems.length)
    : (searchTerm ? filteredIQubesItems.length + filteredCOYNItems.length : iQubesItems.length + coynItems.length);

  const handleItemClick = (item: any) => {
    setSelectedItem(item);
  };

  const closeDialog = () => {
    setSelectedItem(null);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setEditorMode('edit');
    setEditorOpen(true);
    setSelectedItem(null);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setEditorMode('create');
    setEditorOpen(true);
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    setEditingItem(null);
    // Trigger refresh to reload data from database
    setForceRefresh(prev => prev + 1);
  };

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading Knowledge Base...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 pt-4">
        <KnowledgeBaseSearch
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
        {isJMOTenant && isAdmin && (
          <div className="mt-2 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreate}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add REIT Card
            </Button>
            <SyncREITKBButton />
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="mx-4 mt-4 overflow-x-auto">
          <TabsList className={`inline-flex min-w-full ${isJMOTenant ? 'grid grid-cols-4' : 'grid grid-cols-3'} md:w-full`}>
            <TabsTrigger value="all" className="whitespace-nowrap text-xs sm:text-sm">All ({allTabCount})</TabsTrigger>
            <TabsTrigger value="iqubes" className="whitespace-nowrap text-xs sm:text-sm">iQubes ({filteredIQubesItems.length})</TabsTrigger>
            <TabsTrigger value="coyn" className="whitespace-nowrap text-xs sm:text-sm">COYN ({filteredCOYNItems.length})</TabsTrigger>
            {isJMOTenant && (
              <TabsTrigger value="reits" className="whitespace-nowrap text-xs sm:text-sm">REITs ({filteredREITItems.length})</TabsTrigger>
            )}
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="all" className="mt-0 h-full overflow-hidden">
            <KnowledgeList
              filteredQryptoItems={[...filteredIQubesItems, ...filteredREITItems]}
              filteredMetaKnytsItems={filteredCOYNItems}
              searchTerm={searchTerm}
              onItemClick={handleItemClick}
              showBothSections={true}
            />
          </TabsContent>

          <TabsContent value="iqubes" className="mt-0 h-full overflow-hidden">
            <KnowledgeList
              filteredQryptoItems={filteredIQubesItems}
              filteredMetaKnytsItems={[]}
              searchTerm={searchTerm}
              onItemClick={handleItemClick}
              showBothSections={false}
            />
          </TabsContent>

          <TabsContent value="coyn" className="mt-0 h-full overflow-hidden">
            <KnowledgeList
              filteredQryptoItems={[]}
              filteredMetaKnytsItems={filteredCOYNItems}
              searchTerm={searchTerm}
              onItemClick={handleItemClick}
              showBothSections={false}
            />
          </TabsContent>

          {isJMOTenant && (
            <TabsContent value="reits" className="mt-0 h-full overflow-hidden">
              <KnowledgeList
                filteredQryptoItems={filteredREITItems}
                filteredMetaKnytsItems={[]}
                searchTerm={searchTerm}
                onItemClick={handleItemClick}
                showBothSections={false}
              />
            </TabsContent>
          )}
        </div>
      </Tabs>

      <KnowledgeItemDialog
        selectedItem={selectedItem}
        isOpen={!!selectedItem}
        onClose={closeDialog}
        onEdit={handleEdit}
      />

      {isJMOTenant && isAdmin && (
        <REITCardEditor
          isOpen={editorOpen}
          onClose={handleEditorClose}
          item={editingItem}
          mode={editorMode}
        />
      )}
    </div>
  );
};

export default iQubesKnowledgeBase;
