import React, { useEffect, useRef } from 'react';

const MetaAvatarTab: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Only load script once
    if (scriptLoadedRef.current) return;
    
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
    <div className="h-full w-full flex items-center justify-center">
      <div 
        id="did-avatar-container" 
        ref={containerRef}
        className="h-full w-full"
      />
    </div>
  );
};

export default MetaAvatarTab;
