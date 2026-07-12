#!/usr/bin/env node

/**
 * Database Initialization Script
 *
 * Initializes the Supabase database with all schemas, tables, and functions.
 * This script should be run once when setting up a new Supabase project.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import dotenv from 'dotenv';
import ora from 'ora';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(chalk.red('Missing required environment variables:'));
  for (const varName of missingVars) {
    console.error(chalk.red(`  - ${varName}`));
  }
  console.error(
    chalk.yellow('\nPlease copy config/supabase.example.env to .env and fill in the values.')
  );
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// SQL files to execute in order (this is problematic as we add more migration files)
const sqlFiles = [
  '00_schema_setup.sql',
  '01_clients.sql',
  '02_applications.sql',
  '03_invitations.sql',
  '10_shadow_offboarding_workflows.sql',
  '11_credit_system_offboarding.sql',
  '12_task_oriented_offboarding.sql',
];

/**
 * Read and display SQL file content
 */
async function readSqlFile(filename) {
  const spinner = ora(`Reading ${filename}`).start();

  try {
    const filePath = join(projectRoot, 'schemas', filename);
    const sql = readFileSync(filePath, 'utf8');

    spinner.succeed(`${filename} ready for execution`);
    return sql;
  } catch (err) {
    spinner.fail(`Failed to read ${filename}: ${err.message}`);
    return null;
  }
}

/**
 * Display setup instructions
 */
function displaySetupInstructions() {
  console.log(chalk.blue.bold('\n📋 Database Setup Instructions\n'));

  console.log(
    chalk.white(
      'Since Supabase requires manual SQL execution for schema setup, please follow these steps:\n'
    )
  );

  console.log(chalk.yellow('1. Open your Supabase dashboard'));
  console.log(chalk.white('   → Go to your project dashboard'));
  console.log(chalk.white('   → Navigate to the "SQL Editor" tab\n'));

  console.log(chalk.yellow('2. Execute the schema files in order:'));
  for (const [index, file] of sqlFiles.entries()) {
    console.log(chalk.white(`   ${index + 1}. Copy and paste the contents of schemas/${file}`));
  }

  console.log(chalk.yellow('\n3. Verify the setup:'));
  console.log(chalk.white('   → Check that "api", "internal", and "audit" schemas exist'));
  console.log(chalk.white('   → Confirm "Exposed schemas" is set to "api" (Settings → Data API)'));
  console.log(chalk.white('   → Run: npm run health-check'));

  console.log(chalk.green.bold('\n✨ Alternative: Copy SQL files to clipboard\n'));
}

/**
 * Check database connection
 */
async function checkConnection() {
  const spinner = ora('Checking database connection').start();

  try {
    // Simple connection test using PostgREST health endpoint
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    spinner.succeed('Database connection established');
    return true;
  } catch (err) {
    spinner.fail(`Connection failed: ${err.message}`);
    return false;
  }
}

/**
 * Check if initialization is needed
 */
async function checkInitializationStatus() {
  const spinner = ora('Checking initialization status').start();

  try {
    // Try to access a table that would exist if initialized
    // This will fail gracefully if the schema doesn't exist
    const { data, error } = await supabase.from('clients').select('id').limit(1);

    if (error && error.code === 'PGRST116') {
      // Table doesn't exist - ready for initialization
      spinner.succeed('Database ready for initialization');
      return true;
    } else if (error) {
      spinner.info(`Initialization status unclear: ${error.message}`);
      return true;
    } else {
      // Table exists - ask user
      spinner.warn('Database appears to be already initialized');

      const { default: inquirer } = await import('inquirer');
      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Database appears to be already initialized. Continue anyway?',
          default: false,
        },
      ]);

      if (!proceed) {
        console.log(chalk.yellow('Initialization cancelled by user.'));
        process.exit(0);
      }

      return true;
    }
  } catch (err) {
    spinner.info(`Status check failed: ${err.message}, proceeding with setup`);
    return true;
  }
}

/**
 * Main initialization function
 */
async function initializeDatabase() {
  console.log(chalk.blue.bold('🚀 Thepia Flows Database Setup\n'));

  // Check connection
  if (!(await checkConnection())) {
    process.exit(1);
  }

  // Check initialization status
  if (!(await checkInitializationStatus())) {
    process.exit(1);
  }

  // Display setup instructions
  displaySetupInstructions();

  // Ask if user wants to see file contents
  const { default: inquirer } = await import('inquirer');
  const { showFiles } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'showFiles',
      message: 'Would you like to see the SQL file contents to copy/paste?',
      default: true,
    },
  ]);

  if (showFiles) {
    console.log(chalk.blue.bold('\n📄 SQL File Contents\n'));

    for (const filename of sqlFiles) {
      const sql = await readSqlFile(filename);
      if (sql) {
        console.log(chalk.green.bold(`\n${'='.repeat(60)}`));
        console.log(chalk.green.bold(`${filename.toUpperCase()}`));
        console.log(chalk.green.bold(`${'='.repeat(60)}\n`));
        console.log(chalk.white(sql));
        console.log(chalk.green.bold(`\n${'='.repeat(60)}\n`));

        // Wait for user confirmation before showing next file
        if (sqlFiles.indexOf(filename) < sqlFiles.length - 1) {
          await inquirer.prompt([
            {
              type: 'input',
              name: 'continue',
              message: 'Press Enter to see the next file...',
            },
          ]);
        }
      }
    }
  }

  console.log(chalk.green.bold('\n✅ Setup guide completed!'));

  console.log(chalk.blue.bold('\n📊 After running the SQL files manually:'));
  console.log(chalk.white('  1. Run: npm run health-check'));
  console.log(chalk.white('  2. Create your first client: npm run client:create'));
  console.log(chalk.white('  3. Test invitations: npm run invitation:create'));
}

/**
 * Handle errors and cleanup
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught exception:'), error);
  process.exit(1);
});

// Run the initialization
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase().catch((error) => {
    console.error(chalk.red('Initialization failed:'), error);
    process.exit(1);
  });
}

export { initializeDatabase };
