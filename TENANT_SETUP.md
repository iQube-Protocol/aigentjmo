# Aigent JMO - Tenant Setup Documentation

## Overview

**Aigent JMO** is configured as the first tenant instance of the **Aigent Nakamoto** root project, integrated with QubeBase Core Hub for multi-tenant data management.

## Tenant Architecture

```
Aigent Nakamoto (Root Project)
       ↓
    [inherits]
       ↓
Aigent JMO (Tenant - This Project)
       ↓
   [connects to]
       ↓
QubeBase Core Hub (bsjhfvctmduxhohtllly)
```

## Configuration

### Tenant Identity
- **Tenant ID**: `aigent-jmo`
- **Display Name**: `Aigent JMO`
- **Parent Project**: `aigent-nakamoto`
- **Type**: Child tenant

### Inheritance Model
- ✅ **Inherits** root system prompts
- ✅ **Inherits** root knowledge base
- ✅ **Can augment** with tenant-specific data
- ✅ **Syncs** changes from root
- ❌ **Does not push** changes to root

## Files Modified

### Configuration
- `src/config/tenant.ts` - Tenant configuration and identity

### Services
- `src/services/tenant-initialization-service.ts` - Tenant registration and initialization
- `src/services/qubebase-core-client.ts` - Updated default tenant ID
- `src/hooks/use-mcp.ts` - Integrated tenant initialization

### Edge Functions
- `supabase/functions/naka-tenant-register/index.ts` - Tenant registration endpoint

## How It Works

### 1. Initialization Flow

When a user logs in:
1. MCP hook triggers tenant initialization
2. Tenant context is stored in localStorage
3. Tenant is registered with QubeBase Core Hub
4. Connection is verified

### 2. Data Scoping

All QubeBase operations automatically scope to tenant:
- User migration data: `app_nakamoto.user_migration_map` (filtered by tenant_id)
- Knowledge base: `kb.docs` (tenant-scoped + inherited root docs)
- Prompts: `prompts.prompts` (tenant augmentations + root prompts)

### 3. Inheritance Mechanism

```sql
-- Effective KB documents for Aigent JMO
SELECT * FROM kb.docs
WHERE scope = 'root'  -- Inherited from root
   OR (scope = 'tenant' AND tenant_id = 'aigent-jmo')  -- Tenant-specific
```

## QubeBase Core Hub Schema

The tenant must be registered in the Core Hub:

```sql
-- app_nakamoto.tenants table
CREATE TABLE app_nakamoto.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text UNIQUE NOT NULL,
  display_name text NOT NULL,
  parent_project text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Deployment Checklist

### Before Deployment

1. ✅ Tenant configuration defined (`tenant.ts`)
2. ✅ Tenant initialization service created
3. ✅ Edge function for registration deployed
4. ✅ MCP hook integrated with tenant init

### After Deployment

1. **Verify tenant registration**:
   ```sql
   SELECT * FROM app_nakamoto.tenants
   WHERE tenant_id = 'aigent-jmo';
   ```

2. **Check Core Hub connection**:
   - Visit `/admin/migration`
   - Click "Check Connection"
   - Verify tenant is listed

3. **Test tenant scoping**:
   - Add tenant-specific KB document
   - Verify it doesn't appear in other tenants
   - Verify root KB documents are visible

## Migration Path

### From Current Nakamoto to Aigent JMO

1. **Export current Nakamoto data** (see `MIGRATION_STATUS.md`)
2. **Import to Core Hub** using migration edge functions
3. **Tenant inherits** root data automatically
4. **Add tenant-specific** augmentations as needed

### Example: Adding Tenant-Specific Knowledge

```typescript
await supabase.functions.invoke('naka-kb-upsert-tenant-doc', {
  body: {
    tenant_id: 'aigent-jmo',
    title: 'JMO-Specific Instructions',
    content_text: 'Instructions specific to JMO tenant...',
    tags: ['jmo', 'tenant-specific']
  }
});
```

## Troubleshooting

### Tenant Not Found
- Check localStorage for `tenantId`
- Verify `naka-tenant-register` function deployed
- Check Core Hub schema includes `app_nakamoto.tenants` table

### Data Not Scoped Correctly
- Verify tenant_id is being passed to all Core Hub queries
- Check RLS policies include tenant scoping
- Review `qubebase-core-client.ts` tenant context

### Root Data Not Inherited
- Verify `scope = 'root'` documents exist in `kb.docs`
- Check tenant configuration has `inheritRootKB: true`
- Review effective KB views

## Support

For issues with:
- **Tenant setup**: Review this document and `tenant.ts`
- **Data migration**: See `MIGRATION_STATUS.md` and `QUBEBASE_MIGRATION_GUIDE.md`
- **Database schema**: See `NAKAMOTO_DATABASE_SCHEMA.md`
- **Core Hub connection**: Use health check in `/admin/migration`

---

**Status**: ✅ Tenant configured and ready
**Next Step**: Deploy edge functions and verify tenant registration
