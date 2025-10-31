import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

console.log('🚀 naka-reit-kb-pull function loaded');

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Starting REIT KB pull from QubeBase Core Hub...');

    // Initialize local Supabase client
    const localSupabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const localSupabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const localSupabase = createClient(localSupabaseUrl, localSupabaseKey);

    // Initialize QubeBase Core Hub client
    const coreSupabaseUrl = Deno.env.get('CORE_SUPABASE_URL')!;
    const coreSupabaseKey = Deno.env.get('CORE_SUPABASE_SERVICE_ROLE_KEY')!;
    const coreSupabase = createClient(coreSupabaseUrl, coreSupabaseKey);

    console.log('🔗 Connected to QubeBase Core Hub');

    // Fetch REIT KB docs from QubeBase Core Hub
    const { data: coreDocs, error: fetchError } = await coreSupabase
      .from('docs')
      .select('*')
      .eq('scope', 'tenant')
      .eq('tenant_id', 'aigent-jmo')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching from Core Hub:', fetchError);
      throw new Error(`Failed to fetch from Core Hub: ${fetchError.message}`);
    }

    console.log(`📦 Found ${coreDocs?.length || 0} docs in QubeBase Core Hub`);

    if (!coreDocs || coreDocs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No documents found in QubeBase Core Hub',
          pulled: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform Core Hub docs to local format and upsert
    const transformedDocs = coreDocs.map((doc: any) => ({
      reit_id: doc.id,
      qubebase_doc_id: doc.id,
      title: doc.metadata?.title || doc.id,
      content: doc.content || '',
      section: doc.metadata?.section || 'General',
      category: doc.metadata?.category || 'reit-basics',
      keywords: doc.metadata?.keywords || [],
      connections: doc.metadata?.connections || [],
      cross_tags: doc.metadata?.cross_tags || [],
      source: doc.metadata?.source || 'QubeBase Core Hub',
      timestamp: doc.created_at,
      is_active: true,
      is_seed_record: true,
      approval_status: 'approved',
      last_synced_at: new Date().toISOString(),
      created_by: null, // System seed
      updated_by: null
    }));

    console.log('🔄 Upserting documents into local database...');

    // Upsert into local database
    const { data: upsertedDocs, error: upsertError } = await localSupabase
      .from('reit_knowledge_items')
      .upsert(transformedDocs, {
        onConflict: 'qubebase_doc_id',
        ignoreDuplicates: false
      })
      .select();

    if (upsertError) {
      console.error('❌ Error upserting to local DB:', upsertError);
      throw new Error(`Failed to upsert to local DB: ${upsertError.message}`);
    }

    console.log(`✅ Successfully pulled and synced ${upsertedDocs?.length || 0} REIT KB documents`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Pulled ${upsertedDocs?.length || 0} documents from QubeBase`,
        pulled: upsertedDocs?.length || 0,
        documents: upsertedDocs
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in naka-reit-kb-pull:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
