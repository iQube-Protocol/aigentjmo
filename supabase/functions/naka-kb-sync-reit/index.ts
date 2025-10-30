import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

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

  let coreClient: Client | null = null;

  try {
    // Get local Supabase client to read from reit_knowledge_items
    const localUrl = Deno.env.get('SUPABASE_URL')!;
    const localServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const localSupabase = createClient(localUrl, localServiceKey);

    // Use Core Hub credentials for syncing
    const coreUrl = Deno.env.get('CORE_SUPABASE_URL')!;
    const coreDbUrl = Deno.env.get('CORE_SUPABASE_DB_URL');
    
    if (!coreDbUrl) {
      throw new Error('CORE_SUPABASE_DB_URL is required. Format: postgres://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require');
    }
    
    // Normalize connection URL
    let normalizedUrl = coreDbUrl.trim();
    
    // Replace postgresql:// with postgres:// if present
    if (normalizedUrl.startsWith('postgresql://')) {
      normalizedUrl = normalizedUrl.replace('postgresql://', 'postgres://');
    }
    
    // Add sslmode=require if not present
    if (!normalizedUrl.includes('sslmode')) {
      normalizedUrl += normalizedUrl.includes('?') ? '&sslmode=require' : '?sslmode=require';
    }
    
    // Parse URL for safe logging
    const urlObj = new URL(normalizedUrl);
    const maskedUrl = normalizedUrl.replace(/(postgres(ql)?:\/\/)([^@]+)@/, '$1****@');
    console.log(`🔌 Connecting to Core Hub: ${maskedUrl}`);
    console.log(`🔌 Target host: ${urlObj.hostname}, port: ${urlObj.port || '5432'}`);
    
    // Create PostgreSQL client for Core Hub (to access kb schema)
    coreClient = new Client(normalizedUrl);

    // Connect with retry logic
    let connected = false;
    const maxRetries = 3;
    const retryDelays = [500, 1000, 2000];
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`🔄 Connection attempt ${attempt + 1}/${maxRetries}...`);
        await coreClient.connect();
        connected = true;
        console.log(`✅ Connected to Core Hub on attempt ${attempt + 1}`);
        break;
      } catch (error: any) {
        console.error(`❌ Connection attempt ${attempt + 1} failed:`, error.message);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
        } else {
          throw new Error(`Failed to connect after ${maxRetries} attempts: ${error.message}`);
        }
      }
    }
    
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

    // Get the root corpus ID from Core Hub using direct SQL
    const corpusResult = await coreClient.queryObject<{ id: string }>(
      `SELECT id FROM kb.corpora WHERE app = $1 AND name = $2 LIMIT 1`,
      ['nakamoto', 'Root']
    );

    if (corpusResult.rows.length === 0) {
      await coreClient.end();
      throw new Error('Root corpus not found in Core Hub');
    }

    const corpusId = corpusResult.rows[0].id;
    console.log(`✅ Found root corpus: ${corpusId}`);

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
        const existingResult = await coreClient.queryObject<{ id: string; version: number }>(
          `SELECT id, version FROM kb.docs 
           WHERE corpus_id = $1 AND scope = $2 AND tenant_id = $3 AND title = $4 
           LIMIT 1`,
          [corpusId, 'tenant', 'aigent-jmo', cardData.title]
        );

        const existing = existingResult.rows.length > 0 ? existingResult.rows[0] : null;

        if (existing && !force_update) {
          console.log(`⏭️  Skipping existing doc: "${cardData.title}"`);
          results.skipped++;
          continue;
        }

        if (existing && force_update) {
          // Update existing doc
          await coreClient.queryObject(
            `UPDATE kb.docs 
             SET content_text = $1, tags = $2, metadata = $3, version = $4
             WHERE id = $5`,
            [
              cardData.content_text,
              cardData.tags,
              JSON.stringify({ 
                category: cardData.category,
                reit_id: item.reit_id,
                section: item.section,
                source: item.source
              }),
              (existing.version) + 1,
              existing.id
            ]
          );
          
          // Enqueue for reindexing
          await coreClient.queryObject(
            `INSERT INTO kb.reindex_queue (doc_id, action) VALUES ($1, $2)`,
            [existing.id, 'upsert']
          );

          console.log(`✏️  Updated doc: "${cardData.title}" (v${(existing.version) + 1})`);
          results.updated++;
        } else if (!existing) {
          // Insert new doc
          const insertResult = await coreClient.queryObject<{ id: string }>(
            `INSERT INTO kb.docs 
             (corpus_id, scope, tenant_id, title, content_text, source_uri, lang, tags, metadata, is_active, version)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id`,
            [
              corpusId,
              'tenant',
              'aigent-jmo',
              cardData.title,
              cardData.content_text,
              item.source || 'JMO REIT Strategy Document v1.0',
              'en',
              cardData.tags,
              JSON.stringify({ 
                category: cardData.category,
                reit_id: item.reit_id,
                section: item.section,
                source: item.source
              }),
              true,
              1
            ]
          );

          const insertedId = insertResult.rows[0].id;

          // Enqueue for reindexing
          await coreClient.queryObject(
            `INSERT INTO kb.reindex_queue (doc_id, action) VALUES ($1, $2)`,
            [insertedId, 'upsert']
          );

          console.log(`➕ Created doc: "${cardData.title}"`);
          results.created++;
        }
      } catch (error: any) {
        console.error(`❌ Error processing "${item.title}":`, error.message);
        results.errors.push(`${item.title}: ${error.message}`);
      }
    }

    await coreClient.end();
    
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
    try {
      await coreClient?.end();
    } catch {}
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
