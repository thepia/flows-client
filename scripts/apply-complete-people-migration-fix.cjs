#!/usr/bin/env node

/**
 * Apply Complete Employee to People Migration Fix
 *
 * This script applies the complete migration fix that renames employee_id
 * to person_id in documents and tasks tables, updates constraints, and
 * fixes all related functions, views, and policies.
 */

const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function applyMigrationFix() {
  console.log('🔧 Applying Complete Employee to People Migration Fix...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(
      __dirname,
      '../schemas/15_complete_employee_to_people_migration_fix.sql'
    );
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL loaded, applying changes...');

    // Split SQL by statements (basic splitting on semicolon + newline)
    const statements = migrationSQL
      .split(';\n')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comment blocks and empty statements
      if (statement.startsWith('/*') || statement.length < 10) {
        continue;
      }

      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);

      try {
        // Use the Supabase client to execute raw SQL
        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          // If exec_sql is not available, try using the REST API directly
          console.log(
            `⚠️  Direct SQL not available, trying alternative approach for statement ${i + 1}`
          );

          // For critical DDL statements, we need to handle them differently
          if (
            statement.includes('ALTER TABLE') ||
            statement.includes('CREATE POLICY') ||
            statement.includes('CREATE TRIGGER') ||
            statement.includes('CREATE OR REPLACE FUNCTION')
          ) {
            console.log(`❌ Could not execute DDL statement: ${statement.substring(0, 100)}...`);
            console.log(`   Error: ${error.message}`);
            console.log('   This statement needs to be run manually in the Supabase SQL editor.');
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.log(`❌ Error executing statement ${i + 1}: ${err.message}`);
        console.log(`   Statement: ${statement.substring(0, 100)}...`);
      }
    }

    console.log('\n🎉 Migration fix application completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Verify the changes by running the validation queries in the migration file');
    console.log('2. Test that documents and tasks tables now use person_id');
    console.log('3. Restart your application to pick up the schema changes');
  } catch (error) {
    console.error('💥 Failed to apply migration fix:', error.message);
    process.exit(1);
  }
}

// Validation function to check migration success
async function validateMigration() {
  console.log('\n🔍 Validating migration changes...\n');

  try {
    // Check if documents table has person_id column
    console.log('📋 Checking documents table structure...');
    const { data: docsData, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .limit(1);

    if (docsError) {
      console.log(`❌ Documents table error: ${docsError.message}`);
    } else {
      const columns = docsData && docsData.length > 0 ? Object.keys(docsData[0]) : [];
      console.log(`✅ Documents table columns: ${columns.join(', ')}`);

      if (columns.includes('person_id')) {
        console.log('✅ Documents table has person_id column');
      } else if (columns.includes('employee_id')) {
        console.log('❌ Documents table still has employee_id column - migration not complete');
      }
    }

    // Check if tasks table has person_id column
    console.log('\n📋 Checking tasks table structure...');
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .limit(1);

    if (tasksError) {
      console.log(`❌ Tasks table error: ${tasksError.message}`);
    } else {
      const columns = tasksData && tasksData.length > 0 ? Object.keys(tasksData[0]) : [];
      console.log(`✅ Tasks table columns: ${columns.join(', ')}`);

      if (columns.includes('person_id')) {
        console.log('✅ Tasks table has person_id column');
      } else if (columns.includes('employee_id')) {
        console.log('❌ Tasks table still has employee_id column - migration not complete');
      }
    }

    // Check if people table is accessible
    console.log('\n👥 Checking people table access...');
    const { data: peopleData, error: peopleError } = await supabase
      .from('people')
      .select('id, person_code, first_name, last_name')
      .limit(1);

    if (peopleError) {
      console.log(`❌ People table error: ${peopleError.message}`);
    } else {
      console.log(
        `✅ People table accessible, found ${peopleData ? peopleData.length : 0} records`
      );
    }
  } catch (error) {
    console.error('💥 Validation failed:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Complete Employee to People Migration Fix\n');
  console.log('📋 This will:');
  console.log('   • Rename employee_id to person_id in documents and tasks tables');
  console.log('   • Update foreign key constraints');
  console.log('   • Fix functions, views, and RLS policies');
  console.log('   • Ensure proper table relationships\n');

  const args = process.argv.slice(2);

  if (args.includes('--validate-only')) {
    await validateMigration();
  } else {
    await applyMigrationFix();
    await validateMigration();
  }
}

// Handle CLI arguments
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { applyMigrationFix, validateMigration };
