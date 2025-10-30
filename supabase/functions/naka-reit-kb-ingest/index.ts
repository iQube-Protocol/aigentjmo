import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * REIT KB Ingest Endpoint for QubeBase Core Hub
 * Accepts REIT knowledge items from JMO project and syncs to kb schema
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate secret token to prevent unauthorized access
    const authHeader = req.headers.get('authorization');
    const expectedToken = Deno.env.get('SYNC_SECRET_TOKEN');
    
    if (!expectedToken) {
      throw new Error('SYNC_SECRET_TOKEN not configured in Core Hub');
    }
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { items, force_update = false } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No items provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📥 Received ${items.length} REIT KB items for sync (force_update: ${force_update})`);

    // Connect to local database with kb schema
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'kb' },
      auth: { persistSession: false },
    });

    // Get or create root corpus
    let corpusRow = null;
    
    // Try site_id='root' first
    const { data: corpus1, error: err1 } = await supabase
      .from('corpora')
      .select('id, name')
      .eq('site_id', 'root')
      .maybeSingle();
    
    if (err1) {
      console.warn(`⚠️  Failed to fetch corpus by site_id='root': ${err1.message}`);
    } else if (corpus1?.id) {
      corpusRow = corpus1;
      console.log(`✅ Found corpus by site_id='root': ${corpus1.name} (${corpus1.id})`);
    }
    
    // Fallback to name-based lookup
    if (!corpusRow) {
      const { data: corpus2, error: err2 } = await supabase
        .from('corpora')
        .select('id, name')
        .or('name.eq.Root,name.eq.QubeBase Root Corpus')
        .maybeSingle();
      
      if (err2) {
        console.warn(`⚠️  Failed to fetch corpus by name: ${err2.message}`);
      } else if (corpus2?.id) {
        corpusRow = corpus2;
        console.log(`✅ Found corpus by name: ${corpus2.name} (${corpus2.id})`);
      }
    }

    if (!corpusRow?.id) {
      throw new Error('Root corpus not found in kb.corpora (tried site_id=root and name=Root/QubeBase Root Corpus)');
    }

    const corpusId = corpusRow.id as string;
    console.log(`📋 Using corpus: ${corpusId}`);

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    };

    for (const item of items) {
      try {
        const docData = {
          title: item.title as string,
          content_text: item.content as string,
          tags: [ ...(item.keywords || []), ...(item.cross_tags || []) ] as string[],
          category: item.category as string | null
        };

        // Check if doc exists
        const { data: existing, error: existingErr } = await supabase
          .from('docs')
          .select('id, version')
          .eq('corpus_id', corpusId)
          .eq('scope', 'tenant')
          .eq('tenant_id', 'aigent-jmo')
          .eq('title', docData.title)
          .maybeSingle();

        if (existingErr) {
          throw new Error(`Lookup failed: ${existingErr.message}`);
        }

        if (existing && !force_update) {
          console.log(`⏭️  Skipping existing doc: "${docData.title}"`);
          results.skipped++;
          continue;
        }

        if (existing && force_update) {
          const newVersion = (existing.version ?? 0) + 1;
          const { error: updateErr } = await supabase
            .from('docs')
            .update({
              content_text: docData.content_text,
              tags: docData.tags,
              metadata: {
                category: docData.category,
                reit_id: item.reit_id ?? null,
                section: item.section ?? null,
                source: item.source ?? null,
              },
              version: newVersion,
            })
            .eq('id', existing.id);

          if (updateErr) throw new Error(`Update failed: ${updateErr.message}`);

          const { error: enqueueErr } = await supabase
            .from('reindex_queue')
            .insert({ doc_id: existing.id, action: 'upsert' });
          if (enqueueErr) throw new Error(`Reindex enqueue failed: ${enqueueErr.message}`);

          console.log(`✏️  Updated doc: "${docData.title}" (v${newVersion})`);
          results.updated++;
        } else if (!existing) {
          const { data: insertData, error: insertErr } = await supabase
            .from('docs')
            .insert({
              corpus_id: corpusId,
              scope: 'tenant',
              tenant_id: 'aigent-jmo',
              title: docData.title,
              content_text: docData.content_text,
              source_uri: item.source || 'JMO REIT Strategy Document v1.0',
              lang: 'en',
              tags: docData.tags,
              metadata: {
                category: docData.category,
                reit_id: item.reit_id ?? null,
                section: item.section ?? null,
                source: item.source ?? null,
              },
              is_active: true,
              version: 1,
            })
            .select('id')
            .single();

          if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`);

          const insertedId = insertData.id as string;
          const { error: enqueueErr } = await supabase
            .from('reindex_queue')
            .insert({ doc_id: insertedId, action: 'upsert' });
          if (enqueueErr) throw new Error(`Reindex enqueue failed: ${enqueueErr.message}`);

          console.log(`➕ Created doc: "${docData.title}"`);
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
    console.error('❌ Ingest function error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
