/**
 * React hook for Agentic Assets API client
 */

import { useState, useEffect } from 'react';
import { AAClient } from '@/lib/aa-api/client';
import { getDIDSession, hasActiveDIDSession } from '@/lib/aa-api/did-auth';

export function useAAClient() {
  const [client, setClient] = useState<AAClient | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [did, setDid] = useState<string | null>(null);

  useEffect(() => {
    if (hasActiveDIDSession()) {
      const session = getDIDSession();
      if (session) {
        const aaClient = new AAClient(session.did);
        setClient(aaClient);
        setDid(session.did);
        setIsAuthenticated(true);
      }
    }
  }, []);

  const updateDID = (newDid: string) => {
    setDid(newDid);
    setIsAuthenticated(true);
    if (client) {
      client.setDID(newDid);
    } else {
      setClient(new AAClient(newDid));
    }
  };

  return {
    client,
    isAuthenticated,
    did,
    updateDID
  };
}
