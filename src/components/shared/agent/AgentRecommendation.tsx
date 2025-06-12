
import React from 'react';
import { CheckCircle2, AlertTriangle, Cpu, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

interface AgentRecommendationProps {
  agentName: string;
  description: string;
  fee: number;
  onActivate: () => void;
  onDismiss: () => void;
}

const AgentRecommendation = ({
  agentName,
  description,
  fee,
  onActivate,
  onDismiss
}: AgentRecommendationProps) => {
  // Calculate USD equivalent (500 satoshi = 50 cents = $0.50)
  const usdEquivalent = (fee / 10 / 100).toFixed(2);

  return (
    <Card className="p-4 border-iqube-primary/30 bg-iqube-primary/5 min-w-[320px] max-w-[380px] flex-shrink-0">
      <div className="flex items-start space-x-3">
        <div className="bg-iqube-accent/20 p-2 rounded-full">
          <Cpu className="h-6 w-6 text-iqube-accent" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <h4 className="text-base font-semibold truncate">Advanced Agent Available: {agentName}</h4>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="ml-2 bg-amber-500/20 px-2 py-0.5 rounded-full flex items-center flex-shrink-0">
                    <span className="text-[10px] font-medium text-amber-600">TOKEN-GATED</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">This agent requires token payment to activate</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
          
          <div className="mt-3 flex items-center text-sm text-muted-foreground">
            <Wallet className="h-4 w-4 mr-1" />
            <span>Monthly fee: {fee} Satoshi (≈ ${usdEquivalent})</span>
          </div>
          
          <div className="mt-4 flex space-x-3">
            <Button 
              size="sm" 
              onClick={onActivate}
              className="bg-iqube-primary hover:bg-iqube-primary/90 flex-1"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Activate Agent
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onDismiss}
              className="flex-shrink-0"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AgentRecommendation;
