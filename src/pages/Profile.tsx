import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserInteractionsOptimized } from '@/hooks/use-user-interactions-optimized';
import { getRelativeTime } from '@/lib/utils';
import ResponseDialog from '@/components/profile/ResponseDialog';
import NavigationAwareMessageContent from '@/components/profile/NavigationAwareMessageContent';
import { NameManagementSection } from '@/components/settings/NameManagementSection';
import { useSidebarState } from '@/hooks/use-sidebar-state';

const Profile = () => {
  const {
    user
  } = useAuth();
  const { selectedIQube } = useSidebarState();
  const [activeTab, setActiveTab] = useState<'all' | 'qripto' | 'knyt'>('all');
  const [selectedResponse, setSelectedResponse] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Determine persona type from selected iQube
  const getPersonaType = (): 'knyt' | 'qripto' | null => {
    if (selectedIQube === 'KNYT Persona') return 'knyt';
    if (selectedIQube === 'Qripto Persona') return 'qripto';
    return null;
  };

  const {
    interactions,
    loading,
    hasMore,
    loadMoreInteractions,
    refreshInteractions
  } = useUserInteractionsOptimized('all', {  // Always fetch all interactions
    batchSize: 10,
    enableProgressiveLoading: true,
    deferDuringNavigation: true
  });

  useEffect(() => {
    refreshInteractions();
  }, [activeTab, refreshInteractions]);

  // Refresh when persona selection changes
  useEffect(() => {
    // Force a re-render when selectedIQube changes
    setActiveTab(prev => prev); // Trigger state update
  }, [selectedIQube]);
  
  const handleResponseClick = (interaction: any) => {
    setSelectedResponse(interaction);
    setIsDialogOpen(true);
  };
  
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedResponse(null);
  };

  const getAgentName = (interactionType: string) => {
    switch (interactionType) {
      case 'aigent':
        return 'Nakamoto';
      case 'learn':
        return 'Learning';
      case 'earn':
        return 'Earning';
      case 'connect':
        return 'Connection';
      default:
        return interactionType;
    }
  };

  const processHistoricPreview = (content: string) => {
    return content
    .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/^\* /gm, '• ').replace(/^- /gm, '• ').replace(/^### (.+)$/gm, '$1:').replace(/^## (.+)$/gm, '$1:').replace(/^# (.+)$/gm, '$1:')
    .replace(/\n\n+/g, ' ').trim();
  };
  
  if (!user) return null;
  
  return (
    <TooltipProvider>
      <div className="min-h-screen w-full overflow-x-hidden">
        <div className="max-w-full px-3 sm:px-6 py-3 sm:py-6 space-y-4">
          {/* User info section - compressed */}
          <Card className="w-full">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg">Profile</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  {user.email.length > 25 ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="font-mono bg-muted px-1 py-0.5 rounded text-xs break-all cursor-help mt-1">
                          {user.email.substring(0, 20)}...
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{user.email}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div className="font-mono bg-muted px-1 py-0.5 rounded text-xs mt-1">
                      {user.email}
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">ID:</span>
                  <div className="font-mono bg-muted px-1 py-0.5 rounded text-xs break-all mt-1">
                    {user.id.substring(0, 8)}...
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Sign In:</span>
                  <div className="break-words mt-1">{getRelativeTime(new Date(user.last_sign_in_at || ''))}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <div className="break-words mt-1">{new Date(user.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Name Management Section */}
          <NameManagementSection 
            key={selectedIQube} 
            filterPersonaType={getPersonaType()} 
          />

        {/* Interaction history section - compressed */}
        <Card className="w-full">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-base sm:text-lg">History</CardTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              <button 
                onClick={() => setActiveTab('all')} 
                className={`px-3 py-1.5 text-xs sm:text-sm rounded transition-colors ${
                  activeTab === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                }`}
              >
                All
              </button>
              <button 
                onClick={() => setActiveTab('qripto')} 
                className={`px-3 py-1.5 text-xs sm:text-sm rounded transition-colors ${
                  activeTab === 'qripto' ? 'bg-qripto-primary text-white' : 'bg-muted hover:bg-muted/80'
                }`}
              >
                Qripto
              </button>
              <button 
                onClick={() => setActiveTab('knyt')} 
                className={`px-3 py-1.5 text-xs sm:text-sm rounded transition-colors ${
                  activeTab === 'knyt' ? 'bg-knyt-primary text-white' : 'bg-muted hover:bg-muted/80'
                }`}
              >
                KNYT
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6 pb-3">
            <ScrollArea className="h-[250px] sm:h-[300px] w-full">
              <div className="space-y-3 pr-2">
                {interactions && interactions.length > 0 ? interactions.filter(interaction => {
                  if (activeTab === 'all') return true;
                  if (activeTab === 'qripto') {
                    // Check both new activePersona field and legacy metadata flags
                    return (interaction.metadata?.activePersona === 'Qripto Persona') || 
                           (interaction.metadata?.personaContextUsed && !interaction.metadata?.metaKnytsContextUsed);
                  }
                  if (activeTab === 'knyt') {
                    // Check both new activePersona field and legacy metadata flags
                    return (interaction.metadata?.activePersona === 'KNYT Persona') || 
                           interaction.metadata?.metaKnytsContextUsed;
                  }
                  return true;
                }).map(interaction => (
                  <div key={interaction.id} className="w-full overflow-hidden">
                    {/* User Query */}
                     {interaction.query && (
                       <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-r from-[hsl(247,93%,28%)]/[0.04] to-[hsl(267,100%,54%)]/[0.04] border-l-4 border-[hsl(267,100%,54%)]/[0.1] mb-2 overflow-hidden">
                         <div className="flex flex-col gap-1 mb-2">
                           <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-orange-200 bg-gray-500 border-orange-400 w-fit text-xs">
                               You asked
                             </Badge>
                             <span className="text-xs text-muted-foreground">
                               {new Date(interaction.created_at).toLocaleString()}
                             </span>
                           </div>
                         </div>
                         <div className="text-xs sm:text-sm text-zinc-100 break-words overflow-wrap-anywhere">
                           <div className="max-w-full overflow-hidden">
                             <NavigationAwareMessageContent content={interaction.query} sender="user" />
                           </div>
                         </div>
                      </div>
                    )}
                    
                    {/* Agent Response Preview */}
                    {interaction.response && (
                      <div className="p-2 sm:p-3 rounded-lg bg-[#23223f]/[0.32] cursor-pointer hover:bg-[#23223f]/[0.45] transition-colors border-l-4 border-indigo-400 overflow-hidden" onClick={() => handleResponseClick(interaction)}>
                         <div className="flex flex-col gap-1 mb-2">
                            <div className="flex items-center gap-2">
                               <Badge variant="secondary" className="bg-qripto-primary w-fit text-xs">
                                 Nakamoto
                               </Badge>
                              {interaction.metadata?.aiProvider && (
                                <Badge variant="outline" className="bg-green-100 text-green-800 w-fit text-xs">
                                  {interaction.metadata.aiProvider === 'Venice AI (Uncensored)' ? 'Venice AI' : interaction.metadata.aiProvider}
                                </Badge>
                              )}
                              {interaction.metadata?.modelUsed && (
                                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                                  {interaction.metadata.modelUsed}
                                </Badge>
                              )}
                            </div>
                           {interaction.metadata && (
                             <div className="flex flex-wrap gap-1">
                               {interaction.metadata.qryptoItemsFound > 0 && (
                                 <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                                   {interaction.metadata.qryptoItemsFound} KB items
                                 </Badge>
                               )}
                             </div>
                           )}
                         </div>
                        
                        <div className="text-xs sm:text-sm break-words overflow-wrap-anywhere">
                          {interaction.response.length > 200 ? (
                            <div className="max-w-full overflow-hidden">
                              <p className="text-foreground leading-relaxed">
                                {processHistoricPreview(interaction.response.substring(0, 200))}...
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                <span>Click to view full response</span>
                                {interaction.response.includes('```mermaid') && (
                                  <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 ml-1">
                                    Contains diagram
                                  </Badge>
                                )}
                              </p>
                            </div>
                           ) : (
                             <div className="max-w-full overflow-hidden">
                                <NavigationAwareMessageContent 
                                  content={interaction.response} 
                                  sender="agent" 
                                  messageId={interaction.id}
                                />
                             </div>
                           )}
                        </div>
                      </div>
                    )}
                  </div>
                 )) : loading ? (
                   <div className="text-center p-4">
                     <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-2"></div>
                     <p className="text-xs sm:text-sm text-muted-foreground">Loading conversations...</p>
                   </div>
                 ) : (
                     <div className="text-center p-4">
                        <p className="text-xs sm:text-sm">
                          No {activeTab === 'all' ? '' : activeTab === 'qripto' ? 'Qripto ' : 'KNYT '}conversations found.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activeTab === 'all' 
                            ? 'Start a conversation with Nakamoto to see your history here.'
                            : `Start a conversation with the ${activeTab === 'qripto' ? 'Qripto' : 'KNYT'} persona to see your history here.`
                          }
                        </p>
                     </div>
                 )}
                 
                 {/* Progressive loading button */}
                 {hasMore && !loading && (
                   <div className="text-center p-4">
                     <button
                       onClick={loadMoreInteractions}
                       className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                     >
                       Load More Conversations
                     </button>
                   </div>
                 )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        </div>

        <ResponseDialog selectedResponse={selectedResponse} isOpen={isDialogOpen} onClose={handleDialogClose} />
      </div>
    </TooltipProvider>
  );
};

export default Profile;