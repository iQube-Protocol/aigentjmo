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

    // Fetch REIT KB docs from QubeBase Core Hub (with fallback)
    let coreDocs: any[] | null = null;

    // Try legacy 'docs' table first (older Core Hub schema)
    const {
      data: docsData,
      error: docsError,
    } = await coreSupabase
      .from('docs')
      .select('*')
      .eq('scope', 'tenant')
      .eq('tenant_id', 'aigent-jmo')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (docsError) {
      console.error('❌ Error fetching from Core Hub (docs):', docsError);
      // If the 'docs' table doesn't exist on Core Hub, fall back to the normalized table
      if (
        docsError.code === 'PGRST205' ||
        (docsError.message || '').includes("Could not find the table")
      ) {
        console.log('↩️ Falling back to Core Hub table: reit_knowledge_items');
        const {
          data: fallbackData,
          error: fallbackError,
        } = await coreSupabase
          .from('reit_knowledge_items')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (fallbackError) {
          console.error(
            '❌ Error fetching from Core Hub (reit_knowledge_items):',
            fallbackError
          );
          throw new Error(
            `Failed to fetch from Core Hub: ${fallbackError.message}`
          );
        }
        coreDocs = (fallbackData as any[]) || [];
      } else {
        throw new Error(`Failed to fetch from Core Hub: ${docsError.message}`);
      }
    } else {
      coreDocs = (docsData as any[]) || [];
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

    // Transform Core Hub docs (support legacy 'docs' shape and normalized 'reit_knowledge_items')
    const transformedDocs = coreDocs.map((doc: any) => {
      const isDocsFormat = typeof doc?.metadata === 'object' && doc.metadata !== null;
      const title = isDocsFormat ? (doc.metadata?.title ?? doc.id) : (doc.title ?? doc.id);
      const section = isDocsFormat ? (doc.metadata?.section ?? 'General') : (doc.section ?? 'General');
      const category = isDocsFormat ? (doc.metadata?.category ?? 'reit-basics') : (doc.category ?? 'reit-basics');
      const keywords = (isDocsFormat ? doc.metadata?.keywords : doc.keywords) ?? [];
      const connections = (isDocsFormat ? doc.metadata?.connections : doc.connections) ?? [];
      const cross_tags = (isDocsFormat ? doc.metadata?.cross_tags : doc.cross_tags) ?? [];
      const source = (isDocsFormat ? doc.metadata?.source : doc.source) ?? 'QubeBase Core Hub';

      return {
        reit_id: doc.reit_id ?? doc.id,
        qubebase_doc_id: doc.qubebase_doc_id ?? doc.id,
        title,
        content: doc.content ?? '',
        section,
        category,
        keywords,
        connections,
        cross_tags,
        source,
        timestamp: doc.created_at ?? new Date().toISOString(),
        is_active: true,
        is_seed_record: doc.is_seed_record ?? true,
        approval_status: doc.approval_status ?? 'approved',
        last_synced_at: new Date().toISOString(),
        created_by: doc.created_by ?? null, // System seed by default
        updated_by: doc.updated_by ?? null,
      };
    });

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
