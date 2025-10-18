# Database Schema Enhancements for Rich Demo Data (ARCHIVED)

**⚠️ CONSOLIDATED**: This document has been merged into the comprehensive database architecture guide.

**📋 USE INSTEAD**: [../DATABASE_ARCHITECTURE.md](../DATABASE_ARCHITECTURE.md) - Complete database and system architecture

**🗓️ ARCHIVED**: January 2025 - Demo data strategy consolidated into unified documentation

---

## Overview

This document outlines the database schema enhancements needed to support the comprehensive demo company strategy outlined in `DEMO_COMPANIES.md`. The goal is to create a robust foundation that can handle 1000+ employees per company with rich demographic data, comprehensive document libraries, and complex workflow templates.

## Current Schema Analysis

### Existing Tables (from current implementation)
- `clients` - Basic client information
- `employees` - Basic employee data
- `client_applications` - Application configurations
- `employee_enrollments` - Onboarding/offboarding process instances
- `documents` - Document tracking
- `tasks` - Task management
- `invitations` - Invitation management

## Required Schema Enhancements

### 1. Enhanced Client Management

#### Table: `clients` (Enhanced)
```sql
-- Add columns to existing clients table
ALTER TABLE api.clients ADD COLUMN IF NOT EXISTS
  industry VARCHAR(100),
  founded_year INTEGER,
  headquarters_city VARCHAR(100),
  headquarters_country VARCHAR(50),
  headquarters_timezone VARCHAR(50),
  employee_count INTEGER,
  description TEXT,
  culture_keywords TEXT[], -- Array of culture descriptors
  business_model TEXT,
  demo_type VARCHAR(50) DEFAULT 'standard', -- 'standard', 'prospect', 'training'
  demo_complexity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW();

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON api.clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### Table: `client_offices` (New)
```sql
CREATE TABLE api.client_offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES api.clients(id) ON DELETE CASCADE,
  office_name VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(50) NOT NULL,
  timezone VARCHAR(50) NOT NULL,
  address TEXT,
  employee_count INTEGER DEFAULT 0,
  office_type VARCHAR(50) DEFAULT 'branch', -- 'headquarters', 'branch', 'remote_hub', 'temporary'
  is_active BOOLEAN DEFAULT true,
  opened_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER update_client_offices_updated_at BEFORE UPDATE ON api.client_offices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for performance
CREATE INDEX idx_client_offices_client_id ON api.client_offices(client_id);
CREATE INDEX idx_client_offices_active ON api.client_offices(is_active) WHERE is_active = true;
```

### 2. Enhanced Employee Management

#### Table: `employees` (Enhanced)
```sql
-- Add comprehensive demographic and profile columns
ALTER TABLE api.employees ADD COLUMN IF NOT EXISTS
  office_id UUID REFERENCES api.client_offices(id),
  employee_number VARCHAR(50), -- Company employee ID
  title VARCHAR(100), -- Mr, Ms, Dr, etc.
  middle_name VARCHAR(100),
  preferred_name VARCHAR(100),
  date_of_birth DATE,
  nationality VARCHAR(50),
  languages_spoken TEXT[], -- Array of language codes
  gender VARCHAR(20),
  ethnicity VARCHAR(50),
  education_level VARCHAR(50), -- 'high_school', 'bachelor', 'master', 'doctorate', 'professional'
  university VARCHAR(200),
  degree_field VARCHAR(100),
  years_of_experience INTEGER,
  previous_company VARCHAR(200),
  emergency_contact_name VARCHAR(200),
  emergency_contact_phone VARCHAR(50),
  emergency_contact_relationship VARCHAR(50),
  work_authorization_status VARCHAR(50), -- 'citizen', 'permanent_resident', 'work_visa', 'contractor'
  visa_type VARCHAR(50),
  visa_expiry_date DATE,
  linkedin_profile VARCHAR(500),
  skills TEXT[], -- Array of skills
  certifications TEXT[], -- Array of certifications
  security_clearance_level VARCHAR(50),
  is_remote_eligible BOOLEAN DEFAULT false,
  remote_work_percentage INTEGER DEFAULT 0, -- 0-100%
  cost_center VARCHAR(50),
  reporting_manager_id UUID REFERENCES api.employees(id),
  hire_date DATE,
  probation_end_date DATE,
  contract_type VARCHAR(50) DEFAULT 'permanent', -- 'permanent', 'fixed_term', 'contractor', 'intern'
  contract_end_date DATE,
  salary_currency VARCHAR(3),
  salary_amount DECIMAL(12,2),
  salary_frequency VARCHAR(20) DEFAULT 'annual', -- 'hourly', 'monthly', 'annual'
  benefits_eligible BOOLEAN DEFAULT true,
  stock_options_eligible BOOLEAN DEFAULT false,
  notice_period_days INTEGER DEFAULT 30,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW();

-- Add trigger for employees updated_at
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON api.employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Performance indexes
CREATE INDEX idx_employees_office_id ON api.employees(office_id);
CREATE INDEX idx_employees_manager_id ON api.employees(reporting_manager_id);
CREATE INDEX idx_employees_hire_date ON api.employees(hire_date);
CREATE INDEX idx_employees_status_location ON api.employees(status, office_id);
```

#### Table: `employee_process_history` (New)
```sql
CREATE TABLE api.employee_process_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES api.employees(id) ON DELETE CASCADE,
  process_type VARCHAR(50) NOT NULL, -- 'onboarding', 'offboarding', 'transfer', 'promotion'
  process_status VARCHAR(50) NOT NULL, -- 'active', 'completed', 'cancelled'
  start_date DATE NOT NULL,
  expected_completion_date DATE,
  actual_completion_date DATE,
  complexity_level VARCHAR(20) DEFAULT 'standard', -- 'simple', 'standard', 'complex', 'executive'
  assigned_hr_contact_id UUID REFERENCES api.employees(id),
  process_notes TEXT,
  completion_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER update_employee_process_history_updated_at BEFORE UPDATE ON api.employee_process_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_employee_process_history_employee ON api.employee_process_history(employee_id);
CREATE INDEX idx_employee_process_history_status ON api.employee_process_history(process_status);
CREATE INDEX idx_employee_process_history_active ON api.employee_process_history(process_status, start_date);
```

### 3. Enhanced Document Management

#### Table: `document_templates` (New)
```sql
CREATE TABLE api.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES api.clients(id) ON DELETE CASCADE,
  template_name VARCHAR(200) NOT NULL,
  template_category VARCHAR(100) NOT NULL, -- 'employment', 'compliance', 'benefits', 'training', 'operational', 'knowledge_transfer'
  template_subcategory VARCHAR(100),
  document_type VARCHAR(100) NOT NULL, -- 'contract', 'form', 'agreement', 'certificate', 'checklist'
  applicable_regions TEXT[], -- Array of country codes
  applicable_roles TEXT[], -- Array of role categories
  complexity_level VARCHAR(20) DEFAULT 'standard',
  is_mandatory BOOLEAN DEFAULT false,
  requires_signature BOOLEAN DEFAULT false,
  requires_witness BOOLEAN DEFAULT false,
  requires_notarization BOOLEAN DEFAULT false,
  template_content TEXT, -- Could store template markup or file reference
  instructions TEXT,
  estimated_completion_minutes INTEGER,
  legal_review_required BOOLEAN DEFAULT false,
  version_number VARCHAR(20) DEFAULT '1.0',
  is_active BOOLEAN DEFAULT true,
  effective_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  created_by UUID REFERENCES api.employees(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER update_document_templates_updated_at BEFORE UPDATE ON api.document_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_document_templates_client ON api.document_templates(client_id);
CREATE INDEX idx_document_templates_category ON api.document_templates(template_category, is_active);
CREATE INDEX idx_document_templates_mandatory ON api.document_templates(is_mandatory) WHERE is_mandatory = true;
```

#### Table: `documents` (Enhanced)
```sql
-- Enhance existing documents table
ALTER TABLE api.documents ADD COLUMN IF NOT EXISTS
  template_id UUID REFERENCES api.document_templates(id),
  process_history_id UUID REFERENCES api.employee_process_history(id),
  document_category VARCHAR(100),
  document_subcategory VARCHAR(100),
  priority_level VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  due_date DATE,
  assigned_to_id UUID REFERENCES api.employees(id),
  completed_by_id UUID REFERENCES api.employees(id),
  completion_date TIMESTAMP,
  requires_review BOOLEAN DEFAULT false,
  reviewed_by_id UUID REFERENCES api.employees(id),
  review_date TIMESTAMP,
  review_notes TEXT,
  file_path VARCHAR(500),
  file_size_bytes BIGINT,
  file_type VARCHAR(50),
  digital_signature_hash VARCHAR(255),
  is_confidential BOOLEAN DEFAULT false,
  retention_period_years INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON api.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_documents_template ON api.documents(template_id);
CREATE INDEX idx_documents_process ON api.documents(process_history_id);
CREATE INDEX idx_documents_assigned ON api.documents(assigned_to_id, status);
CREATE INDEX idx_documents_due_date ON api.documents(due_date) WHERE due_date IS NOT NULL;
```

### 4. Enhanced Task Management

#### Table: `task_templates` (New)
```sql
CREATE TABLE api.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES api.clients(id) ON DELETE CASCADE,
  template_name VARCHAR(200) NOT NULL,
  template_description TEXT,
  task_category VARCHAR(100) NOT NULL, -- 'preparation', 'orientation', 'training', 'documentation', 'integration', 'knowledge_transfer'
  process_type VARCHAR(50) NOT NULL, -- 'onboarding', 'offboarding', 'transfer'
  applicable_roles TEXT[], -- Array of role categories
  applicable_levels TEXT[], -- Array of seniority levels
  estimated_duration_hours DECIMAL(5,2),
  is_mandatory BOOLEAN DEFAULT true,
  sequence_order INTEGER, -- Order within a workflow
  dependencies TEXT[], -- Array of template IDs that must complete first
  instructions TEXT,
  success_criteria TEXT,
  resources_needed TEXT[],
  assigned_role VARCHAR(100), -- 'hr', 'manager', 'employee', 'it', 'facilities'
  automation_possible BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES api.employees(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER update_task_templates_updated_at BEFORE UPDATE ON api.task_templates
  FOR EACH ROW EXECUTE FUNCTION update_task_template_updated_at_column();

CREATE INDEX idx_task_templates_client ON api.task_templates(client_id);
CREATE INDEX idx_task_templates_category ON api.task_templates(task_category, process_type);
CREATE INDEX idx_task_templates_sequence ON api.task_templates(sequence_order);
```

#### Table: `workflow_templates` (New)
```sql
CREATE TABLE api.workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES api.clients(id) ON DELETE CASCADE,
  workflow_name VARCHAR(200) NOT NULL,
  workflow_description TEXT,
  process_type VARCHAR(50) NOT NULL, -- 'onboarding', 'offboarding', 'transfer'
  complexity_level VARCHAR(20) DEFAULT 'standard',
  applicable_roles TEXT[],
  applicable_levels TEXT[],
  estimated_total_days INTEGER,
  is_default BOOLEAN DEFAULT false,
  task_template_ids UUID[], -- Array of task template IDs
  document_template_ids UUID[], -- Array of document template IDs
  milestone_definitions JSONB, -- JSON structure defining milestones
  escalation_rules JSONB, -- JSON structure for escalation logic
  approval_requirements JSONB, -- JSON structure for approvals needed
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES api.employees(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER update_workflow_templates_updated_at BEFORE UPDATE ON api.workflow_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_workflow_templates_client ON api.workflow_templates(client_id);
CREATE INDEX idx_workflow_templates_process ON api.workflow_templates(process_type, complexity_level);
CREATE INDEX idx_workflow_templates_default ON api.workflow_templates(is_default) WHERE is_default = true;
```

#### Table: `tasks` (Enhanced)
```sql
-- Enhance existing tasks table
ALTER TABLE api.tasks ADD COLUMN IF NOT EXISTS
  template_id UUID REFERENCES api.task_templates(id),
  process_history_id UUID REFERENCES api.employee_process_history(id),
  workflow_template_id UUID REFERENCES api.workflow_templates(id),
  parent_task_id UUID REFERENCES api.tasks(id), -- For subtasks
  sequence_order INTEGER,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  depends_on_task_ids UUID[], -- Array of task IDs that must complete first
  blocking_task_ids UUID[], -- Array of task IDs that are blocked by this task
  milestone_name VARCHAR(100),
  automation_status VARCHAR(50) DEFAULT 'manual', -- 'manual', 'automated', 'semi_automated'
  escalation_level INTEGER DEFAULT 0,
  escalated_to_id UUID REFERENCES api.employees(id),
  escalation_date TIMESTAMP,
  resources_needed TEXT[],
  completion_notes TEXT,
  quality_score INTEGER, -- 1-5 rating of completion quality
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON api.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_tasks_template ON api.tasks(template_id);
CREATE INDEX idx_tasks_process ON api.tasks(process_history_id);
CREATE INDEX idx_tasks_workflow ON api.tasks(workflow_template_id);
CREATE INDEX idx_tasks_dependencies ON api.tasks USING GIN(depends_on_task_ids);
CREATE INDEX idx_tasks_milestone ON api.tasks(milestone_name) WHERE milestone_name IS NOT NULL;
```

### 5. Performance & Analytics Tables

#### Table: `process_metrics` (New)
```sql
CREATE TABLE api.process_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES api.clients(id) ON DELETE CASCADE,
  process_history_id UUID REFERENCES api.employee_process_history(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  overdue_tasks INTEGER DEFAULT 0,
  total_documents INTEGER DEFAULT 0,
  completed_documents INTEGER DEFAULT 0,
  pending_review_documents INTEGER DEFAULT 0,
  average_task_completion_hours DECIMAL(8,2),
  employee_satisfaction_score INTEGER, -- 1-5 rating
  hr_efficiency_score INTEGER, -- 1-5 rating
  process_complexity_actual VARCHAR(20), -- Actual vs planned complexity
  issues_encountered INTEGER DEFAULT 0,
  escalations_required INTEGER DEFAULT 0,
  cost_estimate DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_process_metrics_client_date ON api.process_metrics(client_id, metric_date);
CREATE INDEX idx_process_metrics_process ON api.process_metrics(process_history_id);
```

#### Table: `system_analytics` (New)
```sql
CREATE TABLE api.system_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES api.clients(id) ON DELETE CASCADE,
  analytics_date DATE NOT NULL,
  active_processes INTEGER DEFAULT 0,
  completed_processes_mtd INTEGER DEFAULT 0,
  average_onboarding_days DECIMAL(5,2),
  average_offboarding_days DECIMAL(5,2),
  document_template_usage JSONB, -- JSON with template usage statistics
  task_template_performance JSONB, -- JSON with task completion metrics
  user_adoption_metrics JSONB, -- JSON with user engagement data
  system_performance_metrics JSONB, -- JSON with technical performance data
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_system_analytics_client_date ON api.system_analytics(client_id, analytics_date);
```

## Views for Complex Queries

### Employee Summary View
```sql
CREATE VIEW api.employee_summary AS
SELECT 
  e.*,
  o.office_name,
  o.city as office_city,
  o.country as office_country,
  m.first_name as manager_first_name,
  m.last_name as manager_last_name,
  ph.process_type as current_process_type,
  ph.process_status as current_process_status,
  ph.completion_percentage
FROM api.employees e
LEFT JOIN api.client_offices o ON e.office_id = o.id
LEFT JOIN api.employees m ON e.reporting_manager_id = m.id
LEFT JOIN api.employee_process_history ph ON e.id = ph.employee_id 
  AND ph.process_status = 'active';
```

### Process Dashboard View
```sql
CREATE VIEW api.process_dashboard AS
SELECT 
  c.id as client_id,
  c.legal_name as client_name,
  COUNT(ph.*) as total_active_processes,
  COUNT(ph.*) FILTER (WHERE ph.process_type = 'onboarding') as active_onboarding,
  COUNT(ph.*) FILTER (WHERE ph.process_type = 'offboarding') as active_offboarding,
  AVG(ph.completion_percentage) as avg_completion,
  COUNT(t.*) FILTER (WHERE t.status = 'pending') as pending_tasks,
  COUNT(d.*) FILTER (WHERE d.status = 'pending') as pending_documents
FROM api.clients c
LEFT JOIN api.employee_process_history ph ON c.id = ph.employee_id IN (
  SELECT id FROM api.employees WHERE client_id = c.id
) AND ph.process_status = 'active'
LEFT JOIN api.tasks t ON ph.id = t.process_history_id AND t.status = 'pending'
LEFT JOIN api.documents d ON ph.id = d.process_history_id AND d.status = 'pending'
GROUP BY c.id, c.legal_name;
```

## Data Migration Strategy

### Phase 1: Schema Creation
1. Create new tables and columns
2. Add indexes and constraints
3. Create views and functions
4. Test with small dataset

### Phase 2: Data Enhancement
1. Populate client office data
2. Enhance existing employee records
3. Create template libraries
4. Generate workflow templates

### Phase 3: Demo Data Generation
1. Create comprehensive employee profiles
2. Generate realistic process histories
3. Create document and task instances
4. Populate analytics tables

### Phase 4: Optimization
1. Performance tuning based on usage patterns
2. Additional indexes as needed
3. Query optimization
4. Cleanup and documentation

## Security Considerations

### Data Privacy
- Ensure all demo data is clearly fictional
- Implement proper access controls
- Consider data retention policies
- Plan for GDPR compliance in demo scenarios

### Performance
- Implement proper indexing strategy
- Consider partitioning for large tables
- Plan for efficient data archival
- Monitor query performance

This enhanced schema provides the foundation for creating realistic, scalable demo scenarios while maintaining good performance and data integrity.