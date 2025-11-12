import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * AA API: Initiate asset upload
 * Returns uploadId, uploadUrl, and assetId
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filename, contentType, size, sha256, creator } = await req.json();

    // Generate IDs
    const uploadId = crypto.randomUUID();
    const assetId = `aa:${sha256.substring(0, 16)}`;

    // In production, this would generate a signed URL to a storage bucket
    // For now, return a mock URL
    const uploadUrl = `https://mock-storage.example.com/upload/${uploadId}`;

    console.log(`Upload initiated: ${uploadId} for asset ${assetId}`);

    return new Response(
      JSON.stringify({
        uploadId,
        uploadUrl,
        assetId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Upload initiation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
