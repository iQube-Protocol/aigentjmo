/**
 * Agentic Assets API - Main exports
 */

export { AAClient, computeSHA256 } from './client';
export type { AssetMetadata, AssetPolicy, UploadInitiation, PaymentQuote, Entitlement } from './client';
export { 
  generateDID, 
  signWithDID, 
  createDIDSession, 
  getDIDSession, 
  clearDIDSession, 
  hasActiveDIDSession 
} from './did-auth';
export type { DIDSession } from './did-auth';
