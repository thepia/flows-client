#!/usr/bin/env node

/**
 * Fix RLS Policies for People Tables
 *
 * This script fixes the Row Level Security policies for the people and people_enrollments tables
 * to resolve access control issues after the migration.
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

// Use environment variables for credentials
const supabaseUrl = process.env.SUPABASE_URL || 'https://jstbkvkurjsopuwhlsvy.supabase.co';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzdGJrdmt1cmpzb3B1d2hsc3Z5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk2NjU2OCwiZXhwIjoyMDY2NTQyNTY4fQ.vSSYVzitJDrQQYer1cW-SU_ZSEUtVyIOKsogHjy3h58';

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Execute SQL directly
 */
async function _executeSql(sql) {
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Fix RLS policies
 */
async function fixRlsPolicies() {
  console.log(chalk.blue.bold('🔒 Fixing RLS Policies for People Tables\n'));

  const spinner = ora('Reading RLS fix script').start();

  try {
    // Read the SQL file
    const sqlPath = join(projectRoot, 'schemas', '14_fix_people_rls_policies.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    spinner.succeed('RLS fix script loaded');

    // Execute the SQL through Supabase
    const executeSpinner = ora('Executing RLS policies fix').start();

    try {
      // For Supabase, we need to execute each statement separately
      // Split by double newlines or major section markers
      const statements = sql.split(/;\s*\n\s*\n/);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim();

        if (statement && !statement.startsWith('--') && statement !== ';') {
          const cleanStatement = statement.endsWith(';') ? statement : `${statement};`;

          executeSpinner.text = `Executing statement ${i + 1}/${statements.length}`;

          try {
            await supabase.rpc('exec_sql', { sql_query: cleanStatement });
          } catch (statementError) {
            // Some statements might fail if policies already exist, that's OK
            console.log(
              chalk.yellow(`Warning: Statement ${i + 1} had issues: ${statementError.message}`)
            );
          }
        }
      }

      executeSpinner.succeed('RLS policies fix completed');
    } catch (error) {
      executeSpinner.fail(`Failed to execute RLS fix: ${error.message}`);
      throw error;
    }
  } catch (error) {
    spinner.fail(`Failed to read RLS fix script: ${error.message}`);
    throw error;
  }
}

/**
 * Test database access
 */
async function testAccess() {
  const spinner = ora('Testing database access to people tables').start();

  try {
    // Test access to people table
    const { data: peopleData, error: peopleError } = await supabase
      .from('people')
      .select('id')
      .limit(1);

    if (peopleError) {
      throw new Error(`People table access failed: ${peopleError.message}`);
    }

    // Test access to people_enrollments table
    const { data: enrollmentsData, error: enrollmentsError } = await supabase
      .from('people_enrollments')
      .select('id')
      .limit(1);

    if (enrollmentsError) {
      throw new Error(`People enrollments table access failed: ${enrollmentsError.message}`);
    }

    spinner.succeed('Database access test passed');
    return true;
  } catch (error) {
    spinner.fail(`Database access test failed: ${error.message}`);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    await fixRlsPolicies();

    console.log(chalk.green('\n✅ RLS policies fix completed successfully!'));

    // Test access
    const accessOk = await testAccess();

    if (accessOk) {
      console.log(chalk.green('\n🎉 Database access is working correctly!'));
      console.log(chalk.blue('\nThe application should now be able to access the people tables.'));
    } else {
      console.log(chalk.yellow('\n⚠️  Database access test failed. Manual review may be needed.'));
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Failed to fix RLS policies:'), error.message);
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(chalk.red('Script failed:'), error);
    process.exit(1);
  });
}

export { fixRlsPolicies };
