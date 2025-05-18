
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChatTab from './ChatTab';
import DocumentContext from '../DocumentContext';
import KnowledgeBase from '../KnowledgeBase';
import AgentInputBar from '../AgentInputBar';
import { AgentMessage } from '@/lib/types';

interface AgentTabsProps {
  activeTab: 'chat' | 'knowledge' | 'documents';
  setActiveTab: (tab: 'chat' | 'knowledge' | 'documents') => void;
  messages: AgentMessage[];
  inputValue: string;
  isProcessing: boolean;
  playing: string | null;
  agentType: 'learn' | 'earn' | 'connect' | 'mondai';
  messagesEndRef: React.RefObject<HTMLDivElement>;
  conversationId: string | null;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handlePlayAudio: (messageId: string) => void;
  handleDocumentAdded: () => void;
  documentUpdates?: number; // Track document updates
}

const AgentTabs: React.FC<AgentTabsProps> = ({
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
  handleDocumentAdded,
  documentUpdates = 0
}) => {
  // Function to handle form submission and switch to chat tab
  const handleFormSubmit = (e: React.FormEvent) => {
    handleSubmit(e);
    // Always switch to chat tab when a message is sent
    setActiveTab('chat');
  };

  // Convert 'mondai' to 'learn' for KnowledgeBase component
  const knowledgeBaseAgentType = agentType === 'mondai' ? 'learn' : agentType;

  return (
    <Tabs 
      value={activeTab} 
      onValueChange={(v) => setActiveTab(v as 'chat' | 'knowledge' | 'documents')}
      className="flex-1 flex flex-col h-full"
    >
      <div className="border-b px-4">
        <TabsList className="h-10">
          <TabsTrigger value="chat" className="data-[state=active]:bg-iqube-primary/20">Chat</TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-iqube-primary/20">Tool</TabsTrigger>
          <TabsTrigger value="knowledge" className="data-[state=active]:bg-iqube-primary/20">Knowledge Base</TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <TabsContent value="chat" className="h-full m-0 p-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col flex-1">
          <ChatTab 
            messages={messages}
            playing={playing}
            agentType={agentType}
            messagesEndRef={messagesEndRef}
            handlePlayAudio={handlePlayAudio}
          />
        </TabsContent>
        
        <TabsContent value="documents" className="h-full m-0 p-4 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col flex-1">
          <DocumentContext 
            conversationId={conversationId}
            onDocumentAdded={handleDocumentAdded}
            documentUpdates={documentUpdates}
          />
        </TabsContent>

        <TabsContent value="knowledge" className="h-full m-0 p-4 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col flex-1">
          <KnowledgeBase agentType={knowledgeBaseAgentType} />
        </TabsContent>
      </div>

      {/* Input bar moved outside of tabs, always visible */}
      <div className="mt-auto">
        <AgentInputBar
          inputValue={inputValue}
          handleInputChange={handleInputChange}
          handleSubmit={handleFormSubmit}
          isProcessing={isProcessing}
          agentType={agentType}
        />
      </div>
    </Tabs>
  );
};

export default AgentTabs;
