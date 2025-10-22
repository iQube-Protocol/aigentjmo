import { createClient } from '@supabase/supabase-js';

/**
 * QubeBase Core Hub Client
 * Direct connection to the Core Hub for migration and cross-instance operations
 * 
 * NOTE: This is separate from the main Nakamoto client and should ONLY be used for:
 * - Migration operations
 * - Tenant management
 * - Cross-instance data access
 */

// Core Hub connection (read-only for client-side)
const CORE_HUB_URL = 'https://bsjhfvctmduxhohtllly.supabase.co';
const CORE_HUB_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzamhmdmN0bWR1eGhvaHRsbGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDgyNTgsImV4cCI6MjA3MzEyNDI1OH0.vN9Y_xHQqXqWLQQfnUfhqJI-EjOx5ov-F8G0qKdQjOo';

export const coreHubClient = createClient(CORE_HUB_URL, CORE_HUB_ANON_KEY);

/**
 * Get current tenant context from localStorage
 */
export function getTenantContext(): { tenantId: string; siteId: string } {
  return {
    tenantId: localStorage.getItem('tenantId') || '00000000-0000-0000-0000-000000000000',
    siteId: localStorage.getItem('siteId') || ''
  };
}

/**
 * Set tenant context in localStorage
 */
export function setTenantContext(tenantId: string, siteId: string) {
  localStorage.setItem('tenantId', tenantId);
  localStorage.setItem('siteId', siteId);
}

/**
 * Query Core Hub with automatic tenant scoping
 */
export async function queryCoreHub<T = any>(
  table: string,
  options?: {
    select?: string;
    filter?: Record<string, any>;
    scopeToTenant?: boolean;
  }
) {
  const { tenantId } = getTenantContext();
  let query = coreHubClient.from(table).select(options?.select || '*');

  // Apply filters
  if (options?.filter) {
    Object.entries(options.filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  // Auto-scope to tenant if enabled
  if (options?.scopeToTenant && tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  return query;
}

/**
 * Health check for Core Hub connection
 */
export async function checkCoreHubHealth(): Promise<{ connected: boolean; error?: string }> {
  try {
    const { error } = await coreHubClient
      .from('kb.corpora')
      .select('id')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (acceptable)
      return { connected: false, error: error.message };
    }

    return { connected: true };
  } catch (error: any) {
    return { connected: false, error: error.message };
  }
}
