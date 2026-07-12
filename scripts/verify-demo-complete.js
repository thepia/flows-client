#!/usr/bin/env node

/**
 * Demo Complete Verification Runner
 *
 * Validates that demo:complete script generates the expected data structure.
 * Can run as a standalone script or after demo:complete to verify results.
 */

import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    chalk.red('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  );
  process.exit(1);
}

// Supabase client with proper schema
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'api' },
});

/**
 * Expected patterns for validation
 */
const EXPECTED = {
  totalPeople: { min: 1150, max: 1250 },
  employees: { min: 1150, max: 1200 },
  associates: { min: 8, max: 12 },
  activeEmployees: { min: 950, max: 1050 },
  formerEmployees: { min: 100, max: 180 },
  futureEmployees: { min: 20, max: 60 },
  departments: 8, // Minimum expected departments
  companyDomain: 'hygge-hvidlog.dk',
};

/**
 * Analyze current database state
 */
async function analyzeDatabase() {
  console.log(chalk.blue('🔍 Analyzing current database state...\n'));

  try {
    // Get Hygge & Hvidløg client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, legal_name, client_code')
      .eq('client_code', 'hygge-hvidlog')
      .single();

    if (clientError || !client) {
      throw new Error('Hygge & Hvidløg client not found');
    }

    console.log(chalk.green(`✅ Found client: ${client.legal_name}`));

    // Get all people for this client
    const { data: people, error: peopleError } = await supabase
      .from('people')
      .select('*')
      .eq('client_id', client.id);

    if (peopleError) {
      throw new Error(`Error fetching people: ${peopleError.message}`);
    }

    const analysis = {
      total: people?.length || 0,
      employees: people?.filter((p) => p.associate_status === null).length || 0,
      associates: people?.filter((p) => p.associate_status !== null).length || 0,
      statusCounts: {
        active: people?.filter((p) => p.employment_status === 'active').length || 0,
        former: people?.filter((p) => p.employment_status === 'former').length || 0,
        future: people?.filter((p) => p.employment_status === 'future').length || 0,
        nullStatus: people?.filter((p) => p.employment_status === null).length || 0,
      },
      departments: [...new Set(people?.map((p) => p.department) || [])],
      associateTypes: [
        ...new Set(people?.filter((p) => p.associate_status).map((p) => p.associate_status) || []),
      ],
      seedEmployees: people?.filter((p) => p.person_code?.startsWith('emp-')).length || 0,
      bulkEmployees: people?.filter((p) => p.person_code?.startsWith('hygge-hvidlog-')).length || 0,
      emailDomains: [...new Set(people?.map((p) => p.company_email?.split('@')[1]) || [])],
      samplePeople:
        people?.slice(0, 3).map((p) => ({
          person_code: p.person_code,
          name: `${p.first_name} ${p.last_name}`,
          department: p.department,
          position: p.position,
          employment_status: p.employment_status,
          associate_status: p.associate_status,
        })) || [],
    };

    return { client, people: people || [], analysis };
  } catch (error) {
    console.error(chalk.red(`❌ Database analysis failed: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Validate data against expected patterns
 */
function validateData(analysis) {
  console.log(chalk.blue('\n📊 Validation Results:\n'));

  const results = [];

  // Total people count
  const totalValid =
    analysis.total >= EXPECTED.totalPeople.min && analysis.total <= EXPECTED.totalPeople.max;
  results.push({
    test: 'Total People Count',
    actual: analysis.total,
    expected: `${EXPECTED.totalPeople.min}-${EXPECTED.totalPeople.max}`,
    passed: totalValid,
  });

  // Employee count
  const employeeValid =
    analysis.employees >= EXPECTED.employees.min && analysis.employees <= EXPECTED.employees.max;
  results.push({
    test: 'Employee Count',
    actual: analysis.employees,
    expected: `${EXPECTED.employees.min}-${EXPECTED.employees.max}`,
    passed: employeeValid,
  });

  // Associate count
  const associateValid =
    analysis.associates >= EXPECTED.associates.min &&
    analysis.associates <= EXPECTED.associates.max;
  results.push({
    test: 'Associate Count',
    actual: analysis.associates,
    expected: `${EXPECTED.associates.min}-${EXPECTED.associates.max}`,
    passed: associateValid,
  });

  // Active employees
  const activeValid =
    analysis.statusCounts.active >= EXPECTED.activeEmployees.min &&
    analysis.statusCounts.active <= EXPECTED.activeEmployees.max;
  results.push({
    test: 'Active Employees',
    actual: analysis.statusCounts.active,
    expected: `${EXPECTED.activeEmployees.min}-${EXPECTED.activeEmployees.max}`,
    passed: activeValid,
  });

  // Former employees
  const formerValid =
    analysis.statusCounts.former >= EXPECTED.formerEmployees.min &&
    analysis.statusCounts.former <= EXPECTED.formerEmployees.max;
  results.push({
    test: 'Former Employees',
    actual: analysis.statusCounts.former,
    expected: `${EXPECTED.formerEmployees.min}-${EXPECTED.formerEmployees.max}`,
    passed: formerValid,
  });

  // Future employees
  const futureValid =
    analysis.statusCounts.future >= EXPECTED.futureEmployees.min &&
    analysis.statusCounts.future <= EXPECTED.futureEmployees.max;
  results.push({
    test: 'Future Employees',
    actual: analysis.statusCounts.future,
    expected: `${EXPECTED.futureEmployees.min}-${EXPECTED.futureEmployees.max}`,
    passed: futureValid,
  });

  // Department count
  const deptValid = analysis.departments.length >= EXPECTED.departments;
  results.push({
    test: 'Department Diversity',
    actual: analysis.departments.length,
    expected: `≥${EXPECTED.departments}`,
    passed: deptValid,
  });

  // Email domain consistency
  const domainValid =
    analysis.emailDomains.length === 1 && analysis.emailDomains[0] === EXPECTED.companyDomain;
  results.push({
    test: 'Email Domain Consistency',
    actual: analysis.emailDomains.join(', '),
    expected: EXPECTED.companyDomain,
    passed: domainValid,
  });

  // Display results
  for (const result of results) {
    const status = result.passed ? chalk.green('✅') : chalk.red('❌');
    console.log(
      `${status} ${chalk.cyan(result.test.padEnd(25))}: ${chalk.white(result.actual)} ${chalk.gray(`(expected: ${result.expected})`)}`
    );
  }

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  console.log(chalk.blue(`\n📈 Overall Score: ${passedCount}/${totalCount} tests passed\n`));

  if (passedCount === totalCount) {
    console.log(chalk.green.bold('🎉 All validation tests PASSED!'));
    console.log(chalk.green('   Demo:complete is generating data correctly.\n'));
    return true;
  } else {
    console.log(chalk.yellow.bold('⚠️  Some validation tests FAILED'));
    console.log(chalk.yellow('   Check the demo:complete script configuration.\n'));
    return false;
  }
}

/**
 * Display detailed analysis
 */
function displayAnalysis(analysis) {
  console.log(chalk.blue('📋 Detailed Analysis:\n'));

  console.log(chalk.cyan('People Breakdown:'));
  console.log(`   Total People: ${chalk.white(analysis.total)}`);
  console.log(`   Employees: ${chalk.white(analysis.employees)}`);
  console.log(`   Associates: ${chalk.white(analysis.associates)}\n`);

  console.log(chalk.cyan('Employment Status Distribution:'));
  console.log(
    `   Active: ${chalk.green(analysis.statusCounts.active)} (${Math.round((analysis.statusCounts.active / analysis.employees) * 100)}%)`
  );
  console.log(
    `   Former: ${chalk.yellow(analysis.statusCounts.former)} (${Math.round((analysis.statusCounts.former / analysis.employees) * 100)}%)`
  );
  console.log(
    `   Future: ${chalk.blue(analysis.statusCounts.future)} (${Math.round((analysis.statusCounts.future / analysis.employees) * 100)}%)`
  );
  if (analysis.statusCounts.nullStatus > 0) {
    console.log(`   Null Status: ${chalk.gray(analysis.statusCounts.nullStatus)} (associates)`);
  }
  console.log('');

  console.log(chalk.cyan('Data Quality:'));
  console.log(
    `   Departments: ${chalk.white(analysis.departments.length)} (${analysis.departments.slice(0, 3).join(', ')}${analysis.departments.length > 3 ? '...' : ''})`
  );
  console.log(
    `   Associate Types: ${chalk.white(analysis.associateTypes.length)} (${analysis.associateTypes.join(', ')})`
  );
  console.log(`   Seed Employees: ${chalk.white(analysis.seedEmployees)}`);
  console.log(`   Bulk Employees: ${chalk.white(analysis.bulkEmployees)}`);
  console.log(`   Email Domains: ${chalk.white(analysis.emailDomains.join(', '))}\n`);

  if (analysis.samplePeople.length > 0) {
    console.log(chalk.cyan('Sample People:'));
    for (const person of analysis.samplePeople) {
      const status = person.employment_status || person.associate_status || 'unknown';
      console.log(
        `   ${chalk.white(person.person_code)}: ${person.name} - ${person.department} (${status})`
      );
    }
    console.log('');
  }
}

/**
 * Main verification function
 */
async function main() {
  console.log(chalk.blue.bold('🧪 Demo Complete Verification\n'));

  const { analysis } = await analyzeDatabase();

  displayAnalysis(analysis);

  const allPassed = validateData(analysis);

  if (analysis.total < 100) {
    console.log(chalk.yellow.bold('💡 Insufficient Data Detected'));
    console.log(chalk.yellow("   It looks like demo:complete hasn't been run yet."));
    console.log(chalk.yellow('   Run: pnpm demo:complete\n'));
    process.exit(0);
  }

  if (allPassed) {
    console.log(chalk.green('✅ Demo data structure is correct!'));
    console.log(chalk.green('   The demo:complete script is working as expected.'));
    process.exit(0);
  } else {
    console.log(chalk.red('❌ Demo data validation failed!'));
    console.log(chalk.red('   The demo:complete script may need adjustments.'));
    process.exit(1);
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(chalk.red('💥 Verification failed:'), error);
    process.exit(1);
  });
}

export { analyzeDatabase, displayAnalysis, validateData };
