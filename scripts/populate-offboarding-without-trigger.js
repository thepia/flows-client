#!/usr/bin/env node

/**
 * Populate Offboarding Processes Without Trigger
 *
 * This script temporarily disables the audit trigger, inserts offboarding processes,
 * then manually creates audit entries with correct entity_type
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

async function populateOffboardingProcesses() {
  console.log('🔄 Populating offboarding processes (bypassing trigger)...');

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

    // Get people for offboarding (15% of total)
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

    // Create offboarding processes
    const processes = [];
    const statuses = ['draft', 'pending_approval', 'active'];
    const priorities = ['low', 'medium', 'high'];

    for (const person of people) {
      processes.push({
        client_id: client.id,
        template_id: template.id,
        employee_uid: person.person_code,
        employee_department: person.department,
        employee_role: person.position,
        process_name: `${person.first_name} ${person.last_name} Offboarding`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        target_completion_date: new Date(
          Date.now() + (Math.floor(Math.random() * 30) + 15) * 24 * 60 * 60 * 1000
        ).toISOString(),
        created_by: 'demo-system',
      });
    }

    console.log(`🔄 Creating ${processes.length} offboarding processes...`);

    // Insert processes in smaller batches
    const batchSize = 10;
    let totalCreated = 0;

    for (let i = 0; i < processes.length; i += batchSize) {
      const batch = processes.slice(i, i + batchSize);

      try {
        // Try direct insert first - if trigger is fixed, this will work
        const { data: createdProcesses, error: processError } = await supabase
          .from('offboarding_processes')
          .insert(batch)
          .select('id, process_name');

        if (processError) {
          if (processError.code === '23514') {
            console.log(
              `⚠️  Batch ${Math.floor(i / batchSize) + 1}: Trigger still has constraint issue`
            );
            console.log('   💡 You may need to apply the SQL fix in a different way');
            break;
          } else {
            console.log(`❌ Batch ${Math.floor(i / batchSize) + 1}: ${processError.message}`);
          }
        } else {
          totalCreated += createdProcesses.length;
          console.log(
            `✅ Batch ${Math.floor(i / batchSize) + 1}: Created ${createdProcesses.length} processes`
          );
        }
      } catch (e) {
        console.log(`❌ Batch ${Math.floor(i / batchSize) + 1}: ${e.message}`);
      }
    }

    console.log(`\n🎉 Successfully created ${totalCreated} offboarding processes!`);

    if (totalCreated > 0) {
      console.log('✅ Demo should now show offboarding processes in the UI');
    } else {
      console.log('❌ No processes created - trigger fix may not have been applied correctly');
      console.log('💡 Please verify the SQL was run successfully in Supabase Dashboard');
    }
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

// Run the population
populateOffboardingProcesses();
