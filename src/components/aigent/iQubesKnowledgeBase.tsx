
import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { iQubesKB } from '@/services/iqubes-knowledge-base';
import { coynKB } from '@/services/coyn-knowledge-base';
import { jmoReitKB } from '@/services/jmo-reit-knowledge-base';
import { TENANT_CONFIG } from '@/config/tenant';
import KnowledgeBaseSearch from './components/KnowledgeBaseSearch';
import KnowledgeList from './components/KnowledgeList';
import KnowledgeItemDialog from './components/KnowledgeItemDialog';
import SyncREITKBButton from './components/SyncREITKBButton';
import { useIsMobile } from '@/hooks/use-mobile';

const iQubesKnowledgeBase = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const isMobile = useIsMobile();
  
  // Check if this is the JMO tenant
  const isJMOTenant = TENANT_CONFIG.tenantId === 'aigent-jmo';

  // Get all knowledge items
  const iQubesItems = iQubesKB.getAllKnowledge();
  const coynItems = coynKB.getAllKnowledge();
  const reitItems = isJMOTenant ? jmoReitKB.getAllKnowledge() : [];

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

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 pt-4">
        <KnowledgeBaseSearch
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
        {isJMOTenant && (
          <div className="mt-2 flex justify-end">
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
      />
    </div>
  );
};

export default iQubesKnowledgeBase;
