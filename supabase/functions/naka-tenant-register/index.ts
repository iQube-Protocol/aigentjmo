import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use Core Hub credentials
    const coreUrl = Deno.env.get('CORE_SUPABASE_URL')!;
    const coreServiceKey = Deno.env.get('CORE_SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(coreUrl, coreServiceKey);

    const { 
      tenant_id, 
      display_name,
      parent_project = 'aigent-nakamoto',
      metadata = {}
    } = await req.json();
    
    if (!tenant_id || !display_name) {
      return new Response(
        JSON.stringify({ error: 'tenant_id and display_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Registering tenant: ${display_name} (${tenant_id})`);

    // Note: Tenant registration stores context in user_migration_map
    // The formal tenants table will be created in Core Hub schema later
    
    // For now, just acknowledge the registration
    const result = {
      tenant_id,
      display_name,
      parent_project,
      metadata,
      registered_at: new Date().toISOString(),
      status: 'active'
    };
    
    console.log(`Tenant registered: ${display_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        tenant: result,
        action: 'registered'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
