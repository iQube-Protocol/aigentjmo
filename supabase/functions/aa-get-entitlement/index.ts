import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * AA API: Get entitlement after purchase
 * Returns signed URL or playback token
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assetId, buyerDid } = await req.json();

    // In production, this would verify purchase and generate real signed URLs
    const signedUrl = `https://cdn.example.com/assets/${assetId}?token=${crypto.randomUUID()}`;
    const playbackToken = `pk_${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    console.log(`Entitlement generated for ${buyerDid} on asset ${assetId}`);

    return new Response(
      JSON.stringify({
        assetId,
        signedUrl,
        playbackToken,
        expiresAt,
        rights: ['stream', 'download']
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Entitlement error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
