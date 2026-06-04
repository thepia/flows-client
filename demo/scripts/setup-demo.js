#!/usr/bin/env node

/**
 * Demo Setup Script
 *
 * Creates comprehensive demo content for flows-client using Nets A/S as the example client.
 * Sets up realistic Nordic employee data with onboarding/offboarding workflows.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import { Command } from 'commander';
import { config } from 'dotenv';
import ora from 'ora';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

// Supabase client setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    chalk.red('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Load demo configuration files
 */
function loadDemoConfig() {
  const configPath = path.join(__dirname, '../config/client.json');
  const employeesPath = path.join(__dirname, '../data/employees.json');

  if (!fs.existsSync(configPath)) {
    throw new Error('Demo configuration file not found: ' + configPath);
  }

  if (!fs.existsSync(employeesPath)) {
    throw new Error('Demo employees file not found: ' + employeesPath);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const employees = JSON.parse(fs.readFileSync(employeesPath, 'utf8'));

  return { config, employees };
}

/**
 * Check if demo client already exists
 */
async function checkDemoClientExists(clientCode) {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/clients?select=client_code,id&client_code=eq.${clientCode}`,
      {
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.length > 0 ? data[0] : null;
  } catch (err) {
    throw new Error(`Database error: ${err.message}`);
  }
}

/**
 * Create demo client
 */
async function createDemoClient(clientConfig) {
  const clientData = {
    client_code: clientConfig.client_code,
    legal_name: clientConfig.legal_name,
    domain: clientConfig.domain,
    region: clientConfig.region,
    tier: clientConfig.tier,
    industry: clientConfig.industry,
    company_size: clientConfig.company_size,
    country_code: clientConfig.country_code,
    max_users: clientConfig.tier === 'pro' ? 1000 : 100,
    max_storage_gb: clientConfig.tier === 'pro' ? 10 : 1,
    settings: clientConfig.settings,
    features: clientConfig.features,
  };

  const response = await fetch(`${supabaseUrl}/rest/v1/clients`, {
    method: 'POST',
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(clientData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create demo client: HTTP ${response.status} - ${errorText}`);
  }

  const clients = await response.json();
  return clients[0];
}

/**
 * Create demo applications
 */
async function createDemoApplications(clientId, applications) {
  const createdApps = [];

  for (const appConfig of applications) {
    const applicationData = {
      client_id: clientId,
      app_code: appConfig.app_code,
      app_name: appConfig.app_name,
      app_version: appConfig.app_version,
      app_description: appConfig.app_description,
      configuration: appConfig.configuration,
      features: appConfig.features,
      permissions: appConfig.permissions,
      allowed_domains: appConfig.allowed_domains,
      cors_origins: appConfig.cors_origins,
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/client_applications`, {
      method: 'POST',
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(applicationData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create application ${appConfig.app_code}: HTTP ${response.status} - ${errorText}`
      );
    }

    const apps = await response.json();
    createdApps.push(apps[0]);
  }

  return createdApps;
}

/**
 * Generate JWT hash for invitation
 */
function generateJWTHash(invitationData) {
  const jwtPayload = {
    iss: 'api.thepia.com',
    aud: 'flows.thepia.net',
    sub: invitationData.id,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    iat: Math.floor(Date.now() / 1000),
    invitation: {
      invitee: {
        fullName: `${invitationData.firstName} ${invitationData.lastName}`,
        companyEmail: invitationData.companyEmail,
        privateEmail: invitationData.privateEmail,
      },
      position: invitationData.position,
      department: invitationData.department,
      type: invitationData.invitationType,
    },
  };

  // Create a mock JWT (in real implementation, this would be properly signed)
  const jwtString = JSON.stringify(jwtPayload);
  return crypto.createHash('sha256').update(jwtString).digest('hex');
}

/**
 * Create demo invitations
 */
async function createDemoInvitations(clientId, applications, employees) {
  const createdInvitations = [];

  // Get application IDs by code
  const appMap = {};
  applications.forEach((app) => {
    appMap[app.app_code] = app.id;
  });

  // Create invitations for employees with 'invited' or 'offboarding_initiated' status
  const invitationCandidates = employees.employees.filter(
    (emp) => emp.status === 'invited' || emp.status === 'offboarding_initiated'
  );

  for (const employee of invitationCandidates) {
    const invitationType = employee.status === 'invited' ? 'onboarding' : 'offboarding';
    const appId = appMap[invitationType];

    if (!appId) {
      console.warn(
        chalk.yellow(
          `⚠️ No ${invitationType} application found for employee ${employee.firstName} ${employee.lastName}`
        )
      );
      continue;
    }

    const invitationData = {
      id: `inv-${employee.id}`,
      firstName: employee.firstName,
      lastName: employee.lastName,
      companyEmail: employee.companyEmail,
      privateEmail: employee.privateEmail,
      position: employee.position,
      department: employee.department,
      invitationType: invitationType,
    };

    const jwtHash = generateJWTHash(invitationData);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const invitation = {
      client_id: clientId,
      app_id: appId,
      jwt_token_hash: jwtHash,
      permissions:
        invitationType === 'onboarding'
          ? ['document_upload', 'task_completion', 'training_access']
          : ['document_upload', 'equipment_return', 'exit_interview'],
      restrictions: {
        max_sessions: 5,
        allowed_locations: employee.location,
        business_hours_only: invitationType === 'offboarding',
      },
      expires_at: expiresAt.toISOString(),
      created_by: 'demo-system',
      client_data: {
        employee_id: employee.id,
        department: employee.department,
        manager: employee.manager,
        demo_invitation: true,
      },
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/invitations`, {
      method: 'POST',
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(invitation),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(
        chalk.yellow(
          `⚠️ Failed to create invitation for ${employee.firstName} ${employee.lastName}: ${errorText}`
        )
      );
      continue;
    }

    const invitations = await response.json();
    createdInvitations.push(invitations[0]);
  }

  return createdInvitations;
}

/**
 * Main demo setup function
 */
async function setupDemo(options = {}) {
  const spinner = ora('Setting up demo...').start();

  try {
    // Load demo configuration
    spinner.text = 'Loading demo configuration...';
    const { config, employees } = loadDemoConfig();
    const clientConfig = config.client;
    const applicationsConfig = config.applications;

    // Check if demo client already exists
    spinner.text = 'Checking for existing demo client...';
    const existingClient = await checkDemoClientExists(clientConfig.client_code);

    let client;
    if (existingClient && !options.force) {
      spinner.warn(`Demo client "${clientConfig.client_code}" already exists`);
      client = existingClient;
    } else {
      if (existingClient && options.force) {
        spinner.text = 'Removing existing demo client...';
        // Note: In a real implementation, you'd want to clean up existing data
        console.log(chalk.yellow('⚠️ Force mode: existing client will be updated'));
      }

      // Create demo client
      spinner.text = 'Creating demo client...';
      client = await createDemoClient(clientConfig);
      spinner.succeed(`Demo client "${clientConfig.client_code}" created successfully`);
    }

    // Create demo applications
    spinner.start('Creating demo applications...');
    const applications = await createDemoApplications(client.id, applicationsConfig);
    spinner.succeed(`Created ${applications.length} demo applications`);

    // Create demo invitations
    spinner.start('Creating demo invitations...');
    const invitations = await createDemoInvitations(client.id, applications, employees);
    spinner.succeed(`Created ${invitations.length} demo invitations`);

    // Display summary
    console.log(chalk.green.bold('\\n✅ Demo setup completed successfully!\\n'));
    console.log(chalk.cyan('📋 Demo Summary:'));
    console.log(`   Client:       ${chalk.white(client.legal_name)}`);
    console.log(`   Code:         ${chalk.white(client.client_code)}`);
    console.log(`   Domain:       ${chalk.white(client.domain)}`);
    console.log(`   Applications: ${chalk.white(applications.length)}`);
    console.log(`   Invitations:  ${chalk.white(invitations.length)}`);

    console.log(chalk.cyan('\\n📱 Applications:'));
    applications.forEach((app) => {
      console.log(`   • ${app.app_name} (${app.app_code})`);
    });

    console.log(chalk.cyan('\\n📧 Demo Invitations:'));
    invitations.forEach((inv) => {
      console.log(
        `   • ${inv.invitation_code} (expires: ${new Date(inv.expires_at).toLocaleDateString()})`
      );
    });

    console.log(chalk.yellow('\\n🔗 Next Steps:'));
    console.log(`   1. Run demo admin: ${chalk.green('pnpm run demo:admin')}`);
    console.log(`   2. View demo data in Supabase dashboard`);
    console.log(`   3. Test invitation flows`);
    console.log(`   4. Generate reports: ${chalk.green('pnpm run demo:analytics')}`);
    console.log('');
  } catch (error) {
    spinner.fail(`Demo setup failed: ${error.message}`);
    console.error(chalk.red(error.stack));
    process.exit(1);
  }
}

// CLI configuration
program
  .name('setup-demo')
  .description('Set up comprehensive demo content for flows-client')
  .version('1.0.0');

program
  .command('run')
  .description('Set up demo client, applications, and sample data')
  .option('--force', 'Force setup even if demo client exists')
  .option('--verbose', 'Show detailed output')
  .action(async (options) => {
    await setupDemo(options);
  });

program
  .command('status')
  .description('Check current demo setup status')
  .action(async () => {
    try {
      const { config } = loadDemoConfig();
      const client = await checkDemoClientExists(config.client.client_code);

      if (client) {
        console.log(chalk.green('✅ Demo client exists:'));
        console.log(`   Code: ${client.client_code}`);
        console.log(`   ID: ${client.id}`);
      } else {
        console.log(chalk.yellow('⚠️ Demo client not found'));
        console.log(chalk.blue('Run: pnpm run demo:setup run'));
      }
    } catch (error) {
      console.error(chalk.red('Error checking demo status:', error.message));
    }
  });

// Default to run command if no arguments
if (process.argv.length === 2) {
  setupDemo();
} else {
  program.parse();
}
