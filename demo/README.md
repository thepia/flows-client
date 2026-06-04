# Demo Content Management System

This directory contains the demo content management system for flows-client, providing realistic, maintainable demo data that demonstrates the invitation system with real-world employee onboarding and offboarding scenarios.

## Overview

**Demo Client**: Nets A/S - A Nordic payment processing company  
**Use Case**: Employee offboarding flows with secure invitation-based access  
**Context**: Payment companies require strict security protocols for employee lifecycle management

## Architecture

### Demo Content Layers
1. **Client Configuration** - Nets A/S company setup
2. **Application Configuration** - Onboarding/Offboarding apps  
3. **Employee Data** - Realistic Nordic employees with workflows
4. **Invitation Workflows** - JWT-based secure invitations
5. **Document & Task Management** - Compliance and security processes

### Content Management Strategy
- **Versioned Demo Data** - Track changes to demo content over time
- **Environment Separation** - Dev/staging/production demo variants
- **Automated Updates** - Scripts to refresh and evolve demo data
- **Real Database Integration** - Connect demo UI to actual flows-client

## Demo Scenarios

### Nets A/S Context
**Company**: Nets A/S - Nordic payment processing leader  
**Security Requirements**: High - handles financial transactions  
**Compliance**: GDPR, PCI DSS, SOX requirements  
**Locations**: Copenhagen (HQ), Stockholm, Oslo  
**Employee Types**: Engineering, Product, Security, Compliance

### Offboarding Workflows
1. **Immediate Security Actions**
   - Revoke payment system access
   - Disable financial data access
   - Audit trail creation

2. **Document Collection**
   - Non-disclosure agreements
   - Equipment return receipts
   - Knowledge transfer documents

3. **Compliance Verification**
   - Security clearance updates
   - Access log reviews
   - Final compliance sign-off

### Employee Personas
- **Anna Hansen** - Senior Engineer (Active, completed onboarding)
- **Erik Larsen** - Product Manager (Active, recent hire)
- **Sofia Berg** - UX Designer (Pending onboarding, Stockholm)
- **Magnus Johansson** - DevOps Engineer (Recently offboarded)

## File Structure

```
demo/
├── README.md                    # This file
├── config/
│   ├── client.json             # Demo client configuration
│   ├── applications.json       # App configurations
│   └── environments.json       # Environment-specific settings
├── data/
│   ├── employees.json          # Employee master data
│   ├── enrollments.json        # Onboarding/offboarding progress
│   ├── invitations.json        # Invitation templates
│   └── workflows.json          # Process definitions
├── scripts/
│   ├── setup-demo.js           # Initial demo setup
│   ├── refresh-demo.js         # Update demo content
│   ├── reset-demo.js           # Clean reset
│   └── generate-invitations.js # Create demo invitations
└── docs/
    ├── SCENARIOS.md            # Detailed demo scenarios
    ├── ITERATION.md            # Content update process
    └── INTEGRATION.md          # Database integration guide
```

## Usage

### Initial Setup
```bash
# Set up demo client and data
pnpm run demo:setup

# Generate realistic demo invitations
pnpm run demo:invitations

# Verify demo health
pnpm run demo:verify
```

### Content Management
```bash
# Refresh demo data with new content
pnpm run demo:refresh

# Reset to clean state
pnpm run demo:reset

# Update specific scenarios
pnpm run demo:update --scenario=offboarding
```

### Development Workflow
```bash
# Connect demo UI to database
pnpm run demo:admin

# View demo in production mode
pnpm run demo:admin:build && pnpm run demo:admin:preview
```

## Integration Points

### Database Tables
- `api.clients` - Nets A/S client record
- `api.client_applications` - Onboarding/Offboarding apps
- `api.invitations` - Demo invitation records

### Demo UI
- `examples/flows-admin-demo/` - Svelte admin interface
- Real-time connection to flows-client
- Encrypted PII handling in frontend

### Scripts Integration
- Client setup via `scripts/setup-client.js`
- Invitation management via `scripts/*invitation*.js`
- Health monitoring via `scripts/health-check.js`

## Demo Content Versioning

### Version Strategy
- **v1.0** - Initial Nets A/S setup with basic flows
- **v1.1** - Enhanced Nordic employee data
- **v1.2** - Advanced offboarding scenarios
- **v2.0** - Multi-client demo expansion

### Content Updates
1. Update JSON configuration files
2. Run refresh scripts to sync database
3. Test scenarios in demo UI
4. Document changes in CHANGELOG.md

### Environment Management
- **Development** - Frequent updates, experimental data
- **Staging** - Stable demo for testing
- **Production** - Polished demo for presentations

## Security Considerations

### PII Handling
- All personally identifiable information encrypted in JWTs
- No real employee data in database
- Nordic-style names for authenticity without privacy concerns

### Demo Data Safety
- Clearly marked as demo/test data
- No production secrets or real credentials
- Isolated from actual client data

### Compliance Demonstration
- GDPR-compliant data handling patterns
- Audit trail examples
- Data retention policy demonstrations

## Iteration Process

### Weekly Demo Updates
1. Review demo scenarios for relevance
2. Update employee status and workflows
3. Generate new invitations for testing
4. Validate integration with latest features

### Monthly Content Reviews
1. Assess demo effectiveness
2. Add new use cases based on feedback
3. Update documentation
4. Performance optimization

### Quarterly Major Updates
1. Expand demo scenarios
2. Add new client types
3. Update technology demonstrations
4. Comprehensive testing and validation

## Success Metrics

### Demo Effectiveness
- Realistic workflows that demonstrate real value
- Seamless integration between UI and database
- Clear demonstration of security features
- Positive feedback from stakeholders

### Content Quality
- Accurate Nordic business context
- Realistic employee data and workflows
- Authentic payment industry scenarios
- Comprehensive coverage of features

### Technical Excellence
- Reliable demo setup and updates
- Performance optimization
- Error handling and recovery
- Documentation completeness