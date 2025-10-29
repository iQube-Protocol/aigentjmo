# Tenant Setup Guide - QubeBase Multi-Tenant Architecture

## Overview
This document captures critical insights and requirements for setting up new tenant sites within the QubeBase ecosystem. It addresses common issues and provides a streamlined checklist for tenant initialization.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Phase 1: Core Database Setup](#phase-1-core-database-setup)
3. [Phase 2: Authentication Configuration](#phase-2-authentication-configuration)
4. [Phase 3: Admin Role Initialization](#phase-3-admin-role-initialization)
5. [Phase 4: QubeBase Integration](#phase-4-qubebase-integration)
6. [Phase 5: Security Validation](#phase-5-security-validation)
7. [Common Issues & Solutions](#common-issues--solutions)
8. [Testing Checklist](#testing-checklist)

---

## Prerequisites

### Required Information
- [ ] Tenant ID from QubeBase Core Hub
- [ ] Site ID for this specific tenant site
- [ ] Core Hub connection credentials (URL, anon key, service role key)
- [ ] List of uber_admin users (estate-wide admins like `dele@metame.com`)
- [ ] List of super_admin users (tenant-specific admins)
- [ ] Supabase project URL and keys

### Environment Variables
Ensure these are configured in `.env`:
```bash
VITE_SUPABASE_URL=<tenant-supabase-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<tenant-anon-key>
VITE_SUPABASE_PROJECT_ID=<tenant-project-id>
```

---

## Phase 1: Core Database Setup

### 1.1 Create User Roles System

**CRITICAL SECURITY**: Never store roles on user profiles or auth.users table. Always use a separate `user_roles` table.

```sql
-- 1. Create role enum (if not exists)
CREATE TYPE IF NOT EXISTS public.app_role AS ENUM (
  'user',
  'admin', 
  'super_admin',
  'uber_admin'
);

-- 2. Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- 3. Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create security definer function (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Create RLS policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Add performance index
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role 
  ON public.user_roles(user_id, role);
```

### 1.2 Create Persona Tables

```sql
-- KNYT Personas
CREATE TABLE IF NOT EXISTS public.knyt_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.knyt_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own knyt persona"
  ON public.knyt_personas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own knyt persona"
  ON public.knyt_personas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knyt persona"
  ON public.knyt_personas FOR UPDATE
  USING (auth.uid() = user_id);

-- Qripto Personas (note the spelling: Qripto with 'i', not Qrypto)
CREATE TABLE IF NOT EXISTS public.qripto_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.qripto_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own qripto persona"
  ON public.qripto_personas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own qripto persona"
  ON public.qripto_personas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own qripto persona"
  ON public.qripto_personas FOR UPDATE
  USING (auth.uid() = user_id);

-- Update triggers for both tables
CREATE TRIGGER update_knyt_personas_updated_at
  BEFORE UPDATE ON public.knyt_personas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qripto_personas_updated_at
  BEFORE UPDATE ON public.qripto_personas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### 1.3 Create Supporting Tables

```sql
-- User Connections
CREATE TABLE IF NOT EXISTS public.user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  connection_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

-- User Interactions (for analytics)
CREATE TABLE IF NOT EXISTS public.user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  query TEXT,
  response TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

-- Invited Users (for invitation system)
CREATE TABLE IF NOT EXISTS public.invited_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invitation_code TEXT,
  persona_type TEXT,
  persona_data JSONB DEFAULT '{}'::jsonb,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  batch_id TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  send_attempts INTEGER DEFAULT 0,
  signup_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)
);

ALTER TABLE public.invited_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitations"
  ON public.invited_users FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
```

---

## Phase 2: Authentication Configuration

### 2.1 Configure Supabase Auth Settings

**CRITICAL**: Always enable auto-confirm for development/testing environments.

```typescript
// Use Supabase configure-auth tool or dashboard
{
  "disable_signup": false,
  "external_anonymous_users_enabled": false,
  "auto_confirm_email": true  // CRITICAL for testing
}
```

### 2.2 Set Email Redirect URLs

Ensure proper redirect configuration in auth settings:
- Site URL: `https://yourtenant.lovable.app`
- Redirect URLs: Add `https://yourtenant.lovable.app/**` to allowed list

### 2.3 Verify Authentication Flow

Test these authentication scenarios:
- [ ] Sign up with email/password
- [ ] Sign in with existing credentials
- [ ] Password reset flow
- [ ] Session persistence across page refreshes
- [ ] Sign out and session cleanup

---

## Phase 3: Admin Role Initialization

### 3.1 Identify Admin Users

**Estate-Wide Admins (uber_admin)**:
- `dele@metame.com` - Always included across entire QubeBase estate
- Any other users designated as estate-wide administrators

**Tenant-Specific Admins (super_admin)**:
- Tenant owner/primary contact
- Site administrators designated by tenant owner

### 3.2 Insert Admin Roles

```sql
-- Add uber_admin role for dele@metame.com (estate-wide)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'uber_admin'::app_role
FROM auth.users
WHERE email = 'dele@metame.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Add super_admin roles for tenant admins
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
WHERE email IN (
  'nakamoto@jaredmooss.com',
  'tenant-admin@example.com'
  -- Add other tenant admin emails here
)
ON CONFLICT (user_id, role) DO NOTHING;
```

### 3.3 Update Admin Portal Security

**CRITICAL**: Never use client-side email checks for admin validation.

❌ **WRONG** - Insecure client-side check:
```typescript
const isAdmin = user?.email?.includes('admin') || user?.email?.includes('nakamoto');
```

✅ **CORRECT** - Server-side role validation:
```typescript
import { useAdminCheck } from '@/hooks/use-admin-check';

const { isAdmin, loading } = useAdminCheck();
```

The `useAdminCheck()` hook queries the `user_roles` table server-side and respects RLS policies.

---

## Phase 4: QubeBase Integration

### 4.1 Configure Tenant Context

Set up the tenant context in `localStorage` or initialization service:

```typescript
import { setTenantContext } from '@/services/qubebase-core-client';

// During tenant initialization
setTenantContext(
  'tenant-uuid-from-core-hub',
  'site-uuid-for-this-tenant'
);
```

### 4.2 QubeBase Role Synchronization (Future Enhancement)

**ISSUE IDENTIFIED**: Currently, tenant sites do NOT automatically sync roles from QubeBase Core Hub. This means:

- Estate-wide uber_admins like `dele@metame.com` must be manually added to each tenant's `user_roles` table
- Role changes in Core Hub do not propagate to tenant sites automatically
- Each tenant site maintains its own isolated role system

**RECOMMENDED SOLUTION** (to be implemented):

1. **Create Edge Function: `naka-roles-sync`**
   - Query Core Hub for user's roles using Core Hub service role key
   - Support "pull on login" and "bulk sync" modes
   - Upsert roles into local tenant's `user_roles` table
   - Handle role inheritance (uber_admin → super_admin in tenant context)

2. **Integrate with Authentication Flow**
   - Call role sync function after successful login
   - Cache sync timestamp to avoid excessive API calls
   - Re-sync periodically (e.g., every 24 hours)

3. **Create Admin UI for Manual Sync**
   - Add "Sync Roles from QubeBase" button in admin portal
   - Display last sync timestamp
   - Show current roles from local database

**Until role sync is implemented**, manually insert admin roles using SQL migration for each new tenant.

### 4.3 Verify Core Hub Connection

```typescript
import { checkCoreHubHealth } from '@/services/qubebase-core-client';

const healthCheck = await checkCoreHubHealth();
console.log('Core Hub Connection:', healthCheck);
```

---

## Phase 5: Security Validation

### 5.1 Run Security Linter

```bash
# Use Supabase linter tool
supabase db lint
```

### 5.2 Verify RLS Policies

Check that all tables with PII have proper RLS:
- [ ] `user_roles` - RLS enabled ✓
- [ ] `knyt_personas` - RLS enabled ✓
- [ ] `qripto_personas` - RLS enabled ✓
- [ ] `user_connections` - RLS enabled ✓
- [ ] `user_interactions` - RLS enabled ✓
- [ ] `invited_users` - RLS enabled ✓

### 5.3 Test Access Control

Test these scenarios:
- [ ] Regular users cannot see other users' data
- [ ] Regular users cannot access admin routes
- [ ] Admin users can access admin portal
- [ ] Admin users can manage invitations
- [ ] Uber admins have estate-wide access
- [ ] Users can only CRUD their own personas

### 5.4 Security Checklist

- [ ] No hardcoded admin emails in client-side code
- [ ] All admin checks use server-side `has_role()` function
- [ ] No sensitive data logged to console
- [ ] Input validation implemented for all forms
- [ ] SQL injection prevented (using Supabase client, not raw SQL)
- [ ] CORS properly configured for edge functions
- [ ] Secrets properly stored (never in code)

---

## Common Issues & Solutions

### Issue 1: Admin Cannot Access Admin Portal

**Symptoms**: 
- User with admin email cannot access `/admin/invitations`
- "Access Denied" message shown
- User is logged in and authenticated

**Root Causes**:
1. Admin roles not inserted into `user_roles` table
2. Client-side email check instead of role-based check
3. RLS policies blocking admin access

**Solutions**:
1. Verify admin role exists in database:
   ```sql
   SELECT u.email, ur.role 
   FROM auth.users u
   LEFT JOIN public.user_roles ur ON u.id = ur.user_id
   WHERE u.email IN ('dele@metame.com', 'nakamoto@jaredmooss.com');
   ```

2. Insert missing roles:
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   SELECT id, 'uber_admin'::app_role FROM auth.users WHERE email = 'dele@metame.com'
   ON CONFLICT DO NOTHING;
   ```

3. Replace client-side checks with `useAdminCheck()` hook

### Issue 2: QubeBase Roles Not Syncing

**Symptoms**:
- Estate-wide admin (dele@metame.com) doesn't have access
- Roles defined in Core Hub not visible in tenant site

**Root Cause**: 
Role synchronization from Core Hub to tenant sites is not yet implemented.

**Temporary Solution**:
Manually insert admin roles into each tenant's `user_roles` table using SQL migration.

**Permanent Solution**:
Implement `naka-roles-sync` edge function as described in Phase 4.2.

### Issue 3: Spelling Inconsistencies

**Issue**: "Qrypto" vs "Qripto" spelling inconsistencies across codebase

**Impact**: 
- Database table: `qripto_personas` (with 'i')
- Some UI references still use "Qrypto" (with 'y')
- Causes confusion and potential bugs

**Solution**: 
Standardize on "Qripto" (with 'i') everywhere:
- Database tables: `qripto_personas`
- TypeScript types: `QriptoPersona`
- UI labels: "Qripto Persona", "QriptoCOYN"
- File names: `qripto-*.ts`

Search and replace across codebase:
- "Qrypto" → "Qripto"
- "QryptoCOYN" → "QriptoCOYN"

### Issue 4: RLS Infinite Recursion

**Symptoms**: 
- "infinite recursion detected in policy" error
- Queries hang or timeout

**Root Cause**: 
RLS policy queries the same table it's protecting.

**Solution**: 
Always use security definer functions for role checks:

```sql
-- WRONG - causes recursion
CREATE POLICY "Admins can view all" ON profiles
FOR SELECT USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- CORRECT - uses security definer function
CREATE POLICY "Admins can view all" ON profiles
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role)
);
```

### Issue 5: Persona Tables Missing Name Fields

**Symptoms**:
- NameManagementSection displays "No data for selected persona" even when persona exists
- Name preferences cannot be properly stored or displayed
- Profile management features incomplete

**Root Cause**:
Initial persona table schema was missing critical name fields (`First-Name` and `Last-Name`) that are required by the name management system.

**Solution**:
Add missing columns to both persona tables:

```sql
-- Add name fields to knyt_personas
ALTER TABLE public.knyt_personas
ADD COLUMN IF NOT EXISTS "First-Name" TEXT,
ADD COLUMN IF NOT EXISTS "Last-Name" TEXT,
ADD COLUMN IF NOT EXISTS "Email" TEXT;

-- Add name fields to qripto_personas  
ALTER TABLE public.qripto_personas
ADD COLUMN IF NOT EXISTS "First-Name" TEXT,
ADD COLUMN IF NOT EXISTS "Last-Name" TEXT,
ADD COLUMN IF NOT EXISTS "Email" TEXT;
```

**Note**: Column names use mixed case with hyphens to match external API naming conventions (LinkedIn, Twitter).

### Issue 6: Duplicate UI Messages in Components

**Symptoms**:
- "No data for selected persona" message appearing multiple times
- Confusing UX with redundant empty state messaging
- CardDescription not dynamically reflecting current view

**Root Cause**:
Component had duplicate conditional rendering logic showing the same empty state message twice.

**Solution**:
Clean up conditional rendering in `NameManagementSection.tsx`:
- Remove duplicate empty state checks
- Update CardDescription to dynamically display filtered persona type
- Consolidate empty state rendering into single location

```tsx
// Dynamic description based on filter
<CardDescription className="text-xs sm:text-sm">
  {filterPersonaType 
    ? `Manage your ${filterPersonaType.toUpperCase()} persona display names and profile images`
    : 'Manage your persona display names and profile images across KNYT and QRIPTO'}
</CardDescription>
```

### Issue 7: Protected Routes Not Handling Guest Mode

**Symptoms**:
- Profile page shows blank screen when not authenticated
- Loading states not properly displayed
- Guest users see nothing instead of helpful sign-in prompt

**Root Cause**:
Profile.tsx component returned `null` when `user` was null, but `ProtectedRoute` wrapper allows guest mode, creating mismatch where component renders nothing while route thinks it should show content.

**Solution**:
Update Profile component to properly handle all authentication states:

```tsx
const { user, isGuest, loading: authLoading } = useAuth();

// Show loading spinner during authentication check
if (authLoading) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-lg">Loading profile...</p>
      </div>
    </div>
  );
}

// Show sign-in prompt for guest users
if (!user && isGuest) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          You're browsing in guest mode. Sign in to view your profile and history.
        </p>
        <Link to="/signin">
          <Button size="sm">Sign in</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
```

**Key Lessons**:
- Always handle loading, authenticated, and guest states explicitly
- Never return `null` from protected routes - provide helpful messaging
- Extract auth states early: `isGuest`, `loading`, `user`
- Ensure UI consistency between route protection and component rendering

### Issue 8: Non-Existent Column References in Queries

**Symptoms**:
- Database error: "column user_connections.connected_at does not exist"
- Features fail to load in production even though they work locally
- Private data fields not rendering

**Root Cause**:
Code was referencing `connected_at` column that doesn't exist in the `user_connections` table. The table only has `created_at` and `updated_at` columns.

**Solution**:
Replace all references to `connected_at` with `updated_at` (which tracks the same information):

```typescript
// ❌ WRONG - references non-existent column
const { data } = await supabase
  .from('user_connections')
  .select('service, connected_at, connection_data')
  .eq('user_id', user.id);

// ✅ CORRECT - uses existing column
const { data } = await supabase
  .from('user_connections')
  .select('service, updated_at, connection_data')
  .eq('user_id', user.id);
```

**Affected Files**:
- `src/hooks/useServiceConnections.ts` - Query selection
- `src/services/wallet-connection-service.ts` - Update operations (remove `connected_at` from updates as `updated_at` is auto-managed)

**Prevention**:
- Always verify column names against actual table schema before deployment
- Use TypeScript types from `src/integrations/supabase/types.ts` for type safety
- Test thoroughly in production-like environment before deploying
- Review console logs for database errors during integration testing

### Issue 9: Tenant Agent Name Not Displaying in History

**Symptoms**:
- History shows generic "Nakamoto" agent name instead of tenant-specific name (e.g., "JMO KNYT")
- Agent name doesn't match the tenant branding in QubeBase
- All interactions show the same agent name regardless of tenant

**Root Cause**:
The agent name was hardcoded in the Profile.tsx component instead of being read from tenant configuration and interaction metadata.

**Solution**:
1. Add `agentName` property to tenant configuration
2. Store agent name in interaction metadata when saving
3. Read agent name from metadata when displaying in Profile

**Implementation Steps**:

**Step 1: Update Tenant Configuration** (`src/config/tenant.ts`):
```typescript
export const TENANT_CONFIG = {
  // Unique tenant identifier
  tenantId: 'aigent-jmo',
  
  // Display name in QubeBase
  displayName: 'Aigent JMO',
  
  // Agent name displayed in UI and history
  agentName: 'JMO KNYT',  // ✅ Add this property
  
  // Parent project (root)
  parentProject: 'aigent-nakamoto',
  ...
}
```

**Step 2: Store Agent Name in Metadata** (`src/services/user-interaction-service.ts`):
```typescript
import { TENANT_CONFIG } from '@/config/tenant';

// Inside storeUserInteraction function:
const enhancedMetadata = {
  ...data.metadata,
  activePersona: selectedPersona || 'Anon',
  agentName: TENANT_CONFIG.agentName,  // ✅ Add agent name to metadata
  timestamp: new Date().toISOString()
};
```

**Step 3: Display Agent Name from Metadata** (`src/pages/Profile.tsx`):
```typescript
// ❌ WRONG - hardcoded agent name
<Badge variant="secondary" className="bg-qripto-primary w-fit text-xs">
  Nakamoto
</Badge>

// ✅ CORRECT - read from metadata with fallback
<Badge variant="secondary" className="bg-qripto-primary w-fit text-xs">
  {interaction.metadata?.agentName || 'Nakamoto'}
</Badge>
```

**Affected Files**:
- `src/config/tenant.ts` - Add agentName property
- `src/services/user-interaction-service.ts` - Store agentName in metadata
- `src/pages/Profile.tsx` - Display agentName from metadata in history list
- `src/components/profile/ResponseDialog.tsx` - Display agentName in detailed view dialog

**Testing**:
1. Update tenant config with your agent name
2. Have a conversation with the agent
3. Check Profile page history - should show your tenant's agent name
4. Verify old interactions still show "Nakamoto" as fallback

**Prevention**:
- Always read agent name from tenant config, never hardcode
- Include agent name in all interaction metadata
- Use fallback values for backwards compatibility with old data

### Issue 11: Missing Environment Variables in Edge Functions

**Symptoms**:
- Edge function returns 500 error with "supabaseUrl is required"
- Error occurs at Supabase client creation line
- Function logs show: `Error: supabaseUrl is required` from `@supabase/supabase-js`

**Root Cause**:
Edge function attempts to create a Supabase client using environment variables that don't exist in the project's secrets configuration.

**Example Error**:
```
Function error: Error: supabaseUrl is required.
    at createClient (https://esm.sh/@supabase/supabase-js@2.76.1)
    at Server.<anonymous> (file:///.../index.ts:17:22)
```

**Solution**:

**Option 1: Remove Unused Client (Recommended if not needed)**
```typescript
// ❌ WRONG - Creates client with non-existent env vars
const coreUrl = Deno.env.get('CORE_SUPABASE_URL')!;
const coreServiceKey = Deno.env.get('CORE_SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(coreUrl, coreServiceKey);
// ... client never used ...

// ✅ CORRECT - Remove unused client creation
// Just proceed with your logic without the client
```

**Option 2: Use Correct Environment Variables**
```typescript
// ✅ CORRECT - Use existing Supabase environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
```

**Option 3: Add Missing Secrets**
If you need custom Supabase credentials (e.g., for QubeBase Core Hub):
1. Use the secrets tool to add `CORE_SUPABASE_URL` and `CORE_SUPABASE_SERVICE_ROLE_KEY`
2. Only after secrets are added, proceed with using them in code

**Available Environment Variables**:
Always check existing secrets before using environment variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `SUPABASE_PUBLISHABLE_KEY`
- `LOVABLE_API_KEY`
- `CHAINGPT_API_KEY`

**Affected Files**:
- `supabase/functions/naka-tenant-register/index.ts` - Removed unused client creation

**Prevention**:
- Never assume environment variables exist without checking
- Remove unused code (like Supabase clients that aren't needed)
- Always log which env vars you're trying to access for debugging
- Use the correct env variable names that exist in your project
- Add new secrets via the secrets tool before using them in code

### Issue 12: Tenant-Specific Meta Tags and Branding

**Symptoms**:
- Social media link previews show incorrect branding (root project name instead of tenant name)
- Open Graph and Twitter Card metadata displays "Aigent Nakamoto" instead of tenant-specific name
- Link previews on platforms like Slack, Discord, LinkedIn show wrong description

**Root Cause**:
The `index.html` file contains hardcoded meta tags for the root project (Aigent Nakamoto) instead of tenant-specific branding.

**Solution**:
Update meta tags in `index.html` to reflect tenant branding:

```html
<!-- ❌ WRONG - Root project branding -->
<meta property="og:title" content="Aigent Nakamoto - AI Agent Community Platform" />
<meta name="twitter:title" content="Aigent Nakamoto - AI Agent Community Platform" />

<!-- ✅ CORRECT - Tenant-specific branding -->
<meta property="og:title" content="Aigent JMO KNYT - REIT AI Agent Community Platform" />
<meta name="twitter:title" content="Aigent JMO KNYT - REIT AI Agent Community Platform" />
```

**Full Meta Tag Configuration**:
```html
<!-- Open Graph / Facebook -->
<meta property="og:title" content="Aigent JMO KNYT - REIT AI Agent Community Platform" />
<meta property="og:description" content="Join the future of AI agents with advanced blockchain integration, quantum cryptography, and decentralized intelligence networks" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://jmo.aigentz.me" />
<meta property="og:image" content="/lovable-uploads/fb39dde0-7003-40a5-812e-6d6439bd1391.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:site_name" content="Aigent JMO KNYT" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@AigentNakamoto" />
<meta name="twitter:title" content="Aigent JMO KNYT - REIT AI Agent Community Platform" />
<meta name="twitter:description" content="Join the future of AI agents with advanced blockchain integration, quantum cryptography, and decentralized intelligence networks" />
<meta name="twitter:image" content="/lovable-uploads/fb39dde0-7003-40a5-812e-6d6439bd1391.png" />
```

**Tenant Configuration Checklist**:
1. Update `og:title` and `twitter:title` with tenant name and description
2. Update `og:url` with tenant domain
3. Update `og:site_name` with tenant name
4. Update `twitter:site` handle if tenant has separate Twitter account
5. Replace `og:image` and `twitter:image` if tenant has custom branding image
6. Verify page title in `<title>` tag matches tenant branding

**Affected Files**:
- `index.html` - Lines 16-31 (Open Graph and Twitter Card meta tags)

**Prevention**:
- Always customize meta tags for each tenant during initial setup
- Document tenant-specific branding requirements
- Test link previews on multiple platforms (Slack, Discord, LinkedIn, Twitter)
- Use tenant configuration file as source of truth for branding

### Issue 10: Inconsistent History Rendering in Production

**Symptoms**:
- User interaction history doesn't always render automatically on Profile page
- Sometimes switching between personas (Qripto/KNYT) shows history, sometimes not
- Data exists in database but UI remains empty intermittently

**Root Cause**:
Navigation-aware loading logic was too aggressive in deferring data fetches during route transitions, causing race conditions in production. The `NavigationGuard.isNavigationInProgress()` checks were preventing data loads inconsistently.

**Solution**:
1. Disable navigation deferral for Profile page data loading
2. Add force refresh mechanism that bypasses navigation checks
3. Improve persona filtering logic to handle all metadata states (including null/undefined `activePersona`)

```typescript
// ❌ WRONG - defers loading too aggressively
const { interactions } = useUserInteractionsOptimized('all', {
  deferDuringNavigation: true  // Can cause data not to load
});

// ✅ CORRECT - ensures consistent loading
const { interactions, refreshInteractions } = useUserInteractionsOptimized('all', {
  deferDuringNavigation: false  // Always load data
});

// Force refresh when user becomes available
useEffect(() => {
  if (user && !loading) {
    refreshInteractions(true);  // Force bypasses navigation checks
  }
}, [user]);
```

**Improved Filtering Logic**:
```typescript
// Handle all cases: new activePersona field, legacy flags, and null states
if (activeTab === 'qripto') {
  return activePersona === 'Qripto Persona' || 
         (interaction.metadata?.personaContextUsed && !interaction.metadata?.metaKnytsContextUsed) ||
         (!activePersona && !interaction.metadata?.metaKnytsContextUsed && interaction.metadata?.personaContextUsed);
}
```

**Affected Files**:
- `src/hooks/use-user-interactions-optimized.ts` - Added force parameter to fetchInteractions and refreshInteractions
- `src/pages/Profile.tsx` - Disabled navigation deferral, added force refresh effect, improved filter logic

**Prevention**:
- Avoid over-reliance on navigation guards for critical data fetching
- Always provide force/bypass mechanisms for user-triggered actions
- Handle all possible metadata states in filtering logic
- Test persona switching thoroughly in production environment

---

## Testing Checklist

### Pre-Launch Testing

#### Authentication Tests
- [ ] User can sign up with valid email/password
- [ ] User receives confirmation email (if auto-confirm disabled)
- [ ] User can sign in after signup
- [ ] Session persists across page refreshes
- [ ] User can sign out successfully
- [ ] Password reset flow works end-to-end

#### Admin Access Tests
- [ ] Uber admin (dele@metame.com) can access admin portal
- [ ] Super admin (tenant owner) can access admin portal
- [ ] Regular users cannot access admin portal
- [ ] Admin can view all invitations
- [ ] Admin can create new invitations

#### Persona Management Tests
- [ ] User can create KNYT persona
- [ ] User can create Qripto persona
- [ ] User can update their own personas
- [ ] User cannot view other users' personas
- [ ] Profile images upload successfully

#### QubeBase Integration Tests
- [ ] Tenant context properly initialized
- [ ] Core Hub health check passes
- [ ] User data isolated to correct tenant
- [ ] Cross-tenant data leakage prevented

#### Security Tests
- [ ] Run Supabase security linter
- [ ] Verify all RLS policies active
- [ ] Test unauthorized access attempts
- [ ] Verify input validation on all forms
- [ ] Check for exposed secrets in code
- [ ] Test SQL injection prevention

---

## Post-Launch Monitoring

### Metrics to Track
- User signup/login success rates
- Admin portal access patterns
- Failed authentication attempts
- RLS policy violations
- Edge function error rates
- Database query performance

### Recommended Monitoring Tools
- Supabase Dashboard (Logs, Analytics)
- Custom analytics via `user_interactions` table
- Browser console monitoring for client errors
- Network request monitoring

---

## Future Enhancements

### Priority 1: QubeBase Role Sync
- [ ] Implement `naka-roles-sync` edge function
- [ ] Add role sync to authentication flow
- [ ] Create admin UI for manual role sync
- [ ] Add role sync timestamp tracking

### Priority 2: Tenant Management UI
- [ ] Admin dashboard for tenant configuration
- [ ] Bulk user invitation system
- [ ] Role management interface
- [ ] Tenant analytics and reporting

### Priority 3: Advanced Features
- [ ] Multi-persona support per user
- [ ] Cross-tenant user migration
- [ ] Automated tenant provisioning
- [ ] Advanced RLS policy templates

---

## References

### Key Files
- **Auth Hook**: `src/hooks/use-auth.tsx`
- **Admin Check Hook**: `src/hooks/use-admin-check.ts`
- **QubeBase Client**: `src/services/qubebase-core-client.ts`
- **Admin Portal**: `src/pages/admin/Invitations.tsx`
- **Tenant Init Service**: `src/services/tenant-initialization-service.ts`

### Documentation Links
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [QubeBase Architecture Overview](./ARCHITECTURE.md)
- [Security Best Practices](./SECURITY.md)

---

## Appendix: SQL Script Templates

### Complete Tenant Setup Script

```sql
-- TENANT SETUP SCRIPT
-- Replace <TENANT_NAME> and <ADMIN_EMAILS> with actual values

BEGIN;

-- 1. Create role enum
CREATE TYPE IF NOT EXISTS public.app_role AS ENUM ('user', 'admin', 'super_admin', 'uber_admin');

-- 2. Create user_roles table with RLS
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- 4. Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Create persona tables
CREATE TABLE IF NOT EXISTS public.knyt_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name TEXT,
  email TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.qripto_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name TEXT,
  email TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable RLS on persona tables
ALTER TABLE public.knyt_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qripto_personas ENABLE ROW LEVEL SECURITY;

-- 7. Create persona policies
CREATE POLICY "Users can view their own knyt persona" ON public.knyt_personas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own knyt persona" ON public.knyt_personas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own knyt persona" ON public.knyt_personas FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own qripto persona" ON public.qripto_personas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own qripto persona" ON public.qripto_personas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own qripto persona" ON public.qripto_personas FOR UPDATE USING (auth.uid() = user_id);

-- 8. Add indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON public.user_roles(user_id, role);
CREATE INDEX IF NOT EXISTS idx_knyt_personas_user_id ON public.knyt_personas(user_id);
CREATE INDEX IF NOT EXISTS idx_qripto_personas_user_id ON public.qripto_personas(user_id);

-- 9. Insert admin roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'uber_admin'::app_role FROM auth.users WHERE email = 'dele@metame.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Add tenant-specific admins
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role FROM auth.users 
WHERE email IN ('nakamoto@jaredmooss.com') -- Add more admin emails as needed
ON CONFLICT (user_id, role) DO NOTHING;

COMMIT;
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-28  
**Maintained By**: QubeBase Development Team  
**Questions/Issues**: Contact dele@metame.com
