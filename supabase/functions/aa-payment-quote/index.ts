import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * AA API: Get payment quote for asset purchase
 * Returns QR code, deeplink, and SSE channel for settlement
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assetId, buyerDid } = await req.json();

    const quoteId = crypto.randomUUID();
    const sseChannel = `payment:${quoteId}`;

    // In production, these would be real payment URIs
    const amount = '0.25';
    const asset = 'QCT';
    const qrCode = `qripto://pay?amount=${amount}&asset=${asset}&to=creator&ref=${quoteId}`;
    const deeplink = `agentiq://wallet/pay?amount=${amount}&asset=${asset}&to=creator&ref=${quoteId}`;

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    console.log(`Payment quote generated: ${quoteId} for asset ${assetId}`);

    return new Response(
      JSON.stringify({
        quoteId,
        amount,
        asset,
        qrCode,
        deeplink,
        sseChannel,
        expiresAt
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Payment quote error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
