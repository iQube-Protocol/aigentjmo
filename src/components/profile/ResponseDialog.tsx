
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import MessageContent from '@/components/shared/agent/message/MessageContent';

interface ResponseDialogProps {
  selectedResponse: any;
  isOpen: boolean;
  onClose: () => void;
}

const ResponseDialog = ({ selectedResponse, isOpen, onClose }: ResponseDialogProps) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="pr-8">Historic Conversation</DialogTitle>
          <DialogDescription className="text-xs flex items-center gap-2">
            <Badge variant="outline" className="bg-iqube-primary/20 text-iqube-primary border-iqube-primary/30">
              {getAgentName(selectedResponse?.interaction_type)}
            </Badge>
            {selectedResponse?.metadata?.aiProvider && (
              <>
                <span>•</span>
                <Badge variant="outline" className="text-xs bg-[hsl(267_100%_54%_/_0.12)] text-[hsl(267_100%_25%)] border-[hsl(267_100%_54%_/_0.3)]">
                  {selectedResponse.metadata.aiProvider === 'Venice AI (Uncensored)' ? 'Venice AI' : selectedResponse.metadata.aiProvider}
                </Badge>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 pr-6 space-y-6">
            {selectedResponse?.query && (
              <div className="historic-response user-theme">
                <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                  <Badge variant="outline" className="bg-[hsl(267_100%_54%_/_0.12)] text-[hsl(267_100%_25%)] border-[hsl(267_100%_54%_/_0.3)]">
                    Your Question
                  </Badge>
                  <span>•</span>
                  <span>{selectedResponse?.created_at ? new Date(selectedResponse.created_at).toLocaleString() : ''}</span>
                </h4>
                <div className="p-4 rounded-lg" style={{ background: 'linear-gradient(135deg, hsl(247 93% 28% / 0.08), hsl(267 100% 54% / 0.08))', borderLeft: '4px solid hsl(267 100% 54% / 0.6)' }}>
                  <div className="conversational-content">
                    <MessageContent content={selectedResponse.query} sender="user" />
                  </div>
                </div>
              </div>
            )}
            
            {selectedResponse?.response && (
              <div className="historic-response agent-theme">
                <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                   <Badge variant="secondary" className="bg-iqube-primary text-white">
                     Nakamoto
                   </Badge>
                   {selectedResponse?.metadata?.modelUsed && (
                     <Badge variant="outline" className="text-xs bg-[hsl(267_100%_54%_/_0.12)] text-[hsl(267_100%_25%)] border-[hsl(267_100%_54%_/_0.3)]">
                       {selectedResponse.metadata.modelUsed}
                     </Badge>
                   )}
                  {selectedResponse.metadata && (
                    <div className="flex gap-1">
                      {selectedResponse.metadata.qryptoItemsFound > 0 && (
                        <Badge variant="outline" className="text-xs bg-[hsl(267_100%_54%_/_0.12)] text-[hsl(267_100%_25%)] border-[hsl(267_100%_54%_/_0.3)]">
                          {selectedResponse.metadata.qryptoItemsFound} KB items found
                        </Badge>
                      )}
                      {selectedResponse.metadata.metaKnytsItemsFound > 0 && (
                        <Badge variant="outline" className="text-xs bg-[hsl(257_90%_60%_/_0.12)] text-[hsl(257_90%_30%)] border-[hsl(257_90%_60%_/_0.3)]">
                          {selectedResponse.metadata.metaKnytsItemsFound} mẹtaKnyts items
                        </Badge>
                      )}
                    </div>
                  )}
                </h4>
                <div className="p-4 rounded-lg" style={{ background: 'linear-gradient(135deg, hsl(247 93% 28% / 0.08), hsl(267 100% 54% / 0.08))', borderLeft: '4px solid hsl(267 100% 54% / 0.6)' }}>
                  <div className="conversational-content">
                    <MessageContent content={selectedResponse.response} sender="agent" />
                  </div>
                </div>
              </div>
            )}
            
            {/* Metadata section if available */}
            {selectedResponse?.metadata?.citations && selectedResponse.metadata.citations.length > 0 && (
              <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                <h5 className="font-medium mb-2 text-sm text-slate-700 dark:text-slate-300">Sources & Citations:</h5>
                <div className="space-y-2">
                  {selectedResponse.metadata.citations.map((citation: string, index: number) => (
                    <div key={index} className="text-xs text-slate-600 dark:text-slate-400 p-2 bg-white dark:bg-slate-700 rounded border-l-3 border-slate-300 dark:border-slate-600">
                      {citation}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="border-t pt-3 flex justify-end flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResponseDialog;
