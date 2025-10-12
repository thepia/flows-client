# Demo Data Strategy & Implementation Plan

*Created: January 2025*


## 📊 Current System Analysis

### Current Demo Client Selection Architecture

**Default Loading Priority:**
1. Primary: `nets-demo` client (hardcoded priority)
2. Fallback: Any client with `%demo%` in client_code
3. Ultimate fallback: First available client

**Issue Identified**: The system prioritizes `nets-demo` over the rich demo companies that have been carefully architected.

### ✅ Existing Demo Companies (Already Defined)

Two comprehensive demo companies are **fully architected** but need data population:

#### 1. **Hygge & Hvidløg A/S** (`hygge-hvidlog`)
- **Industry**: Sustainable Food Technology
- **Scale**: 1,200 employees (target)
- **Locations**: Copenhagen, Aarhus, Berlin, Amsterdam
- **Departments**: Product Development, Marketing, Operations, R&D, Sales, Quality Assurance
- **Status**: Architecture complete, data generation needed
- **Demo Type**: Internal demos, complex scenarios
- **Branding**: Custom forest green theme

#### 2. **Meridian Brands International** (`meridian-brands`)
- **Industry**: Consumer Products
- **Scale**: 15,500 employees (global enterprise)
- **Locations**: New York, London, Singapore, São Paulo, Mumbai, Tokyo
- **Departments**: Product Management, Global Marketing, Supply Chain, Digital Innovation, Regional Sales, Corporate Strategy
- **Status**: Architecture complete, data generation needed
- **Demo Type**: Prospect demos, enterprise scenarios
- **Branding**: Custom indigo corporate theme

### 🎯 Demo Data Requirements Analysis

Based on user requirements:

1. **Multiple Demo Clients** ✅ (architecture exists)
2. **Fictitious Companies** ✅ (both companies are fictitious)
3. **Large Datasets** ⚠️ (capability exists, execution needed)
4. **Realistic & Authentic Data** ✅ (comprehensive generation system exists)
5. **CI Testing Client** 🆕 (needs creation)
6. **1000+ Offboarding Capability** ✅ (system can handle this scale)

## 🚀 Implementation Strategy

### Phase 1: Priority Demo Client Restructure (Week 1)

**Update Default Loading Logic:**

```typescript
// Current: Prioritizes nets-demo
.eq('client_code', 'nets-demo')

// Proposed: Prioritize rich demo companies
const PRIORITY_DEMO_CLIENTS = ['hygge-hvidlog', 'meridian-brands'];
```

**Action Items:**
1. Update `loadDemoData()` to prioritize the rich demo companies
2. Update localStorage defaults to select Hygge & Hvidløg by default
3. Verify branding integration works correctly

### Phase 2: Large-Scale Data Generation (Week 1-2)

**Execute Existing Data Generation System:**

The system already has comprehensive generation capabilities. Execute for both companies:

```typescript
// For Hygge & Hvidløg (Mid-size European company)
const hyggeConfig: DemoGenerationConfig = {
  companyId: 'hygge-hvidlog',
  employeeCount: 1200,
  onboardingCount: 50,
  offboardingCount: 30,
  complexity: 'realistic'
};

// For Meridian Brands (Large enterprise)
const meridianConfig: DemoGenerationConfig = {
  companyId: 'meridian-brands',
  employeeCount: 2500, // Start with manageable subset
  onboardingCount: 120,
  offboardingCount: 80,
  complexity: 'enterprise'
};
```

**Data Distribution Strategy:**

**Hygge & Hvidløg (1,200 employees):**
- Product Development: 25% (300 employees)
- R&D: 20% (240 employees)
- Operations: 15% (180 employees)
- Sales: 15% (180 employees)
- Marketing: 15% (180 employees)
- Quality Assurance: 10% (120 employees)

**Meridian Brands (2,500 employees):**
- Regional Sales: 30% (750 employees)
- Product Management: 20% (500 employees)
- Global Marketing: 15% (375 employees)
- Supply Chain: 15% (375 employees)
- Digital Innovation: 10% (250 employees)
- Corporate Strategy: 10% (250 employees)

### Phase 3: CI Testing Client Creation (Week 2)

**New Demo Client: `flows-ci-test`**

```typescript
const CI_TEST_CLIENT = {
  id: 'flows-ci-test',
  name: 'flows-ci-test',
  displayName: 'Flows CI Testing Corp',
  industry: 'Software Testing',
  description: 'Stable dataset for continuous integration testing',
  employeeCount: 100, // Small, stable dataset
  onboardingCount: 5,
  offboardingCount: 3,
  demoType: 'ci-testing',
  complexity: 'simple',
  isActive: true,
  dataStability: 'locked' // Never regenerate
};
```

**CI Client Characteristics:**
- **Fixed Dataset**: Never changes to avoid breaking tests
- **Comprehensive Coverage**: Includes all edge cases for testing
- **Predictable IDs**: Stable identifiers for reliable test assertions
- **Complete Scenarios**: All process states and statuses represented
- **Performance Optimized**: Minimal data for fast test execution

### Phase 4: Enterprise Scale Demo (Week 3)

**Meridian Brands Scale-Up:**

```typescript
// Scale up Meridian for enterprise demos
const meridianEnterpriseConfig: DemoGenerationConfig = {
  companyId: 'meridian-brands',
  employeeCount: 15500, // Full enterprise scale
  onboardingCount: 500,
  offboardingCount: 300,
  complexity: 'enterprise-scale'
};
```

**Enterprise Features:**
- **Multi-location Distribution**: Realistic global workforce distribution
- **Complex Hierarchies**: 5-7 levels of management structure
- **Seasonal Patterns**: Realistic hiring/departure patterns
- **Department Interdependencies**: Cross-functional project teams
- **Large-Scale Offboarding**: 1000+ parallel offboarding processes for demos

## 📋 Detailed Data Generation Specifications

### Realistic Data Distribution Patterns

**Employment Status Distribution:**
- Active: 85%
- Previous: 12%
- Future: 3%

**Department Size Patterns:**
- Core Business Functions: 40-50% of workforce
- Support Functions: 20-30% of workforce
- Innovation/Strategy: 10-20% of workforce
- Admin/Executive: 5-10% of workforce

**Tenure Distribution:**
- 0-1 years: 20%
- 1-3 years: 35%
- 3-7 years: 30%
- 7+ years: 15%

**Geographic Distribution (Meridian Brands):**
- North America: 40%
- Europe: 25%
- Asia-Pacific: 20%
- Latin America: 10%
- Other: 5%

### Process Data Realism

**Offboarding Process Distribution:**
- Standard (2-week): 60%
- Extended (4-week): 25%
- Executive (6-week): 10%
- Immediate (1-week): 5%

**Task Completion Patterns:**
- On Schedule: 70%
- Behind Schedule: 20%
- Blocked: 5%
- Ahead of Schedule: 5%

**Document Upload Patterns:**
- Complete: 80%
- Partial: 15%
- Missing: 5%

## 🔧 Technical Implementation

### Database Schema Preparation

**Required Tables:**
- ✅ `clients` (exists)
- ✅ `people` (exists) 
- ✅ `people_enrollments` (exists)
- ✅ `invitations` (exists)
- ✅ `client_applications` (exists)

**Data Generation Scripts:**

```typescript
// Execute data generation for demo companies
async function populateDemoCompanies() {
  const { generateDemoDataForCompany } = await import('./services/demoDataGenerator.js');
  
  // Hygge & Hvidløg
  await generateDemoDataForCompany({
    companyId: 'hygge-hvidlog',
    employeeCount: 1200,
    onboardingCount: 50,
    offboardingCount: 30
  });
  
  // Meridian Brands
  await generateDemoDataForCompany({
    companyId: 'meridian-brands', 
    employeeCount: 2500,
    onboardingCount: 120,
    offboardingCount: 80
  });
  
  // CI Testing Client
  await generateDemoDataForCompany({
    companyId: 'flows-ci-test',
    employeeCount: 100,
    onboardingCount: 5,
    offboardingCount: 3,
    stability: 'locked'
  });
}
```

### Client Selection Logic Update

```typescript
// Update loadDemoData to prioritize rich demo companies
export async function loadDemoData() {
  loading.set(true);
  error.set(null);

  try {
    // Priority order for demo clients
    const DEMO_PRIORITIES = [
      'hygge-hvidlog',     // Primary internal demo
      'meridian-brands',   // Primary prospect demo  
      'flows-ci-test',     // CI testing
      'nets-demo'          // Legacy fallback
    ];

    for (const clientCode of DEMO_PRIORITIES) {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('client_code', clientCode)
        .single();

      if (!clientError && clientData) {
        await loadClientData(clientData.id);
        return;
      }
    }

    // Fallback to any demo client
    // ... existing fallback logic
  } catch (err) {
    // ... existing error handling
  }
}
```

## 📊 Demo Client Usage Strategy

### Client Selection by Use Case

| Demo Client | Primary Use | Scale | Audience | Complexity |
|------------|-------------|-------|----------|------------|
| **Hygge & Hvidløg** | Internal demos, training | 1,200 employees | Internal team, partners | Medium-High |
| **Meridian Brands** | Prospect demos, sales | 15,500 employees | Enterprise prospects | High |
| **Flows CI Test** | Automated testing | 100 employees | CI/CD pipeline | Low |
| **Nets Demo** | Legacy support | Variable | Fallback only | Variable |

### Demo Scenarios by Client

**Hygge & Hvidløg Scenarios:**
- European company onboarding workflows
- Multi-location coordination
- Sustainable industry compliance
- Medium-scale process management
- Department-specific templates

**Meridian Brands Scenarios:**
- Global enterprise operations
- Large-scale offboarding (1000+ employees)
- Complex hierarchical structures
- Multi-timezone coordination
- Executive-level reporting

**Flows CI Test Scenarios:**
- Edge case testing
- Performance validation
- Feature regression testing
- API integration testing
- Error handling validation

## 🎯 Success Metrics

### Data Quality Metrics
- **Realism Score**: 95%+ realistic data patterns
- **Distribution Accuracy**: ±5% from target department distributions
- **Relationship Integrity**: 100% valid foreign key relationships
- **Performance**: <2s load time for 1000+ employee datasets

### Demo Effectiveness Metrics
- **Sales Demo Success**: Able to demonstrate enterprise-scale capabilities
- **Training Effectiveness**: Internal team can navigate all demo scenarios
- **CI Stability**: <1% test failure rate due to data inconsistencies
- **Performance Demos**: Successfully demonstrate 1000+ concurrent offboarding

## 🚀 Immediate Action Plan

### Week 1 Tasks
1. **Update Client Selection Logic** (2 hours)
   - Modify `loadDemoData()` function
   - Update localStorage defaults
   - Test client switching

2. **Execute Data Generation** (4 hours)
   - Run generation for Hygge & Hvidløg (1,200 employees)
   - Run generation for Meridian Brands (2,500 employees)
   - Verify data quality and distributions

3. **Validation Testing** (2 hours)
   - Test navigation with new datasets
   - Verify branding integration
   - Performance testing with large datasets

### Week 2 Tasks
1. **CI Testing Client Creation** (3 hours)
   - Design stable test dataset
   - Generate CI testing data
   - Update test configurations

2. **Documentation Update** (2 hours)
   - Update demo guides
   - Create client selection documentation
   - Performance optimization notes

### Week 3 Tasks  
1. **Enterprise Scale-Up** (4 hours)
   - Scale Meridian to 15,500 employees
   - Test 1000+ offboarding capability
   - Performance optimization

2. **Demo Scenarios** (3 hours)
   - Create use-case specific demo workflows
   - Sales demo script development
   - Training material updates

## 📝 Documentation Updates Needed

1. **Demo Client Guide** - How to select and use different demo clients
2. **Data Generation Manual** - How to regenerate demo data safely
3. **Sales Demo Scripts** - Client-specific demo scenarios
4. **CI Testing Guide** - Using the stable CI testing client
5. **Performance Benchmarks** - Expected performance with large datasets

---

*This strategy leverages the existing comprehensive demo architecture while addressing the need for multiple realistic demo environments. The two existing demo companies are exceptional and just need data population to become fully functional.*