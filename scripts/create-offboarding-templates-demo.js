#!/usr/bin/env node

/**
 * Create demo data for task-oriented offboarding templates
 * Demonstrates department/function-specific template variants
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    '❌ Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Demo client ID (using "demo-client" from existing setup)
const _DEMO_CLIENT_ID = 'demo-client';

// Template definitions for different departments and roles
const OFFBOARDING_TEMPLATES = [
  {
    name: 'Standard Company-Wide Offboarding',
    description: 'Default offboarding process applicable to all employees',
    template_type: 'company_wide',
    department: null,
    role_category: null,
    seniority_level: null,
    estimated_duration_days: 10,
    complexity_score: 2,
    is_default: true,
    requires_manager_approval: true,
    requires_hr_approval: true,
    requires_security_review: false,
    tasks: [
      {
        name: 'Schedule Exit Interview',
        description: 'Coordinate exit interview with HR',
        instructions:
          'Contact HR to schedule a 60-minute exit interview session. Prepare questions about employee experience and improvement suggestions.',
        category: 'exit_interview',
        estimated_hours: 1.0,
        sort_order: 1,
        default_assignee_role: 'hr_representative',
        requires_approval: false,
        documents: [{ name: 'Exit Interview Form', document_type: 'form', is_mandatory: true }],
      },
      {
        name: 'Complete Equipment Return',
        description: 'Return all company equipment',
        instructions:
          'Collect and return laptop, phone, badge, keys, and any other company property. Obtain signed receipt.',
        category: 'equipment_return',
        estimated_hours: 0.5,
        sort_order: 2,
        default_assignee_role: 'departing_employee',
        requires_evidence: true,
        evidence_types: ['signature', 'document'],
        documents: [
          { name: 'Equipment Return Checklist', document_type: 'checklist', is_mandatory: true },
        ],
      },
      {
        name: 'Knowledge Transfer Documentation',
        description: 'Document key responsibilities and handover information',
        instructions:
          'Create comprehensive documentation of daily tasks, ongoing projects, and important contacts.',
        category: 'documentation',
        estimated_hours: 4.0,
        sort_order: 3,
        default_assignee_role: 'departing_employee',
        requires_approval: true,
        approval_role: 'direct_manager',
        documents: [
          {
            name: 'Handover Document Template',
            document_type: 'handover_document',
            is_mandatory: true,
          },
        ],
      },
      {
        name: 'Access Revocation Review',
        description: 'Review and revoke all system access',
        instructions:
          'Systematically review and revoke access to all systems, applications, and physical spaces.',
        category: 'access_revocation',
        estimated_hours: 1.5,
        sort_order: 4,
        default_assignee_role: 'it_administrator',
        requires_evidence: true,
        evidence_types: ['confirmation'],
        documents: [
          { name: 'Access Revocation Checklist', document_type: 'checklist', is_mandatory: true },
        ],
      },
      {
        name: 'Final Payroll and Benefits',
        description: 'Process final compensation and benefits transition',
        instructions:
          'Calculate final pay, process unused vacation time, coordinate COBRA/benefits transition.',
        category: 'final_procedures',
        estimated_hours: 2.0,
        sort_order: 5,
        default_assignee_role: 'hr_representative',
        requires_approval: true,
        approval_role: 'department_head',
      },
    ],
  },

  {
    name: 'Engineering Department Offboarding',
    description: 'Specialized offboarding for engineering team members',
    template_type: 'department_specific',
    department: 'Engineering',
    role_category: 'engineering',
    seniority_level: null,
    estimated_duration_days: 14,
    complexity_score: 4,
    is_default: true,
    requires_manager_approval: true,
    requires_hr_approval: true,
    requires_security_review: true,
    tasks: [
      {
        name: 'Code Repository Access Review',
        description: 'Review and secure code repository access',
        instructions:
          'Remove access to GitHub, GitLab, and any other code repositories. Review commit history for sensitive information.',
        category: 'access_revocation',
        estimated_hours: 1.0,
        sort_order: 1,
        default_assignee_role: 'it_administrator',
        requires_evidence: true,
        evidence_types: ['screenshot', 'confirmation'],
        requires_approval: true,
        approval_role: 'security_officer',
      },
      {
        name: 'Technical Documentation Handover',
        description: 'Document technical systems and architecture knowledge',
        instructions:
          'Create detailed documentation of system architecture, deployment processes, and technical decisions.',
        category: 'knowledge_transfer',
        estimated_hours: 8.0,
        sort_order: 2,
        default_assignee_role: 'departing_employee',
        requires_approval: true,
        approval_role: 'direct_manager',
        documents: [
          {
            name: 'Technical Architecture Document',
            document_type: 'knowledge_base',
            is_mandatory: true,
          },
          {
            name: 'Deployment Process Guide',
            document_type: 'procedure_guide',
            is_mandatory: true,
          },
        ],
      },
      {
        name: 'Active Project Transition',
        description: 'Transition ownership of active development projects',
        instructions:
          'Meet with team to discuss project status, blockers, and next steps. Assign new project owners.',
        category: 'transition_planning',
        estimated_hours: 6.0,
        sort_order: 3,
        default_assignee_role: 'departing_employee',
        depends_on_task_ids: [], // Will be populated with actual IDs
        documents: [
          { name: 'Project Handover Checklist', document_type: 'checklist', is_mandatory: true },
        ],
      },
      {
        name: 'Production Environment Review',
        description: 'Review production access and on-call responsibilities',
        instructions:
          'Remove production environment access, update on-call rotations, transfer monitoring responsibilities.',
        category: 'access_revocation',
        estimated_hours: 2.0,
        sort_order: 4,
        default_assignee_role: 'it_administrator',
        requires_security_review: true,
      },
      {
        name: 'Intellectual Property Review',
        description: 'Review and secure intellectual property',
        instructions:
          'Ensure all code, documentation, and technical assets are properly transferred and secured.',
        category: 'compliance',
        estimated_hours: 1.5,
        sort_order: 5,
        default_assignee_role: 'security_officer',
        requires_approval: true,
        approval_role: 'department_head',
      },
    ],
  },

  {
    name: 'Sales Team Offboarding',
    description: 'Specialized offboarding for sales team members',
    template_type: 'department_specific',
    department: 'Sales',
    role_category: 'sales',
    seniority_level: null,
    estimated_duration_days: 12,
    complexity_score: 3,
    is_default: true,
    requires_manager_approval: true,
    requires_hr_approval: true,
    requires_security_review: false,
    tasks: [
      {
        name: 'Client Relationship Handover',
        description: 'Transfer client relationships to team members',
        instructions:
          'Create detailed client profiles, relationship history, and introduce replacement contacts to key clients.',
        category: 'knowledge_transfer',
        estimated_hours: 6.0,
        sort_order: 1,
        default_assignee_role: 'departing_employee',
        requires_approval: true,
        approval_role: 'direct_manager',
        documents: [
          {
            name: 'Client Relationship Transfer Document',
            document_type: 'handover_document',
            is_mandatory: true,
          },
          { name: 'Client Contact List', document_type: 'contact_list', is_mandatory: true },
        ],
      },
      {
        name: 'Pipeline and Opportunity Transfer',
        description: 'Transfer active sales opportunities',
        instructions:
          'Update CRM with detailed opportunity status, next steps, and transfer ownership to designated team members.',
        category: 'transition_planning',
        estimated_hours: 4.0,
        sort_order: 2,
        default_assignee_role: 'departing_employee',
        documents: [
          { name: 'Pipeline Transfer Checklist', document_type: 'checklist', is_mandatory: true },
        ],
      },
      {
        name: 'Commission and Quota Reconciliation',
        description: 'Finalize commission calculations and quota tracking',
        instructions:
          'Calculate final commission payments, update quota achievement records, and process any pending deals.',
        category: 'final_procedures',
        estimated_hours: 3.0,
        sort_order: 3,
        default_assignee_role: 'hr_representative',
        requires_approval: true,
        approval_role: 'department_head',
      },
      {
        name: 'CRM Access and Data Review',
        description: 'Review CRM access and data ownership',
        instructions:
          'Transfer data ownership in CRM, remove access, and ensure all client data is properly secured.',
        category: 'access_revocation',
        estimated_hours: 1.5,
        sort_order: 4,
        default_assignee_role: 'it_administrator',
      },
      {
        name: 'Client Communication Plan',
        description: 'Coordinate client communication about transition',
        instructions:
          'Develop communication plan for informing clients about account manager changes.',
        category: 'communication',
        estimated_hours: 2.0,
        sort_order: 5,
        default_assignee_role: 'direct_manager',
        documents: [
          { name: 'Client Communication Template', document_type: 'other', is_mandatory: false },
        ],
      },
    ],
  },

  {
    name: 'Senior Leadership Offboarding',
    description: 'Comprehensive offboarding for senior leadership roles',
    template_type: 'role_specific',
    department: null,
    role_category: 'leadership',
    seniority_level: 'executive',
    estimated_duration_days: 21,
    complexity_score: 5,
    is_default: true,
    requires_manager_approval: true,
    requires_hr_approval: true,
    requires_security_review: true,
    tasks: [
      {
        name: 'Strategic Knowledge Transfer',
        description: 'Document strategic vision and long-term planning',
        instructions:
          'Create comprehensive documentation of strategic initiatives, long-term vision, and key strategic relationships.',
        category: 'knowledge_transfer',
        estimated_hours: 12.0,
        sort_order: 1,
        default_assignee_role: 'departing_employee',
        requires_approval: true,
        approval_role: 'department_head',
        documents: [
          {
            name: 'Strategic Vision Document',
            document_type: 'knowledge_base',
            is_mandatory: true,
          },
          {
            name: 'Key Relationships Directory',
            document_type: 'contact_list',
            is_mandatory: true,
          },
        ],
      },
      {
        name: 'Board and Stakeholder Communication',
        description: 'Coordinate communication with board and key stakeholders',
        instructions:
          'Develop communication strategy for board members, investors, and key external stakeholders.',
        category: 'communication',
        estimated_hours: 4.0,
        sort_order: 2,
        default_assignee_role: 'departing_employee',
        custom_assignee_role: 'CEO/Board Chair',
      },
      {
        name: 'Team Leadership Transition',
        description: 'Transition leadership responsibilities to successors',
        instructions:
          'Meet with direct reports, discuss transition plans, and formally transfer leadership responsibilities.',
        category: 'transition_planning',
        estimated_hours: 8.0,
        sort_order: 3,
        default_assignee_role: 'departing_employee',
        documents: [
          {
            name: 'Leadership Transition Plan',
            document_type: 'procedure_guide',
            is_mandatory: true,
          },
        ],
      },
      {
        name: 'Confidentiality and Non-Compete Review',
        description: 'Review confidentiality agreements and legal obligations',
        instructions:
          'Comprehensive review of all legal agreements, confidentiality requirements, and post-employment obligations.',
        category: 'compliance',
        estimated_hours: 2.0,
        sort_order: 4,
        default_assignee_role: 'hr_representative',
        custom_assignee_role: 'Legal Counsel',
        requires_approval: true,
        approval_role: 'security_officer',
      },
      {
        name: 'Financial Authority Transfer',
        description: 'Transfer financial signing authority and access',
        instructions:
          'Update bank signatures, transfer financial system access, and document budget responsibilities.',
        category: 'access_revocation',
        estimated_hours: 3.0,
        sort_order: 5,
        default_assignee_role: 'hr_representative',
        requires_approval: true,
        approval_role: 'department_head',
        documents: [
          { name: 'Financial Authority Transfer Form', document_type: 'form', is_mandatory: true },
        ],
      },
    ],
  },

  {
    name: 'IT Administrator Offboarding',
    description: 'Specialized offboarding for IT and system administrators',
    template_type: 'role_specific',
    department: 'IT',
    role_category: 'technical',
    seniority_level: null,
    estimated_duration_days: 16,
    complexity_score: 5,
    is_default: true,
    requires_manager_approval: true,
    requires_hr_approval: true,
    requires_security_review: true,
    tasks: [
      {
        name: 'Administrative Access Audit',
        description: 'Comprehensive audit of all administrative access',
        instructions:
          'Document all systems with administrative access, create access inventory, and plan secure transfer.',
        category: 'access_revocation',
        estimated_hours: 4.0,
        sort_order: 1,
        default_assignee_role: 'departing_employee',
        requires_approval: true,
        approval_role: 'security_officer',
        documents: [
          {
            name: 'Administrative Access Inventory',
            document_type: 'checklist',
            is_mandatory: true,
          },
        ],
      },
      {
        name: 'Critical System Documentation',
        description: 'Document critical system configurations and procedures',
        instructions:
          'Create detailed documentation of system configurations, emergency procedures, and maintenance schedules.',
        category: 'documentation',
        estimated_hours: 10.0,
        sort_order: 2,
        default_assignee_role: 'departing_employee',
        requires_approval: true,
        approval_role: 'direct_manager',
        documents: [
          {
            name: 'System Configuration Guide',
            document_type: 'knowledge_base',
            is_mandatory: true,
          },
          {
            name: 'Emergency Response Procedures',
            document_type: 'procedure_guide',
            is_mandatory: true,
          },
        ],
      },
      {
        name: 'Security Credential Transfer',
        description: 'Secure transfer of security credentials and certificates',
        instructions:
          'Transfer security certificates, API keys, and other credentials through secure channels.',
        category: 'access_revocation',
        estimated_hours: 3.0,
        sort_order: 3,
        default_assignee_role: 'security_officer',
        requires_security_review: true,
        requires_evidence: true,
        evidence_types: ['confirmation', 'signature'],
      },
      {
        name: 'Backup and Recovery Verification',
        description: 'Verify backup systems and recovery procedures',
        instructions:
          'Test backup systems, verify recovery procedures, and ensure continuity of critical operations.',
        category: 'compliance',
        estimated_hours: 4.0,
        sort_order: 4,
        default_assignee_role: 'it_administrator',
        custom_assignee_role: 'Backup IT Administrator',
      },
      {
        name: 'Vendor and Support Contact Transfer',
        description: 'Transfer vendor relationships and support contacts',
        instructions:
          'Update vendor contacts, transfer support relationships, and document service agreements.',
        category: 'transition_planning',
        estimated_hours: 2.0,
        sort_order: 5,
        default_assignee_role: 'departing_employee',
        documents: [
          { name: 'Vendor Contact Directory', document_type: 'contact_list', is_mandatory: true },
        ],
      },
    ],
  },
];

async function createTaskOrientedTemplates(clientId = null, skipLogs = false) {
  if (!skipLogs) {
    console.log('🚀 Creating task-oriented offboarding templates...');
  }

  try {
    // If no clientId provided, get the first available client
    if (!clientId) {
      const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('id, code')
        .limit(1);

      if (clientError || !clients || clients.length === 0) {
        throw new Error('No clients found. Please run the base demo setup first.');
      }

      clientId = clients[0].id;
      if (!skipLogs) {
        console.log(`✅ Using client: ${clients[0].code} (${clientId})`);
      }
    }

    // Clear existing demo templates
    await supabase.from('offboarding_task_templates').delete().eq('client_id', clientId);

    await supabase.from('offboarding_document_templates').delete().eq('client_id', clientId);

    await supabase.from('offboarding_templates').delete().eq('client_id', clientId);

    console.log('🧹 Cleared existing offboarding templates');

    // Create templates
    for (const templateData of OFFBOARDING_TEMPLATES) {
      console.log(`📋 Creating template: ${templateData.name}`);

      // Extract tasks and documents before creating template
      const { tasks, ...templateInfo } = templateData;

      // Create template
      const { data: template, error: templateError } = await supabase
        .from('offboarding_templates')
        .insert({
          client_id: clientId,
          ...templateInfo,
          created_by: 'system-demo',
        })
        .select()
        .single();

      if (templateError) {
        console.error(`❌ Error creating template ${templateData.name}:`, templateError);
        continue;
      }

      console.log(`  ✅ Created template: ${template.id}`);

      // Create tasks for this template
      for (const taskData of tasks) {
        const { documents, ...taskInfo } = taskData;

        const { data: task, error: taskError } = await supabase
          .from('offboarding_task_templates')
          .insert({
            client_id: clientId,
            template_id: template.id,
            ...taskInfo,
          })
          .select()
          .single();

        if (taskError) {
          console.error(`❌ Error creating task ${taskData.name}:`, taskError);
          continue;
        }

        console.log(`    📝 Created task: ${task.name}`);

        // Create documents for this task
        if (documents && documents.length > 0) {
          for (const docData of documents) {
            const { error: docError } = await supabase
              .from('offboarding_document_templates')
              .insert({
                client_id: clientId,
                task_template_id: task.id,
                template_id: template.id,
                ...docData,
              });

            if (docError) {
              console.error(`❌ Error creating document ${docData.name}:`, docError);
            } else {
              console.log(`      📄 Created document: ${docData.name}`);
            }
          }
        }
      }

      console.log(`  ✅ Completed template: ${template.name} (${tasks.length} tasks)`);
    }

    console.log('✨ Successfully created all offboarding templates!');

    // Display summary
    const { data: templateCount } = await supabase
      .from('offboarding_templates')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId);

    const { data: taskCount } = await supabase
      .from('offboarding_task_templates')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId);

    const { data: docCount } = await supabase
      .from('offboarding_document_templates')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId);

    if (!skipLogs) {
      console.log('📊 Summary:');
      console.log(`  Templates: ${templateCount?.count || 0}`);
      console.log(`  Tasks: ${taskCount?.count || 0}`);
      console.log(`  Documents: ${docCount?.count || 0}`);
    }

    return {
      templates: templateCount?.count || 0,
      tasks: taskCount?.count || 0,
      documents: docCount?.count || 0,
    };
  } catch (error) {
    if (!skipLogs) {
      console.error('❌ Error creating offboarding templates:', error);
    }
    throw error;
  }
}

// Backwards compatibility
async function createOffboardingTemplates() {
  return await createTaskOrientedTemplates();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTaskOrientedTemplates();
}

export { createOffboardingTemplates, createTaskOrientedTemplates };
