/**
 * Agentic Assets (AA) API Client for JMO KNYT / Aigent Nakamoto
 * Handles asset upload, registration, policies, payments, and entitlements
 */

import { supabase } from '@/integrations/supabase/client';

const AA_API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export interface AssetMetadata {
  title: string;
  description?: string;
  contentType: string;
  size: number;
  creator: string;
  tags?: string[];
  thumbnail?: string;
}

export interface AssetPolicy {
  rights: string[];
  price: string;
  asset: string; // QCT, QOYN, etc.
  payout: {
    creator: string;
    percentage: number;
  }[];
}

export interface UploadInitiation {
  uploadId: string;
  uploadUrl: string;
  assetId: string;
}

export interface PaymentQuote {
  quoteId: string;
  amount: string;
  asset: string;
  qrCode: string;
  deeplink: string;
  sseChannel: string;
  expiresAt: string;
}

export interface Entitlement {
  assetId: string;
  signedUrl?: string;
  playbackToken?: string;
  expiresAt: string;
  rights: string[];
}

export class AAClient {
  private did: string | null = null;

  constructor(did?: string) {
    this.did = did || null;
  }

  setDID(did: string) {
    this.did = did;
  }

  /**
   * Step 1: Initiate asset upload
   */
  async initiateUpload(file: File, sha256: string): Promise<UploadInitiation> {
    const { data, error } = await supabase.functions.invoke('aa-upload-initiate', {
      body: {
        filename: file.name,
        contentType: file.type,
        size: file.size,
        sha256,
        creator: this.did
      }
    });

    if (error) throw new Error(`Upload initiation failed: ${error.message}`);
    return data;
  }

  /**
   * Step 2: PUT file to upload URL
   */
  async uploadFile(uploadUrl: string, file: File): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });

    if (!response.ok) {
      throw new Error(`File upload failed: ${response.statusText}`);
    }
  }

  /**
   * Step 3: Register asset with metadata
   */
  async registerAsset(uploadId: string, metadata: AssetMetadata): Promise<{ assetId: string }> {
    const { data, error } = await supabase.functions.invoke('aa-register-asset', {
      body: {
        uploadId,
        metadata: {
          ...metadata,
          creator: this.did
        }
      }
    });

    if (error) throw new Error(`Asset registration failed: ${error.message}`);
    return data;
  }

  /**
   * Step 4: Set asset policy (rights, price, payouts)
   */
  async setAssetPolicy(assetId: string, policy: AssetPolicy): Promise<void> {
    const { error } = await supabase.functions.invoke('aa-set-policy', {
      body: {
        assetId,
        policy
      }
    });

    if (error) throw new Error(`Policy setting failed: ${error.message}`);
  }

  /**
   * Get payment quote for asset purchase
   */
  async getPaymentQuote(assetId: string, buyerDid: string): Promise<PaymentQuote> {
    const { data, error } = await supabase.functions.invoke('aa-payment-quote', {
      body: {
        assetId,
        buyerDid
      }
    });

    if (error) throw new Error(`Payment quote failed: ${error.message}`);
    return data;
  }

  /**
   * Subscribe to payment settlement SSE
   */
  subscribeToSettlement(sseChannel: string, onSettled: (data: any) => void): EventSource {
    const eventSource = new EventSource(
      `${AA_API_BASE}/aa-payment-sse?channel=${sseChannel}`
    );

    eventSource.addEventListener('settlement', (event) => {
      const data = JSON.parse(event.data);
      onSettled(data);
    });

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      eventSource.close();
    };

    return eventSource;
  }

  /**
   * Get entitlements after purchase
   */
  async getEntitlement(assetId: string): Promise<Entitlement> {
    const { data, error } = await supabase.functions.invoke('aa-get-entitlement', {
      body: {
        assetId,
        buyerDid: this.did
      }
    });

    if (error) throw new Error(`Entitlement fetch failed: ${error.message}`);
    return data;
  }

  /**
   * List user's created assets
   */
  async listMyAssets(): Promise<any[]> {
    const { data, error } = await supabase.functions.invoke('aa-list-assets', {
      body: {
        creatorDid: this.did
      }
    });

    if (error) throw new Error(`Asset listing failed: ${error.message}`);
    return data.assets || [];
  }

  /**
   * List user's purchased assets
   */
  async listMyPurchases(): Promise<any[]> {
    const { data, error } = await supabase.functions.invoke('aa-list-purchases', {
      body: {
        buyerDid: this.did
      }
    });

    if (error) throw new Error(`Purchase listing failed: ${error.message}`);
    return data.purchases || [];
  }

  /**
   * Browse available assets
   */
  async browseAssets(filters?: { tags?: string[]; creator?: string }): Promise<any[]> {
    const { data, error } = await supabase.functions.invoke('aa-browse-assets', {
      body: filters
    });

    if (error) throw new Error(`Asset browsing failed: ${error.message}`);
    return data.assets || [];
  }
}

/**
 * Compute SHA-256 hash of a file
 */
export async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
