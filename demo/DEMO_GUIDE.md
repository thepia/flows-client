# Flows-DB Demo System - Complete Guide

A comprehensive demo content management system for flows-client featuring **Nets A/S**, a Nordic payment processing company, demonstrating realistic employee onboarding and offboarding workflows with GDPR compliance.

## 🎯 Demo Overview

### What This Demonstrates
- **Multi-tenant database architecture** with client isolation
- **JWT-based invitation system** with encrypted PII
- **Nordic business context** with authentic employee data
- **Payment industry compliance** (GDPR, PCI DSS requirements)
- **Complete employee lifecycle** from invitation to offboarding
- **Security-first offboarding** for financial services

### Demo Client: Nets A/S
- **Industry**: Payment processing and financial services
- **Locations**: Copenhagen (HQ), Stockholm, Oslo
- **Compliance**: GDPR, PCI DSS, SOX
- **Employee Base**: 6 realistic Nordic personas
- **Workflows**: Secure onboarding/offboarding with audit trails

## 🚀 Quick Start

### 1. Initial Demo Setup
```bash
# Set up complete demo environment
pnpm run demo:setup

# Check setup status
pnpm run demo:setup:status

# Launch demo admin interface
pnpm run demo:admin
```

### 2. View Demo Content
- **Admin Dashboard**: `https://dev.thepia.net:5173`
- **Supabase Dashboard**: View database tables in `api` schema
- **Demo Client**: `nets-demo.thepia.net` (configured)

### 3. Test Demo Scenarios
```bash
# Refresh demo with new scenarios
pnpm run demo:refresh

# Reset for clean demo
pnpm run demo:reset
pnpm run demo:setup
```

## 📊 Demo Scenarios

### Employee Personas

#### 1. **Anna Hansen** - Senior Software Engineer
- **Status**: Active (completed onboarding)
- **Location**: Copenhagen, Denmark  
- **Context**: Payment systems developer, security clearance
- **Demo Value**: Shows completed successful onboarding

#### 2. **Erik Larsen** - Product Manager
- **Status**: Active (recently completed onboarding)
- **Location**: Copenhagen, Denmark
- **Context**: Financial services product management
- **Demo Value**: Recent hire with full compliance

#### 3. **Sofia Berg** - UX Designer  
- **Status**: Pending onboarding (45% complete)
- **Location**: Stockholm, Sweden
- **Context**: Remote worker, design tools setup
- **Demo Value**: In-progress onboarding workflow

#### 4. **Magnus Johansson** - DevOps Engineer
- **Status**: Recently offboarded  
- **Location**: Stockholm, Sweden
- **Context**: Voluntary resignation, complete audit trail
- **Demo Value**: Successful offboarding with compliance

#### 5. **Lars Petersen** - Frontend Developer
- **Status**: Invitation sent (not yet accepted)
- **Location**: Copenhagen, Denmark
- **Context**: New hire invitation workflow
- **Demo Value**: Fresh invitation ready for testing

#### 6. **Mette Sørensen** - Marketing Specialist
- **Status**: Offboarding in progress
- **Location**: Copenhagen, Denmark  
- **Context**: Position elimination, active workflow
- **Demo Value**: Current offboarding process demonstration

### Workflow Demonstrations

#### Onboarding Workflows
1. **Document Collection**
   - Employment contracts with digital signatures
   - GDPR consent and data processing agreements
   - Identity verification and security clearance
   - Tax forms and banking information

2. **Task Management** 
   - IT equipment setup and configuration
   - Payment systems training and certification
   - Security training and compliance verification
   - Department-specific onboarding tasks

3. **Compliance Verification**
   - Background checks and security clearance
   - Financial disclosure requirements
   - Access provisioning and verification
   - Training completion certification

#### Offboarding Workflows  
1. **Immediate Security Actions**
   - Payment system access revocation
   - Financial data access termination
   - Security badge deactivation
   - VPN and remote access termination

2. **Knowledge Transfer**
   - Handover documentation creation
   - Knowledge transfer sessions
   - Code repository access transfer
   - Client relationship handover

3. **Compliance and Audit**
   - Equipment return verification
   - Data retention policy compliance
   - Final payroll and benefits processing
   - Exit interview completion

## 🛠️ Demo Management

### Daily Operations
```bash
# Check demo health
pnpm run demo:setup:status

# Refresh scenarios (automated daily)
pnpm run demo:refresh

# View analytics
pnpm run demo:analytics
```

### Weekly Maintenance
```bash
# Force scenario updates
pnpm run demo:refresh --force-scenarios

# Reset and rebuild (for major changes)
pnpm run demo:reset
pnpm run demo:setup --force
```

### Content Updates
```bash
# Edit employee data
vim demo/data/employees.json

# Update client configuration  
vim demo/config/client.json

# Apply changes
pnpm run demo:refresh
```

## 📁 File Structure

```
demo/
├── README.md                    # System overview
├── DEMO_GUIDE.md               # This guide
├── config/
│   └── client.json             # Nets A/S client configuration
├── data/
│   └── employees.json          # Nordic employee personas
├── scripts/
│   ├── setup-demo.js          # Initial demo setup
│   ├── refresh-demo.js        # Content updates
│   └── reset-demo.js          # Clean reset
└── docs/
    ├── ITERATION.md           # Content update strategy
    └── SCENARIOS.md           # Detailed use cases
```

## 🔐 Security Features Demonstrated

### JWT-Based Invitations
- **Encrypted PII**: All personal data encrypted in JWT tokens
- **No Database PII**: Only metadata stored in database
- **Tamper Protection**: Cryptographic signatures prevent modification
- **Automatic Expiration**: Time-based invitation validity

### Row-Level Security (RLS)
- **Client Isolation**: Complete data separation between clients
- **Role-Based Access**: Staff, managers, and employees have different access
- **Audit Trails**: Complete logging of all access and changes

### GDPR Compliance
- **Data Minimization**: Minimal PII storage in database
- **Right to Erasure**: Demonstrated data deletion workflows
- **Consent Management**: Clear consent tracking and verification
- **Audit Requirements**: Complete audit trail maintenance

### Payment Industry Security
- **PCI DSS Alignment**: Security controls for payment data
- **Immediate Access Revocation**: Critical for financial services
- **Segregation of Duties**: Multiple approval requirements
- **Comprehensive Auditing**: Financial service audit requirements

## 📈 Analytics and Monitoring

### Demo Metrics
- **Invitation Acceptance Rates**: Track demo engagement
- **Onboarding Completion Times**: Workflow efficiency
- **Offboarding Compliance**: Audit trail completeness
- **User Interaction Patterns**: Demo effectiveness

### Performance Monitoring
- **Database Query Performance**: Optimization opportunities
- **API Response Times**: User experience metrics
- **Error Rates**: System reliability
- **Security Event Tracking**: Audit and compliance

## 🎨 Customization Options

### Client Branding
```json
{
  "branding": {
    "primary_color": "#1e40af",
    "secondary_color": "#64748b", 
    "logo_url": "https://assets.thepia.net/clients/nets/logo.svg"
  }
}
```

### Workflow Configuration
```json
{
  "workflow": {
    "auto_progress": true,
    "require_manager_approval": true,
    "completion_threshold": 95
  }
}
```

### Security Settings
```json
{
  "security": {
    "require_mfa": true,
    "session_timeout": 30,
    "audit_level": "comprehensive"
  }
}
```

## 🔄 Demo Evolution

### Automated Scenario Updates
- **Daily**: Invitation expiration, basic progression
- **Weekly**: Employee status changes, new invitations
- **Monthly**: Major scenario updates, new personas
- **Quarterly**: Strategic content updates, feature demonstrations

### Manual Customization
- **Custom Scenarios**: Tailored for specific demonstrations
- **Feature Showcases**: Highlight new platform capabilities
- **Compliance Updates**: Reflect changing regulations
- **Client Variations**: Different industry demonstrations

## 📞 Demo Support

### Common Issues

#### Demo Setup Fails
```bash
# Check database connection
pnpm run health-check

# Verify schema setup
pnpm run db:init

# Reset and retry
pnpm run demo:reset --force
pnpm run demo:setup
```

#### Missing Demo Data
```bash
# Check demo client exists
pnpm run demo:setup:status

# Refresh content
pnpm run demo:refresh

# Full rebuild if needed
pnpm run demo:reset && pnpm run demo:setup
```

#### UI Not Showing Demo Data
```bash
# Verify admin demo connection
pnpm run demo:admin

# Check for API errors in browser console
# Ensure .env variables are set correctly
```

### Getting Help
- **Issues**: Create issue in flows-client repository
- **Customization**: See `demo/docs/ITERATION.md`
- **Integration**: See `demo/docs/INTEGRATION.md`
- **Performance**: Run `pnpm run demo:analytics --detailed`

## 🚢 Production Deployment

### Demo Environment Setup
1. **Staging Environment**: Stable demo for presentations
2. **Development Environment**: Active development and testing
3. **Production Demo**: Polished version for client presentations

### Integration with CI/CD
```yaml
# .github/workflows/demo-update.yml
name: Update Demo Content
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
jobs:
  refresh-demo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm run demo:refresh
```

### Monitoring and Alerts
- **Demo Health Checks**: Automated verification
- **Content Freshness**: Alert on stale demo data
- **Performance Monitoring**: Response time tracking
- **Error Rate Monitoring**: Failed demo scenarios

---

## 🎉 Demo Success Stories

This demo system effectively demonstrates:
- **Real-world Nordic business context** with authentic employee scenarios
- **Complete compliance workflows** for financial services
- **Secure invitation system** with encrypted PII handling
- **Multi-tenant architecture** with robust data isolation
- **Professional offboarding processes** critical for payment companies

The Nets A/S demo provides a compelling, realistic demonstration of flows-client capabilities while maintaining security, compliance, and authentic business context.