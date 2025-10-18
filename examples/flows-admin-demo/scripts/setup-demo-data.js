#!/usr/bin/env node

/**
 * Setup Demo Data Script for flows-admin-demo
 * 
 * Ensures the required demo client and data exists in the database
 * for the flows-admin-demo to function properly.
 */

import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import dotenv from 'dotenv';
import ora from 'ora';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(chalk.red('❌ Missing required environment variables:'));
  missingVars.forEach(varName => {
    console.error(chalk.red(`   - ${varName}`));
  });
  console.error(chalk.yellow('\n💡 Please check your .env file'));
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Check database connection
 */
async function checkConnection() {
  const spinner = ora('Checking database connection').start();

  try {
    const { data, error } = await supabase
      .from('clients')
      .select('id')
      .limit(1);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    spinner.succeed('Database connection established');
    return true;
  } catch (err) {
    spinner.fail(`Connection failed: ${err.message}`);
    return false;
  }
}

/**
 * Create demo client if it doesn't exist
 */
async function ensureDemoClient() {
  const spinner = ora('Checking for demo client').start();

  const clientCode = 'hygge-hvidlog';
  const clientData = {
    client_code: clientCode,
    legal_name: 'Hygge & Hvidløg A/S',
    domain: 'hygge-hvidlog.thepia.net',
    tier: 'enterprise',
    status: 'active',
    region: 'EU',
    max_users: 1200,
    max_storage_gb: 100,
    industry: 'food_technology',
    company_size: 'large',
    country_code: 'DK',
  };

  try {
    // Check if client exists
    const { data: existingClient, error: checkError } = await supabase
      .from('clients')
      .select('*')
      .eq('client_code', clientCode)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(`Error checking for client: ${checkError.message}`);
    }

    if (existingClient) {
      spinner.succeed(`Demo client "${clientCode}" already exists`);
      return existingClient;
    }

    // Create client
    spinner.text = 'Creating demo client';
    const { data: newClient, error: createError } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single();

    if (createError) {
      throw new Error(`Error creating client: ${createError.message}`);
    }

    spinner.succeed(`Demo client "${clientCode}" created successfully`);
    return newClient;
  } catch (err) {
    spinner.fail(`Failed to ensure demo client: ${err.message}`);
    throw err;
  }
}

/**
 * Create demo applications for the client
 */
async function ensureDemoApplications(clientId) {
  const spinner = ora('Checking for demo applications').start();

  const applications = [
    {
      client_id: clientId,
      app_code: 'employee-onboarding',
      app_name: 'Employee Onboarding',
      app_version: '2.1.0',
      app_description: 'Comprehensive employee onboarding process',
      status: 'active',
      configuration: {
        theme: 'hygge',
        locale: 'da-DK',
        features: ['document-upload', 'task-tracking', 'notifications']
      },
      features: ['document-management', 'task-tracking', 'notifications'],
      max_concurrent_users: 100
    },
    {
      client_id: clientId,
      app_code: 'employee-offboarding',
      app_name: 'Employee Offboarding',
      app_version: '2.0.0',
      app_description: 'Structured employee departure process',
      status: 'active',
      configuration: {
        theme: 'hygge',
        locale: 'da-DK',
        features: ['asset-return', 'access-revocation', 'knowledge-transfer']
      },
      features: ['asset-management', 'access-control', 'documentation'],
      max_concurrent_users: 50
    }
  ];

  try {
    for (const app of applications) {
      // Check if application exists
      const { data: existingApp, error: checkError } = await supabase
        .from('client_applications')
        .select('*')
        .eq('client_id', clientId)
        .eq('app_code', app.app_code)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.warn(`Warning checking for app ${app.app_code}: ${checkError.message}`);
        continue;
      }

      if (existingApp) {
        console.log(`  ✓ Application "${app.app_code}" already exists`);
        continue;
      }

      // Create application
      const { error: createError } = await supabase
        .from('client_applications')
        .insert(app);

      if (createError) {
        console.warn(`Warning creating app ${app.app_code}: ${createError.message}`);
        continue;
      }

      console.log(`  ✓ Created application "${app.app_code}"`);
    }

    spinner.succeed('Demo applications ensured');
  } catch (err) {
    spinner.fail(`Failed to ensure demo applications: ${err.message}`);
    throw err;
  }
}

/**
 * Create sample notifications
 */
async function ensureSampleNotifications(clientId) {
  const spinner = ora('Creating sample notifications').start();

  const notifications = [
    {
      client_id: clientId,
      user_id: 'demo-user-1',
      title: 'Welcome to Hygge & Hvidløg!',
      message: 'Your onboarding process has been initiated. Please complete your profile.',
      type: 'info',
      read: false
    },
    {
      client_id: clientId,
      user_id: 'demo-user-1',
      title: 'Document Upload Required',
      message: 'Please upload your identification documents to complete verification.',
      type: 'warning',
      read: false
    },
    {
      client_id: clientId,
      user_id: 'demo-user-2',
      title: 'Onboarding Complete',
      message: 'Congratulations! Your onboarding process has been completed successfully.',
      type: 'success',
      read: true
    }
  ];

  try {
    // Clear existing demo notifications
    await supabase
      .from('notifications')
      .delete()
      .eq('client_id', clientId)
      .like('user_id', 'demo-user-%');

    // Insert new notifications
    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      console.warn(`Warning creating notifications: ${error.message}`);
    } else {
      spinner.succeed('Sample notifications created');
    }
  } catch (err) {
    spinner.warn(`Could not create sample notifications: ${err.message}`);
  }
}

/**
 * Main setup function
 */
async function setupDemoData() {
  console.log(chalk.blue.bold('🚀 Setting up flows-admin-demo data\n'));

  try {
    // Check connection
    if (!(await checkConnection())) {
      process.exit(1);
    }

    // Ensure demo client exists
    const client = await ensureDemoClient();

    // Ensure demo applications exist
    await ensureDemoApplications(client.id);

    // Create sample notifications
    await ensureSampleNotifications(client.id);

    console.log(chalk.green.bold('\n✅ Demo data setup complete!'));
    console.log(chalk.cyan(`\n📋 Demo client details:`));
    console.log(chalk.cyan(`   - Client Code: ${client.client_code}`));
    console.log(chalk.cyan(`   - Legal Name: ${client.legal_name}`));
    console.log(chalk.cyan(`   - Client ID: ${client.id}`));
    console.log(chalk.cyan(`\n🌐 You can now run the flows-admin-demo application.`));

  } catch (error) {
    console.error(chalk.red.bold('\n❌ Setup failed:'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

// Run setup
setupDemoData();
