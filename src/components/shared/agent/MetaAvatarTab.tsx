import React, { useEffect, useRef } from 'react';

const MetaAvatarTab: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    const containerId = 'did-avatar-container';
    
    // Clear container
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    
    // Remove any existing D-ID scripts
    const existingScripts = document.querySelectorAll('script[src*="agent.d-id.com"]');
    existingScripts.forEach(script => script.remove());
    
    // Create fresh script element
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
    scriptRef.current = script;

    // Cleanup function
    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
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
