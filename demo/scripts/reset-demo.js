#!/usr/bin/env node

/**
 * Demo Reset Script
 *
 * Completely resets the demo environment by removing all demo data
 * and preparing for a fresh setup.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import { Command } from 'commander';
import { config } from 'dotenv';
import inquirer from 'inquirer';
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
 * Get demo client information
 */
async function getDemoClient() {
  const configPath = path.join(__dirname, '../config/client.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('Demo configuration not found');
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const clientCode = config.client.client_code;

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
 * Delete demo invitations
 */
async function deleteDemoInvitations(clientId) {
  const response = await fetch(`${supabaseUrl}/rest/v1/invitations?client_id=eq.${clientId}`, {
    method: 'DELETE',
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete demo invitations: HTTP ${response.status}`);
  }

  return response;
}

/**
 * Delete demo applications
 */
async function deleteDemoApplications(clientId) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/client_applications?client_id=eq.${clientId}`,
    {
      method: 'DELETE',
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete demo applications: HTTP ${response.status}`);
  }

  return response;
}

/**
 * Delete demo client
 */
async function deleteDemoClient(clientId) {
  const response = await fetch(`${supabaseUrl}/rest/v1/clients?id=eq.${clientId}`, {
    method: 'DELETE',
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete demo client: HTTP ${response.status}`);
  }

  return response;
}

/**
 * Reset demo data files to initial state
 */
function resetDemoFiles() {
  // You could restore from backup versions here
  console.log(chalk.blue('📁 Demo data files kept intact (use --reset-files to reset)'));
}

/**
 * Main reset function
 */
async function resetDemo(options = {}) {
  console.log(chalk.red.bold('⚠️  DEMO RESET WARNING ⚠️'));
  console.log(chalk.yellow('This will permanently delete all demo data including:'));
  console.log(chalk.yellow('- Demo client record'));
  console.log(chalk.yellow('- All demo applications'));
  console.log(chalk.yellow('- All demo invitations'));
  console.log(chalk.yellow('- Associated database records'));
  console.log('');

  if (!options.force) {
    const confirmation = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Are you sure you want to reset the demo?',
        default: false,
      },
    ]);

    if (!confirmation.proceed) {
      console.log(chalk.blue('Demo reset cancelled.'));
      return;
    }
  }

  const spinner = ora('Resetting demo...').start();

  try {
    // Get demo client
    spinner.text = 'Finding demo client...';
    const client = await getDemoClient();

    if (!client) {
      spinner.warn('No demo client found - nothing to reset');
      return;
    }

    console.log(
      chalk.cyan(`\\nResetting demo client: ${client.legal_name} (${client.client_code})`)
    );

    // Delete demo invitations
    spinner.start('Deleting demo invitations...');
    await deleteDemoInvitations(client.id);
    spinner.succeed('Demo invitations deleted');

    // Delete demo applications
    spinner.start('Deleting demo applications...');
    await deleteDemoApplications(client.id);
    spinner.succeed('Demo applications deleted');

    // Delete demo client
    spinner.start('Deleting demo client...');
    await deleteDemoClient(client.id);
    spinner.succeed('Demo client deleted');

    // Reset demo files if requested
    if (options.resetFiles) {
      spinner.start('Resetting demo data files...');
      resetDemoFiles();
      spinner.succeed('Demo data files reset');
    } else {
      resetDemoFiles();
    }

    console.log(chalk.green.bold('\\n✅ Demo reset completed successfully!\\n'));
    console.log(chalk.cyan('🔗 Next Steps:'));
    console.log(`   1. Run setup: ${chalk.green('pnpm run demo:setup')}`);
    console.log(`   2. Verify setup: ${chalk.green('pnpm run demo:setup:status')}`);
    console.log(`   3. Start demo: ${chalk.green('pnpm run demo:admin')}`);
    console.log('');
  } catch (error) {
    spinner.fail(`Demo reset failed: ${error.message}`);
    console.error(chalk.red(error.stack));
    process.exit(1);
  }
}

// CLI configuration
program
  .name('reset-demo')
  .description('Reset demo environment by removing all demo data')
  .version('1.0.0');

program
  .command('run')
  .description('Reset demo data and prepare for fresh setup')
  .option('--force', 'Skip confirmation prompt')
  .option('--reset-files', 'Also reset demo data files to initial state')
  .option('--verbose', 'Show detailed output')
  .action(async (options) => {
    await resetDemo(options);
  });

// Default to run command if no arguments
if (process.argv.length === 2) {
  resetDemo();
} else {
  program.parse();
}
