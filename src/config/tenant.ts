/**
 * Tenant Configuration for Aigent JMO
 * 
 * This project is a tenant instance of the root Aigent Nakamoto project.
 * It inherits root configuration but maintains its own tenant-specific data.
 */

export const TENANT_CONFIG = {
  // Unique tenant identifier
  tenantId: 'aigent-jmo',
  
  // Display name in QubeBase
  displayName: 'Aigent JMO',
  
  // Parent project (root)
  parentProject: 'aigent-nakamoto',
  
  // Tenant type
  type: 'child' as const,
  
  // Inheritance settings
  inheritance: {
    // Inherit root system prompts
    inheritRootPrompts: true,
    
    // Inherit root knowledge base
    inheritRootKB: true,
    
    // Allow tenant-specific augmentations
    allowTenantAugmentation: true,
    
    // Sync changes from root
    syncFromRoot: true,
    
    // Do not push changes to root
    pushToRoot: false
  },
  
  // QubeBase Core Hub connection
  coreHub: {
    url: 'https://bsjhfvctmduxhohtllly.supabase.co',
    // Anon key for client-side operations
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzamhmdmN0bWR1eGhvaHRsbGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MjYxMjgsImV4cCI6MjA1ODUwMjEyOH0.wBJSVkd5VQ2FiUqLbV5Ek2a8AEpC0wBcpJ4LfW0npUA'
  },
  
  // Metadata
  metadata: {
    created: new Date().toISOString(),
    version: '1.0.0',
    description: 'First tenant instance of Aigent Nakamoto project'
  }
} as const;

/**
 * Get tenant context for QubeBase operations
 */
export function getTenantContext() {
  return {
    tenantId: TENANT_CONFIG.tenantId,
    displayName: TENANT_CONFIG.displayName,
    parentProject: TENANT_CONFIG.parentProject
  };
}

/**
 * Check if this is a tenant project (vs root project)
 */
export function isTenantProject(): boolean {
  return TENANT_CONFIG.type === 'child';
}

/**
 * Check if tenant should inherit from root
 */
export function shouldInheritFromRoot(): boolean {
  return TENANT_CONFIG.inheritance.syncFromRoot;
}

/**
 * Check if tenant can augment root data
 */
export function canAugmentRoot(): boolean {
  return TENANT_CONFIG.inheritance.allowTenantAugmentation;
}
