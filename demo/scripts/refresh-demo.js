#!/usr/bin/env node

/**
 * Demo Refresh Script
 *
 * Updates demo content with new scenarios, evolves employee statuses,
 * and generates fresh invitations to keep the demo realistic and current.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

const _supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Load demo configuration
 */
function loadDemoConfig() {
  const configPath = path.join(__dirname, '../config/client.json');
  const employeesPath = path.join(__dirname, '../data/employees.json');

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const employees = JSON.parse(fs.readFileSync(employeesPath, 'utf8'));

  return { config, employees };
}

/**
 * Get demo client information
 */
async function getDemoClient(clientCode) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/clients?select=*&client_code=eq.${clientCode}`,
    {
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get demo client: HTTP ${response.status}`);
  }

  const clients = await response.json();
  return clients.length > 0 ? clients[0] : null;
}

/**
 * Get demo applications
 */
async function getDemoApplications(clientId) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/client_applications?select=*&client_id=eq.${clientId}`,
    {
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get demo applications: HTTP ${response.status}`);
  }

  return await response.json();
}

/**
 * Clean up expired invitations
 */
async function cleanupExpiredInvitations(clientId) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/invitations?client_id=eq.${clientId}&status=eq.pending&expires_at=lt.${new Date().toISOString()}`,
    {
      method: 'PATCH',
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'expired' }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to cleanup expired invitations: HTTP ${response.status}`);
  }

  return response;
}

/**
 * Evolve employee scenarios
 */
function evolveEmployeeScenarios(employees) {
  const scenarios = [
    // Promote pending employees to active
    {
      condition: (emp) => emp.status === 'pending' && Math.random() > 0.7,
      update: (emp) => {
        emp.status = 'active';
        emp.onboarding.completed = true;
        emp.onboarding.completionDate = new Date().toISOString();
        emp.onboarding.completionPercentage = 100;
        return { action: 'completed_onboarding', employee: emp };
      },
    },

    // Move some active employees to offboarding
    {
      condition: (emp) => emp.status === 'active' && Math.random() > 0.9,
      update: (emp) => {
        emp.status = 'offboarding_initiated';
        emp.offboarding = {
          initiated: true,
          initiatedDate: new Date().toISOString(),
          reason: Math.random() > 0.5 ? 'voluntary_resignation' : 'position_elimination',
          exitInterviewCompleted: false,
          knowledgeTransferCompleted: false,
          equipmentReturned: false,
          accessRevoked: false,
          finalPayroll: false,
        };
        return { action: 'initiated_offboarding', employee: emp };
      },
    },

    // Complete offboarding for those in progress
    {
      condition: (emp) => emp.status === 'offboarding_initiated' && Math.random() > 0.6,
      update: (emp) => {
        emp.status = 'offboarded';
        emp.endDate = new Date().toISOString();
        if (emp.offboarding) {
          emp.offboarding.completed = true;
          emp.offboarding.completionDate = new Date().toISOString();
          emp.offboarding.exitInterviewCompleted = true;
          emp.offboarding.knowledgeTransferCompleted = true;
          emp.offboarding.equipmentReturned = true;
          emp.offboarding.accessRevoked = true;
          emp.offboarding.finalPayroll = true;
        }
        return { action: 'completed_offboarding', employee: emp };
      },
    },

    // Add new invitations
    {
      condition: (emp) => emp.status === 'invited' && Math.random() > 0.8,
      update: (emp) => {
        // Keep as invited, will generate new invitation
        return { action: 'refresh_invitation', employee: emp };
      },
    },
  ];

  const updates = [];

  for (const employee of employees) {
    for (const scenario of scenarios) {
      if (scenario.condition(employee)) {
        const update = scenario.update(employee);
        updates.push(update);
      }
    }
  }

  return updates;
}

/**
 * Generate demo invitations for new scenarios
 */
async function generateNewInvitations(clientId, applications, _employees, updates) {
  const appMap = {};
  for (const app in applications) {
    appMap[app.app_code] = app.id;
  }

  const newInvitations = [];

  // Create invitations for employees who need them
  const invitationNeeded = updates.filter(
    (update) =>
      update.action === 'initiated_offboarding' ||
      update.action === 'refresh_invitation' ||
      update.employee.status === 'invited'
  );

  for (const update of invitationNeeded) {
    const employee = update.employee;
    const invitationType = employee.status === 'invited' ? 'onboarding' : 'offboarding';
    const appId = appMap[invitationType];

    if (!appId) continue;

    const jwtPayload = {
      iss: 'api.thepia.com',
      aud: 'flows.thepia.net',
      sub: `inv-${employee.id}-${Date.now()}`,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      iat: Math.floor(Date.now() / 1000),
      invitation: {
        invitee: {
          fullName: `${employee.firstName} ${employee.lastName}`,
          companyEmail: employee.companyEmail,
          privateEmail: employee.privateEmail,
        },
        position: employee.position,
        department: employee.department,
        type: invitationType,
      },
    };

    const jwtHash = crypto.createHash('sha256').update(JSON.stringify(jwtPayload)).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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
        scenario_type: update.action,
        refresh_date: new Date().toISOString(),
      },
      expires_at: expiresAt.toISOString(),
      created_by: 'demo-refresh-system',
      client_data: {
        employee_id: employee.id,
        department: employee.department,
        manager: employee.manager,
        demo_invitation: true,
        scenario: update.action,
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

    if (response.ok) {
      const invitations = await response.json();
      newInvitations.push(invitations[0]);
    }
  }

  return newInvitations;
}

/**
 * Save updated employee data
 */
function saveUpdatedEmployees(employees, updates) {
  // Update metadata
  employees.demo_metadata.last_updated = new Date().toISOString();
  employees.demo_metadata.last_refresh_actions = updates.map((u) => u.action);

  // Calculate new statistics
  const statuses = employees.employees.reduce((acc, emp) => {
    acc[emp.status] = (acc[emp.status] || 0) + 1;
    return acc;
  }, {});

  employees.demo_metadata.active_employees = statuses.active || 0;
  employees.demo_metadata.pending_onboarding = statuses.pending || 0;
  employees.demo_metadata.offboarded = statuses.offboarded || 0;
  employees.demo_metadata.offboarding_in_progress = statuses.offboarding_initiated || 0;
  employees.demo_metadata.invited = statuses.invited || 0;

  const employeesPath = path.join(__dirname, '../data/employees.json');
  fs.writeFileSync(employeesPath, JSON.stringify(employees, null, 2));
}

/**
 * Main refresh function
 */
async function refreshDemo(_options = {}) {
  const spinner = ora('Refreshing demo content...').start();

  try {
    // Load current demo configuration
    spinner.text = 'Loading demo configuration...';
    const { config, employees } = loadDemoConfig();

    // Get demo client
    spinner.text = 'Getting demo client information...';
    const client = await getDemoClient(config.client.client_code);
    if (!client) {
      throw new Error('Demo client not found. Run setup-demo first.');
    }

    // Get demo applications
    spinner.text = 'Getting demo applications...';
    const applications = await getDemoApplications(client.id);

    // Clean up expired invitations
    spinner.text = 'Cleaning up expired invitations...';
    await cleanupExpiredInvitations(client.id);

    // Evolve employee scenarios
    spinner.text = 'Evolving employee scenarios...';
    const updates = evolveEmployeeScenarios(employees);

    // Generate new invitations for evolved scenarios
    spinner.text = 'Generating new invitations...';
    const newInvitations = await generateNewInvitations(
      client.id,
      applications,
      employees,
      updates
    );

    // Save updated employee data
    spinner.text = 'Saving updated employee data...';
    saveUpdatedEmployees(employees, updates);

    spinner.succeed('Demo content refreshed successfully!');

    // Display summary
    console.log(chalk.green.bold('\\n✅ Demo refresh completed!\\n'));
    console.log(chalk.cyan('📊 Refresh Summary:'));
    console.log(`   Client:           ${chalk.white(client.legal_name)}`);
    console.log(`   Employee Updates: ${chalk.white(updates.length)}`);
    console.log(`   New Invitations:  ${chalk.white(newInvitations.length)}`);

    if (updates.length > 0) {
      console.log(chalk.cyan('\\n🔄 Employee Updates:'));
      for (const update of updates) {
        const emp = update.employee;
        console.log(`   • ${emp.firstName} ${emp.lastName}: ${update.action}`);
      }
    }

    if (newInvitations.length > 0) {
      console.log(chalk.cyan('\\n📧 New Invitations:'));
      newInvitations.forEach((inv) => {
        console.log(
          `   • ${inv.invitation_code} (expires: ${new Date(inv.expires_at).toLocaleDateString()})`
        );
      });
    }

    console.log(chalk.yellow('\\n🔗 Next Steps:'));
    console.log(`   1. View updates: ${chalk.green('pnpm run demo:admin')}`);
    console.log(`   2. Test new scenarios in demo UI`);
    console.log(`   3. Generate analytics: ${chalk.green('pnpm run demo:analytics')}`);
    console.log('');
  } catch (error) {
    spinner.fail(`Demo refresh failed: ${error.message}`);
    console.error(chalk.red(error.stack));
    process.exit(1);
  }
}

// CLI configuration
program
  .name('refresh-demo')
  .description('Refresh demo content with new scenarios and invitations')
  .version('1.0.0');

program
  .command('run')
  .description('Refresh demo scenarios and generate new content')
  .option('--force-scenarios', 'Force all possible scenario updates')
  .option('--verbose', 'Show detailed output')
  .action(async (options) => {
    await refreshDemo(options);
  });

// Default to run command if no arguments
if (process.argv.length === 2) {
  refreshDemo();
} else {
  program.parse();
}
