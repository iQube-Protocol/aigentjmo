import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

console.log('🚀 naka-reit-kb-review-changes function loaded');

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { approval_id, action, reviewer_notes } = await req.json();

    if (!approval_id || !action) {
      throw new Error('approval_id and action are required');
    }

    if (!['approve', 'reject'].includes(action)) {
      throw new Error('action must be "approve" or "reject"');
    }

    console.log(`🔍 ${action === 'approve' ? 'Approving' : 'Rejecting'} approval ${approval_id}...`);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase clients
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

    // Check if user is uber_admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'uber_admin')
      .single();

    if (roleError || !roleData) {
      throw new Error('Only uber admins can review changes');
    }

    console.log(`👤 Uber admin ${user.id} reviewing changes`);

    // Fetch approval queue entry
    const { data: approval, error: approvalError } = await supabase
      .from('reit_kb_approval_queue')
      .select('*')
      .eq('id', approval_id)
      .eq('approval_status', 'pending')
      .single();

    if (approvalError || !approval) {
      throw new Error('Approval not found or already processed');
    }

    if (action === 'approve') {
      console.log('✅ Approving change and pushing to QubeBase...');

      // Push to QubeBase Core Hub
      const coreSupabaseUrl = Deno.env.get('CORE_SUPABASE_URL')!;
      const coreSupabaseKey = Deno.env.get('CORE_SUPABASE_SERVICE_ROLE_KEY')!;
      const coreSupabase = createClient(coreSupabaseUrl, coreSupabaseKey);

      const proposedData = approval.proposed_data as any;

      const coreDoc = {
        id: approval.qubebase_doc_id || undefined,
        scope: 'tenant',
        tenant_id: 'aigent-jmo',
        content: proposedData.content,
        is_active: true,
        metadata: {
          title: proposedData.title,
          section: proposedData.section,
          category: proposedData.category,
          keywords: proposedData.keywords,
          connections: proposedData.connections,
          cross_tags: proposedData.cross_tags,
          source: proposedData.source
        }
      };

      const { data: pushedDoc, error: pushError } = await coreSupabase
        .from('docs')
        .upsert(coreDoc)
        .select()
        .single();

      if (pushError) {
        console.error('❌ Failed to push to QubeBase:', pushError);
        throw new Error(`Failed to push to QubeBase: ${pushError.message}`);
      }

      console.log('✅ Successfully pushed to QubeBase');

      // Update approval queue
      await supabase
        .from('reit_kb_approval_queue')
        .update({
          approval_status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          reviewer_notes
        })
        .eq('id', approval_id);

      // Update local record
      await supabase
        .from('reit_knowledge_items')
        .update({
          approval_status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          qubebase_doc_id: pushedDoc.id,
          last_synced_at: new Date().toISOString(),
          pending_approval_id: null
        })
        .eq('id', approval.local_record_id);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Change approved and synced to QubeBase',
          action: 'approved',
          qubebase_doc_id: pushedDoc.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      console.log('❌ Rejecting change...');

      // Update approval queue
      await supabase
        .from('reit_kb_approval_queue')
        .update({
          approval_status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          reviewer_notes
        })
        .eq('id', approval_id);

      // Revert local record or mark as rejected
      if (approval.change_type === 'update' && approval.original_data) {
        // Revert to original QubeBase version
        const originalData = approval.original_data as any;
        await supabase
          .from('reit_knowledge_items')
          .update({
            content: originalData.content,
            title: originalData.metadata?.title,
            section: originalData.metadata?.section,
            category: originalData.metadata?.category,
            keywords: originalData.metadata?.keywords,
            connections: originalData.metadata?.connections,
            cross_tags: originalData.metadata?.cross_tags,
            approval_status: 'approved',
            pending_approval_id: null
          })
          .eq('id', approval.local_record_id);
      } else {
        // Mark as rejected
        await supabase
          .from('reit_knowledge_items')
          .update({
            approval_status: 'rejected',
            pending_approval_id: null
          })
          .eq('id', approval.local_record_id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Change rejected',
          action: 'rejected'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('❌ Error in naka-reit-kb-review-changes:', error);
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
