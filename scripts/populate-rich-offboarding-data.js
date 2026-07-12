#!/usr/bin/env node

/**
 * Populate Rich Offboarding Demo Data
 *
 * Creates varied, realistic offboarding processes with rich metadata
 * that makes the UI more interesting and demonstrates different scenarios
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  db: {
    schema: 'api',
  },
});

async function populateRichOffboardingData() {
  console.log('🎨 Creating rich offboarding demo data...');

  try {
    // Get hygge-hvidlog client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, client_code')
      .eq('client_code', 'hygge-hvidlog')
      .single();

    if (clientError || !client) {
      console.error('❌ Could not find hygge-hvidlog client:', clientError);
      return;
    }

    console.log('✅ Found client:', client.client_code);

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('offboarding_templates')
      .select('id, name')
      .eq('client_id', client.id)
      .single();

    if (templateError || !template) {
      console.error('❌ Could not find offboarding template:', templateError);
      return;
    }

    console.log('✅ Found template:', template.name);

    // Clear existing processes to avoid duplicates
    console.log('🧹 Clearing existing offboarding processes...');
    const { error: deleteError } = await supabase
      .from('offboarding_processes')
      .delete()
      .eq('client_id', client.id);

    if (deleteError) {
      console.warn('⚠️  Could not clear existing processes:', deleteError);
    }

    // Get people for offboarding (varied selection)
    const { data: people, error: peopleError } = await supabase
      .from('people')
      .select('id, person_code, first_name, last_name, department, position')
      .eq('client_id', client.id)
      .range(700, 849); // Get people 701-850 (150 people for offboarding)

    if (peopleError || !people || people.length === 0) {
      console.error('❌ Could not find people:', peopleError);
      return;
    }

    console.log(`✅ Found ${people.length} people for offboarding processes`);

    // Rich status and priority data (using valid constraint values)
    const statusData = [
      { status: 'draft', weight: 20, completion: [0, 10] },
      { status: 'pending_approval', weight: 15, completion: [10, 25] },
      { status: 'active', weight: 45, completion: [25, 85] },
      { status: 'overdue', weight: 10, completion: [15, 60] },
      { status: 'completed', weight: 10, completion: [95, 100] },
    ];

    const priorityData = [
      { priority: 'urgent', weight: 5, daysToComplete: [3, 7] },
      { priority: 'high', weight: 20, daysToComplete: [7, 14] },
      { priority: 'medium', weight: 50, daysToComplete: [14, 30] },
      { priority: 'low', weight: 25, daysToComplete: [30, 60] },
    ];

    // Offboarding reasons for variety
    const offboardingReasons = [
      'Resignation - New Opportunity',
      'Resignation - Career Change',
      'Resignation - Personal Reasons',
      'Termination - Performance',
      'Termination - Redundancy',
      'Contract Completion',
      'Retirement',
      'Internal Transfer',
    ];

    // Department-specific details
    const departmentNotes = {
      Engineering: [
        'Code review handover needed',
        'Access keys to revoke',
        'Technical documentation transfer',
      ],
      Product: [
        'Project roadmap handover',
        'Stakeholder communication needed',
        'User research data transfer',
      ],
      Design: ['Design system maintenance', 'Asset library handover', 'Brand guideline review'],
      Marketing: [
        'Campaign handover required',
        'Social media access removal',
        'Content calendar transfer',
      ],
      Sales: ['Client relationship transfer', 'Pipeline handover needed', 'CRM data cleanup'],
      HR: ['Employee records review', 'Compliance documentation', 'Policy updates needed'],
      Finance: [
        'Budget responsibility transfer',
        'Expense approvals setup',
        'Financial system access',
      ],
    };

    // Weighted random selection helper
    function weightedRandom(items) {
      const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
      let random = Math.random() * totalWeight;

      for (const item of items) {
        random -= item.weight;
        if (random <= 0) return item;
      }
      return items[0];
    }

    // Create rich offboarding processes
    const processes = [];

    for (let i = 0; i < people.length; i++) {
      const person = people[i];
      const statusInfo = weightedRandom(statusData);
      const priorityInfo = weightedRandom(priorityData);

      // Calculate completion percentage based on status
      const completion = Math.floor(
        Math.random() * (statusInfo.completion[1] - statusInfo.completion[0]) +
          statusInfo.completion[0]
      );

      // Calculate dates based on priority and status
      const daysToComplete = Math.floor(
        Math.random() * (priorityInfo.daysToComplete[1] - priorityInfo.daysToComplete[0]) +
          priorityInfo.daysToComplete[0]
      );

      const startDate = new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000); // Started 0-14 days ago
      const targetDate = new Date(startDate.getTime() + daysToComplete * 24 * 60 * 60 * 1000);

      // Add some completed processes with actual completion dates
      let actualCompletionDate = null;
      if (statusInfo.status === 'completed') {
        actualCompletionDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      }

      // Generate rich process name and notes
      const reason = offboardingReasons[Math.floor(Math.random() * offboardingReasons.length)];
      const deptNotes = departmentNotes[person.department] || ['Standard offboarding procedure'];
      const selectedNote = deptNotes[Math.floor(Math.random() * deptNotes.length)];

      // Task progress simulation
      const totalTasks = Math.floor(Math.random() * 8) + 5; // 5-12 tasks
      const completedTasks = Math.floor((completion / 100) * totalTasks);
      const overdueTasks =
        statusInfo.status === 'active' && Math.random() > 0.7 ? Math.floor(Math.random() * 2) : 0;

      // Determine seniority for more realistic data
      const seniorities = ['junior', 'mid', 'senior', 'lead', 'principal'];
      const seniority = seniorities[Math.floor(Math.random() * seniorities.length)];

      // Estimate hours based on role and seniority
      const baseHours = {
        junior: [20, 40],
        mid: [30, 60],
        senior: [40, 80],
        lead: [60, 100],
        principal: [80, 120],
      };
      const hourRange = baseHours[seniority] || [30, 60];
      const estimatedHours = Math.floor(
        Math.random() * (hourRange[1] - hourRange[0]) + hourRange[0]
      );

      // Manager assignment (some people don't have managers)
      const hasManager = Math.random() > 0.2; // 80% have managers
      const managerUid = hasManager ? `mgr-${Math.floor(Math.random() * 20) + 1}` : null;

      // Approval dates based on status
      let managerApproved = null;
      let hrApproved = null;
      let securityApproved = null;

      if (['active', 'completed'].includes(statusInfo.status)) {
        managerApproved = new Date(startDate.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000);
        if (Math.random() > 0.3) {
          // 70% get HR approval
          hrApproved = new Date(managerApproved.getTime() + Math.random() * 24 * 60 * 60 * 1000);
        }
        if (['Engineering', 'Product'].includes(person.department) && Math.random() > 0.5) {
          securityApproved = new Date(
            (hrApproved || managerApproved).getTime() + Math.random() * 24 * 60 * 60 * 1000
          );
        }
      }

      // Custom fields for rich data
      const customFields = {
        reason: reason,
        completion_percentage: completion,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        overdue_tasks: overdueTasks,
        handover_required: ['Engineering', 'Product', 'Design'].includes(person.department),
        equipment_return: Math.random() > 0.3,
        exit_interview_scheduled: statusInfo.status !== 'draft',
      };

      processes.push({
        client_id: client.id,
        template_id: template.id,
        employee_uid: person.person_code,
        employee_department: person.department,
        employee_role: person.position,
        employee_seniority: seniority,
        process_name: `${person.first_name} ${person.last_name} - ${reason}`,
        status: statusInfo.status,
        priority: priorityInfo.priority,
        target_completion_date: targetDate.toISOString(),
        actual_start_date: startDate.toISOString(),
        actual_completion_date: actualCompletionDate?.toISOString() || null,
        estimated_total_hours: estimatedHours,
        complexity_score: Math.floor(Math.random() * 5) + 1, // 1-5 scale
        manager_uid: managerUid,
        manager_approved_at: managerApproved?.toISOString() || null,
        manager_approved_by: managerApproved ? `${managerUid}-manager` : null,
        hr_approved_at: hrApproved?.toISOString() || null,
        hr_approved_by: hrApproved ? 'hr-team' : null,
        security_approved_at: securityApproved?.toISOString() || null,
        security_approved_by: securityApproved ? 'security-team' : null,
        notes: `${selectedNote}. Estimated ${estimatedHours}h total effort.`,
        custom_fields: customFields,
        created_by: 'demo-system',
      });
    }

    console.log(`🔄 Creating ${processes.length} rich offboarding processes...`);

    // Insert processes in batches
    const batchSize = 20;
    let totalCreated = 0;

    for (let i = 0; i < processes.length; i += batchSize) {
      const batch = processes.slice(i, i + batchSize);

      try {
        const { data: createdProcesses, error: processError } = await supabase
          .from('offboarding_processes')
          .insert(batch)
          .select('id, process_name, status, priority');

        if (processError) {
          console.log(`❌ Batch ${Math.floor(i / batchSize) + 1}: ${processError.message}`);
        } else {
          totalCreated += createdProcesses.length;
          console.log(
            `✅ Batch ${Math.floor(i / batchSize) + 1}: Created ${createdProcesses.length} processes`
          );

          // Show sample of created processes
          if (i === 0) {
            console.log('   📋 Sample processes:');
            createdProcesses.slice(0, 3).forEach((p) => {
              console.log(`      • ${p.process_name} (${p.status}, ${p.priority})`);
            });
          }
        }
      } catch (e) {
        console.log(`❌ Batch ${Math.floor(i / batchSize) + 1}: ${e.message}`);
      }
    }

    console.log(`\n🎉 Successfully created ${totalCreated} rich offboarding processes!`);

    // Summary of created data
    const statusCounts = {};
    const priorityCounts = {};

    processes.forEach((p) => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      priorityCounts[p.priority] = (priorityCounts[p.priority] || 0) + 1;
    });

    console.log('\n📊 Data variety summary:');
    console.log('   Status distribution:', statusCounts);
    console.log('   Priority distribution:', priorityCounts);
    console.log('   Reasons included:', offboardingReasons.length, 'different reasons');
    console.log(
      '   Department-specific notes for',
      Object.keys(departmentNotes).length,
      'departments'
    );

    console.log('\n✅ Rich demo data should now display properly in the UI!');
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

// Run the population
populateRichOffboardingData();
