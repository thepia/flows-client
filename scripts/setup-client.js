#!/usr/bin/env node

/**
 * Client Setup Script
 *
 * Provisions a new client in the multi-tenant database system.
 * Creates client record, applications, storage buckets, and RLS policies.
 */

import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import { Command } from 'commander';
import { config } from 'dotenv';
import inquirer from 'inquirer';
import ora from 'ora';

// Load environment variables
config();

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

// Client tier configurations
const CLIENT_TIERS = {
  free: {
    maxUsers: 100,
    maxStorageGB: 1,
    features: ['basic-auth', 'invitations'],
    price: 0,
  },
  pro: {
    maxUsers: 1000,
    maxStorageGB: 10,
    features: ['basic-auth', 'invitations', 'analytics', 'sso'],
    price: 25,
  },
  enterprise: {
    maxUsers: 10000,
    maxStorageGB: 100,
    features: [
      'basic-auth',
      'invitations',
      'analytics',
      'sso',
      'custom-domains',
      'priority-support',
    ],
    price: 250,
  },
};

// Default application configurations
const DEFAULT_APPS = {
  offboarding: {
    name: 'Employee Offboarding',
    description: 'Streamlined employee offboarding process with digital workflows',
    version: '1.0.0',
    configuration: {
      theme: 'corporate',
      locale: 'en-US',
      branding: {
        primary_color: '#2563eb',
        secondary_color: '#64748b',
      },
    },
    features: ['document-capture', 'task-management', 'notifications'],
  },
  onboarding: {
    name: 'Employee Onboarding',
    description: 'Digital employee onboarding and orientation workflows',
    version: '1.0.0',
    configuration: {
      theme: 'welcoming',
      locale: 'en-US',
      branding: {
        primary_color: '#059669',
        secondary_color: '#64748b',
      },
    },
    features: ['document-collection', 'training-modules', 'progress-tracking'],
  },
};

/**
 * Validate client code format
 */
function validateClientCode(code) {
  if (!code || typeof code !== 'string') {
    return 'Client code is required';
  }

  if (!/^[a-z0-9-]+$/.test(code)) {
    return 'Client code must contain only lowercase letters, numbers, and hyphens';
  }

  if (code.length < 2 || code.length > 50) {
    return 'Client code must be between 2 and 50 characters';
  }

  if (code.startsWith('-') || code.endsWith('-') || code.includes('--')) {
    return 'Client code cannot start/end with hyphens or contain consecutive hyphens';
  }

  return true;
}

/**
 * Validate domain format
 */
function validateDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    return 'Domain is required';
  }

  if (!/^[a-z0-9.-]+\.(thepia\.net|thepia\.com)$/.test(domain)) {
    return 'Domain must be a subdomain of thepia.net or thepia.com';
  }

  return true;
}

/**
 * Check if client code or domain already exists
 */
async function checkClientExists(clientCode, domain) {
  try {
    // Use direct fetch as workaround for schema configuration issues
    const response = await fetch(
      `${supabaseUrl}/rest/v1/clients?select=client_code,domain&or=(client_code.eq.${clientCode},domain.eq.${domain})`,
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

    return {
      codeExists: data.some((c) => c.client_code === clientCode),
      domainExists: data.some((c) => c.domain === domain),
    };
  } catch (err) {
    throw new Error(`Database error: ${err.message}`);
  }
}

/**
 * Create storage buckets for client
 */
async function createStorageBuckets(clientCode) {
  const buckets = [
    {
      id: `${clientCode}-assets`,
      name: `${clientCode}-assets`,
      public: true,
      file_size_limit: 52428800, // 50MB
      allowed_mime_types: ['image/*', 'video/*', 'application/pdf'],
    },
    {
      id: `${clientCode}-user-uploads`,
      name: `${clientCode}-user-uploads`,
      public: false,
      file_size_limit: 104857600, // 100MB
      allowed_mime_types: ['image/*', 'video/*', 'application/pdf', 'application/msword'],
    },
    {
      id: `${clientCode}-documents`,
      name: `${clientCode}-documents`,
      public: false,
      file_size_limit: 52428800, // 50MB
      allowed_mime_types: ['application/pdf', 'application/msword', 'text/plain'],
    },
  ];

  const results = [];

  for (const bucket of buckets) {
    const { data, error } = await supabase.storage.createBucket(bucket.id, {
      public: bucket.public,
      fileSizeLimit: bucket.file_size_limit,
      allowedMimeTypes: bucket.allowed_mime_types,
    });

    if (error && !error.message.includes('already exists')) {
      throw new Error(`Failed to create bucket ${bucket.id}: ${error.message}`);
    }

    results.push({
      bucket: bucket.id,
      created: !error,
      public: bucket.public,
    });
  }

  return results;
}

/**
 * Create client applications
 */
async function createClientApplications(clientId, clientCode, apps) {
  const applicationRecords = [];

  for (const [appCode, appConfig] of Object.entries(apps)) {
    const application = {
      client_id: clientId,
      app_code: appCode,
      app_name: appConfig.name,
      app_version: appConfig.version,
      app_description: appConfig.description,
      configuration: appConfig.configuration,
      features: appConfig.features,
      allowed_domains: [`${clientCode}.thepia.net`],
      cors_origins: [`https://${clientCode}.thepia.net`, `https://app.${clientCode}.thepia.net`],
    };

    // Use direct fetch as workaround for schema configuration issues
    const response = await fetch(`${supabaseUrl}/rest/v1/client_applications`, {
      method: 'POST',
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(application),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create application ${appCode}: HTTP ${response.status} - ${errorText}`
      );
    }

    const apps = await response.json();
    applicationRecords.push(apps[0]);
  }

  return applicationRecords;
}

/**
 * Interactive client setup
 */
async function interactiveSetup() {
  console.log(chalk.blue.bold('🚀 Thepia Flows - Client Setup Wizard\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'clientCode',
      message: 'Client code (used in URLs and file paths):',
      validate: validateClientCode,
      transformer: (input) => input.toLowerCase(),
    },
    {
      type: 'input',
      name: 'legalName',
      message: 'Legal company name:',
      validate: (input) => (input.trim().length > 0 ? true : 'Legal name is required'),
    },
    {
      type: 'input',
      name: 'domain',
      message: 'Domain (subdomain of thepia.net):',
      default: (answers) => `${answers.clientCode}.thepia.net`,
      validate: validateDomain,
    },
    {
      type: 'list',
      name: 'region',
      message: 'Data region:',
      choices: ['EU', 'US', 'APAC'],
      default: 'EU',
    },
    {
      type: 'list',
      name: 'tier',
      message: 'Client tier:',
      choices: Object.keys(CLIENT_TIERS).map((tier) => ({
        name: `${tier} (${CLIENT_TIERS[tier].maxUsers} users, ${CLIENT_TIERS[tier].maxStorageGB}GB storage, $${CLIENT_TIERS[tier].price}/month)`,
        value: tier,
      })),
      default: 'free',
    },
    {
      type: 'input',
      name: 'industry',
      message: 'Industry (optional):',
      default: '',
    },
    {
      type: 'list',
      name: 'companySize',
      message: 'Company size:',
      choices: ['startup', 'small', 'medium', 'large', 'enterprise'],
      default: 'small',
    },
    {
      type: 'input',
      name: 'countryCode',
      message: 'Country code (ISO 3166-1 alpha-2):',
      default: 'US',
      validate: (input) =>
        /^[A-Z]{2}$/.test(input.toUpperCase()) ? true : 'Enter valid 2-letter country code',
    },
    {
      type: 'checkbox',
      name: 'apps',
      message: 'Applications to create:',
      choices: Object.keys(DEFAULT_APPS).map((app) => ({
        name: `${app} - ${DEFAULT_APPS[app].name}`,
        value: app,
        checked: true,
      })),
    },
    {
      type: 'confirm',
      name: 'createBuckets',
      message: 'Create storage buckets?',
      default: true,
    },
  ]);

  return answers;
}

/**
 * Main setup function
 */
async function setupClient(options) {
  const spinner = ora('Setting up client...').start();

  try {
    // Check if client already exists
    spinner.text = 'Checking if client already exists...';
    const { codeExists, domainExists } = await checkClientExists(
      options.clientCode,
      options.domain
    );

    if (codeExists) {
      spinner.fail(`Client code "${options.clientCode}" already exists`);
      return;
    }

    if (domainExists) {
      spinner.fail(`Domain "${options.domain}" already exists`);
      return;
    }

    // Create client record
    spinner.text = 'Creating client record...';
    const tierConfig = CLIENT_TIERS[options.tier];

    const clientData = {
      client_code: options.clientCode,
      legal_name: options.legalName,
      domain: options.domain,
      region: options.region,
      tier: options.tier,
      industry: options.industry || null,
      company_size: options.companySize,
      country_code: options.countryCode.toUpperCase(),
      max_users: tierConfig.maxUsers,
      max_storage_gb: tierConfig.maxStorageGB,
      settings: {},
      features: tierConfig.features,
    };

    // Use direct fetch as workaround for schema configuration issues
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
      throw new Error(`Failed to create client: HTTP ${response.status} - ${errorText}`);
    }

    const clients = await response.json();
    const client = clients[0];

    spinner.succeed(`Client "${options.clientCode}" created successfully`);

    // Create storage buckets
    if (options.createBuckets) {
      spinner.start('Creating storage buckets...');
      const buckets = await createStorageBuckets(options.clientCode);
      spinner.succeed(`Created ${buckets.length} storage buckets`);
    }

    // Create applications
    if (options.apps && options.apps.length > 0) {
      spinner.start('Creating applications...');
      const selectedApps = Object.fromEntries(
        Object.entries(DEFAULT_APPS).filter(([key]) => options.apps.includes(key))
      );
      const applications = await createClientApplications(
        client.id,
        options.clientCode,
        selectedApps
      );
      spinner.succeed(`Created ${applications.length} applications`);
    }

    // Display summary
    console.log(chalk.green.bold('\n✅ Client setup completed successfully!\n'));
    console.log(chalk.cyan('📋 Client Summary:'));
    console.log(`   Client Code: ${chalk.white(client.client_code)}`);
    console.log(`   Legal Name:  ${chalk.white(client.legal_name)}`);
    console.log(`   Domain:      ${chalk.white(client.domain)}`);
    console.log(
      `   Tier:        ${chalk.white(client.tier)} (${tierConfig.maxUsers} users, ${tierConfig.maxStorageGB}GB)`
    );
    console.log(`   Region:      ${chalk.white(client.region)}`);
    console.log(`   Setup Email: ${chalk.white(client.setup_email)}`);

    if (options.apps && options.apps.length > 0) {
      console.log(chalk.cyan('\n📱 Applications:'));
      for (const app of options.apps) {
        console.log(`   • ${app} - ${DEFAULT_APPS[app].name}`);
        console.log(`     URL: ${chalk.blue(`https://${client.domain}/${app}`)}`);
      }
    }

    console.log(chalk.yellow('\n🔗 Next Steps:'));
    console.log(`   1. Configure DNS for ${client.domain}`);
    console.log(`   2. Set up SSL certificates`);
    console.log(`   3. Deploy applications to CDN`);
    console.log(`   4. Create initial invitations`);
    console.log(
      `\n   Use: ${chalk.green(`npm run client:status ${client.client_code}`)} to check status\n`
    );
  } catch (error) {
    spinner.fail(`Setup failed: ${error.message}`);
    console.error(chalk.red(error.stack));
    process.exit(1);
  }
}

// CLI configuration
program
  .name('setup-client')
  .description('Provision a new client in the multi-tenant database system')
  .version('1.0.0');

program
  .command('interactive')
  .description('Interactive client setup wizard')
  .action(async () => {
    const options = await interactiveSetup();
    await setupClient(options);
  });

program
  .command('create')
  .description('Create client from command line arguments')
  .requiredOption('--client-code <code>', 'Client code (lowercase, alphanumeric, hyphens)')
  .requiredOption('--legal-name <name>', 'Legal company name')
  .option('--domain <domain>', 'Domain (defaults to client-code.thepia.net)')
  .option('--region <region>', 'Data region (EU, US, APAC)', 'EU')
  .option('--tier <tier>', 'Client tier (free, pro, enterprise)', 'free')
  .option('--industry <industry>', 'Industry')
  .option(
    '--company-size <size>',
    'Company size (startup, small, medium, large, enterprise)',
    'small'
  )
  .option('--country-code <code>', 'Country code (ISO 3166-1 alpha-2)', 'US')
  .option('--apps <apps>', 'Comma-separated list of apps to create', 'offboarding')
  .option('--no-buckets', 'Skip creating storage buckets')
  .action(async (options) => {
    // Validate and transform options
    const clientCode = options.clientCode.toLowerCase();
    const domain = options.domain || `${clientCode}.thepia.net`;
    const apps =
      typeof options.apps === 'string' ? options.apps.split(',').map((s) => s.trim()) : [];

    const setupOptions = {
      clientCode,
      legalName: options.legalName,
      domain,
      region: options.region.toUpperCase(),
      tier: options.tier,
      industry: options.industry,
      companySize: options.companySize,
      countryCode: options.countryCode,
      apps,
      createBuckets: options.buckets !== false,
    };

    // Validate inputs
    const clientCodeValidation = validateClientCode(clientCode);
    if (clientCodeValidation !== true) {
      console.error(chalk.red(`❌ ${clientCodeValidation}`));
      process.exit(1);
    }

    const domainValidation = validateDomain(domain);
    if (domainValidation !== true) {
      console.error(chalk.red(`❌ ${domainValidation}`));
      process.exit(1);
    }

    await setupClient(setupOptions);
  });

// Default to interactive mode if no command specified
if (process.argv.length === 2) {
  (async () => {
    const options = await interactiveSetup();
    await setupClient(options);
  })();
} else {
  program.parse();
}
