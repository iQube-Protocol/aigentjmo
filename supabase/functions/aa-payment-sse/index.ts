import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * AA API: SSE endpoint for payment settlement notifications
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const channel = url.searchParams.get('channel');

    if (!channel) {
      return new Response('Missing channel parameter', { status: 400 });
    }

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        // Send initial connection message
        controller.enqueue(encoder.encode(': connected\n\n'));

        // Simulate payment settlement after 10 seconds (for demo)
        setTimeout(() => {
          const settlementData = JSON.stringify({
            channel,
            status: 'settled',
            txHash: '0x' + crypto.randomUUID().replace(/-/g, ''),
            timestamp: new Date().toISOString()
          });

          controller.enqueue(encoder.encode(`event: settlement\n`));
          controller.enqueue(encoder.encode(`data: ${settlementData}\n\n`));
          
          // Close stream after sending settlement
          setTimeout(() => controller.close(), 1000);
        }, 10000);
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('SSE error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
