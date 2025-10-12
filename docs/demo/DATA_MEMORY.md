# Demo Data Setup Memory & Procedures

*Critical Reference: January 2025*

See also docs/DEMO_DATA_STRATEGY.md

## 🎯 Current State Analysis

### **Problem Identified**: 
- Demo data appears to be "lost rather than gained"
- System defaults to basic `nets-demo` instead of rich demo companies
- Offboarding schema not deployed, causing script failures
- Missing memory/documentation about proper setup sequence

### **Root Cause**:
1. **Schema Gap**: Offboarding tables not deployed to `api` schema
2. **Priority Issue**: Client selection defaults to wrong company  
3. **Documentation Gap**: Setup sequence not clearly documented

## 📋 Complete Demo Data Setup Procedure

### **Phase 1: Schema Deployment** (Required First)

The complete database schema must be deployed in correct order. All SQL files are stored in `/schemas/` directory.

**Critical Schema Dependencies:**
1. **Core Foundation** (Required for all features)
   - `00_schema_setup.sql` - Basic api schema and RLS setup
   - `01_clients.sql` - Client management foundation
   - `02_applications.sql` - Application configurations  
   - `03_invitations.sql` - JWT-based invitation system

2. **Employee Management** (Required for demo data)
   - `04_employee_management.sql` - Core employee tables
   - `05_employee_status_refactor.sql` - Enhanced status tracking
   - `13_employee_to_people_migration.sql` - People/employees unification
   - `14_fix_people_rls_policies.sql` - RLS policy fixes

3. **Demo Data Architecture** (Required for rich demos)
   - `08_add_demo_clients.sql` - Basic demo client setup
   - `09_add_detailed_demo_companies.sql` - Rich demo companies (Hygge & Hvidløg, Meridian Brands)
   - `09_enhanced_demo_schema.sql` - Enhanced demo data structures

4. **Offboarding Systems** (Required for offboarding features)
   - `10_shadow_offboarding_workflows.sql` - Legacy offboarding workflows
   - `11_credit_system_offboarding.sql` - Credit/billing system for offboarding
   - `12_task_oriented_offboarding.sql` - New task-oriented offboarding system

5. **Metrics & Analytics** (Optional)
   - `06_app_specific_metrics.sql` - Application metrics tracking
   - `07_add_future_employee_status.sql` - Future status planning

**Step 1: Deploy Complete Schema Sequence**
```bash
# Execute each schema file in Supabase SQL Editor in numerical order:
# 1. Core schemas (00-03) - Foundation tables
# 2. Employee schemas (04-05, 13-14) - Employee management  
# 3. Demo schemas (08-09) - Demo company architectures
# 4. Offboarding schemas (10-12) - Offboarding workflows
# 5. Optional schemas (06-07) - Metrics and planning

# If schema 12 conflicts exist, run cleanup first:
# schemas/12_cleanup_and_recreate.sql (then re-run 12)
```

**Step 2: Verify Schema Deployment**
```bash
# Check that all tables exist
pnpm run health-check
```

### **Phase 2: Client & Data Setup**

**Step 1: Complete Demo Setup**
```bash
# This is the comprehensive command that does everything:
pnpm run demo:complete

# What it does:
# - Creates demo client (Nets A/S)
# - Creates applications (onboarding/offboarding)
# - Generates employees with realistic data
# - Creates invitations, enrollments, documents
# - Creates offboarding workflows (if schema exists)
```

**Alternative Step-by-Step Setup:**
```bash
# If demo:complete fails, run individually:
pnpm run demo:setup           # Basic client + apps
pnpm run demo:populate        # Standard employee data  
pnpm run demo:populate-rich   # Enhanced employee variety
pnpm run offboarding:demo-data # Offboarding workflows
```

### **Phase 3: Rich Demo Companies** (Future Enhancement)

The system has two fully-architected demo companies that need data population:

```bash
# These companies exist but need data generated:
# - hygge-hvidlog (Hygge & Hvidløg A/S) - 1,200 employees
# - meridian-brands (Meridian Brands International) - 15,500 employees
```

## 🚀 Quick Setup Commands

### **Full Reset & Setup** (Nuclear Option)
```bash
# Complete reset and rebuild
pnpm run demo:reset
pnpm run demo:complete
```

### **Daily Refresh** (Incremental)
```bash
# Refresh existing data with natural progression
pnpm run demo:refresh
```

### **Status Check**
```bash
# Check current demo status
pnpm run demo:setup:status
pnpm run health-check
```

## 📊 Expected Demo Data After Setup

### **Nets A/S Demo Client** (Current Primary)
- **Industry**: Financial Services (Nordic payment processing)
- **Employees**: 8 comprehensive personas
- **Scale**: Small/medium company demo
- **Features**: Full GDPR compliance, realistic workflows

### **Employee Personas** (8 total):
1. **Anna Hansen** - Senior Software Engineer (Active, onboarded)
2. **Erik Larsen** - Product Manager (Active, recent hire)  
3. **Sofia Berg** - UX Designer (Onboarding 45% complete)
4. **Magnus Johansson** - DevOps Engineer (Offboarded with full audit)
5. **Lars Petersen** - Frontend Developer (Invited, not started)
6. **Mette Sørensen** - Marketing Specialist (Offboarding in progress)
7. **Nils Andersen** - Backend Developer (Active)
8. **Astrid Olsen** - QA Engineer (Active)

### **Data Richness Per Employee**:
- **Documents**: 15+ (contracts, GDPR forms, tax documents, etc.)
- **Tasks**: 2-4 (equipment setup, training, compliance checks)
- **Enrollments**: Complete status tracking
- **Invitations**: JWT-based with encrypted PII

## 🔧 Troubleshooting Guide

### **Common Issues & Solutions**

#### **Issue**: "Schema must be one of the following: api"
**Solution**: The scripts are trying to use the wrong schema. This is expected with offboarding scripts until schema is deployed.
```bash
# Deploy the offboarding schema first
pnpm run offboarding:deploy-schema
# Then manually execute the SQL in Supabase Dashboard
```

#### **Issue**: "Demo data appears lost"
**Root Cause**: System defaults to basic `nets-demo` instead of rich companies.
**Solution**: Rich companies exist but need data generation (future enhancement).

#### **Issue**: Demo setup fails with 409 conflicts
**Solution**: Demo data already exists. Use reset or refresh:
```bash
pnpm run demo:reset
pnpm run demo:complete
```

#### **Issue**: Health check fails
**Solution**: Check database connection and schema:
```bash
pnpm run health-check
# If fails, check .env variables and database access
```

## 🎯 Demo Company Strategy

### **Current Active**: Nets A/S (`nets-demo`)
- **Status**: ✅ Working, comprehensive
- **Use Case**: Standard demos, development, testing
- **Scale**: 8 employees with rich scenarios

### **Future Enhancement**: Rich Demo Companies
These are fully architected but need data generation:

#### **Hygge & Hvidløg A/S** (`hygge-hvidlog`)
- **Industry**: Sustainable Food Technology  
- **Scale**: 1,200 employees (medium enterprise)
- **Use Case**: European company demos
- **Status**: ⚠️ Architecture complete, data needed

#### **Meridian Brands International** (`meridian-brands`)
- **Industry**: Consumer Products
- **Scale**: 15,500 employees (large enterprise)
- **Use Case**: Enterprise scale demos
- **Status**: ⚠️ Architecture complete, data needed

## 📝 Data Generation Scripts Reference

### **Core Scripts** (in `/demo/scripts/`):
- `setup-demo.js` - Basic client + applications setup
- `populate-full-demo.js` - Standard employee data (6 employees)
- `populate-rich-demo.js` - Enhanced variety (8 employees)
- `setup-complete-demo.js` - **MASTER SCRIPT** - Everything in one command
- `reset-demo.js` - Clean slate reset
- `refresh-demo.js` - Incremental updates

### **Offboarding Scripts** (in `/scripts/`):
- `deploy-task-offboarding-schema.js` - Deploy offboarding tables
- `create-offboarding-demo-data.js` - Create offboarding workflows
- `create-offboarding-templates-demo.js` - Create process templates

## 🔄 Gradual Data Building Strategy

### **Approach 1: Incremental Enhancement**
```bash
# Start with basic setup
pnpm run demo:setup

# Add employee variety
pnpm run demo:populate-rich

# Add offboarding workflows (after schema deployment)
pnpm run offboarding:demo-data

# Regular refreshes to simulate progression
pnpm run demo:refresh
```

### **Approach 2: Full Reset & Rebuild**
```bash
# Nuclear option - complete rebuild
pnpm run demo:reset
pnpm run demo:complete
```

### **Approach 3: Status-Driven Building**
```bash
# Check what exists
pnpm run demo:setup:status

# Add missing pieces based on status
# (Scripts will skip existing data)
```

## 🎉 Success Criteria

### **Healthy Demo Environment**:
- ✅ `pnpm run health-check` passes
- ✅ `pnpm run demo:setup:status` shows complete setup
- ✅ Demo admin interface (`pnpm run demo:admin`) shows rich data
- ✅ 8 employees with variety of statuses
- ✅ 15+ documents per employee
- ✅ Realistic onboarding/offboarding scenarios

### **Expected Metrics**:
- **Employees**: 8 total (various statuses)
- **Documents**: 120+ total across all employees
- **Tasks**: 16-32 total (2-4 per employee)
- **Invitations**: 3-5 active invitations
- **Processes**: 2-3 active offboarding processes

## 🚨 Critical Reminders

### **Schema Dependencies**:
1. **MUST deploy offboarding schema first** via Supabase SQL Editor
2. **Use `api` schema** - all tables should be in `api.table_name`
3. **Check health** after schema changes

### **Data Persistence**:
- Demo data persists in database until manually reset
- `demo:refresh` adds progression, doesn't replace
- `demo:reset` is nuclear option - rebuilds everything
- Rich demo companies need separate data generation

### **Memory Strategy**:
- **This document** is the source of truth for setup procedures
- **Update this document** when procedures change
- **Reference demo commands** before building new scripts
- **Document gradual building** approach for each enhancement

---

*This memory document should be updated whenever demo data procedures change. It serves as the definitive guide for understanding and maintaining the demo data system.*