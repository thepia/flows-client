#!/usr/bin/env node

/**
 * Add Applications to All Demo Clients
 *
 * This script ensures all demo clients have at least one application defined.
 * Run this after setting up the initial demo clients to ensure every client
 * can display application tabs.
 *
 * Usage: node scripts/add-applications-to-demo-clients.js
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: { schema: 'api' },
});

async function addApplicationsToDemoClients() {
  console.log('🚀 Adding applications to all demo clients...\n');

  try {
    // Define applications for each client type
    const clientApplications = [
      {
        clientCode: 'demo-tech',
        apps: [
          {
            app_code: 'tech-onboarding',
            app_name: 'Tech Team Onboarding',
            app_version: '2.5.0',
            app_description: 'Specialized onboarding for technical roles with coding assessments',
            status: 'active',
            configuration: {
              theme: 'tech',
              locale: 'en-US',
              features: {
                code_assessment: true,
                github_integration: true,
              },
            },
            features: [
              'technical-assessments',
              'github-integration',
              'equipment-tracking',
              'security-clearance',
            ],
            max_concurrent_users: 100,
          },
          {
            app_code: 'tech-offboarding',
            app_name: 'Secure Tech Offboarding',
            app_version: '2.2.0',
            app_description: 'Security-focused offboarding for technical staff',
            status: 'active',
            configuration: {
              theme: 'tech',
              locale: 'en-US',
              security_focused: true,
            },
            features: ['access-revocation', 'code-review', 'knowledge-transfer', 'security-audit'],
            max_concurrent_users: 100,
          },
        ],
      },
      {
        clientCode: 'test-solutions',
        apps: [
          {
            app_code: 'enterprise-onboarding',
            app_name: 'Enterprise Onboarding Suite',
            app_version: '4.0.1',
            app_description: 'Comprehensive enterprise onboarding with compliance tracking',
            status: 'active',
            configuration: {
              theme: 'corporate',
              locale: 'en-GB',
              compliance: {
                gdpr: true,
                sox: true,
              },
            },
            features: [
              'compliance-tracking',
              'multi-department',
              'role-based-access',
              'audit-trail',
            ],
            max_concurrent_users: 1000,
          },
          {
            app_code: 'enterprise-offboarding',
            app_name: 'Enterprise Exit Management',
            app_version: '3.8.0',
            app_description: 'Enterprise-grade offboarding with legal compliance',
            status: 'active',
            configuration: {
              theme: 'corporate',
              locale: 'en-GB',
              legal_compliance: true,
            },
            features: [
              'legal-compliance',
              'data-retention',
              'audit-reports',
              'automated-workflows',
            ],
            max_concurrent_users: 1000,
          },
        ],
      },
      {
        clientCode: 'sample-industries',
        apps: [
          {
            app_code: 'basic-onboarding',
            app_name: 'Basic Onboarding',
            app_version: '1.0.0',
            app_description: 'Simple onboarding process for small teams',
            status: 'active',
            configuration: {
              theme: 'default',
              locale: 'en-US',
            },
            features: ['document-upload', 'basic-tasks', 'email-notifications'],
            max_concurrent_users: 25,
          },
        ],
      },
      {
        clientCode: 'demo-healthcare',
        apps: [
          {
            app_code: 'healthcare-onboarding',
            app_name: 'Healthcare Staff Onboarding',
            app_version: '3.1.0',
            app_description:
              'Specialized onboarding for healthcare professionals with credential verification',
            status: 'active',
            configuration: {
              theme: 'healthcare',
              locale: 'en-US',
              features: {
                credential_verification: true,
                hipaa_compliance: true,
              },
            },
            features: [
              'credential-verification',
              'hipaa-training',
              'department-rotation',
              'mentor-assignment',
            ],
            max_concurrent_users: 500,
          },
          {
            app_code: 'healthcare-offboarding',
            app_name: 'Healthcare Departure Process',
            app_version: '2.9.0',
            app_description: 'Compliant offboarding for healthcare staff',
            status: 'active',
            configuration: {
              theme: 'healthcare',
              locale: 'en-US',
              hipaa_compliant: true,
            },
            features: [
              'patient-handover',
              'credential-removal',
              'compliance-checklist',
              'exit-documentation',
            ],
            max_concurrent_users: 500,
          },
        ],
      },
      {
        clientCode: 'test-mfg',
        apps: [
          {
            app_code: 'factory-onboarding',
            app_name: 'Factory Worker Onboarding',
            app_version: '2.0.0',
            app_description: 'Safety-focused onboarding for manufacturing facilities',
            status: 'active',
            configuration: {
              theme: 'industrial',
              locale: 'en-US',
              safety_focused: true,
            },
            features: [
              'safety-training',
              'equipment-certification',
              'shift-assignment',
              'ppe-tracking',
            ],
            max_concurrent_users: 200,
          },
          {
            app_code: 'factory-offboarding',
            app_name: 'Manufacturing Exit Process',
            app_version: '1.8.0',
            app_description: 'Equipment return and safety compliance for departing workers',
            status: 'active',
            configuration: {
              theme: 'industrial',
              locale: 'en-US',
              equipment_tracking: true,
            },
            features: [
              'equipment-return',
              'safety-clearance',
              'tool-inventory',
              'final-inspection',
            ],
            max_concurrent_users: 200,
          },
        ],
      },
      {
        clientCode: 'nets-demo',
        apps: [
          {
            app_code: 'standard-onboarding',
            app_name: 'Standard Onboarding',
            app_version: '2.0.0',
            app_description: 'Standard employee onboarding process',
            status: 'active',
            configuration: {
              theme: 'default',
              locale: 'en-US',
            },
            features: ['document-management', 'task-tracking', 'email-notifications', 'reporting'],
            max_concurrent_users: 100,
          },
          {
            app_code: 'standard-offboarding',
            app_name: 'Standard Offboarding',
            app_version: '2.0.0',
            app_description: 'Standard employee offboarding process',
            status: 'active',
            configuration: {
              theme: 'default',
              locale: 'en-US',
            },
            features: [
              'checklist-management',
              'asset-return',
              'knowledge-transfer',
              'exit-interview',
            ],
            max_concurrent_users: 100,
          },
        ],
      },
    ];

    // Process each client
    for (const clientConfig of clientApplications) {
      console.log(`\n📦 Processing ${clientConfig.clientCode}...`);

      // Get client ID
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, legal_name')
        .eq('client_code', clientConfig.clientCode)
        .single();

      if (clientError || !client) {
        console.warn(`⚠️  Client ${clientConfig.clientCode} not found, skipping...`);
        continue;
      }

      console.log(`✅ Found client: ${client.legal_name}`);

      // Add applications
      for (const app of clientConfig.apps) {
        const { data: existingApp } = await supabase
          .from('client_applications')
          .select('id')
          .eq('client_id', client.id)
          .eq('app_code', app.app_code)
          .single();

        if (existingApp) {
          console.log(`   ↩️  ${app.app_name} already exists, updating...`);

          const { error: updateError } = await supabase
            .from('client_applications')
            .update({
              app_name: app.app_name,
              app_version: app.app_version,
              app_description: app.app_description,
              status: app.status,
              configuration: app.configuration,
              features: app.features,
              max_concurrent_users: app.max_concurrent_users,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingApp.id);

          if (updateError) {
            console.error(`   ❌ Error updating ${app.app_name}:`, updateError.message);
          } else {
            console.log(`   ✅ Updated ${app.app_name}`);
          }
        } else {
          const { error: insertError } = await supabase.from('client_applications').insert({
            client_id: client.id,
            ...app,
            created_at: new Date().toISOString(),
          });

          if (insertError) {
            console.error(`   ❌ Error creating ${app.app_name}:`, insertError.message);
          } else {
            console.log(`   ✅ Created ${app.app_name}`);
          }
        }
      }
    }

    // Create Nets Demo client if it doesn't exist
    console.log('\n📦 Checking for Nets Demo client...');
    const { data: netsClient, error: netsError } = await supabase
      .from('clients')
      .select('id')
      .eq('client_code', 'nets-demo')
      .single();

    if (netsError || !netsClient) {
      console.log('Creating Nets Demo client...');
      const { error: createError } = await supabase.from('clients').insert({
        legal_name: 'Nets Demo Company',
        client_code: 'nets-demo',
        domain: 'nets-demo.com',
        tier: 'enterprise',
        status: 'active',
        region: 'EU',
      });

      if (createError) {
        console.error('❌ Error creating Nets Demo client:', createError.message);
      } else {
        console.log('✅ Created Nets Demo client');
      }
    }

    // Display summary
    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');

    const { data: allClients } = await supabase
      .from('clients')
      .select('client_code, legal_name')
      .in('client_code', [
        'demo-tech',
        'test-solutions',
        'sample-industries',
        'demo-healthcare',
        'test-mfg',
        'nets-demo',
        'hygge-hvidlog',
        'meridian-brands',
      ])
      .order('client_code');

    if (allClients) {
      for (const client of allClients) {
        const { count } = await supabase
          .from('client_applications')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', client.id);

        console.log(`${client.client_code} (${client.legal_name}): ${count || 0} applications`);
      }
    }

    console.log('\n✅ All demo clients now have applications!');
    console.log('\n💡 To use this in the app:');
    console.log(
      '1. The SQL script has been created at: schemas/10_add_applications_to_all_demo_clients.sql'
    );
    console.log('2. Run it in your Supabase SQL editor');
    console.log('3. Or use this script which does the same thing programmatically');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
addApplicationsToDemoClients();
