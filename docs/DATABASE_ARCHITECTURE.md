# Database Architecture - Flows DB

**📋 CONSOLIDATED**: This document combines schema design, system architecture, and API contracts into a single comprehensive guide.

## Overview

The Thepia Flows database implements a sophisticated multi-tenant architecture designed for enterprise HR applications. This system provides strict data isolation, scalable demo data management, and flexible API access patterns.

## Quick Reference

### Core Components
- **Database**: PostgreSQL with dedicated API schema
- **Authentication**: Hybrid Auth0/WorkOS + Supabase support
- **Access Control**: Three-tier RLS system (thepia_staff, client_manager, client_employee)
- **Demo System**: Rich company data with 1000+ employees per client

### Key Files
- **Schema**: `schemas/31_final_user_roles_complete.sql` (current implementation)
- **Demo Data**: `scripts/demo-data-generation/` (company data scripts)
- **API**: Exposed via `api` schema with RLS policies

## Database Schema Architecture

### Schema Structure

```sql
┌─────────────────────────────────────────────────┐
│                PostgreSQL Database               │
├─────────────────┬────────────────┬──────────────┤
│   API Schema    │ Internal Schema│ Audit Schema │
│   (Exposed)     │   (Hidden)     │  (Hidden)    │
├─────────────────┼────────────────┼──────────────┤
│ • clients       │ • staff_users  │ • access_logs│
│ • people        │ • system_config│ • changes    │
│ • user_roles    │ • jwt_keys     │ • events     │
│ • tasks         │ • migrations   │ • security   │
│ • documents     │ • temp_data    │ • audit_trail│
│ • invitations   │ • cache_tables │ • compliance │
└─────────────────┴────────────────┴──────────────┘
```

### API Schema Design Principles

#### 1. Security Through Isolation
- **Exposed Tables**: Only business data in `api` schema
- **Hidden Implementation**: Internal tables in separate schemas
- **RLS Protection**: All API tables protected by Row Level Security
- **No Direct Access**: Clients never access `public` or internal schemas

#### 2. Clear API Boundaries
- **Consistent Naming**: All exposed tables follow `api.table_name` pattern
- **Documented Contracts**: Each table has defined access patterns
- **Version Control**: Schema changes tracked and documented
- **Migration Safety**: Non-breaking changes preferred

#### 3. Multi-Tenant Isolation
- **Client Separation**: Strict `client_id`-based data isolation
- **No Cross-Client Access**: Database-level enforcement via RLS
- **Thepia Staff Override**: Administrative access for support/development
- **Audit Trail**: All access logged for compliance

## Core Tables Structure

### Authentication & Authorization

```sql
-- User roles with hybrid authentication
CREATE TABLE api.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thepia_user_id TEXT UNIQUE,              -- Auth0/WorkOS stable ID
  supabase_user_id UUID REFERENCES auth.users(id), -- Direct Supabase auth
  user_email TEXT,
  role TEXT NOT NULL CHECK (role IN ('thepia_staff', 'client_manager', 'client_employee')),
  client_id UUID REFERENCES api.clients(id),
  employee_id UUID,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Business Data

```sql
-- Client organizations
CREATE TABLE api.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  industry TEXT,
  employee_count INTEGER,
  headquarters_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employee/people data
CREATE TABLE api.people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES api.clients(id),
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  department TEXT,
  position TEXT,
  hire_date DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task management
CREATE TABLE api.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES api.people(id),
  created_by UUID REFERENCES api.people(id),
  status TEXT DEFAULT 'pending',
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document management
CREATE TABLE api.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_path TEXT,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES api.people(id),
  visibility TEXT DEFAULT 'private',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Access Control Patterns

### RLS Policy Architecture

#### Standard Multi-Tenant Pattern
```sql
-- Template for all client-scoped tables
CREATE POLICY policy_table_access ON api.table_name
  FOR ALL USING (
    -- Thepia staff: Full access
    api.is_thepia_staff()
    
    -- Client managers: Their client only
    OR (api.is_client_manager() AND client_id = api.get_current_user_client_id())
    
    -- Client employees: Personal data only (where applicable)
    OR (api.is_client_employee() AND assigned_to = api.get_current_user_employee_id())
  );
```

#### Hybrid Authentication Support
```sql
-- Supports both Auth0/WorkOS and Supabase auth
CREATE POLICY policy_user_roles_self_access ON api.user_roles
  FOR SELECT USING (
    (thepia_user_id IS NOT NULL AND thepia_user_id = api.get_current_thepia_user_id())
    OR (supabase_user_id IS NOT NULL AND supabase_user_id = auth.uid())
  );
```

### Helper Functions

```sql
-- User context functions
api.get_current_thepia_user_id()     -- Gets Auth0/WorkOS user ID
api.get_current_user_role()          -- Looks up role in user_roles
api.get_current_user_client_id()     -- Gets client context
api.get_current_user_employee_id()   -- Gets employee context

-- Role checking functions
api.is_thepia_staff()                -- Checks for admin access
api.is_client_manager()              -- Validates manager permissions
api.is_client_employee()             -- Validates employee permissions
```

## Demo Data Architecture

### Rich Company Data Strategy

#### Large-Scale Demo Companies
- **1000+ employees** per demo company
- **Realistic departments** (Engineering, Sales, HR, Finance, etc.)
- **Hierarchical structure** (managers, teams, reporting chains)
- **Diverse demographics** (names, locations, hire dates)
- **Complete document libraries** (policies, forms, templates)

#### Demo Data Generation
```bash
# Generate demo companies
pnpm demo:generate-companies --count=5 --employees=1000

# Populate with realistic data
pnpm demo:populate-documents --company=acme-corp
pnpm demo:create-workflows --company=acme-corp
```

### Demo Company Examples
1. **Acme Corporation** - Technology company (1200 employees)
2. **Global Manufacturing Inc** - Industrial company (800 employees)
3. **Creative Agency Ltd** - Marketing agency (300 employees)
4. **Healthcare Solutions** - Medical services (600 employees)
5. **Financial Services Co** - Banking/finance (1500 employees)

## API Integration Patterns

### Transport Layer Contracts

#### Browser Environment (Standard Web)
```javascript
// Direct Supabase client
const supabase = createClient(url, anonKey);

// API access via RLS-protected tables
const { data: people } = await supabase
  .from('people')
  .select('*')
  .eq('client_id', userClientId);
```

#### Native WebView Environment
```javascript
// Service worker bridge for native apps
const response = await fetch('/api/people', {
  headers: { 'Authorization': `Bearer ${jwt}` }
});
```

### API Boundaries

#### Exposed Endpoints
- **`/api/people`** - Employee management
- **`/api/tasks`** - Task management
- **`/api/documents`** - Document management
- **`/api/clients`** - Organization management (admin only)
- **`/api/user_roles`** - Role management (admin only)

#### Security Constraints
- **RLS Enforcement**: All queries filtered by user permissions
- **JWT Validation**: All requests require valid authentication
- **Rate Limiting**: API calls throttled per user/client
- **Audit Logging**: All access logged for compliance

## System Architecture Overview

### Frontend Architecture
- **SvelteKit Application** with file-based routing
- **Reactive State Management** using Svelte stores
- **Component Library** based on shadcn-svelte
- **Client-specific Branding** with dynamic theming
- **Offline Mode Support** for connectivity issues

### Data Layer
- **Supabase Integration** for real-time subscriptions
- **Local Caching** for offline functionality
- **Optimistic Updates** for better UX
- **Conflict Resolution** for concurrent edits

### Demo Management System
- **Dynamic Company Switching** in admin interface
- **Rich Demo Data** with realistic business scenarios
- **Template System** for onboarding workflows
- **Performance Monitoring** for large datasets

## Implementation Status

### ✅ Completed Systems
- **Core Schema**: API schema with RLS policies
- **Authentication**: Hybrid Auth0/WorkOS + Supabase support
- **User Roles**: Three-tier access control system
- **Basic Tables**: clients, people, tasks, documents, user_roles
- **Demo Framework**: Company generation and data population

### 🔄 In Progress
- **Enhanced Demo Data**: Rich company profiles with 1000+ employees
- **Document Templates**: Industry-specific document libraries
- **Workflow Automation**: Onboarding/offboarding process templates
- **Performance Optimization**: Indexing and query optimization for large datasets

### 📋 Planned Enhancements
- **Advanced Analytics**: Cross-client reporting for Thepia staff
- **API Versioning**: Backward-compatible schema evolution
- **Audit System**: Comprehensive compliance logging
- **Mobile Optimization**: Native app integration patterns

## Migration and Deployment

### Schema Deployment
```sql
-- Deploy current schema (v31)
\i schemas/31_final_user_roles_complete.sql

-- Verify deployment
SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'api';
SELECT * FROM api.user_roles LIMIT 5;
```

### Demo Data Setup
```bash
# Initialize demo environment
pnpm demo:setup

# Generate sample companies
pnpm demo:generate --companies=5 --employees=1000

# Verify demo data
pnpm demo:verify
```

### Production Considerations
- **Backup Strategy**: Regular automated backups of all schemas
- **Monitoring**: Performance metrics for RLS policy execution
- **Scaling**: Connection pooling and read replicas for high load
- **Security**: Regular security audits and penetration testing

## Troubleshooting

### Common Issues

#### 1. RLS Policy Blocking Access
```sql
-- Check user's role and context
SELECT
  api.get_current_thepia_user_id() as user_id,
  api.get_current_user_role() as role,
  api.get_current_user_client_id() as client_id;

-- Verify policy exists
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'api' AND tablename = 'people';
```

#### 2. Demo Data Performance
```sql
-- Check table sizes
SELECT schemaname, tablename, n_tup_ins as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'api'
ORDER BY n_tup_ins DESC;

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM api.people WHERE client_id = 'uuid-here';
```

#### 3. Authentication Issues
```sql
-- Check JWT claims
SELECT auth.jwt();

-- Verify user role assignment
SELECT * FROM api.user_roles WHERE user_email = 'user@example.com';
```

## Related Documentation

### Current Documentation
- **[USER_ROLE_MANAGEMENT.md](USER_ROLE_MANAGEMENT.md)** - Authentication and authorization
- **[demo/DATA_STRATEGY.md](demo/DATA_STRATEGY.md)** - Demo data generation strategy
- **[dev/error-reporting-setup-guide.md](dev/error-reporting-setup-guide.md)** - Development setup

### Archived Documentation
- **[archive/SCHEMA_ARCHITECTURE_DETAILED.md](archive/SCHEMA_ARCHITECTURE_DETAILED.md)** - Detailed schema decisions
- **[archive/COMPREHENSIVE_SYSTEM_ARCHITECTURE_HISTORICAL.md](archive/COMPREHENSIVE_SYSTEM_ARCHITECTURE_HISTORICAL.md)** - Historical system overview
- **[archive/CORE_ARCHITECTURE_CONTRACTS_DETAILED.md](archive/CORE_ARCHITECTURE_CONTRACTS_DETAILED.md)** - Detailed API contracts

## Quick Start Guide

### For Developers
1. **Clone repository** and install dependencies
2. **Set up environment** variables (.env file)
3. **Deploy schema**: `\i schemas/31_final_user_roles_complete.sql`
4. **Generate demo data**: `pnpm demo:setup`
5. **Start development**: `pnpm dev`

### For Administrators
1. **Assign admin role**: Update user_roles table with thepia_staff
2. **Create client**: Add new organization to clients table
3. **Assign users**: Add client_manager and client_employee roles
4. **Monitor access**: Check RLS policies are working correctly

### For API Integration
1. **Authentication**: Obtain JWT from Auth0/WorkOS or Supabase
2. **API Access**: Use Supabase client with RLS-protected tables
3. **Error Handling**: Implement proper error handling for RLS denials
4. **Testing**: Verify access patterns match expected permissions

---

**Document Status**: ✅ Current - Consolidated from multiple architecture documents
**Last Updated**: January 2025 - Combined schema, system, and API architecture
**Replaces**: SCHEMA_ARCHITECTURE.md, SCHEMA_ENHANCEMENTS.md, COMPREHENSIVE_SYSTEM_ARCHITECTURE.md, CORE_ARCHITECTURE_CONTRACTS.md
