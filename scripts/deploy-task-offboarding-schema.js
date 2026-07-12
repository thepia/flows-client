#!/usr/bin/env node

/**
 * Deploy Task-Oriented Offboarding Schema
 *
 * This script helps deploy the new task-oriented offboarding schema (12_task_oriented_offboarding.sql)
 * to your Supabase database. Since Supabase requires manual SQL execution for schema changes,
 * this script displays the SQL content for copy/paste into the Supabase SQL Editor.
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

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const SCHEMA_FILE = '12_task_oriented_offboarding.sql';

/**
 * Check database connection
 */
async function checkConnection() {
  const spinner = ora('Checking database connection').start();

  try {
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
 * Check if task-oriented offboarding schema already exists
 */
async function checkExistingSchema() {
  const spinner = ora('Checking for existing task-oriented offboarding schema').start();

  try {
    // Try to access the offboarding_templates table
    const { data, error } = await supabase.from('offboarding_templates').select('id').limit(1);

    if (error && error.code === 'PGRST116') {
      // Table doesn't exist - ready for deployment
      spinner.succeed('Ready to deploy task-oriented offboarding schema');
      return false;
    } else if (error) {
      spinner.warn(`Schema check unclear: ${error.message}`);
      return false;
    } else {
      // Table exists
      spinner.warn('Task-oriented offboarding schema appears to already exist');
      return true;
    }
  } catch (err) {
    spinner.info(`Schema check failed: ${err.message}, proceeding with deployment`);
    return false;
  }
}

/**
 * Read and display the schema file
 */
async function readSchemaFile() {
  const spinner = ora(`Reading ${SCHEMA_FILE}`).start();

  try {
    const filePath = join(projectRoot, 'schemas', SCHEMA_FILE);
    const sql = readFileSync(filePath, 'utf8');

    spinner.succeed(`${SCHEMA_FILE} ready for deployment`);
    return sql;
  } catch (err) {
    spinner.fail(`Failed to read ${SCHEMA_FILE}: ${err.message}`);
    return null;
  }
}

/**
 * Display deployment instructions
 */
function displayDeploymentInstructions() {
  console.log(chalk.blue.bold('\n🚀 Task-Oriented Offboarding Schema Deployment\n'));

  console.log(
    chalk.white('To deploy the new task-oriented offboarding system, please follow these steps:\n')
  );

  console.log(chalk.yellow('1. Open your Supabase dashboard'));
  console.log(chalk.white('   → Go to your project dashboard'));
  console.log(chalk.white('   → Navigate to the "SQL Editor" tab\n'));

  console.log(chalk.yellow('2. Copy and paste the schema SQL'));
  console.log(chalk.white('   → Copy the SQL content shown below'));
  console.log(chalk.white('   → Paste it into a new query in the SQL Editor'));
  console.log(chalk.white('   → Click "Run" to execute the schema\n'));

  console.log(chalk.yellow('3. Verify the deployment'));
  console.log(
    chalk.white(
      '   → Check that new tables exist: offboarding_templates, offboarding_task_templates, etc.'
    )
  );
  console.log(chalk.white('   → Run: npm run health-check'));
  console.log(
    chalk.white('   → Populate demo data: node scripts/create-offboarding-templates-demo.js\n')
  );

  console.log(chalk.green.bold('📋 New Tables Created:'));
  console.log(chalk.white('   • offboarding_templates - Process templates'));
  console.log(chalk.white('   • offboarding_task_templates - Task templates'));
  console.log(chalk.white('   • offboarding_document_templates - Document templates'));
  console.log(chalk.white('   • offboarding_processes - Active processes'));
  console.log(chalk.white('   • offboarding_tasks - Active tasks'));
  console.log(chalk.white('   • offboarding_documents - Process documents'));
  console.log(chalk.white('   • offboarding_audit_log - Audit trail\n'));
}

/**
 * Main deployment function
 */
async function deployTaskOffboardingSchema() {
  console.log(chalk.blue.bold('📋 Task-Oriented Offboarding Schema Deployment Tool\n'));

  // Check connection
  if (!(await checkConnection())) {
    process.exit(1);
  }

  // Check for existing schema
  const schemaExists = await checkExistingSchema();
  if (schemaExists) {
    const { default: inquirer } = await import('inquirer');
    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message:
          'Schema appears to already exist. This will update/replace existing tables. Continue?',
        default: false,
      },
    ]);

    if (!proceed) {
      console.log(chalk.yellow('Deployment cancelled by user.'));
      process.exit(0);
    }
  }

  // Read schema file
  const sql = await readSchemaFile();
  if (!sql) {
    process.exit(1);
  }

  // Display deployment instructions
  displayDeploymentInstructions();

  // Ask if user wants to see the SQL content
  const { default: inquirer } = await import('inquirer');
  const { showSQL } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'showSQL',
      message: 'Show the SQL schema content for copy/paste?',
      default: true,
    },
  ]);

  if (showSQL) {
    console.log(chalk.green.bold('\n📄 TASK-ORIENTED OFFBOARDING SCHEMA SQL\n'));
    console.log(chalk.green.bold(`${'='.repeat(80)}`));
    console.log(chalk.green.bold(`COPY THE CONTENT BELOW INTO SUPABASE SQL EDITOR`));
    console.log(chalk.green.bold(`${'='.repeat(80)}\n`));
    console.log(chalk.white(sql));
    console.log(chalk.green.bold(`\n${'='.repeat(80)}`));
    console.log(chalk.green.bold(`END OF SQL SCHEMA`));
    console.log(chalk.green.bold(`${'='.repeat(80)}\n`));
  }

  console.log(chalk.blue.bold('📊 After running the SQL in Supabase:\n'));
  console.log(chalk.white('  1. Verify tables created: Check Supabase Dashboard → Tables'));
  console.log(chalk.white('  2. Test connection: npm run health-check'));
  console.log(
    chalk.white('  3. Create demo data: node scripts/create-offboarding-templates-demo.js')
  );
  console.log(chalk.white('  4. Update your application UI to use the new task-oriented system\n'));

  console.log(chalk.green.bold('✅ Deployment guide completed!'));
  console.log(chalk.yellow('Remember: You must manually execute the SQL in Supabase SQL Editor.'));
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

// Run the deployment guide
if (import.meta.url === `file://${process.argv[1]}`) {
  deployTaskOffboardingSchema().catch((error) => {
    console.error(chalk.red('Deployment failed:'), error);
    process.exit(1);
  });
}

export { deployTaskOffboardingSchema };
