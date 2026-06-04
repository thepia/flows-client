# Thepia Flows Database - Setup Guide

Complete setup instructions for the multi-client database management system.

## 🎯 Prerequisites

### Required Software
- **Node.js 18+** and **npm/pnpm**
- **Git** for version control
- **Supabase account** and project access
- **Access to thepia.net DNS management**

### Required Accounts & Access
- Supabase organization owner/admin access
- GitHub repository access for thepia/flows-client
- DNS management for thepia.net domain
- Email access for installation+*@thepia.net

## 🚀 Initial Setup

### 1. Clone Repository
```bash
git clone https://github.com/thepia/flows-client.git
cd flows-client
npm install
```

### 2. Environment Configuration
```bash
# Copy environment template
cp config/supabase.example.env .env

# Edit environment variables
nano .env
```

#### Required Environment Variables
```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# JWT Configuration for Invitations
JWT_SECRET=your-strong-jwt-secret-key-here
JWT_ISSUER=api.thepia.com
JWT_AUDIENCE=flows.thepia.net

# Email Configuration
SETUP_EMAIL_DOMAIN=thepia.net
SETUP_EMAIL_PREFIX=installation

# Storage Configuration
STORAGE_BUCKET_PREFIX=client-assets

# Optional: Monitoring & Analytics
POSTHOG_API_KEY=your-posthog-key
SENTRY_DSN=your-sentry-dsn
```

### 3. Database Initialization
```bash
# Initialize database schema
npm run db:init

# Verify database health
npm run health-check

# Optionally seed with test data
npm run db:seed
```

### 4. Verification
```bash
# Run all tests
npm test

# Check database connectivity
npm run health-check

# Verify schema installation
npm run db:status
```

## 🏗️ Supabase Project Setup

### 1. Create Supabase Project
1. Log in to [Supabase Dashboard](https://app.supabase.com)
2. Create new project with name `thepia-flows-production`
3. Choose region based on primary user base (EU/US)
4. Note the project URL and keys

### 2. Configure Authentication
```bash
# In Supabase Dashboard > Authentication > Settings
# Set up Auth0 integration (if applicable)
# Configure JWT secret (same as in .env file)
```

### 3. Database Configuration
```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_crypto";

-- Set timezone
SET timezone = 'UTC';
```

### 4. RLS and Security
- Row Level Security (RLS) is automatically enabled by schema scripts
- Service role key has full access (keep secure)
- Anon key only has limited access through RLS policies

### 5. User Role Management
After database setup, configure admin access:

```sql
-- Apply the user role management schema
\i schemas/22_user_role_management.sql

-- Assign thepia_staff role to your admin user
SELECT * FROM assign_thepia_staff_role('your-admin-email@thepia.com', 'Initial admin setup');

-- Verify role assignment
SELECT * FROM list_user_roles();
```

**Role System:**
- `thepia_staff` - Full cross-client access for Thepia employees
- `authenticated` - Client-scoped access via JWT claims
- `anon` - Limited demo access

**For admin apps (like flows.thepia.net/admin):** Users need `thepia_staff` role to bypass RLS and see all data.

## 👥 Multi-Client Architecture

### Client Isolation Strategy
- **Single database** with Row-Level Security (RLS)
- **Client-specific storage buckets**
- **JWT-based invitations** with encrypted PII
- **Audit trails** for all operations

### Free Tier Management
- **2 Supabase projects**: Production + Staging
- **Single production database** serves all clients
- **Upgrade to Pro ($25/month)** when limits approached

### Email Management
```
Email Format: installation+{client-code}@thepia.net

Examples:
- installation+acme@thepia.net
- installation+hotelchain@thepia.net
- installation+fintech@thepia.net
```

## 🔧 Client Management

### Add Your First Client
```bash
# Interactive setup (recommended)
npm run client:create

# Command line setup
npm run client:create \
  --client-code="acme" \
  --legal-name="Acme Corporation" \
  --domain="acme-corp.thepia.net" \
  --region="EU" \
  --tier="free"
```

### Client Management Commands
```bash
# List all clients
npm run client:list

# Check client status
npm run client:status acme

# Update client configuration
npm run client:update acme --tier pro

# Deactivate client
npm run client:deactivate acme

# Generate analytics
npm run client:analytics acme --month 2025-01
```

## 🎫 Invitation System

### JWT-Based Architecture
- **No PII in database** - all personal data encrypted in JWT tokens
- **Invitation metadata only** stored in database
- **Stateless validation** with tamper-proof tokens
- **Automatic expiration** with token lifecycle

### Create Invitations
```bash
# Interactive invitation creation
npm run invitation:create

# Command line invitation
npm run invitation:create \
  --client acme \
  --app offboarding \
  --email "john.doe@acme.com" \
  --name "John Doe" \
  --expires-in 7d
```

### Invitation Management
```bash
# List active invitations
npm run invitation:list --client acme --status pending

# Validate invitation
npm run invitation:validate <jwt-token>

# Revoke invitation
npm run invitation:revoke <invitation-id> --reason "No longer needed"

# Cleanup expired invitations
npm run invitation:cleanup
```

## 📊 Storage & CDN Setup

### Client Storage Buckets
Each client gets dedicated storage buckets:
```
{client-code}-assets         # Public assets (50MB files)
{client-code}-user-uploads   # Private uploads (100MB files)  
{client-code}-documents      # Private documents (50MB files)
```

### CDN Configuration
```bash
# Configure client CDN settings
npm run client:update acme --cdn-config '{
  "cache_ttl": 3600,
  "compression": true,
  "image_optimization": true
}'
```

## 🔐 Security Configuration

### JWT Token Security
```javascript
// JWT tokens contain encrypted invitation data
{
  "iss": "api.thepia.com",
  "aud": "flows.thepia.net", 
  "sub": "invitation-uuid",
  "exp": 1672531200,
  "invitation": {
    // All PII encrypted with deployment secret
    "invitee": "ENCRYPTED_DATA",
    "permissions": ["app.access", "documents.upload"],
    "restrictions": {
      "ip_whitelist": ["192.168.1.0/24"],
      "time_window": {...}
    }
  }
}
```

### RLS Policies
- **Staff-only access** to client management tables
- **Client-isolated access** via JWT client_id claims
- **Invitation holders** can only access their own data
- **Audit trails** track all access and modifications

### Data Protection
```bash
# Database backup (encrypted)
npm run db:backup --client acme

# Restore from backup
npm run db:restore backup-2025-01-15-acme.sql

# Export client data (GDPR compliance)
npm run client:export acme --format json
```

## 📈 Monitoring & Maintenance

### Health Monitoring
```bash
# Overall system health
npm run health-check

# Client-specific health
npm run client:health acme

# Database performance
npm run db:performance
```

### Automated Maintenance
```bash
# Run daily maintenance (cron job)
npm run maintenance

# Cleanup expired invitations
npm run invitation:cleanup

# Update usage statistics
npm run analytics:update
```

### Key Metrics
- Client storage usage per bucket
- Invitation creation/redemption rates
- API usage per client and application
- Error rates and performance metrics
- Database query performance

## 🧪 Development & Testing

### Development Setup
```bash
# Setup development environment
npm run setup:dev

# Create test client
npm run test:setup-client

# Run development server
npm run dev

# Watch tests
npm run test:watch
```

### Testing Strategy
```bash
# Run all tests
npm test

# Test specific components
npm run test:schema      # Database schema tests
npm run test:rls         # RLS policy tests
npm run test:client      # Client management tests
npm run test:invitations # Invitation system tests

# Integration tests
npm run test:integration
```

### Database Development
```bash
# Reset development database
npm run db:reset

# Apply new migrations
npm run db:migrate

# Seed test data
npm run db:seed

# Generate schema documentation
npm run docs:generate
```

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check environment variables
npm run config:check

# Test database connectivity
npm run db:test-connection

# Verify Supabase credentials
npm run supabase:verify
```

#### Client Setup Issues
```bash
# Check if client code already exists
npm run client:check acme

# Validate domain availability
npm run domain:check acme-corp.thepia.net

# Verify storage bucket creation
npm run storage:list --client acme
```

#### Invitation Issues
```bash
# Validate JWT token
npm run invitation:validate <token>

# Check invitation status
npm run invitation:status <invitation-id>

# Debug invitation creation
npm run invitation:debug --client acme
```

### Performance Issues
```bash
# Database performance analysis
npm run db:analyze

# Query performance check
npm run db:slow-queries

# Client usage analysis
npm run client:usage-analysis
```

### Log Analysis
```bash
# View recent logs
npm run logs:view

# Error log analysis
npm run logs:errors

# Client-specific logs
npm run logs:client acme
```

## 📋 Production Checklist

### Pre-Production
- [ ] Environment variables configured
- [ ] Database schema deployed
- [ ] RLS policies tested
- [ ] Storage buckets created
- [ ] JWT secret rotation plan
- [ ] Monitoring configured
- [ ] Backup strategy implemented

### Production Deployment
- [ ] DNS records configured
- [ ] SSL certificates installed
- [ ] CDN settings optimized
- [ ] Error reporting enabled
- [ ] Performance monitoring active
- [ ] Access logs configured

### Post-Production
- [ ] First client successfully onboarded
- [ ] Invitation system tested
- [ ] Storage access verified
- [ ] Analytics data flowing
- [ ] Support documentation complete
- [ ] Incident response plan ready

## 🆘 Support & Resources

### Documentation
- **[Client Onboarding Guide](CLIENT_ONBOARDING.md)**
- **[API Reference](API_REFERENCE.md)**
- **[Security Guide](SECURITY.md)**
- **[Troubleshooting](TROUBLESHOOTING.md)**

### Support Channels
- **GitHub Issues**: [flows-client/issues](https://github.com/thepia/flows-client/issues)
- **Email Support**: support@thepia.com
- **Security Issues**: security@thepia.com
- **Emergency**: Use GitHub issues for urgent production issues

### Useful Commands Reference
```bash
# Quick status check
npm run health-check && npm run client:list

# Create new client (interactive)
npm run client:create

# Create invitation (interactive)  
npm run invitation:create

# Daily maintenance
npm run maintenance

# Backup all client data
npm run backup:all

# Generate usage report
npm run analytics:monthly
```

---

**Next Steps**: After completing setup, proceed to [Client Onboarding Guide](CLIENT_ONBOARDING.md) to add your first client.