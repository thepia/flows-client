# User Role Management System (v22 - OUTDATED)

**⚠️ DEPRECATED**: This document describes an outdated system that used `auth.users(id)` foreign keys.

**📋 USE INSTEAD**: [../USER_ROLE_MANAGEMENT.md](../USER_ROLE_MANAGEMENT.md) - Current v31 system with stable identity

**🗓️ ARCHIVED**: January 2025 - Replaced by v31 system with hybrid authentication support

---

Documentation for the Thepia Flows database user role and permission system (LEGACY VERSION).

## Overview

The Thepia Flows database uses a simplified JWT-based authentication system with Row Level Security (RLS) policies optimized for Thepia's specific requirements. This system provides secure, web-deployable admin tools while maintaining strict client isolation.

**📖 See [ROLE_ARCHITECTURE_DECISIONS.md](ROLE_ARCHITECTURE_DECISIONS.md) for the complete architectural rationale and decision process.**

## Role System Architecture

### System Requirements Summary

**Thepia's role system is designed for:**
1. **Thepia Staff**: Full cross-client access for development and maintenance
2. **Client Isolation**: Each client operates in isolated "islands" by `client_id`
3. **Client User Hierarchy**: Regular users and optional superusers within client data
4. **Web-Deployable Security**: No service keys in client-side code
5. **Future Automation**: Minimal admin intervention as system matures

### Role Types

#### Thepia Staff Roles
- **`thepia_staff`** - Thepia employees with full cross-client database access
- **`service_role`** - Backend services and CLI tools (server-side only)

#### Client User Roles  
- **`authenticated`** - Client users with access limited to their `client_id`
- **`client_superuser`** - Optional enhanced access within client's data (via `user_metadata.client_role`)

#### System Roles
- **`anon`** - Anonymous users with limited demo access

### Access Patterns

1. **Thepia Staff Access**: Full cross-client access via `user_metadata.role = 'thepia_staff'`
2. **Client Isolation**: Strict separation via `client_id` in JWT claims  
3. **Client Hierarchy**: Optional superuser privileges within client data
4. **Service Access**: CLI tools and backend services use service_role key

## User Role Management Table

```sql
CREATE TABLE api.user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('thepia_staff', 'service_role', 'authenticated')),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);
```

## Role Assignment Functions

### Assign thepia_staff Role

```sql
-- Assign thepia_staff role to a user by email
SELECT * FROM assign_thepia_staff_role('user@example.com', 'Promotion to admin');
```

**Returns:**
- `success` (boolean) - Whether the operation succeeded
- `message` (text) - Human-readable result message
- `user_id` (uuid) - The affected user's ID

### Remove User Role

```sql
-- Remove role assignment from a user
SELECT * FROM remove_user_role('user@example.com');
```

### List All User Roles

```sql
-- View all current role assignments
SELECT * FROM list_user_roles();
```

**Returns:**
- `user_id` - User's UUID
- `email` - User's email address
- `role` - Assigned role
- `assigned_by_email` - Who assigned the role
- `assigned_at` - When the role was assigned
- `notes` - Assignment notes

## RLS Policy Integration

All tables with client data follow this RLS pattern:

```sql
-- Staff can access everything
CREATE POLICY policy_table_staff_access ON table_name
  FOR ALL USING (
    auth.jwt()->>'role' = 'thepia_staff'
    OR auth.jwt()->>'role' = 'service_role'
  );

-- Clients can only access their own data
CREATE POLICY policy_table_client_access ON table_name
  FOR SELECT USING (
    auth.jwt()->>'client_id' = client_id::text
    OR auth.jwt()->>'client_code' = some_client_field
  );
```

## Admin Application Setup

For admin applications like `flows.thepia.net/admin`:

1. **User must have `thepia_staff` role** in their JWT claims
2. **Role is checked client-side** via `auth.jwt()->>'role'`
3. **RLS policies enforce server-side** access control

### Common Issues

### Problem: Admin app shows no data despite user being logged in

**Root Cause**: RLS policies checking wrong JWT path

**Diagnosis**:
1. User has `"role": "thepia_staff"` in `user_metadata` (✅ correct)
2. RLS policies check `auth.jwt()->>'role'` which returns `"authenticated"` (❌ wrong path)
3. Should check `auth.jwt()->>'user_metadata'->>'role'` (✅ correct path)

**Solution**:
```sql
-- Fix RLS policy JWT path (recommended)
DROP POLICY IF EXISTS policy_invitations_staff_access ON api.invitations;
CREATE POLICY policy_invitations_staff_access ON api.invitations
  FOR ALL USING (
    auth.jwt()->>'user_metadata'->>'role' = 'thepia_staff'  -- Correct path
    OR auth.jwt()->>'role' = 'service_role'
  );

-- Alternative: Check if user has role assigned
SELECT * FROM list_user_roles() WHERE user_email = 'admin@thepia.com';

-- Assign role if missing
SELECT * FROM assign_thepia_staff_role('admin@thepia.com', 'Admin access for flows app');
```

### Problem: Service key security concerns

**Situation**: Need admin access but concerned about service key distribution

**Solution**: Use `thepia_staff` role instead of service key
- ✅ **Secure**: No service keys in client-side code
- ✅ **Web-deployable**: Can safely deploy admin apps
- ✅ **Auditable**: All actions logged with user identity

## JWT Claims Population

The system provides a function to populate JWT claims during authentication:

```sql
-- This function should be integrated with Supabase Auth hooks
SELECT auth.populate_user_claims('user-uuid-here');
```

**Note**: This requires Supabase Edge Functions or custom auth hooks to implement the JWT claim injection during authentication.

## Security Considerations

### Role Assignment Security

- Only `thepia_staff` and `service_role` can assign roles
- All role changes are logged with timestamps and assigner information
- Role assignments are protected by RLS policies

### Database Access

- **Service role key**: Has full database access, bypasses RLS
- **Anonymous key**: Limited by RLS policies, safe for client-side use
- **User JWTs**: Contain role claims that determine RLS policy enforcement

### Audit Trail

All role assignments are logged in `api.user_roles` with:
- Who assigned the role (`assigned_by`)
- When it was assigned (`assigned_at`)
- Optional notes explaining the assignment

## Quick Reference

### Initial Admin Setup

```sql
-- 1. Apply schema
\i schemas/22_user_role_management.sql

-- 2. Create first admin
SELECT * FROM assign_thepia_staff_role('admin@thepia.com', 'Initial admin user');

-- 3. Verify
SELECT * FROM list_user_roles();
```

### Troubleshooting Commands

```sql
-- Find user by email pattern
SELECT id, email, created_at FROM auth.users WHERE email LIKE '%@thepia.com';

-- Check RLS policies on a table
\d+ table_name

-- Test role assignment manually
INSERT INTO api.user_roles (user_id, role, notes)
SELECT id, 'thepia_staff', 'Manual assignment'
FROM auth.users WHERE email = 'user@example.com';
```

### Admin Script Usage

Use the provided script for easy role management:

```bash
# Edit the email in the script, then run in Supabase SQL editor
cat scripts/assign-admin-role.sql
```

## Integration Notes

This role management system is designed to work with:

- **Supabase Auth**: For user authentication and JWT generation
- **RLS Policies**: For database-level access control
- **Client Applications**: For role-based UI and feature access
- **API Services**: For service-to-service authentication

The system provides the foundation for secure, multi-tenant access control across the entire Thepia Flows ecosystem.