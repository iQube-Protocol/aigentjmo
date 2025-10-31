import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

console.log('🚀 naka-reit-kb-submit-changes function loaded');

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { record_ids } = await req.json();

    if (!record_ids || !Array.isArray(record_ids) || record_ids.length === 0) {
      throw new Error('record_ids array is required');
    }

    console.log(`📤 Submitting ${record_ids.length} changes for approval...`);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client with user's auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    console.log(`👤 User ${user.id} submitting changes`);

    // Check if user is super_admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['super_admin', 'uber_admin'])
      .single();

    if (roleError || !roleData) {
      throw new Error('User does not have permission to submit changes');
    }

    const submissions = [];
    
    for (const recordId of record_ids) {
      // Fetch the record with draft status
      const { data: record, error: fetchError } = await supabase
        .from('reit_knowledge_items')
        .select('*')
        .eq('id', recordId)
        .eq('approval_status', 'draft')
        .single();

      if (fetchError) {
        console.warn(`⚠️ Failed to fetch record ${recordId}:`, fetchError);
        continue;
      }

      // Fetch original data from QubeBase if it's a seed record
      let originalData = null;
      if (record.is_seed_record && record.qubebase_doc_id) {
        const coreSupabaseUrl = Deno.env.get('CORE_SUPABASE_URL')!;
        const coreSupabaseKey = Deno.env.get('CORE_SUPABASE_SERVICE_ROLE_KEY')!;
        const coreSupabase = createClient(coreSupabaseUrl, coreSupabaseKey);

        const { data: coreDoc } = await coreSupabase
          .from('docs')
          .select('*')
          .eq('id', record.qubebase_doc_id)
          .single();

        originalData = coreDoc;
      }

      // Create approval queue entry
      const { data: queueEntry, error: queueError } = await supabase
        .from('reit_kb_approval_queue')
        .insert({
          local_record_id: record.id,
          qubebase_doc_id: record.qubebase_doc_id,
          change_type: record.is_seed_record ? 'update' : 'create',
          proposed_data: record,
          original_data: originalData,
          submitted_by: user.id,
          approval_status: 'pending'
        })
        .select()
        .single();

      if (queueError) {
        console.error(`❌ Failed to create queue entry for ${recordId}:`, queueError);
        continue;
      }

      // Update local record status
      await supabase
        .from('reit_knowledge_items')
        .update({
          approval_status: 'pending',
          pending_approval_id: queueEntry.id
        })
        .eq('id', recordId);

      submissions.push({
        record_id: recordId,
        approval_id: queueEntry.id,
        title: record.title
      });

      console.log(`✅ Submitted ${record.title} for approval`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Submitted ${submissions.length} changes for approval`,
        submissions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in naka-reit-kb-submit-changes:', error);
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
