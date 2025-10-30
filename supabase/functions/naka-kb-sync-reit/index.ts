import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Bulk sync JMO REIT Knowledge Base to QubeBase Core Hub
 * Reads from local reit_knowledge_items table and syncs to kb.docs
 * with proper tenant scoping (tenant_id = 'aigent-jmo')
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get local Supabase client to read from reit_knowledge_items
    const localUrl = Deno.env.get('SUPABASE_URL')!;
    const localServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const localSupabase = createClient(localUrl, localServiceKey);

    // Use Core Hub credentials for syncing
    const coreUrl = Deno.env.get('CORE_SUPABASE_URL')!;
    const coreServiceKey = Deno.env.get('CORE_SUPABASE_SERVICE_ROLE_KEY')!;
    const coreSupabase = createClient(coreUrl, coreServiceKey);

    const { force_update = false } = await req.json();
    
    console.log(`🚀 Starting JMO REIT KB sync to QubeBase (force_update: ${force_update})`);

    // Fetch all active REIT KB items from local database
    const { data: reitItems, error: fetchError } = await localSupabase
      .from('reit_knowledge_items')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch REIT KB items: ${fetchError.message}`);
    }

    if (!reitItems || reitItems.length === 0) {
      console.log('⚠️  No active REIT KB items found in database');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No items to sync',
          results: { created: 0, updated: 0, skipped: 0, errors: [] }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    console.log(`📚 Found ${reitItems.length} active REIT KB items to sync`);

    // Get the root corpus ID from Core Hub
    const { data: corpus, error: corpusError } = await coreSupabase
      .from('kb.corpora')
      .select('id')
      .eq('app', 'nakamoto')
      .eq('name', 'Root')
      .single();

    if (corpusError || !corpus) {
      throw new Error(`Root corpus not found: ${corpusError?.message || 'Unknown error'}`);
    }

    console.log(`✅ Found root corpus: ${corpus.id}`);

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    };

    // Process each REIT KB item from database
    for (const item of reitItems) {
      try {
        // Transform database record to KB doc format
        const cardData = {
          title: item.title,
          content_text: item.content,
          tags: [...(item.keywords || []), ...(item.cross_tags || [])],
          category: item.category
        };

        // Check if doc already exists in Core Hub
        const { data: existing } = await coreSupabase
          .from('kb.docs')
          .select('id, version')
          .eq('corpus_id', corpus.id)
          .eq('scope', 'tenant')
          .eq('tenant_id', 'aigent-jmo')
          .eq('title', cardData.title)
          .single();

        if (existing && !force_update) {
          console.log(`⏭️  Skipping existing doc: "${cardData.title}"`);
          results.skipped++;
          continue;
        }

        if (existing && force_update) {
          // Update existing doc
          const { error: updateError } = await coreSupabase
            .from('kb.docs')
            .update({
              content_text: cardData.content_text,
              tags: cardData.tags,
              metadata: { 
                category: cardData.category,
                reit_id: item.reit_id,
                section: item.section,
                source: item.source
              },
              version: existing.version + 1
            })
            .eq('id', existing.id);

          if (updateError) throw updateError;
          
          // Enqueue for reindexing
          await coreSupabase
            .from('kb.reindex_queue')
            .insert({
              doc_id: existing.id,
              action: 'upsert'
            });

          console.log(`✏️  Updated doc: "${cardData.title}" (v${existing.version + 1})`);
          results.updated++;
        } else {
          // Insert new doc
          const { data: inserted, error: insertError } = await coreSupabase
            .from('kb.docs')
            .insert({
              corpus_id: corpus.id,
              scope: 'tenant',
              tenant_id: 'aigent-jmo',
              title: cardData.title,
              content_text: cardData.content_text,
              source_uri: item.source || 'JMO REIT Strategy Document v1.0',
              lang: 'en',
              tags: cardData.tags,
              metadata: { 
                category: cardData.category,
                reit_id: item.reit_id,
                section: item.section,
                source: item.source
              },
              is_active: true,
              version: 1
            })
            .select()
            .single();

          if (insertError) throw insertError;

          // Enqueue for reindexing
          await coreSupabase
            .from('kb.reindex_queue')
            .insert({
              doc_id: inserted.id,
              action: 'upsert'
            });

          console.log(`➕ Created doc: "${cardData.title}"`);
          results.created++;
        }
      } catch (error: any) {
        console.error(`❌ Error processing "${item.title}":`, error.message);
        results.errors.push(`${item.title}: ${error.message}`);
      }
    }

    console.log(`✅ Sync complete - Created: ${results.created}, Updated: ${results.updated}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `JMO REIT KB sync complete: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('❌ Sync function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
