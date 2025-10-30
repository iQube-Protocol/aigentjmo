import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Bulk sync JMO REIT Knowledge Base to QubeBase Core Hub
 * Reads from local reit_knowledge_items table and syncs to Core Hub kb schema
 * using HTTP (Supabase client) rather than raw Postgres to avoid TCP/DNS issues
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Local client (this project) - read reit_knowledge_items
    const localUrl = Deno.env.get('SUPABASE_URL')!;
    const localServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const localSupabase = createClient(localUrl, localServiceKey);

    // Core Hub client - operate on kb schema via HTTP
    const rawCoreUrl = (Deno.env.get('CORE_SUPABASE_URL') ?? '').trim();
    const coreDbUrl = (Deno.env.get('CORE_SUPABASE_DB_URL') ?? '').trim();
    const coreServiceKey = Deno.env.get('CORE_SUPABASE_SERVICE_ROLE_KEY');

    // Normalize Core Hub URL: accept HTTPS base URL or derive from Postgres URL
    let coreUrl = rawCoreUrl;

    const deriveHttpsFromPostgres = (pgUrl: string): string | null => {
      try {
        const host = new URL(pgUrl).hostname; // e.g., db.<ref>.supabase.co
        const parts = host.split('.');
        const ref = parts[0] === 'db' && parts.length >= 3 ? parts[1] : parts[0];
        return `https://${ref}.supabase.co`;
      } catch {
        return null;
      }
    };

    if (!coreUrl || coreUrl.startsWith('postgres://')) {
      const fromRaw = coreUrl && coreUrl.startsWith('postgres://') ? deriveHttpsFromPostgres(coreUrl) : null;
      const fromDb = coreDbUrl.startsWith('postgres://') ? deriveHttpsFromPostgres(coreDbUrl) : null;
      const derived = fromDb || fromRaw;
      if (derived) {
        coreUrl = derived;
        console.log(`Derived Core Hub API URL: ${coreUrl}`);
      }
    } else {
      // Prefer DB URL if both are set, to avoid pointing at the wrong project
      if (coreDbUrl.startsWith('postgres://')) {
        const prefer = deriveHttpsFromPostgres(coreDbUrl);
        if (prefer && prefer !== coreUrl) {
          coreUrl = prefer;
          console.log(`Overrode Core Hub API URL using CORE_SUPABASE_DB_URL: ${coreUrl}`);
        }
      }
    }

    if (!coreUrl || !coreServiceKey) {
      throw new Error('Missing Core Hub config: CORE_SUPABASE_URL (https://<ref>.supabase.co) and CORE_SUPABASE_SERVICE_ROLE_KEY are required');
    }
    if (!coreUrl.startsWith('http')) {
      throw new Error('Invalid CORE_SUPABASE_URL: must be an HTTPS URL like https://<ref>.supabase.co, not a postgres connection string');
    }

    // Try 'kb' schema first (preferred); will work if 'kb' is exposed to REST
    let coreSupabase = createClient(coreUrl, coreServiceKey, {
      db: { schema: 'kb' },
      auth: { persistSession: false },
    });

    const { force_update = false } = await req.json().catch(() => ({ force_update: false }));
    console.log(`🚀 Starting JMO REIT KB sync to Core Hub via HTTP (force_update: ${force_update})`);

    // Preflight: verify Core Hub exposes expected KB tables via REST
    const preflight = async (table: string) => {
      const { error } = await coreSupabase.from(table).select('id').limit(1);
      if (error) return { ok: false, table, error: error.message } as const;
      return { ok: true, table } as const;
    };
    const checks = await Promise.all([
      preflight('corpora'),
      preflight('docs'),
      preflight('reindex_queue')
    ]);
    const missing = checks.filter((c) => !c.ok);
    if (missing.length) {
      const details = missing.map((m) => `${m.table}: ${'error' in m ? m.error : 'unknown'}`).join('; ');
      throw new Error(
        `Core Hub KB tables not accessible. Expected public tables [corpora, docs, reindex_queue] or expose a 'kb' schema to REST. Details: ${details}`
      );
    }

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

    // Get the root corpus ID from Core Hub (kb.corpora)
    // Try site_id='root' first (preferred), fallback to name-based lookup
    let corpusRow = null;
    let corpusErr = null;
    
    // Attempt 1: Look for site_id='root' (most reliable)
    const { data: corpus1, error: err1 } = await coreSupabase
      .from('corpora')
      .select('id, name')
      .eq('site_id', 'root')
      .maybeSingle();
    
    if (err1) {
      console.warn(`⚠️  Failed to fetch corpus by site_id='root': ${err1.message}`);
      corpusErr = err1;
    } else if (corpus1?.id) {
      corpusRow = corpus1;
      console.log(`✅ Found corpus by site_id='root': ${corpus1.name} (${corpus1.id})`);
    }
    
    // Attempt 2: Fallback to name-based lookup if needed
    if (!corpusRow) {
      const { data: corpus2, error: err2 } = await coreSupabase
        .from('corpora')
        .select('id, name')
        .or('name.eq.Root,name.eq.QubeBase Root Corpus')
        .maybeSingle();
      
      if (err2) {
        console.warn(`⚠️  Failed to fetch corpus by name: ${err2.message}`);
        corpusErr = err2;
      } else if (corpus2?.id) {
        corpusRow = corpus2;
        console.log(`✅ Found corpus by name: ${corpus2.name} (${corpus2.id})`);
      }
    }

    if (corpusErr && !corpusRow) {
      throw new Error(`Failed to fetch root corpus from Core Hub: ${corpusErr.message}`);
    }

    if (!corpusRow?.id) {
      throw new Error('Root corpus not found in Core Hub (tried site_id=root and name=Root/QubeBase Root Corpus)');
    }

    const corpusId = corpusRow.id as string;
    console.log(`📋 Using corpus: ${corpusId}`);

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    };

    for (const item of reitItems) {
      try {
        const cardData = {
          title: item.title as string,
          content_text: item.content as string,
          tags: [ ...(item.keywords || []), ...(item.cross_tags || []) ] as string[],
          category: item.category as string | null
        };

        // Check if doc exists
        const { data: existing, error: existingErr } = await coreSupabase
          .from('docs')
          .select('id, version')
          .eq('corpus_id', corpusId)
          .eq('scope', 'tenant')
          .eq('tenant_id', 'aigent-jmo')
          .eq('title', cardData.title)
          .maybeSingle();

        if (existingErr) {
          throw new Error(`Lookup failed: ${existingErr.message}`);
        }

        if (existing && !force_update) {
          console.log(`⏭️  Skipping existing doc: "${cardData.title}"`);
          results.skipped++;
          continue;
        }

        if (existing && force_update) {
          const newVersion = (existing.version ?? 0) + 1;
          const { error: updateErr } = await coreSupabase
            .from('docs')
            .update({
              content_text: cardData.content_text,
              tags: cardData.tags,
              metadata: {
                category: cardData.category,
                reit_id: item.reit_id ?? null,
                section: item.section ?? null,
                source: item.source ?? null,
              },
              version: newVersion,
            })
            .eq('id', existing.id);

          if (updateErr) throw new Error(`Update failed: ${updateErr.message}`);

          const { error: enqueueErr1 } = await coreSupabase
            .from('reindex_queue')
            .insert({ doc_id: existing.id, action: 'upsert' });
          if (enqueueErr1) throw new Error(`Reindex enqueue failed: ${enqueueErr1.message}`);

          console.log(`✏️  Updated doc: "${cardData.title}" (v${newVersion})`);
          results.updated++;
        } else if (!existing) {
          const { data: insertData, error: insertErr } = await coreSupabase
            .from('docs')
            .insert({
              corpus_id: corpusId,
              scope: 'tenant',
              tenant_id: 'aigent-jmo',
              title: cardData.title,
              content_text: cardData.content_text,
              source_uri: item.source || 'JMO REIT Strategy Document v1.0',
              lang: 'en',
              tags: cardData.tags,
              metadata: {
                category: cardData.category,
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
          const { error: enqueueErr2 } = await coreSupabase
            .from('reindex_queue')
            .insert({ doc_id: insertedId, action: 'upsert' });
          if (enqueueErr2) throw new Error(`Reindex enqueue failed: ${enqueueErr2.message}`);

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
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
