import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Edit } from 'lucide-react';
import MessageContent from '@/components/shared/agent/message/MessageContent';
import { useAdminCheck } from '@/hooks/use-admin-check';

interface KnowledgeItemDialogProps {
  selectedItem: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (item: any) => void;
}

const KnowledgeItemDialog = ({
  selectedItem,
  isOpen,
  onClose,
  onEdit
}: KnowledgeItemDialogProps) => {
  const { isAdmin } = useAdminCheck();
  
  // Check if this is a REIT card (has reit-related category or source)
  const isREITCard = selectedItem?.category?.includes('reit') || 
                     selectedItem?.source?.includes('REIT') ||
                     selectedItem?.section?.includes('REIT');
  
  const canEdit = isAdmin && isREITCard && onEdit;
  return <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="pr-8">{selectedItem?.title}</DialogTitle>
              <DialogDescription className="text-xs">
                Source: {selectedItem?.source} • Type: {selectedItem?.type}
              </DialogDescription>
            </div>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(selectedItem)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 pr-6">
            {selectedItem?.content && <MessageContent content={selectedItem.content} sender="agent" />}
            {selectedItem?.keywords && selectedItem.keywords.length > 0 && <div className="mb-4 mt-6 p-3 border-l-4 border-blue-400 rounded-r-lg bg-zinc-700">
                <h4 className="font-medium mb-2 text-indigo-400">Related Keywords:</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedItem.keywords.map((keyword: string) => <Badge key={keyword} variant="secondary" className="text-xs bg-blue-100/30 text-slate-200 hover:bg-blue-200/40 font-normal">
                      {keyword}
                    </Badge>)}
                </div>
              </div>}
            {selectedItem?.connections && selectedItem.connections.length > 0 && <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-400 rounded-r-lg">
                <h4 className="font-medium mb-2 text-green-800">Connected Concepts:</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedItem.connections.map((connection: string) => <Badge key={connection} variant="outline" className="text-xs bg-green-100/30 text-green-700 border-green-300/40 hover:bg-green-200/40 font-normal">
                      {connection}
                    </Badge>)}
                </div>
              </div>}
          </div>
        </ScrollArea>
        
        <div className="border-t pt-2 flex justify-end flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>;
};
export default KnowledgeItemDialog;