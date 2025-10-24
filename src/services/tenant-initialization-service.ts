import { supabase } from '@/integrations/supabase/client';
import { TENANT_CONFIG, getTenantContext } from '@/config/tenant';
import { coreHubClient } from './qubebase-core-client';

/**
 * Initialize tenant context and register with QubeBase Core Hub
 */
export async function initializeTenant(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🏢 Initializing tenant:', TENANT_CONFIG.displayName);
    
    const context = getTenantContext();
    
    // Store tenant context in localStorage
    localStorage.setItem('tenantId', context.tenantId);
    localStorage.setItem('tenantDisplayName', context.displayName);
    localStorage.setItem('parentProject', context.parentProject);
    
    // Register tenant with Core Hub via edge function
    const { data, error } = await supabase.functions.invoke('naka-tenant-register', {
      body: {
        tenant_id: context.tenantId,
        display_name: context.displayName,
        parent_project: context.parentProject,
        metadata: TENANT_CONFIG.metadata
      }
    });
    
    if (error) {
      console.error('Failed to register tenant:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Tenant registered successfully:', data);
    
    return { success: true };
  } catch (error: any) {
    console.error('Tenant initialization error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get current tenant ID from context
 */
export function getCurrentTenantId(): string {
  return localStorage.getItem('tenantId') || TENANT_CONFIG.tenantId;
}

/**
 * Get current tenant display name
 */
export function getCurrentTenantName(): string {
  return localStorage.getItem('tenantDisplayName') || TENANT_CONFIG.displayName;
}

/**
 * Check if tenant is properly initialized
 */
export function isTenantInitialized(): boolean {
  return !!localStorage.getItem('tenantId');
}
