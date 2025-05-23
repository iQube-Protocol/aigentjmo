
import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Database, Bot, FolderGit2 } from 'lucide-react';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import CubeIcon from './CubeIcon';
import { QubeItem } from './sidebarData';
import { useIsMobile } from '@/hooks/use-mobile';

interface IQubesSectionProps {
  iQubeItems: QubeItem[];
  iQubesOpen: boolean;
  toggleIQubesMenu: () => void;
  collapsed: boolean;
  selectedIQube: string | null;
  activeQubes: {[key: string]: boolean};
  handleIQubeClick: (iqubeId: string) => void;
  toggleIQubeActive: (e: React.MouseEvent<HTMLDivElement>, qubeName: string) => void;
  location: { pathname: string };
  toggleMobileSidebar?: () => void;  // Add this line to accept the toggleMobileSidebar prop
}

const IQubesSection: React.FC<IQubesSectionProps> = ({
  iQubeItems,
  iQubesOpen,
  toggleIQubesMenu,
  collapsed,
  selectedIQube,
  activeQubes,
  handleIQubeClick,
  toggleIQubeActive,
  location,
  toggleMobileSidebar
}) => {
  const isMobile = useIsMobile();
  
  // Function to render iQube type icon based on type
  const renderIQubeTypeIcon = (type: string) => {
    switch(type) {
      case 'DataQube':
        return <Database className="h-4 w-4 text-blue-500" />;
      case 'AgentQube':
        return <Bot className="h-4 w-4 text-purple-500" />;
      case 'ToolQube':
        return <FolderGit2 className="h-4 w-4 text-green-500" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const handleIQubeItemClick = (iqubeId: string) => {
    handleIQubeClick(iqubeId);
    
    // If on mobile, also close the sidebar
    if (isMobile && toggleMobileSidebar) {
      toggleMobileSidebar();
    }
  };

  if (collapsed) {
    return (
      <div className="pt-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center justify-center p-2 rounded-md hover:bg-accent/30 cursor-pointer",
                  location.pathname.includes('/qubes') && "bg-accent/20"
                )}
                onClick={toggleIQubesMenu}
              >
                <CubeIcon className="h-5 w-5" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">iQubes</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className="pt-2">
      <Collapsible
        open={iQubesOpen}
        onOpenChange={toggleIQubesMenu}
        className="border-t pt-2"
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between p-2 hover:bg-accent/30 rounded-md">
          <div className="flex items-center">
            <CubeIcon className="h-5 w-5 mr-2" />
            <span className="text-sm font-medium">iQubes</span>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            iQubesOpen && "transform rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-1 space-y-1">
          {iQubeItems.map((qube) => (
            <div 
              key={qube.id}
              className={cn(
                "flex items-center justify-between px-2 py-1.5 text-sm rounded-md hover:bg-accent/30 cursor-pointer",
                location.pathname === '/settings' && selectedIQube === qube.name && "bg-accent/20"
              )}
              onClick={() => handleIQubeItemClick(qube.name)}
            >
              <div className="flex items-center flex-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="mr-2">
                        {renderIQubeTypeIcon(qube.type)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {qube.type}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="mr-2">{qube.name}</span>
              </div>
              <div 
                className="switch-container" 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleIQubeActive(e, qube.name);
                }}
              >
                <Switch 
                  size="sm" 
                  checked={activeQubes[qube.name] || false}
                  className="data-[state=checked]:bg-iqube-primary"
                />
              </div>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default IQubesSection;
