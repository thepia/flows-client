# Demo System - Consolidated Guide

**📋 CONSOLIDATED**: This document combines demo data strategy, company profiles, and setup procedures.

## Overview

The Flows Admin Demo system provides realistic, scalable demo datasets for showcasing platform capabilities. This system supports prospect demonstrations, internal testing, and training scenarios with comprehensive HR workflows.

## Demo Companies

### Primary Demo Companies

#### 1. Hygge & Hvidløg A/S (`hygge-hvidlog`)
- **Industry**: Sustainable Food Technology
- **Scale**: 1,200 employees (target)
- **Locations**: Copenhagen, Aarhus, Berlin, Amsterdam
- **Departments**: Product Development, Marketing, Operations, R&D, Sales, Quality Assurance
- **Demo Type**: Internal demos, complex scenarios
- **Branding**: Custom forest green theme

#### 2. Meridian Brands International (`meridian-brands`)
- **Industry**: Global Consumer Brands
- **Scale**: 800+ employees
- **Locations**: Multiple international offices
- **Demo Type**: Prospect demonstrations
- **Focus**: Professional, scalable workflows

### Demo Requirements
- **Employee Scale**: 1000+ employees per major company
- **Active Processes**: 20+ onboarding, 15+ offboarding simultaneously
- **Historical Data**: Hundreds of completed processes
- **Document Library**: Comprehensive HR document templates
- **Task Templates**: Complete workflow library

## Demo Data Architecture

### Current System Behavior
**Default Loading Priority:**
1. Primary: `nets-demo` client (hardcoded priority)
2. Fallback: Any client with `%demo%` in client_code
3. Ultimate fallback: First available client

**Known Issue**: System prioritizes basic `nets-demo` over rich demo companies.

### Demo Data Scripts
**Location**: `demo/scripts/`
- `setup-complete-demo.js` - Complete demo setup
- `populate-rich-demo.js` - Rich company data
- `populate-full-demo.js` - Full dataset population
- `refresh-demo.js` - Refresh existing data
- `reset-demo.js` - Reset demo environment
- `setup-demo.js` - Basic demo setup

**⚠️ Note**: Script functionality not verified. Use with caution in production environments.

## Setup Procedures

### Basic Demo Setup
```bash
# Option 1: Use package.json scripts (if available)
pnpm db:seed

# Option 2: Direct script execution (verify first)
node demo/scripts/setup-demo.js
```

### Rich Demo Data
```bash
# Full rich demo setup (verify script works first)
node demo/scripts/setup-complete-demo.js

# Populate specific company data
node demo/scripts/populate-rich-demo.js
```

### Demo Reset
```bash
# Reset demo environment (use with caution)
node demo/scripts/reset-demo.js
```

## Database Schema Requirements

### Core Tables (Schema 31)
- `api.clients` - Demo company information
- `api.people` - Employee data (1000+ per company)
- `api.user_roles` - Access control for demo users
- `api.tasks` - Workflow tasks and templates
- `api.documents` - Document library and instances

### Demo-Specific Considerations
- **Multi-tenant isolation**: Each demo company isolated by `client_id`
- **Realistic data**: Names, departments, locations, hire dates
- **Workflow templates**: Onboarding/offboarding process templates
- **Document libraries**: Industry-specific HR documents

## Demonstration Scenarios

### 1. Prospect Demos
- **Focus**: Professional, impressive scale
- **Data**: Anonymized but realistic
- **Companies**: Meridian Brands (polished, international)
- **Workflows**: Standard HR processes, clean data

### 2. Internal Demos
- **Focus**: Real-world complexity
- **Data**: Comprehensive, edge cases included
- **Companies**: Hygge & Hvidløg (complex scenarios)
- **Workflows**: Advanced features, integrations

### 3. Training Scenarios
- **Focus**: Educational, varied cases
- **Data**: Multiple scenarios, different company sizes
- **Workflows**: Step-by-step learning paths

### 4. Scalability Testing
- **Focus**: Performance under load
- **Data**: Large datasets (1000+ employees)
- **Workflows**: Concurrent processes, stress testing

## Known Issues & Troubleshooting

### Common Problems

#### 1. Demo Data "Lost"
- **Symptom**: System shows basic `nets-demo` instead of rich companies
- **Cause**: Client selection priority defaults to wrong company
- **Solution**: Verify demo company data exists, check client selection logic

#### 2. Script Failures
- **Symptom**: Demo setup scripts fail with database errors
- **Cause**: Missing schema tables (e.g., offboarding tables not deployed)
- **Solution**: Ensure Schema 31 fully deployed before running demo scripts

#### 3. Missing Demo Companies
- **Symptom**: Expected demo companies not appearing
- **Cause**: Demo data not properly populated
- **Solution**: Run appropriate population scripts, verify data insertion

### Verification Commands
```sql
-- Check demo companies exist
SELECT name, slug FROM api.clients WHERE slug LIKE '%demo%';

-- Check employee counts
SELECT c.name, COUNT(p.id) as employee_count 
FROM api.clients c 
LEFT JOIN api.people p ON c.id = p.client_id 
WHERE c.slug LIKE '%demo%' 
GROUP BY c.id, c.name;

-- Check demo user roles
SELECT ur.role, c.name, COUNT(*) 
FROM api.user_roles ur 
JOIN api.clients c ON ur.client_id = c.id 
WHERE c.slug LIKE '%demo%' 
GROUP BY ur.role, c.name;
```

## File References

### Consolidated From
- `docs/demo/DATA_STRATEGY.md` - Demo data strategy and implementation
- `docs/demo/COMPANIES.md` - Company profiles and requirements
- `docs/demo/DATA_MEMORY.md` - Setup procedures and troubleshooting
- `docs/demo/TFC_DEMO_DATA_PRINCIPLES.md` - Demo data principles
- `docs/demo/demo-notifications-implementation.md` - Notification system demo

### Related Documentation
- `docs/DATABASE_ARCHITECTURE.md` - Database schema and RLS policies
- `docs/USER_ROLE_MANAGEMENT.md` - Authentication and authorization
- `docs/SETUP_GUIDE.md` - Development environment setup

## Safety Notes

⚠️ **Important**: Demo scripts can modify database state. Always:
1. **Backup database** before running demo scripts
2. **Test in development** environment first
3. **Verify script functionality** before production use
4. **Review script contents** to understand what they do

---

**Document Status**: ✅ Current - Consolidated demo system documentation
**Last Updated**: January 2025 - Combined 5 demo-related documents
**Replaces**: demo/DATA_STRATEGY.md, demo/COMPANIES.md, demo/DATA_MEMORY.md, demo/TFC_DEMO_DATA_PRINCIPLES.md, demo/demo-notifications-implementation.md
