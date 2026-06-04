# JWT Claims Specification for Three-Tier Access Control

## Overview

This document specifies the JWT claims structure required to support the three-tier access control system in flows-client.

## Architecture Context

### **Client-Server Contract**
- **Client (Database)**: `flows-client` - Consumes JWTs via database functions (`api.get_current_thepia_user_id()`, etc.)
- **Server (API)**: `thepia.com/src/api` - Generates JWTs during authentication
- **Deployment**: flows-client may be used as a library by the API server to deploy server-side components

### **Purpose**
This specification defines the **contract between API server and database** for authentication:
1. **API Server** (thepia.com) generates JWTs with this exact structure during Auth0/WorkOS authentication
2. **Database** (flows-client) expects JWTs in this format for RLS policies and access control functions
3. **Single Source of Truth**: This flows-client specification defines what the API server must implement

## Required JWT Claims Structure

### Base Claims (All Users)
```json
{
  "sub": "user-uuid-from-auth-provider",
  "email": "user@example.com",
  "iat": 1634567890,
  "exp": 1634571490,
  "aud": "authenticated",
  "iss": "https://api.thepia.com"
}
```

### Enhanced User Metadata Claims

#### 1. Thepia Staff Users
```json
{
  "user_metadata": {
    "role": "thepia_staff",
    "permissions": ["admin", "all_clients", "user_management"],
    "department": "engineering"
  }
}
```

**Access Level**: Full access to all clients and data

#### 2. Client Manager Users  
```json
{
  "user_metadata": {
    "role": "client_manager", 
    "client_id": "453a82ec-c5b7-48c9-8244-4c978b9c7e11",
    "client_code": "hygge-hvidlog",
    "permissions": ["client_admin", "employee_management", "data_access"],
    "department": "management"
  }
}
```

**Access Level**: Full access to their client's data and employee management

#### 3. Client Employee Users
```json
{
  "user_metadata": {
    "role": "client_employee",
    "client_id": "453a82ec-c5b7-48c9-8244-4c978b9c7e11", 
    "client_code": "hygge-hvidlog",
    "employee_id": "789def12-3456-7890-abcd-ef1234567890",
    "department": "engineering",
    "access_level": "personal", // or "department", "read_only"
    "permissions": ["self_data", "assigned_tasks"]
  }
}
```

**Access Level**: Limited to their own data and assigned tasks

## Implementation in Auth Providers

### Auth0/WorkOS Integration

When users sign in through Auth0 or WorkOS, the authentication API should:

1. **Look up user role** in `api.user_roles` table by email
2. **Enrich JWT** with appropriate claims based on role
3. **Include client/employee associations** from database

### Example Auth API Enhancement

```javascript
// In your auth API (thepia.com)
async function enrichJWTClaims(userEmail, baseToken) {
  // Look up user role and associations
  const userRole = await supabase
    .from('user_roles')
    .select('role, client_id, employee_id, access_level')
    .eq('user_email', userEmail)
    .single();
    
  if (!userRole.data) {
    // Default to basic authenticated user
    return {
      ...baseToken,
      user_metadata: {
        role: 'authenticated'
      }
    };
  }
  
  const { role, client_id, employee_id, access_level } = userRole.data;
  
  // Build enhanced claims based on role
  const enhancedClaims = {
    ...baseToken,
    user_metadata: {
      role,
      ...(client_id && { client_id }),
      ...(employee_id && { employee_id }),
      ...(access_level && { access_level })
    }
  };
  
  // Add client_code for convenience
  if (client_id) {
    const client = await supabase
      .from('clients')
      .select('client_code')
      .eq('id', client_id)
      .single();
      
    if (client.data) {
      enhancedClaims.user_metadata.client_code = client.data.client_code;
    }
  }
  
  return enhancedClaims;
}
```

## Security Considerations

### 1. Role Verification
- **Never trust client-side role claims** - always verify against database
- **Use database functions** to check permissions in RLS policies
- **Audit all role changes** with proper logging

### 2. Token Refresh
- **Re-verify roles** on token refresh to catch role changes
- **Invalidate sessions** when roles are revoked
- **Short token expiry** (15-30 minutes) for sensitive operations

### 3. Client Isolation
- **Validate client_id** matches user's assigned client in database
- **Prevent client_id spoofing** through JWT manipulation
- **Use UUIDs** for client_id to prevent enumeration

### 4. Employee Data Protection
- **Encrypt sensitive employee data** at rest
- **Log access attempts** to employee records
- **Implement data retention policies** for compliance

## Testing the Implementation

### 1. Role Assignment Tests
```sql
-- Test thepia staff assignment
SELECT * FROM api.assign_thepia_staff_role('henrik@thepia.com', 'Initial admin');

-- Test client manager assignment  
SELECT * FROM api.assign_client_manager_role(
  'manager@hygge-hvidlog.com', 
  '453a82ec-c5b7-48c9-8244-4c978b9c7e11',
  'Client manager setup'
);

-- Test employee assignment
SELECT * FROM api.assign_client_employee_role(
  'employee@hygge-hvidlog.com',
  '453a82ec-c5b7-48c9-8244-4c978b9c7e11', 
  'emp-uuid-here',
  'personal',
  'Employee onboarding'
);
```

### 2. Access Control Tests
```sql
-- Test data isolation (should return different results based on role)
SELECT COUNT(*) FROM api.employees; -- Varies by role
SELECT COUNT(*) FROM api.tasks WHERE assigned_to IS NOT NULL; -- Varies by role
SELECT COUNT(*) FROM api.documents; -- Varies by role
```

### 3. Security Boundary Tests
```sql
-- These should fail for non-privileged users
SELECT * FROM api.clients; -- Only thepia_staff should see all
SELECT * FROM api.user_roles; -- Limited access based on role
```

## Migration Path

1. **Deploy enhanced schema** (`27_enhanced_user_roles.sql`, `28_enhanced_rls_policies.sql`)
2. **Update auth API** to include enhanced JWT claims
3. **Assign initial roles** to existing users
4. **Test access controls** thoroughly
5. **Monitor audit logs** for security issues
6. **Gradually migrate** from old role system

This three-tier system provides **database-level security** that cannot be bypassed by UI manipulation or API bugs, ensuring true multi-tenant data isolation.
