# Schema Architecture Decision: Dedicated API Schema (ARCHIVED)

**⚠️ CONSOLIDATED**: This document has been merged into the comprehensive database architecture guide.

**📋 USE INSTEAD**: [../DATABASE_ARCHITECTURE.md](../DATABASE_ARCHITECTURE.md) - Complete database and system architecture

**🗓️ ARCHIVED**: January 2025 - Consolidated into unified architecture documentation

---

## 🎯 Decision: Use Dedicated API Schema

After careful consideration, we've implemented a **dedicated API schema** architecture instead of using Supabase's default public schema. This document explains the reasoning and implementation details.

## 🏗️ Schema Structure

```sql
┌─────────────────────────────────────────────────┐
│                PostgreSQL Database               │
├─────────────────┬────────────────┬──────────────┤
│   API Schema    │ Internal Schema│ Audit Schema │
│   (Exposed)     │   (Hidden)     │  (Hidden)    │
├─────────────────┼────────────────┼──────────────┤
│ • clients       │ • staff_users  │ • access_logs│
│ • applications  │ • system_config│ • changes    │
│ • invitations   │ • jwt_keys     │ • events     │
│ • user_profiles │ • migrations   │ • security   │
└─────────────────┴────────────────┴──────────────┘
                          ↓
                   PostgREST API
                  (Only sees 'api')
```

## 🔐 Key Benefits

### 1. **Security Through Isolation**
```sql
-- Only expose what's necessary
CREATE SCHEMA api;      -- Client-facing tables
CREATE SCHEMA internal; -- Never exposed via API
CREATE SCHEMA audit;    -- Compliance logging

-- PostgREST configuration
COMMENT ON SCHEMA api IS 'exposed';
COMMENT ON SCHEMA internal IS 'hidden';
COMMENT ON SCHEMA audit IS 'hidden';
```

### 2. **Clear API Boundaries**
- **api schema**: Everything clients can access
- **internal schema**: System operations, config, secrets
- **audit schema**: Compliance, logging, security events

### 3. **Easier Security Audits**
```sql
-- Quick security audit: What's exposed?
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'api';

-- Versus checking every table in public schema
-- and remembering which have RLS policies
```

### 4. **Prevent Accidental Exposure**
```sql
-- New developer creates a table
CREATE TABLE internal.encryption_keys (...);
-- ✅ Automatically hidden from API

-- Versus public schema where it would be exposed
-- unless RLS is explicitly configured
```

### 5. **API Versioning Support**
```sql
-- Future API versions
CREATE SCHEMA api_v2;

-- Gradual migration
CREATE VIEW api_v2.clients AS 
  SELECT * FROM api.clients 
  WITH additional_columns;
```

## 📊 Comparison: API Schema vs Public Schema

| Aspect | Dedicated API Schema | Public Schema |
|--------|---------------------|---------------|
| **Security** | ✅ Explicit exposure control | ⚠️ Everything exposed by default |
| **Clarity** | ✅ Clear API boundaries | ❌ Mixed concerns |
| **Maintenance** | ✅ Easy to audit what's exposed | ❌ Must check each table's RLS |
| **Flexibility** | ✅ Multiple schemas for different needs | ❌ Everything in one schema |
| **PostgREST Config** | ✅ Simple: expose one schema | ⚠️ Complex RLS for each table |
| **Team Safety** | ✅ New tables hidden by default | ❌ New tables exposed by default |

## 🛠️ Implementation Details

### PostgREST Configuration
```javascript
// In Supabase, configure PostgREST to expose only 'api' schema
{
  "db_schema": "api",  // Instead of default "public"
  "db_anon_role": "anon",
  "db_authenticated_role": "authenticated"
}
```

### Migration from Public Schema
```sql
-- Move existing tables to api schema
ALTER TABLE public.clients SET SCHEMA api;
ALTER TABLE public.applications SET SCHEMA api;
ALTER TABLE public.invitations SET SCHEMA api;

-- Or use our helper function
SELECT internal.move_table_to_schema('clients', 'public', 'api');
```

### RLS Policies Work the Same
```sql
-- RLS policies work identically in api schema
ALTER TABLE api.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can access all clients" ON api.clients
  FOR ALL USING (auth.jwt()->>'role' = 'thepia_staff');
```

## 🔍 Common Patterns

### Pattern 1: Client-Facing Tables
```sql
-- Goes in api schema
CREATE TABLE api.user_profiles (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES api.clients(id),
  -- ... user data
);
```

### Pattern 2: System Configuration
```sql
-- Goes in internal schema
CREATE TABLE internal.feature_flags (
  id UUID PRIMARY KEY,
  feature_name TEXT,
  enabled BOOLEAN,
  -- Never exposed to clients
);
```

### Pattern 3: Audit Logging
```sql
-- Goes in audit schema
CREATE TABLE audit.data_access_log (
  id UUID PRIMARY KEY,
  accessed_at TIMESTAMP,
  user_id UUID,
  table_name TEXT,
  operation TEXT,
  -- Read-only for compliance
);
```

## 🚨 Important Considerations

### 1. **Fully Qualified Names**
```sql
-- Always use schema prefix in production code
INSERT INTO api.clients (...) VALUES (...);

-- Not just:
INSERT INTO clients (...) VALUES (...);
```

### 2. **Search Path Settings**
```sql
-- Set search path for convenience during development
SET search_path TO api, public;

-- But use fully qualified names in application code
```

### 3. **Permissions Management**
```sql
-- Grant permissions on schema level
GRANT USAGE ON SCHEMA api TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA api TO authenticated;

-- Internal schema - no access for regular users
-- (No GRANT statements for anon/authenticated)
```

### 4. **Supabase Dashboard**
- The Supabase dashboard shows all schemas
- Configure table editor to show 'api' schema by default
- Train team to use correct schema for new tables

## 📋 Migration Checklist

If migrating from public schema:

- [ ] Run `00_schema_setup.sql` to create schemas
- [ ] Move tables to appropriate schemas
- [ ] Update all SQL to use schema prefixes
- [ ] Update PostgREST configuration
- [ ] Test API access with new schema
- [ ] Update application connection strings
- [ ] Verify RLS policies still work
- [ ] Update documentation

## 🎯 Decision Summary

**We use a dedicated API schema because:**

1. **Security by default** - New tables are hidden unless explicitly exposed
2. **Clear boundaries** - Obvious what's API vs internal
3. **Easier auditing** - Simple to see what's exposed
4. **Future flexibility** - Easy to version APIs
5. **Team safety** - Reduces accidental data exposure

This architecture provides defense-in-depth security while maintaining all the benefits of Supabase's Row Level Security and real-time features.

## 🔐 JWT + Hash Storage Architecture

### GDPR-Compliant Data Storage Pattern

Starting with schema version 11, we implement a **JWT + Hash hybrid approach** for storing personally identifiable information (PII) while enabling operational queries:

```sql
-- Example: Invitations table with JWT + hash storage
ALTER TABLE api.invitations
  ADD COLUMN jwt_token TEXT,          -- Encrypted JWT containing PII
  ADD COLUMN email_hash VARCHAR(64),  -- SHA-256 for privacy-preserving lookups
  ADD COLUMN email_domain TEXT,       -- Domain only (@company.com) for spam analysis
  ADD COLUMN retention_purpose TEXT,  -- Legal basis for data retention
  ADD COLUMN auto_delete_at TIMESTAMPTZ; -- Automated GDPR deletion date
```

### Principles for Token and Hash Storage

#### 1. **JWT Token Storage**
```sql
-- Store full encrypted JWT containing all PII
jwt_token TEXT -- Contains: { email, name, company, phone, etc. }
```

**Benefits:**
- **Encrypted PII**: All sensitive data encrypted in JWT
- **Access Control**: Requires decryption key to access PII
- **Audit Trail**: Full context preserved for compliance
- **Key Separation**: Encryption keys stored separately from database

#### 2. **Hash-Based Lookups**
```sql
-- SHA-256 hash for privacy-preserving operations
email_hash VARCHAR(64) -- SHA-256(email) for deduplication/lookup
```

**Benefits:**
- **Operational Queries**: Find records without exposing email
- **Deduplication**: Prevent duplicate requests without storing plaintext
- **Spam Detection**: Analyze patterns without exposing personal data
- **GDPR Compliance**: Hashed data still considered personal data, but protected

#### 3. **Selective Domain Storage**
```sql
-- Domain-only storage for business intelligence
email_domain TEXT -- "@company.com" for spam/analytics analysis
```

**Benefits:**
- **Spam Analysis**: Detect suspicious domains without full emails
- **Business Intelligence**: Company size analysis, industry patterns
- **Minimal PII**: Domain alone is less sensitive than full email

#### 4. **Automated Retention Management**
```sql
-- GDPR-compliant auto-deletion
retention_purpose TEXT,      -- Legal basis for retention
auto_delete_at TIMESTAMPTZ  -- Automatic deletion date
```

**Retention Policies:**
- **Demo requests completed**: 90 days
- **Demo requests rejected**: 30 days  
- **Spam detected**: 30 days
- **Active invitations**: 2 years
- **General retention**: 1 year (default)

### Implementation Guidelines

#### Creating JWT Tokens
```javascript
// Application layer (Node.js example)
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function createInvitationRecord(email, demoData) {
  // Encrypt PII in JWT
  const jwtToken = jwt.sign({
    email,
    name: demoData.name,
    company: demoData.company,
    phone: demoData.phone,
    // ... other PII
  }, process.env.JWT_ENCRYPTION_KEY);
  
  // Create privacy-preserving hashes
  const emailHash = crypto
    .createHash('sha256')
    .update(email.toLowerCase())
    .digest('hex');
  
  const emailDomain = email.split('@')[1].toLowerCase();
  
  return {
    jwt_token: jwtToken,
    email_hash: emailHash,
    email_domain: emailDomain,
    retention_purpose: 'demo_request',
    auto_delete_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
  };
}
```

#### Querying with Hashes
```sql
-- Find invitation by email (application provides hash)
SELECT * FROM api.invitations 
WHERE email_hash = $1  -- SHA-256 of user's email
  AND status = 'pending';

-- Spam analysis by domain
SELECT email_domain, COUNT(*) as request_count
FROM api.invitations
WHERE spam_score > 70
GROUP BY email_domain
ORDER BY request_count DESC;
```

#### Email Operations
```sql
-- Email sending function (requires JWT decryption in application)
SELECT id, jwt_token, email_hash 
FROM api.get_invitations_needing_email()
WHERE email_attempts < 3;

-- Application decrypts JWT to get actual email for sending
-- Updates database with delivery status using email_hash for identification
```

### Security Considerations

#### 1. **Key Management**
- **Encryption keys** stored separately from database (env vars, key vault)
- **Key rotation** supported through JWT versioning
- **Access logging** for all key usage

#### 2. **Hash Security**  
- **SHA-256** provides strong collision resistance
- **Lowercase normalization** ensures consistent hashing
- **Salt not used** to enable deduplication (trade-off for functionality)

#### 3. **GDPR Compliance**
- **Hashed data still considered PII** under GDPR
- **Automated deletion** prevents indefinite storage
- **Purpose documentation** required for legal compliance
- **Right to erasure** supported through hash-based deletion

### Migration from Direct Email Storage

```sql
-- Migration script for existing tables with direct email storage
UPDATE api.invitations 
SET 
  email_hash = encode(digest(lower(email), 'sha256'), 'hex'),
  email_domain = split_part(lower(email), '@', 2),
  jwt_token = api.create_jwt_from_email(email), -- Custom function
  retention_purpose = 'migration_data',
  auto_delete_at = now() + interval '1 year'
WHERE email IS NOT NULL;

-- Remove direct email column after migration
ALTER TABLE api.invitations DROP COLUMN email;
```

### Monitoring and Compliance

#### Daily Cleanup Function
```sql
-- Automated GDPR compliance cleanup
SELECT api.gdpr_compliant_cleanup();

-- Returns: {
--   "deleted_records": 23,
--   "updated_retention_policies": 45,
--   "cleanup_run_at": "2024-01-15T10:00:00Z"
-- }
```

#### Retention Statistics
```sql
-- Compliance reporting
SELECT api.get_retention_stats();

-- Returns retention statistics for audits
```

This architecture provides **strong privacy protection** while enabling **operational efficiency**, ensuring both security and GDPR compliance for all PII storage.

## 🔗 Related Documentation

- [Database Schema Files](../schemas/)
- [Security Guide](SECURITY.md)
- [RLS Policy Guide](RLS_POLICIES.md)
- [GDPR Compliance Functions](../schemas/11_extend_invitations_for_demos.sql)
- [Supabase PostgREST Docs](https://supabase.com/docs/guides/api)