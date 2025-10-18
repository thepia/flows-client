# Role Architecture Decisions and Evolution (HISTORICAL)

**⚠️ ARCHIVED**: This document contains historical context for the role system evolution.

**📋 CURRENT SYSTEM**: [../USER_ROLE_MANAGEMENT.md](../USER_ROLE_MANAGEMENT.md) - v31 implementation with hybrid authentication

**🗓️ ARCHIVED**: January 2025 - Historical context preserved for reference

---

## Executive Summary

This document captures critical architectural decisions made during the role system design for Thepia Flows. It includes the evolution from complex custom role systems to a simplified, secure approach optimized for Thepia's specific requirements.

## Background Context

### Original Problem
- `/admin` app in flows.thepia.net could not see invitation records
- RLS policies were blocking access even for intended admin users
- Need for secure, web-deployable admin tools for Thepia staff

### Initial Analysis Discovery
- Supabase JWT contained `"role": "authenticated"` (database role) 
- Custom role `"thepia_staff"` was in `user_metadata.role`
- RLS policies were checking wrong JWT path: `auth.jwt()->>'role'` instead of `auth.jwt()->>'user_metadata'->>'role'`

## Architectural Requirements Analysis

### Thepia's Actual System Requirements
Based on detailed discussion with stakeholder:

1. **Thepia Staff Access**
   - Full cross-client database access for development and maintenance
   - Web-deployable admin tools (security requirement: no service keys in client code)
   - Only group with direct database admin capabilities

2. **Client Isolation Model**
   - Each client operates in isolated "island" determined by `client_id`
   - Clients have NO direct database access
   - 100% transparent database layer - clients don't know database exists
   - Apps may access Supabase, but database is completely abstracted

3. **Client User Hierarchy**
   - **Client Superusers**: Access to additional tables within their client's data
   - **Client Regular Users**: Basic access within their client's data
   - No cross-client data access for any client users

4. **System Evolution Goals**
   - Highly automated with minimal admin intervention long-term
   - Currently in setup/proof-of-concept phase requiring admin tooling
   - Architecture must support transition to automated operations

## Architecture Decision Process

### Why Not Standard Supabase Roles?

**Initial Challenge**: Why can't we use Supabase's built-in role system?

**Analysis of Supabase Built-in Limitations**:
```sql
-- Supabase only provides 3 fixed roles:
'anon'          -- Unauthenticated users
'authenticated' -- Any signed-in user  
'service_role'  -- Backend services (bypasses RLS)
```

**Critical Limitations Identified**:
1. **No Role Hierarchy**: Cannot distinguish admin from regular users
2. **No Business Logic Roles**: Cannot have thepia_staff vs client_user distinctions
3. **No Dynamic Assignment**: Cannot promote users or change permissions via application
4. **No Client Isolation**: Cannot restrict users to specific client data

**Real-World Impact**:
```sql
-- IMPOSSIBLE with built-in roles: Can't distinguish admin from regular user
CREATE POLICY policy_invitations_access ON invitations
  FOR ALL USING (
    auth.jwt()->>'role' = 'authenticated'  -- ALL users see ALL data!
  );

-- IMPOSSIBLE: Can't restrict data by client  
CREATE POLICY policy_client_data ON clients
  FOR SELECT USING (
    auth.jwt()->>'role' = 'authenticated'  -- Every user sees every client!
  );
```

### Evaluation of Role System Options

#### Option 1: Complex Custom Role System (Initially Proposed)
```sql
-- Multi-tier role hierarchy
CREATE TABLE api.user_roles (user_id, role, permissions, client_assignments...);
CREATE TABLE api.role_permissions (...);
CREATE TABLE api.client_user_roles (...);
```

**Pros**: Maximum flexibility, enterprise-grade permission system
**Cons**: Over-engineered for current requirements, complex to maintain

#### Option 2: Service Key Distribution (Rejected)
```javascript
// Use service_role key in client applications
const supabase = createClient(url, serviceKey);
```

**Pros**: Simple, bypasses all RLS complexity
**Cons**: **Major security risk** - service keys in client code, wide distribution

#### Option 3: Simplified JWT Claims (Selected)
```sql
-- Thepia staff: user_metadata.role = 'thepia_staff'
auth.jwt()->>'user_metadata'->>'role' = 'thepia_staff'

-- Client users: client_id isolation + optional client_role
auth.jwt()->>'client_id' = 'uuid'
auth.jwt()->>'user_metadata'->>'client_role' = 'superuser'  -- optional
```

**Pros**: Secure, web-deployable, meets all requirements, industry standard pattern
**Cons**: Requires understanding of JWT structure

## Final Architecture Decision

### Chosen Approach: JWT Claims with Minimal Complexity

#### For Thepia Staff (Web-Deployable Admin Tools)
- **Role Assignment**: `user_metadata.role = 'thepia_staff'` in Supabase Auth
- **Security**: No service keys in client-side code
- **Deployment**: Can safely deploy admin apps to web
- **Access Pattern**: Full cross-client database access via RLS policies

#### For Client Users (Client-Scoped Access)
- **Isolation**: `client_id` in JWT claims
- **Hierarchy**: Optional `user_metadata.client_role` for superusers
- **Security**: Cannot access other clients' data
- **Transparency**: Database layer completely abstracted

#### For Internal Development Tools
- **CLI Tools**: Service key for local development scripts
- **Migration Scripts**: Service key for database operations
- **Monitoring**: Service key for system health checks

### RLS Policy Pattern
```sql
-- Standard pattern for all tables
CREATE POLICY unified_access ON table_name
  FOR ALL USING (
    -- Thepia staff: full access
    auth.jwt()->>'user_metadata'->>'role' = 'thepia_staff'
    OR auth.jwt()->>'role' = 'service_role'
    OR (
      -- Client users: isolated to their client
      client_id = (auth.jwt()->'client_id')::uuid
      AND (
        -- Regular tables: all client users
        table_access_level = 'regular'
        -- Admin tables: superusers only
        OR auth.jwt()->>'user_metadata'->>'client_role' = 'superuser'
      )
    )
  );
```

## Implementation Steps

### Phase 1: Immediate Fix (Current)
1. **Fix JWT Path in RLS Policies**
   ```sql
   -- Change from:
   auth.jwt()->>'role' = 'thepia_staff'
   -- To:
   auth.jwt()->>'user_metadata'->>'role' = 'thepia_staff'
   ```

2. **Verify Admin App Access**
   - Apply single policy fix to invitations table
   - Confirm admin app shows missing records
   - Validate create/edit functionality

### Phase 2: System-Wide Implementation
1. **Update All RLS Policies** (schema 23_fix_jwt_role_paths.sql)
2. **Implement Client Isolation** patterns
3. **Add Client Superuser** support where needed

### Phase 3: Production Hardening
1. **Security Audit** of JWT claim usage
2. **Performance Testing** of RLS policies
3. **Documentation** for client onboarding

## Security Considerations

### JWT Claims Security Model
- **Thepia Staff**: Assigned via admin tools, stored in Supabase Auth user_metadata
- **Client Assignment**: Set during user onboarding, immutable after creation
- **Client Roles**: Managed by client superusers within their domain

### Service Key Protection
- **Development Only**: CLI tools and migration scripts
- **Never in Client Code**: No service keys in web-deployable applications
- **Environment Isolation**: Different keys for dev/staging/production

### RLS Policy Validation
- **Defense in Depth**: Multiple layers of access control
- **Audit Logging**: All policy changes tracked
- **Regular Review**: Quarterly security assessment of policies

## Lessons Learned

### Key Insights
1. **Challenge Assumptions**: Initial complex role system was over-engineered
2. **Requirements Drive Architecture**: Thepia's specific needs allow simpler solutions
3. **Security vs Simplicity**: Can achieve both with careful JWT design
4. **Supabase Patterns**: user_metadata approach is industry standard for custom roles

### Common Pitfalls Avoided
1. **Service Key Distribution**: Rejected due to security implications
2. **Complex Role Hierarchies**: Avoided unnecessary complexity
3. **Wrong JWT Paths**: Identified and fixed RLS policy paths
4. **Over-Engineering**: Chose minimal viable architecture

## Future Considerations

### Scaling Considerations
- **Multi-Tenant Growth**: Current client_id isolation pattern scales well
- **Role Complexity**: Can add role hierarchies if needed without architectural changes
- **Performance**: RLS policies perform well with proper indexing

### Migration Path
- **Current System**: Proven foundation for growth
- **Enterprise Features**: Can add without breaking changes
- **Client Onboarding**: Streamlined process with current architecture

## Cross-References

### Related Documentation
- **[USER_ROLE_MANAGEMENT.md](USER_ROLE_MANAGEMENT.md)**: Technical implementation details
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)**: Installation and configuration
- **[flows.thepia.net/docs/admin-interface.md](../../flows.thepia.net/docs/admin-interface.md)**: Admin app documentation

### Implementation Files
- **Schema**: `schemas/22_user_role_management.sql`, `schemas/23_fix_jwt_role_paths.sql`
- **CLI Tools**: `scripts/manage-admin-users.js`
- **Admin App**: `flows.thepia.net/src/stores/auth.js`

---

**Document Status**: ✅ Complete - Captures all architectural decisions and rationale from role system design process.

**Last Updated**: July 2025 - Post architecture decision and implementation