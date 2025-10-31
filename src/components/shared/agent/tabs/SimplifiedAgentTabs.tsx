import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, ChevronDown, MessageSquare, BookOpen, Play, User, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ChatTab from './ChatTab';
import KnowledgeBase from '../KnowledgeBase';
import IQubesKnowledgeBase from '@/components/aigent/iQubesKnowledgeBase';
import MetaAvatarTab from '../MetaAvatarTab';
import AgentInputBar from '../AgentInputBar';
import { AgentMessage } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { iframeSessionManager } from '@/services/iframe-session-manager';

interface SimplifiedAgentTabsProps {
  activeTab: 'chat' | 'metaAvatar' | 'knowledge' | 'media';
  setActiveTab: (tab: 'chat' | 'metaAvatar' | 'knowledge' | 'media') => void;
  messages: AgentMessage[];
  inputValue: string;
  isProcessing: boolean;
  playing: string | null;
  agentType: 'learn' | 'earn' | 'connect' | 'aigent';
  messagesEndRef: React.RefObject<HTMLDivElement>;
  conversationId: string | null;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handlePlayAudio: (messageId: string) => void;
  handleKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  recommendations?: {
    showVeniceRecommendation: boolean;
    showQryptoRecommendation: boolean;
    showKNYTRecommendation: boolean;
  };
  dismissRecommendation?: (agentName: string) => void;
  hideRecommendation?: (agentName: string) => void;
}

const SimplifiedAgentTabs: React.FC<SimplifiedAgentTabsProps & {
  onActivateAgent?: (agentName: string, fee: number, description: string) => void;
}> = ({
  activeTab,
  setActiveTab,
  messages,
  inputValue,
  isProcessing,
  playing,
  agentType,
  messagesEndRef,
  conversationId,
  handleInputChange,
  handleSubmit,
  handlePlayAudio,
  handleKeyDown,
  recommendations,
  dismissRecommendation,
  hideRecommendation,
  onActivateAgent
}) => {
  const isMobile = useIsMobile();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // State for tabs menu collapse - default to collapsed when media tab is active
  const [tabsCollapsed, setTabsCollapsed] = useState(activeTab === 'media');
  // Use global iframe session manager instead of local state
  const [mediaInitialized, setMediaInitialized] = useState(iframeSessionManager.isMediaInitialized());
  const [sessionRecovering, setSessionRecovering] = useState(false);
  // Key to force remount of MetaAvatarTab
  const [metaAvatarKey, setMetaAvatarKey] = useState(0);

  // Setup iframe ref with session manager
  useEffect(() => {
    if (iframeRef.current && mediaInitialized) {
      iframeSessionManager.setIframeRef(iframeRef.current);
      
      // Request auth state if we think we have session
      if (iframeSessionManager.hasAuthState()) {
        setSessionRecovering(true);
        setTimeout(() => {
          iframeSessionManager.requestAuthState();
          setSessionRecovering(false);
        }, 2000);
      }
    }
  }, [mediaInitialized]);

  // Update collapse state when activeTab changes to media
  useEffect(() => {
    if (activeTab === 'media') {
      setTabsCollapsed(true);
      // Update global state when media tab is accessed
      if (!mediaInitialized) {
        iframeSessionManager.setMediaInitialized(true);
        setMediaInitialized(true);
      }
    }
  }, [activeTab, mediaInitialized]);

  // Function to handle tab switching after form submission
  const handleAfterSubmit = () => {
    // Always switch to chat tab when a message is sent
    setActiveTab('chat');
  };

  // Convert 'aigent' to 'learn' for KnowledgeBase component
  const knowledgeBaseAgentType = agentType === 'aigent' ? 'learn' : agentType;

  return (
    <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'chat' | 'metaAvatar' | 'knowledge' | 'media')} className="flex-1 flex flex-col h-full">
      <div className="border-b px-4">
        <div className="flex items-center justify-between">
          {!tabsCollapsed ? (
            <TabsList className="h-10 gap-0">
              <TabsTrigger value="chat" className="data-[state=active]:bg-qrypto-primary/20 px-3">Chat</TabsTrigger>
              <TabsTrigger value="metaAvatar" className="data-[state=active]:bg-qrypto-primary/20 px-3">metaVatar</TabsTrigger>
              <TabsTrigger value="knowledge" className="data-[state=active]:bg-qrypto-primary/20 px-3">KB</TabsTrigger>
              <TabsTrigger value="media" className="data-[state=active]:bg-qrypto-primary/20 px-3">Media</TabsTrigger>
            </TabsList>
          ) : (
            <div className="h-10 flex items-center">
              {activeTab === 'chat' && <MessageSquare className="h-4 w-4 cursor-pointer hover:text-qrypto-primary" onClick={() => setTabsCollapsed(false)} />}
              {activeTab === 'metaAvatar' && <User className="h-4 w-4 cursor-pointer hover:text-qrypto-primary" onClick={() => setTabsCollapsed(false)} />}
              {activeTab === 'knowledge' && <BookOpen className="h-4 w-4 cursor-pointer hover:text-qrypto-primary" onClick={() => setTabsCollapsed(false)} />}
              {activeTab === 'media' && <Play className="h-4 w-4 cursor-pointer hover:text-qrypto-primary" onClick={() => setTabsCollapsed(false)} />}
            </div>
          )}
          
          <div className="flex items-center gap-3">
            {/* Show Dual Knowledge Base header only when knowledge tab is active and agent is aigent */}
            {activeTab === 'knowledge' && agentType === 'aigent' && !tabsCollapsed && (
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="h-5 w-5 text-gray-400 cursor-help flex items-center justify-center text-sm font-medium">3</div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Explore iQubes technical knowledge, COYN economic framework, and REIT knowledge bases</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            
            {/* Refresh button for metaAvatar tab */}
            {activeTab === 'metaAvatar' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        console.info('MetaAvatar: forcing full page reload');
                        try { window.location.href = window.location.href; } catch (e) { console.warn('href reload failed', e); }
                        try { window.location.reload(); } catch (e) { console.warn('window reload failed', e); }
                        try {
                          if (window.parent && window.parent !== window) {
                            (window.parent as any).location.href = (window.parent as any).location.href;
                          }
                        } catch (e) { console.warn('parent reload failed', e); }
                        try {
                          if (window.top && window.top !== window) {
                            (window.top as any).location.href = (window.top as any).location.href;
                          }
                        } catch (e) { console.warn('top reload failed', e); }
                      }}
                      className="h-8 w-8"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reload page</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Processing indicator */}
            {isProcessing && (
              <div className="relative">
                <div className="w-5 h-5 rounded-full border-2 border-qrypto-primary/20 relative overflow-hidden">
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-qrypto-primary animate-spin"></div>
                  <div className="absolute inset-1 rounded-full bg-qrypto-primary/30 animate-pulse"></div>
                  <div className="absolute inset-2 rounded-full bg-qrypto-primary/60 animate-ping"></div>
                </div>
              </div>
            )}
            
            {/* Collapse button */}
            <Button variant="ghost" size="icon" onClick={() => setTabsCollapsed(!tabsCollapsed)} className="h-8 w-8">
              <ChevronDown className={cn("h-4 w-4 transition-transform", tabsCollapsed && "transform rotate-180")} />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col relative">
        <TabsContent value="chat" className="h-full m-0 p-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col flex-1">
          <ChatTab 
            messages={messages} 
            playing={playing} 
            agentType={agentType} 
            messagesEndRef={messagesEndRef} 
            handlePlayAudio={handlePlayAudio}
            recommendations={recommendations}
            onActivateAgent={onActivateAgent}
            onDismissRecommendation={dismissRecommendation}
          />
        </TabsContent>

        <TabsContent value="metaAvatar" className="h-full m-0 p-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col flex-1">
          <MetaAvatarTab key={metaAvatarKey} />
        </TabsContent>

        <TabsContent value="knowledge" className="h-full m-0 p-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col flex-1">
          {agentType === 'aigent' ? <IQubesKnowledgeBase /> : <KnowledgeBase agentType={knowledgeBaseAgentType} />}
        </TabsContent>

        <TabsContent value="media" className="h-full m-0 p-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col flex-1">
          {/* Empty content - iframe is handled by persistent container below */}
        </TabsContent>

        {/* Persistent iframe for media tab - always mounted but visibility controlled using global state */}
        {mediaInitialized && (
          <div 
            className={cn(
              "absolute inset-0 z-10",
              activeTab === 'media' ? 'block' : 'hidden'
            )}
            style={{ 
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              padding: isMobile ? '0' : '1rem'
            }}
          >
            <div className="h-full w-full relative">
              {sessionRecovering && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-20">
                  <div className="text-sm text-muted-foreground">Restoring session...</div>
                </div>
              )}
              <iframe 
                ref={iframeRef}
                src="https://www.sizzleperks.com/embed/hqusgMObjXJ9" 
                width="100%" 
                height="100%" 
                allow="camera; microphone; display-capture; fullscreen"
                allowFullScreen
                style={{
                  height: isMobile ? '120vh' : '100vh',
                  maxHeight: '100%',
                  width: '100%',
                  maxWidth: '100%',
                  border: 'none',
                  outline: 'none'
                }}
                className="border-0"
                aria-hidden={activeTab !== 'media'}
              />
            </div>
          </div>
        )}
      </div>

      {/* Input bar moved outside of tabs, always visible with improved mobile support */}
      <div className="mt-auto">
        <AgentInputBar 
          inputValue={inputValue} 
          handleInputChange={handleInputChange} 
          handleSubmit={handleSubmit} 
          isProcessing={isProcessing} 
          agentType={agentType} 
          handleKeyDown={handleKeyDown} 
          onAfterSubmit={handleAfterSubmit}
          activeTab={activeTab}
        />
      </div>
    </Tabs>
  );
};

export default SimplifiedAgentTabs;
