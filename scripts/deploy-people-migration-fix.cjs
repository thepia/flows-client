#!/usr/bin/env node

/**
 * Deploy Complete Employee to People Migration Fix
 *
 * This script applies the SQL migration using the database initialization pattern
 */

const { execSync } = require('node:child_process');
const path = require('node:path');
require('dotenv').config();

async function deployMigration() {
  console.log('🔧 Deploying Complete Employee to People Migration Fix...\n');

  try {
    // Get database connection details from environment
    const dbUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!dbUrl || !serviceKey) {
      throw new Error(
        'Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
      );
    }

    // Path to our migration file
    const migrationFile = path.join(
      __dirname,
      '../schemas/15_complete_employee_to_people_migration_fix.sql'
    );

    console.log('📄 Migration file:', migrationFile);
    console.log('🎯 Target database:', dbUrl);
    console.log('');

    // For now, just show the SQL that needs to be run
    console.log('📋 SQL MIGRATION TO RUN MANUALLY:');
    console.log('=====================================');
    console.log('');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Create a new query');
    console.log('4. Copy and paste the contents of the following file:');
    console.log(`   ${migrationFile}`);
    console.log('5. Run the query');
    console.log('');
    console.log('Alternatively, if you have psql access to the database:');
    console.log(`psql "connection-string" -f "${migrationFile}"`);
    console.log('');

    console.log('✅ Migration file ready for deployment!');
    console.log('');
    console.log('🔍 After running the migration, you can validate with:');
    console.log('   node scripts/apply-complete-people-migration-fix.cjs --validate-only');
  } catch (error) {
    console.error('💥 Deployment preparation failed:', error.message);
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  deployMigration().catch(console.error);
}
