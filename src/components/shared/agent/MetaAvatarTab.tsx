import React, { useEffect, useRef } from 'react';

const MetaAvatarTab: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const containerIdRef = useRef<string>(`did-avatar-container-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const init = () => {
      const containerId = containerIdRef.current = `did-avatar-container-${Math.random().toString(36).slice(2)}`;

      // Remove any previously injected D-ID artifacts
      document.querySelectorAll('script[src*="agent.d-id.com"]').forEach((s) => s.remove());
      document.querySelectorAll('[id^="did-avatar-container-"]').forEach((el) => (el.innerHTML = ''));

      // Ensure container has the unique id
      if (containerRef.current) {
        containerRef.current.id = containerId;
        containerRef.current.innerHTML = '';
      }

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

      document.body.appendChild(script);
      scriptRef.current = script;
    };

    // Initialize on mount
    init();

    // Listen for external refresh events
    const handler = () => {
      // Cleanup previous instance before re-init
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
        scriptRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      init();
    };

    window.addEventListener('metaAvatarRefresh', handler);

    return () => {
      window.removeEventListener('metaAvatarRefresh', handler);
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
