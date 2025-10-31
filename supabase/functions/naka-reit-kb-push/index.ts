import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting REIT KB sync to Core Hub...');

    // Get request body for options
    const { force_update = false } = await req.json().catch(() => ({}));

    // Initialize local Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const localClient = createClient(supabaseUrl, supabaseKey);

    // Fetch active REIT knowledge items from local database
    console.log('📚 Fetching active REIT knowledge items...');
    const { data: reitItems, error: fetchError } = await localClient
      .from('reit_knowledge_items')
      .select('*')
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching REIT items:', fetchError);
      throw new Error(`Failed to fetch REIT items: ${fetchError.message}`);
    }

    if (!reitItems || reitItems.length === 0) {
      console.log('ℹ️ No active REIT items found to sync');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No items to sync',
          items_synced: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`📦 Found ${reitItems.length} items to sync`);

    // Transform items to the format expected by the ingest endpoint
    const transformedItems = reitItems.map(item => ({
      title: item.title,
      content: item.content,
      metadata: {
        reit_id: item.reit_id,
        section: item.section,
        category: item.category,
        keywords: item.keywords || [],
        source: item.source,
        timestamp: item.timestamp,
        connections: item.connections || [],
        cross_tags: item.cross_tags || []
      }
    }));

    // Get Core Hub URL and sync token
    const coreHubUrl = Deno.env.get('CORE_SUPABASE_URL');
    const syncToken = Deno.env.get('SYNC_SECRET_TOKEN');

    if (!coreHubUrl) {
      throw new Error('CORE_SUPABASE_URL environment variable not set');
    }

    if (!syncToken) {
      throw new Error('SYNC_SECRET_TOKEN environment variable not set');
    }

    // Call the Core Hub ingest endpoint
    console.log(`🚀 Calling Core Hub ingest endpoint: ${coreHubUrl}`);
    const ingestUrl = `${coreHubUrl}/functions/v1/naka-reit-kb-ingest`;
    
    const response = await fetch(ingestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${syncToken}`
      },
      body: JSON.stringify({
        items: transformedItems,
        force_update
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Core Hub ingest failed:', errorText);
      throw new Error(`Core Hub ingest failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Sync completed:', result);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'REIT KB items synced successfully',
        local_items_fetched: reitItems.length,
        sync_result: result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('❌ Sync error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
