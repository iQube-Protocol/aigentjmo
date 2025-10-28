
import React, { useRef } from 'react';
import { Send, Mic, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import ScoreTooltip from '../ScoreTooltips';
import { useIsMobile } from '@/hooks/use-mobile';

interface AgentInputBarProps {
  inputValue: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isProcessing: boolean;
  agentType: 'learn' | 'earn' | 'connect' | 'aigent';
  handleKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onAfterSubmit?: () => void;
  activeTab?: 'chat' | 'metaAvatar' | 'knowledge' | 'media';
}

const AgentInputBar = ({
  inputValue,
  handleInputChange,
  handleSubmit,
  isProcessing,
  agentType,
  handleKeyDown,
  onAfterSubmit,
  activeTab
}: AgentInputBarProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleVoiceInput = () => {
    toast({
      title: "Voice Input Activated",
      description: "Voice recognition is listening... (Simulated)",
    });
  };

  const handleAttachment = () => {
    toast({
      title: "Attach Files",
      description: "File attachment functionality coming soon.",
    });
  };

  // Enhanced form submit handler that calls the callback after submission
  const handleFormSubmit = (e: React.FormEvent) => {
    handleSubmit(e);
    // Call the callback after submission if provided
    if (onAfterSubmit) {
      onAfterSubmit();
    }
  };

  // Custom input change handler to adjust textarea height
  const customHandleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e);
    
    // Reset height to auto to properly calculate scrollHeight
    e.target.style.height = 'auto';
    
    // Set height based on content (with min height)
    const minHeight = 40; // in pixels
    const newHeight = Math.max(e.target.scrollHeight, minHeight);
    e.target.style.height = `${newHeight}px`;
  };

  return (
    <form onSubmit={handleFormSubmit} className="border-t p-4" style={{
      borderTopColor: 'hsl(267 100% 54% / 0.2)',
      background: 'linear-gradient(135deg, hsl(247 93% 28% / 0.03), hsl(267 100% 54% / 0.03))'
    }}>
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 flex items-center">
          <div className="absolute left-3 flex items-center space-x-2">
            <ScoreTooltip type="voice">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={handleVoiceInput}
              >
                <Mic className="h-4 w-4 text-muted-foreground" />
              </Button>
            </ScoreTooltip>
            
            <ScoreTooltip type="attachment">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={handleAttachment}
              >
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              </Button>
            </ScoreTooltip>
          </div>
          
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={customHandleInputChange}
            onKeyDown={handleKeyDown} 
            placeholder={
              activeTab === 'metaAvatar' 
                ? 'Ask Satoshi KNYT #1...' 
                : window.location.pathname === '/aigent' 
                  ? 'Ask JMO KNYT...' 
                  : `Ask your ${agentType} agent...`
            }
            className="pl-24 min-h-[40px] max-h-32 flex-1 pr-3 py-2 flex items-center font-montserrat border-[hsl(267_100%_54%_/_0.2)] focus-visible:ring-[hsl(267_100%_54%)]"
            style={{
              resize: 'none',
              paddingTop: inputValue ? '0.5rem' : '0.625rem', 
              paddingBottom: inputValue ? '0.5rem' : '0.625rem',
              lineHeight: '1.5',
              display: 'flex',
              alignItems: 'center',
              overflow: 'auto',
              background: 'linear-gradient(135deg, hsl(247 93% 28% / 0.05), hsl(267 100% 54% / 0.05))'
            }}
            disabled={isProcessing}
          />
        </div>
        
        <Button 
          type="submit" 
          size="icon" 
          className="jmo-send-button"
          disabled={!inputValue.trim() || isProcessing}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};

export default AgentInputBar;
