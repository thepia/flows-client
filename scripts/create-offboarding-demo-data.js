#!/usr/bin/env node

/**
 * Create Demo Data for Offboarding System
 *
 * This script creates demo offboarding workflows, knowledge transfer items,
 * compliance checks, and credit balances for testing the system.
 */

import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client with API schema
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  db: {
    schema: 'api',
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function cleanupOffboardingData(clientId) {
  // Delete in order to respect foreign key constraints
  const tables = [
    // Task-oriented offboarding tables (new system) - these should exist
    'offboarding_audit_log',
    'offboarding_documents',
    'offboarding_tasks',
    'offboarding_processes',
    'offboarding_document_templates',
    'offboarding_task_templates',
    'offboarding_templates',
    // Legacy shadow offboarding tables commented out as they may not exist
    // 'workflow_credit_usage',
    // 'offboarding_communications',
    // 'offboarding_compliance_checks',
    // 'knowledge_transfer_items',
    // 'offboarding_workflows',
    // 'credit_transactions',
    // 'client_credit_balances'
  ];

  for (const table of tables) {
    try {
      await supabase.from(table).delete().eq('client_id', clientId);
    } catch (_error) {}
  }
}

async function createDemoData(clientId = null, skipLogs = false) {
  if (!skipLogs) {
    console.log(chalk.blue.bold('🚀 Creating Offboarding Demo Data\n'));
  }

  try {
    // If no clientId provided, get the demo client
    if (!clientId) {
      const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('id, client_code')
        .limit(1);

      if (clientError) throw clientError;
      if (!clients || clients.length === 0) {
        throw new Error('No clients found. Please run the base demo setup first.');
      }

      clientId = clients[0].id;
      if (!skipLogs) {
        console.log(chalk.green(`✅ Found client: ${clients[0].client_code} (${clientId})`));
      }
    }

    // Clean up existing offboarding data for this client
    if (!skipLogs) {
      console.log(chalk.blue('\n🧹 Cleaning up existing offboarding data...'));
    }
    await cleanupOffboardingData(clientId);

    // Create credit balance for the client (if table exists)
    try {
      if (!skipLogs) {
        console.log(chalk.blue('\n📊 Setting up credit balance...'));
      }
      const { error: balanceError } = await supabase.from('client_credit_balances').upsert({
        client_id: clientId,
        total_purchased: 100,
        total_used: 15,
        total_refunded: 0,
        total_adjustments: 0,
        reserved_credits: 3,
        low_balance_threshold: 10,
        critical_balance_threshold: 5,
        auto_replenish_enabled: false,
        auto_replenish_threshold: 5,
        auto_replenish_amount: 50,
        total_spent: 17500,
        first_purchase_date: '2024-01-15',
        last_purchase_at: '2024-06-15T10:30:00Z',
        last_usage_at: '2024-06-27T14:20:00Z',
      });

      if (balanceError) throw balanceError;
      if (!skipLogs) {
        console.log(chalk.green('✅ Credit balance created'));
      }
    } catch (_error) {
      if (!skipLogs) {
        console.log(chalk.yellow('⚠️ Credit balance table not found - skipping'));
      }
    }

    // Create demo offboarding workflows (if tables exist)
    let createdWorkflows = [];
    try {
      if (!skipLogs) {
        console.log(chalk.blue('\n👥 Creating demo offboarding workflows...'));
      }

      const workflows = [
        {
          client_id: clientId,
          employee_uid: 'emp_001_anonymous',
          status: 'knowledge_transfer',
          priority: 'high',
          expected_last_day: '2024-07-15',
          knowledge_transfer_deadline: '2024-07-10',
          final_completion_deadline: '2024-08-15',
          department_category: 'technical',
          seniority_level: 'senior',
          workflow_complexity: 'complex',
          estimated_knowledge_transfer_hours: 16,
          number_of_direct_reports: 2,
          number_of_key_relationships: 5,
          has_critical_system_knowledge: true,
          has_client_relationships: true,
          has_specialized_processes: true,
          credit_consumed: true,
          credit_amount: 175.0,
          created_by: 'demo_system',
        },
        {
          client_id: clientId,
          employee_uid: 'emp_002_anonymous',
          status: 'coordination',
          priority: 'standard',
          expected_last_day: '2024-07-30',
          knowledge_transfer_deadline: '2024-07-25',
          final_completion_deadline: '2024-08-30',
          department_category: 'sales',
          seniority_level: 'mid_level',
          workflow_complexity: 'standard',
          estimated_knowledge_transfer_hours: 8,
          number_of_direct_reports: 0,
          number_of_key_relationships: 8,
          has_client_relationships: true,
          has_vendor_relationships: true,
          credit_consumed: true,
          credit_amount: 175.0,
          created_by: 'demo_system',
        },
        {
          client_id: clientId,
          employee_uid: 'emp_003_anonymous',
          status: 'initiated',
          priority: 'urgent',
          expected_last_day: '2024-07-05',
          knowledge_transfer_deadline: '2024-07-03',
          final_completion_deadline: '2024-08-05',
          department_category: 'leadership',
          seniority_level: 'executive',
          workflow_complexity: 'executive',
          estimated_knowledge_transfer_hours: 24,
          number_of_direct_reports: 8,
          number_of_key_relationships: 15,
          has_critical_system_knowledge: true,
          has_client_relationships: true,
          has_vendor_relationships: true,
          has_team_leadership_responsibilities: true,
          requires_legal_review: true,
          requires_client_notification: true,
          credit_consumed: false,
          credit_amount: 350.0, // Emergency rate
          created_by: 'demo_system',
        },
      ];

      const { data: createdWorkflows, error: workflowError } = await supabase
        .from('offboarding_workflows')
        .insert(workflows)
        .select();

      if (workflowError) throw workflowError;
      if (!skipLogs) {
        console.log(chalk.green(`✅ Created ${createdWorkflows.length} demo workflows`));
      }

      // Create knowledge transfer items for the first workflow
      if (createdWorkflows.length > 0) {
        if (!skipLogs) {
          console.log(chalk.blue('\n📚 Creating knowledge transfer items...'));
        }

        const knowledgeItems = [
          {
            offboarding_workflow_id: createdWorkflows[0].id,
            knowledge_type: 'system_knowledge',
            title: 'Legacy Authentication System',
            description:
              'Critical knowledge about the custom authentication system that handles enterprise SSO integration.',
            business_impact: 'critical',
            urgency: 'high',
            successor_role: 'Senior Backend Engineer',
            successor_identified: true,
            documentation_status: 'in_progress',
            handover_session_required: true,
            handover_session_scheduled: true,
            estimated_hours: 6.0,
            has_written_documentation: true,
            has_process_diagrams: true,
            target_completion_date: '2024-07-08',
          },
          {
            offboarding_workflow_id: createdWorkflows[0].id,
            knowledge_type: 'client_relationships',
            title: 'Enterprise Client Technical Contacts',
            description:
              'Key technical contacts and escalation procedures for top 5 enterprise clients.',
            business_impact: 'high',
            urgency: 'immediate',
            successor_role: 'Solutions Architect',
            successor_identified: false,
            documentation_status: 'pending',
            handover_session_required: true,
            estimated_hours: 4.0,
            requires_client_introduction: true,
            has_contact_lists: true,
            target_completion_date: '2024-07-05',
          },
          {
            offboarding_workflow_id: createdWorkflows[1].id,
            knowledge_type: 'process_documentation',
            title: 'Sales Pipeline Management Process',
            description: 'Complete sales process from lead qualification to contract signature.',
            business_impact: 'medium',
            urgency: 'standard',
            successor_role: 'Senior Sales Representative',
            successor_identified: true,
            documentation_status: 'completed',
            handover_session_required: true,
            handover_session_completed: true,
            documentation_reviewed: true,
            knowledge_verified: true,
            estimated_hours: 3.0,
            actual_hours: 2.5,
            actual_completion_date: '2024-06-25',
            has_written_documentation: true,
            has_process_diagrams: false,
          },
        ];

        const { error: knowledgeError } = await supabase
          .from('knowledge_transfer_items')
          .insert(knowledgeItems);

        if (knowledgeError) throw knowledgeError;
        if (!skipLogs) {
          console.log(chalk.green(`✅ Created ${knowledgeItems.length} knowledge transfer items`));
        }
      }

      // Create compliance checks
      if (!skipLogs) {
        console.log(chalk.blue('\n🛡️ Creating compliance checks...'));
      }

      const complianceChecks = [
        {
          offboarding_workflow_id: createdWorkflows[0].id,
          compliance_type: 'exit_interview',
          criticality: 'important',
          status: 'completed',
          responsible_party: 'hr_department',
          completion_evidence: 'Exit interview conducted via video call on 2024-06-20',
          verified_by: 'hr_manager',
          verification_date: '2024-06-20',
          completed_date: '2024-06-20',
          due_date: '2024-07-15',
        },
        {
          offboarding_workflow_id: createdWorkflows[0].id,
          compliance_type: 'knowledge_transfer_verification',
          criticality: 'critical',
          status: 'in_progress',
          responsible_party: 'engineering_manager',
          due_date: '2024-07-10',
          non_compliance_risk: 'high',
          business_impact_if_missed:
            'Loss of critical system knowledge could impact production support',
          depends_on_employer_systems: false,
        },
        {
          offboarding_workflow_id: createdWorkflows[1].id,
          compliance_type: 'client_notification_completion',
          criticality: 'critical',
          status: 'pending',
          responsible_party: 'account_manager',
          due_date: '2024-07-23',
          non_compliance_risk: 'medium',
          business_impact_if_missed: 'Client relationships may be impacted without proper handover',
        },
        {
          offboarding_workflow_id: createdWorkflows[2].id,
          compliance_type: 'security_clearance_review',
          criticality: 'critical',
          status: 'pending',
          responsible_party: 'security_department',
          due_date: '2024-07-05',
          non_compliance_risk: 'severe',
          business_impact_if_missed: 'Executive access privileges must be revoked immediately',
          legal_impact_if_missed: 'Regulatory compliance failure if access not properly revoked',
        },
      ];

      const { error: complianceError } = await supabase
        .from('offboarding_compliance_checks')
        .insert(complianceChecks);

      if (complianceError) throw complianceError;
      if (!skipLogs) {
        console.log(chalk.green(`✅ Created ${complianceChecks.length} compliance checks`));
      }

      // Create some communication records
      if (!skipLogs) {
        console.log(chalk.blue('\n📞 Creating communication records...'));
      }

      const communications = [
        {
          offboarding_workflow_id: createdWorkflows[0].id,
          communication_type: 'knowledge_handover_meeting',
          scheduled_date: '2024-07-08',
          scheduled_time: '14:00:00',
          duration_minutes: 120,
          meeting_platform: 'zoom',
          participant_roles: ['departing_employee', 'successor', 'engineering_manager'],
          facilitator_role: 'engineering_manager',
          status: 'scheduled',
          agenda_provided: true,
          preparation_materials_sent: true,
        },
        {
          offboarding_workflow_id: createdWorkflows[1].id,
          communication_type: 'client_notification_call',
          scheduled_date: '2024-07-20',
          scheduled_time: '10:00:00',
          duration_minutes: 60,
          meeting_platform: 'teams',
          participant_roles: ['departing_employee', 'account_manager', 'client_representative'],
          facilitator_role: 'account_manager',
          status: 'confirmed',
          requires_client_participation: true,
        },
      ];

      const { error: communicationError } = await supabase
        .from('offboarding_communications')
        .insert(communications);

      if (communicationError) throw communicationError;
      if (!skipLogs) {
        console.log(chalk.green(`✅ Created ${communications.length} communication records`));

        console.log(chalk.green.bold('\n🎉 Demo data creation completed successfully!'));
        console.log(chalk.blue('\n📋 What was created:'));
        console.log(
          chalk.white(`   • Client credit balance: 85 available credits (100 purchased - 15 used)`)
        );
        console.log(
          chalk.white(`   • ${createdWorkflows.length} offboarding workflows in different stages`)
        );
        console.log(chalk.white(`   • 3 knowledge transfer items with varying completion status`));
        console.log(chalk.white(`   • 4 compliance checks across different criticality levels`));
        console.log(chalk.white(`   • 2 scheduled communications/meetings`));

        console.log(chalk.blue.bold('\n🚀 Next Steps:'));
        console.log(chalk.white('   1. Run: pnpm run demo:admin'));
        console.log(chalk.white('   2. Navigate to the "Offboarding" tab'));
        console.log(
          chalk.white('   3. Explore the workflows, knowledge transfer, and compliance tracking')
        );
        console.log(chalk.white('   4. Test creating new workflows and updating statuses\n'));
      }
    } catch (_error) {
      if (!skipLogs) {
        console.log(
          chalk.yellow('⚠️ Legacy offboarding tables not found - skipping workflow creation')
        );
      }
      createdWorkflows = [];
    }

    // Create task-oriented offboarding templates (if tables exist)
    let taskTemplatesCount = 0;
    try {
      if (!skipLogs) {
        console.log(chalk.blue('\n📋 Creating task-oriented offboarding templates...'));
      }

      const { createTaskOrientedTemplates } = await import(
        './create-offboarding-templates-demo.js'
      );
      const templateResults = await createTaskOrientedTemplates(clientId, skipLogs);
      taskTemplatesCount = templateResults?.templates || 0;

      if (!skipLogs && taskTemplatesCount > 0) {
        console.log(chalk.green(`✅ Created ${taskTemplatesCount} task-oriented templates`));
      }
    } catch (_error) {
      if (!skipLogs) {
        console.log(
          chalk.yellow('⚠️ Task-oriented templates not created (tables may not exist yet)')
        );
      }
    }

    return {
      taskTemplates: taskTemplatesCount,
      workflows: createdWorkflows.length,
      knowledgeItems: createdWorkflows.length > 0 ? 3 : 0,
      complianceChecks: createdWorkflows.length > 0 ? 4 : 0,
      communications: createdWorkflows.length > 0 ? 2 : 0,
      creditBalance: 85,
    };
  } catch (error) {
    if (!skipLogs) {
      console.error(chalk.red('❌ Error creating demo data:'), error);
      console.log(
        chalk.yellow('\n💡 This usually means the offboarding tables are not created yet.')
      );
      console.log(chalk.blue('Please run the SQL schema files first:'));
      console.log(chalk.white('   1. Open Supabase Dashboard > SQL Editor'));
      console.log(chalk.white('   2. Execute schemas/10_shadow_offboarding_workflows.sql'));
      console.log(chalk.white('   3. Execute schemas/11_credit_system_offboarding.sql'));
      console.log(chalk.white('   4. Then run this script again\n'));
    }
    throw error; // Re-throw for calling function to handle
  }
}

runDemoData().catch((error) => {
  console.error(chalk.red('Demo data creation failed:'), error);
  process.exit(1);
});

async function runDemoData() {
  await createDemoData();
}

// Also export for use in demo:complete script
export { cleanupOffboardingData, createDemoData };
