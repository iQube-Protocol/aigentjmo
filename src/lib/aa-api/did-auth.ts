/**
 * DID Authentication for JMO KNYT / Aigent Nakamoto
 * Integrates with AgentiQ Wallet and DIDQube
 */

import { supabase } from '@/integrations/supabase/client';

export interface DIDSession {
  did: string;
  persona: string;
  signature: string;
  timestamp: string;
}

/**
 * Generate a DID for the current user
 * Uses the @qriptoagentiq/core-client SDK when available
 */
export async function generateDID(persona: string): Promise<string> {
  // For now, use fallback DID generation until SDK is fully installed
  // TODO: Activate core-client SDK integration after installation
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');
    
    // Generate did:iq: format DID
    return `did:iq:@qripto/${persona}.${user.id.substring(0, 8)}`;
  } catch (error) {
    throw new Error('Failed to generate DID: ' + (error as Error).message);
  }
}

/**
 * Sign a message with the user's DID
 */
export async function signWithDID(did: string, message: string): Promise<string> {
  // For now, use simple signing until SDK is fully installed
  // TODO: Integrate with AgentiQ Wallet after core-client SDK installation
  // This creates a deterministic signature for demonstration
  return btoa(`${did}:${message}:${Date.now()}`);
}

/**
 * Create a DID session
 */
export async function createDIDSession(persona: string): Promise<DIDSession> {
  const did = await generateDID(persona);
  const timestamp = new Date().toISOString();
  const message = `Sign in to JMO KNYT as ${did} at ${timestamp}`;
  const signature = await signWithDID(did, message);

  const session: DIDSession = {
    did,
    persona,
    signature,
    timestamp
  };

  // Store session in localStorage
  localStorage.setItem('aa_did_session', JSON.stringify(session));

  return session;
}

/**
 * Get current DID session
 */
export function getDIDSession(): DIDSession | null {
  const stored = localStorage.getItem('aa_did_session');
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Clear DID session
 */
export function clearDIDSession(): void {
  localStorage.removeItem('aa_did_session');
}

/**
 * Verify if user has an active DID session
 */
export function hasActiveDIDSession(): boolean {
  const session = getDIDSession();
  if (!session) return false;
  
  // Check if session is less than 24 hours old
  const sessionTime = new Date(session.timestamp).getTime();
  const now = Date.now();
  const hoursSinceSession = (now - sessionTime) / (1000 * 60 * 60);
  
  return hoursSinceSession < 24;
}
