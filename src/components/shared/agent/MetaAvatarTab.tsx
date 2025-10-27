import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';

const MetaAvatarTab: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  const hasBeenLoadedRef = useRef(false);
  const [showReloadNotice, setShowReloadNotice] = useState(false);

  useEffect(() => {
    // If avatar was previously loaded, show reload notice
    if (hasBeenLoadedRef.current) {
      setShowReloadNotice(true);
      return;
    }

    // Only load script once
    if (scriptLoadedRef.current) return;
    
    hasBeenLoadedRef.current = true;
    
    const containerId = 'did-avatar-container';
    
    // Create script element
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://agent.d-id.com/v2/index.js';
    script.setAttribute('data-mode', 'full');
    script.setAttribute('data-client-key', 'Z29vZ2xlLW9hdXRoMnwxMDcyNjU3ODI2NjQ5ODgyODU4MDk6YkoxSDdROEp5S2Q1Mk1CbEx0ODE2');
    script.setAttribute('data-agent-id', 'v2_agt_K6rQNYxY');
    script.setAttribute('data-name', 'did-agent');
    script.setAttribute('data-monitor', 'true');
    script.setAttribute('data-target-id', containerId);

    // Append script to body
    document.body.appendChild(script);
    scriptLoadedRef.current = true;

    // Cleanup function
    return () => {
      // Remove script when component unmounts
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      scriptLoadedRef.current = false;
    };
  }, []);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center">
      {showReloadNotice && (
        <div className="flex items-center gap-2 p-4 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">
            Please reload the page to reactivate the avatar interface.
          </p>
        </div>
      )}
      <div 
        id="did-avatar-container" 
        ref={containerRef}
        className="h-full w-full"
      />
    </div>
  );
};

export default MetaAvatarTab;
