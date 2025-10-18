# Three-Tier Access Control System

## Overview

The flows-db implements a sophisticated three-tier access control system designed for multi-tenant SaaS applications. This system provides strict data isolation between client organizations while allowing Thepia staff administrative access.

## Quick Setup

### Current Implementation
- **Schema**: `schemas/31_final_user_roles_complete.sql` (ONLY script you need)
- **Table**: `api.user_roles` with hybrid authentication support
- **Roles**: `thepia_staff`, `client_manager`, `client_employee`

### Setup Commands
```sql
-- Run complete setup (drops and recreates everything)
\i schemas/31_final_user_roles_complete.sql

-- Verify setup
SELECT * FROM api.user_roles LIMIT 5;
```

**⚠️ WARNING**: This script drops and recreates the entire user role system. Only run on development databases.

## Access Levels

### Level 1: Thepia Staff (`thepia_staff`)
- **Purpose**: System administrators and support staff
- **Access Scope**: Full access to ALL client data across the entire system
- **Users**: Henrik (@thepia.com), Katty (@thepia.com), other Thepia employees
- **Use Cases**:
  - System administration and maintenance
  - Client support and troubleshooting
  - Cross-client data analysis and reporting
  - Database management and migrations

### Level 2: Client Managers (`client_manager`)
- **Purpose**: Client organization administrators
- **Access Scope**: Full access to their client's data only
- **Constraint**: Restricted by `client_id` to one organization
- **Use Cases**:
  - Managing organization employees and roles
  - Viewing all tasks and documents within their organization
  - Organization-wide reporting and analytics
  - Employee onboarding and offboarding

### Level 3: Client Employees (`client_employee`)
- **Purpose**: Regular employees within client organizations
- **Access Scope**: Personal data only (their own records)
- **Constraint**: Restricted by `person_id` to their own data
- **Use Cases**:
  - Viewing and editing their own tasks
  - Accessing their personal documents
  - Updating their profile information
  - Personal productivity tracking

## Architecture

### Two-Layer Design

#### Authorization Layer (`user_roles` table)
- Maps authentication users to system roles
- Handles role assignments and permissions
- Supports pre-registration scenarios
- Maintains audit trail of role changes

#### Business Data Layer (`people`, `tasks`, `documents` tables)
- Contains actual business data and relationships
- Enforced by Row Level Security (RLS) policies
- Uses EXISTS subqueries for indirect client_id lookups

### User Identity Management

#### Stable User Identification
```sql
thepia_user_id TEXT UNIQUE  -- e.g., 'user_01K4DDYMKSK82XKFYAKBG54AH9'
```
- **Permanent identifier** from Thepia auth system
- **Survives email changes** - Users can update email without losing permissions
- **Pre-registration support** - Can be NULL for roles assigned before registration
- **Business logic key** - Used in JWT lookups and role resolution

#### Database Primary Key
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```
- **Internal database identifier** for relationships and foreign keys
- **Always present** - Never NULL, automatically generated
- **Used for** - Audit trails, foreign key references, internal operations

## Implementation Details

### Row Level Security (RLS) Policies

#### Pattern for Direct Client Access
```sql
-- Tables with direct client_id column (e.g., people)
CREATE POLICY policy_people_client_manager ON api.people
  FOR ALL
  USING (
    api.is_client_manager() AND
    client_id = api.get_current_user_client_id()
  );
```

#### Pattern for Indirect Client Access
```sql
-- Tables without direct client_id (e.g., tasks, documents)
CREATE POLICY policy_tasks_client_manager ON api.tasks
  FOR ALL
  USING (
    api.is_client_manager() AND
    EXISTS (
      SELECT 1 FROM api.people p 
      WHERE p.id = tasks.person_id 
      AND p.client_id = api.get_current_user_client_id()
    )
  );
```

### Helper Functions

#### Role Resolution
- `api.get_current_user_role()` - Looks up role in user_roles table (not JWT)
- `api.is_thepia_staff()` - Checks for thepia_staff or service_role
- `api.is_client_manager()` - Validates client manager permissions

#### User Context
- `api.get_current_thepia_user_id()` - Extracts stable user ID from JWT
- `api.get_current_user_client_id()` - Gets client context from JWT
- `api.get_current_user_employee_id()` - Gets person context from JWT

## Security Principles

### Default Deny
- Users without explicit role assignments get minimal `'authenticated'` access
- All permissions must be explicitly granted through role assignments
- No implicit access based on JWT claims alone

### Principle of Least Privilege
- Each role has access only to data necessary for their function
- Client employees cannot access other employees' data
- Client managers cannot access other clients' data
- Thepia staff access is logged and auditable

### Data Isolation
- Strict client_id-based separation between organizations
- No cross-client data leakage possible through application logic
- Database-level enforcement through RLS policies

## Bootstrap and Management

### Initial Setup
- Henrik and Katty are bootstrapped as thepia_staff during system setup
- Uses actual thepia_user_id values from auth system
- Supports both pre-registration and post-registration role assignment

### Role Assignment Workflow
1. **Pre-registration**: Create user_roles entry with email, NULL thepia_user_id
2. **Registration**: User signs up, thepia_user_id gets populated
3. **Post-registration**: Direct assignment using known thepia_user_id

### Email Change Handling
- thepia_user_id remains constant when user changes email
- Role assignments survive email changes
- Audit trail maintains historical email information

## Files and Scripts

### Core Implementation
- `schemas/31_final_user_roles_complete.sql` - Complete setup script
- `schemas/28_enhanced_rls_policies.sql` - RLS policies for all tables

### Documentation
- `docs/THREE_TIER_ACCESS_CONTROL.md` - This document
- `docs/SESSION_MANAGEMENT_REQUIREMENTS.md` - Session and JWT requirements
- `CLAUDE.md` - Development patterns and common mistakes

## Testing and Validation

### Test Scenarios
1. **Thepia staff access** - Verify cross-client data access
2. **Client isolation** - Ensure clients cannot access other clients' data  
3. **Employee isolation** - Ensure employees cannot access others' personal data
4. **Email change scenarios** - Verify role persistence across email updates
5. **Pre-registration scenarios** - Test role assignment before user signup

### Validation Queries
```sql
-- Verify role assignments
SELECT thepia_user_id, user_email, role, client_id FROM api.user_roles;

-- Test current user context
SELECT 
  api.get_current_thepia_user_id() as user_id,
  api.get_current_user_role() as role,
  api.is_thepia_staff() as is_staff;

-- Verify data isolation
SELECT COUNT(*) FROM api.people; -- Should respect RLS
```

This system provides enterprise-grade security for multi-tenant applications while maintaining flexibility for various user management scenarios.
