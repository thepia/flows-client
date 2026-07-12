#!/usr/bin/env node

/**
 * Full Demo Data Population Script
 *
 * Creates comprehensive demo data matching the richness of the mock data
 * in the Svelte UI, including employees, enrollments, documents, and tasks.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

/**
 * Direct API helper function
 */
async function apiCall(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
  };

  if (data && (method === 'POST' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
    if (method === 'POST') {
      options.headers.Prefer = 'return=representation';
    }
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `API call failed: ${method} ${endpoint} - HTTP ${response.status}: ${errorText}`
    );
  }

  return method === 'DELETE' ? null : await response.json();
}

/**
 * Get demo client and applications
 */
async function getDemoClientAndApps() {
  const configPath = path.join(__dirname, '../config/client.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const clientCode = config.client.client_code;

  const clients = await apiCall(`clients?select=*&client_code=eq.${clientCode}`);
  if (!clients || clients.length === 0) {
    throw new Error('Demo client not found. Run demo:setup first.');
  }

  const client = clients[0];
  const applications = await apiCall(`client_applications?select=*&client_id=eq.${client.id}`);

  return { client, applications };
}

/**
 * Create employees
 */
async function createEmployees(clientId) {
  const employeesData = [
    {
      person_code: 'emp-001',
      first_name: 'Anna',
      last_name: 'Hansen',
      company_email: 'anna.hansen@nets.eu',
      department: 'Engineering',
      position: 'Senior Software Engineer',
      location: 'Copenhagen, Denmark',
      manager: 'Lars Nielsen',
      start_date: '2024-01-15',
      employment_status: 'active',
      security_clearance: 'high',
      employment_type: 'full_time',
      work_location: 'hybrid',
      skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Payment APIs'],
      languages: ['Danish', 'English', 'Swedish'],
    },
    {
      person_code: 'emp-002',
      first_name: 'Erik',
      last_name: 'Larsen',
      company_email: 'erik.larsen@nets.eu',
      department: 'Product',
      position: 'Product Manager',
      location: 'Copenhagen, Denmark',
      manager: 'Maria Andersen',
      start_date: '2024-02-01',
      employment_status: 'active',
      security_clearance: 'medium',
      employment_type: 'full_time',
      work_location: 'office',
      skills: ['Product Strategy', 'Agile', 'Data Analysis', 'Financial Services', 'User Research'],
      languages: ['Danish', 'English', 'Norwegian'],
    },
    {
      person_code: 'emp-003',
      first_name: 'Sofia',
      last_name: 'Berg',
      company_email: 'sofia.berg@nets.eu',
      department: 'Design',
      position: 'UX Designer',
      location: 'Stockholm, Sweden',
      manager: 'Peter Olsen',
      start_date: '2024-03-01',
      employment_status: 'pending',
      security_clearance: 'medium',
      employment_type: 'full_time',
      work_location: 'remote',
      skills: ['UX Design', 'Figma', 'User Research', 'Prototyping', 'Accessibility'],
      languages: ['Swedish', 'English', 'Danish'],
    },
    {
      person_code: 'emp-004',
      first_name: 'Magnus',
      last_name: 'Johansson',
      company_email: 'magnus.johansson@nets.eu',
      department: 'Engineering',
      position: 'DevOps Engineer',
      location: 'Stockholm, Sweden',
      manager: 'Lars Nielsen',
      start_date: '2023-12-01',
      end_date: '2024-03-15',
      employment_status: 'offboarded',
      security_clearance: 'high',
      employment_type: 'full_time',
      work_location: 'hybrid',
      skills: ['Kubernetes', 'Docker', 'AWS', 'CI/CD', 'Infrastructure as Code'],
      languages: ['Swedish', 'English'],
    },
  ];

  const createdEmployees = [];
  for (const empData of employeesData) {
    const employee = await apiCall('people', 'POST', {
      ...empData,
      client_id: clientId,
    });
    createdEmployees.push(employee[0]);
  }

  return createdEmployees;
}

/**
 * Create employee enrollments
 */
async function createEmployeeEnrollments(employees) {
  const enrollmentsData = [
    {
      person_code: 'emp-001',
      onboarding_completed: true,
      completion_date: '2024-01-20T16:00:00Z',
      completion_percentage: 100,
      mentor: 'Lars Nielsen',
      buddy_program: true,
      last_activity: '2024-01-15T16:00:00Z',
    },
    {
      person_code: 'emp-002',
      onboarding_completed: true,
      completion_date: '2024-02-07T17:00:00Z',
      completion_percentage: 100,
      mentor: 'Maria Andersen',
      buddy_program: true,
      last_activity: '2024-02-05T17:00:00Z',
    },
    {
      person_code: 'emp-003',
      onboarding_completed: false,
      completion_percentage: 45,
      mentor: 'Peter Olsen',
      buddy_program: true,
      last_activity: '2024-03-02T15:30:00Z',
    },
    {
      person_code: 'emp-004',
      onboarding_completed: true,
      completion_date: '2023-12-08T17:00:00Z',
      completion_percentage: 100,
      mentor: 'Lars Nielsen',
      buddy_program: true,
      offboarding_initiated: true,
      offboarding_completed: true,
      offboarding_reason: 'voluntary_resignation',
      offboarding_initiated_date: '2024-03-01T09:00:00Z',
      offboarding_completion_date: '2024-03-15T17:00:00Z',
      new_position: 'Senior DevOps Engineer at Klarna',
      exit_interview_completed: true,
      knowledge_transfer_completed: true,
      equipment_returned: true,
      access_revoked: true,
      final_payroll: true,
      last_activity: '2024-03-15T17:00:00Z',
    },
  ];

  const createdEnrollments = [];
  for (const enrollData of enrollmentsData) {
    const employee = employees.find((e) => e.person_code === enrollData.person_code);
    if (!employee) continue;

    const { person_code, ...enrollmentData } = enrollData;
    const enrollment = await apiCall('people_enrollments', 'POST', {
      ...enrollmentData,
      employee_id: employee.id,
    });
    createdEnrollments.push(enrollment[0]);
  }

  return createdEnrollments;
}

/**
 * Create documents
 */
async function createDocuments(employees) {
  const documentsData = [
    // Anna Hansen documents
    {
      person_code: 'emp-001',
      documents: [
        {
          name: 'Employment Contract',
          type: 'contract',
          employment_status: 'verified',
          uploaded_at: '2024-01-10T10:00:00Z',
          reviewed_at: '2024-01-12T14:30:00Z',
          reviewed_by: 'HR Team',
        },
        {
          name: 'ID Verification',
          type: 'id_verification',
          employment_status: 'verified',
          uploaded_at: '2024-01-10T10:30:00Z',
          reviewed_at: '2024-01-12T14:35:00Z',
          reviewed_by: 'HR Team',
        },
        {
          name: 'GDPR Consent',
          type: 'gdpr_consent',
          employment_status: 'verified',
          uploaded_at: '2024-01-10T11:00:00Z',
          reviewed_at: '2024-01-12T15:00:00Z',
          reviewed_by: 'Compliance Team',
        },
      ],
    },
    // Erik Larsen documents
    {
      person_code: 'emp-002',
      documents: [
        {
          name: 'Employment Contract',
          type: 'contract',
          employment_status: 'verified',
          uploaded_at: '2024-01-25T11:00:00Z',
          reviewed_at: '2024-01-26T10:00:00Z',
          reviewed_by: 'HR Team',
        },
        {
          name: 'Financial Disclosure',
          type: 'financial_disclosure',
          employment_status: 'verified',
          uploaded_at: '2024-01-25T12:00:00Z',
          reviewed_at: '2024-01-26T11:00:00Z',
          reviewed_by: 'Compliance Team',
        },
      ],
    },
    // Sofia Berg documents
    {
      person_code: 'emp-003',
      documents: [
        {
          name: 'Employment Contract',
          type: 'contract',
          employment_status: 'pending',
          uploaded_at: '2024-02-25T14:00:00Z',
        },
        {
          name: 'Tax Forms',
          type: 'tax_form',
          employment_status: 'uploaded',
          uploaded_at: '2024-02-26T09:30:00Z',
        },
      ],
    },
    // Magnus Johansson documents
    {
      person_code: 'emp-004',
      documents: [
        {
          name: 'Resignation Letter',
          type: 'resignation_letter',
          employment_status: 'verified',
          uploaded_at: '2024-03-01T09:00:00Z',
          reviewed_at: '2024-03-01T14:00:00Z',
          reviewed_by: 'HR Director',
        },
        {
          name: 'Knowledge Transfer Document',
          type: 'knowledge_transfer',
          employment_status: 'verified',
          uploaded_at: '2024-03-10T16:00:00Z',
          reviewed_at: '2024-03-11T10:00:00Z',
          reviewed_by: 'Lars Nielsen',
        },
        {
          name: 'Equipment Return Receipt',
          type: 'equipment_return',
          employment_status: 'verified',
          uploaded_at: '2024-03-14T12:00:00Z',
          reviewed_at: '2024-03-14T14:00:00Z',
          reviewed_by: 'IT Department',
        },
      ],
    },
  ];

  const createdDocuments = [];
  for (const empDocs of documentsData) {
    const employee = employees.find((e) => e.person_code === empDocs.person_code);
    if (!employee) continue;

    for (const docData of empDocs.documents) {
      const document = await apiCall('documents', 'POST', {
        ...docData,
        employee_id: employee.id,
      });
      createdDocuments.push(document[0]);
    }
  }

  return createdDocuments;
}

/**
 * Create tasks
 */
async function createTasks(employees) {
  const tasksData = [
    // Anna Hansen tasks
    {
      person_code: 'emp-001',
      tasks: [
        {
          title: 'Complete IT Setup',
          description: 'Set up laptop, email, and access credentials',
          category: 'equipment',
          employment_status: 'completed',
          priority: 'high',
          assigned_by: 'IT Department',
          assigned_at: '2024-01-15T09:00:00Z',
          completed_at: '2024-01-15T16:00:00Z',
        },
        {
          title: 'Payment Systems Training',
          description: 'Complete Nets payment platform training',
          category: 'training',
          employment_status: 'completed',
          priority: 'high',
          assigned_by: 'Product Team',
          assigned_at: '2024-01-16T09:00:00Z',
          completed_at: '2024-01-18T17:00:00Z',
        },
      ],
    },
    // Erik Larsen tasks
    {
      person_code: 'emp-002',
      tasks: [
        {
          title: 'Product Training',
          description: 'Complete product knowledge training modules',
          category: 'training',
          employment_status: 'completed',
          priority: 'medium',
          assigned_by: 'Product Team',
          assigned_at: '2024-02-01T09:00:00Z',
          completed_at: '2024-02-05T17:00:00Z',
        },
        {
          title: 'Stakeholder Introductions',
          description: 'Meet key internal and external stakeholders',
          category: 'networking',
          employment_status: 'completed',
          priority: 'medium',
          assigned_by: 'Maria Andersen',
          assigned_at: '2024-02-02T09:00:00Z',
          completed_at: '2024-02-06T16:00:00Z',
        },
      ],
    },
    // Sofia Berg tasks
    {
      person_code: 'emp-003',
      tasks: [
        {
          title: 'Design Tools Setup',
          description: 'Install and configure Figma, Adobe Creative Suite',
          category: 'equipment',
          employment_status: 'in_progress',
          priority: 'high',
          assigned_by: 'Design Team',
          assigned_at: '2024-03-01T09:00:00Z',
          due_date: '2024-03-05T17:00:00Z',
        },
        {
          title: 'Complete Company Handbook',
          description: 'Read and acknowledge company policies',
          category: 'compliance',
          employment_status: 'not_started',
          priority: 'medium',
          assigned_by: 'HR Team',
          assigned_at: '2024-03-01T09:00:00Z',
          due_date: '2024-03-10T17:00:00Z',
        },
      ],
    },
    // Magnus Johansson tasks
    {
      person_code: 'emp-004',
      tasks: [
        {
          title: 'Knowledge Transfer Sessions',
          description: 'Conduct handover sessions for all managed systems',
          category: 'knowledge_transfer',
          employment_status: 'completed',
          priority: 'high',
          assigned_by: 'Lars Nielsen',
          assigned_at: '2024-03-01T09:00:00Z',
          completed_at: '2024-03-10T17:00:00Z',
        },
        {
          title: 'Access Revocation Audit',
          description: 'Verify all system access has been properly revoked',
          category: 'security',
          employment_status: 'completed',
          priority: 'high',
          assigned_by: 'Security Team',
          assigned_at: '2024-03-14T09:00:00Z',
          completed_at: '2024-03-15T10:00:00Z',
        },
      ],
    },
  ];

  const createdTasks = [];
  for (const empTasks of tasksData) {
    const employee = employees.find((e) => e.person_code === empTasks.person_code);
    if (!employee) continue;

    for (const taskData of empTasks.tasks) {
      const task = await apiCall('tasks', 'POST', {
        ...taskData,
        employee_id: employee.id,
      });
      createdTasks.push(task[0]);
    }
  }

  return createdTasks;
}

/**
 * Generate JWT hash for invitation
 */
function generateJWTHash(employee, appCode) {
  const jwtPayload = {
    iss: 'api.thepia.com',
    aud: 'flows.thepia.net',
    sub: `inv-${employee.person_code}-${Date.now()}`,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    iat: Math.floor(Date.now() / 1000),
    invitation: {
      invitee: {
        fullName: `${employee.first_name} ${employee.last_name}`,
        companyEmail: employee.company_email,
        privateEmail: employee.company_email.replace('@nets.eu', '@gmail.com'),
      },
      position: employee.position,
      department: employee.department,
      type: appCode,
    },
  };

  return crypto.createHash('sha256').update(JSON.stringify(jwtPayload)).digest('hex');
}

/**
 * Create matching invitations for employees
 */
async function createMatchingInvitations(clientId, applications, employees) {
  const appMap = {};
  for (const app of applications) {
    appMap[app.app_code] = app.id;
  }

  const invitationsData = [
    {
      person_code: 'emp-003', // Sofia - pending onboarding
      app_code: 'onboarding',
      employment_status: 'sent',
      permissions: ['document_upload', 'task_completion', 'training_access'],
    },
  ];

  const createdInvitations = [];
  for (const invData of invitationsData) {
    const employee = employees.find((e) => e.person_code === invData.person_code);
    const appId = appMap[invData.app_code];

    if (!employee || !appId) continue;

    const jwtHash = generateJWTHash(employee, invData.app_code);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await apiCall('invitations', 'POST', {
      client_id: clientId,
      app_id: appId,
      jwt_token_hash: jwtHash,
      permissions: invData.permissions,
      restrictions: {
        max_sessions: 5,
        person_code: employee.person_code,
      },
      employment_status: invData.status,
      expires_at: expiresAt.toISOString(),
      created_by: 'demo-system',
      client_data: {
        employee_id: employee.id,
        person_code: employee.person_code,
        department: employee.department,
        demo_invitation: true,
      },
    });

    createdInvitations.push(invitation[0]);
  }

  return createdInvitations;
}

/**
 * Main population function
 */
async function populateFullDemo(_options = {}) {
  const spinner = ora('Populating comprehensive demo data...').start();

  try {
    // Get demo client and applications
    spinner.text = 'Getting demo client and applications...';
    const { client, applications } = await getDemoClientAndApps();

    // Create employees
    spinner.text = 'Creating employees...';
    const employees = await createEmployees(client.id);
    spinner.succeed(`Created ${employees.length} employees`);

    // Create employee enrollments
    spinner.start('Creating employee enrollments...');
    const enrollments = await createEmployeeEnrollments(employees);
    spinner.succeed(`Created ${enrollments.length} employee enrollments`);

    // Create documents
    spinner.start('Creating documents...');
    const documents = await createDocuments(employees);
    spinner.succeed(`Created ${documents.length} documents`);

    // Create tasks
    spinner.start('Creating tasks...');
    const tasks = await createTasks(employees);
    spinner.succeed(`Created ${tasks.length} tasks`);

    // Create matching invitations
    spinner.start('Creating matching invitations...');
    const invitations = await createMatchingInvitations(client.id, applications, employees);
    spinner.succeed(`Created ${invitations.length} matching invitations`);

    // Display summary
    console.log(chalk.green.bold('\\n✅ Full demo data population completed!\\n'));
    console.log(chalk.cyan('📊 Created Data Summary:'));
    console.log(`   Client:       ${chalk.white(client.legal_name)}`);
    console.log(`   Employees:    ${chalk.white(employees.length)}`);
    console.log(`   Enrollments:  ${chalk.white(enrollments.length)}`);
    console.log(`   Documents:    ${chalk.white(documents.length)}`);
    console.log(`   Tasks:        ${chalk.white(tasks.length)}`);
    console.log(`   Invitations:  ${chalk.white(invitations.length)}`);

    console.log(chalk.cyan('\\n👥 Employees Created:'));
    for (const emp of employees) {
      console.log(`   • ${emp.first_name} ${emp.last_name} (${emp.position}) - ${emp.status}`);
    }

    console.log(chalk.yellow('\\n🔗 Next Steps:'));
    console.log(`   1. Verify data: Check Supabase dashboard api schema`);
    console.log(`   2. Launch demo: ${chalk.green('pnpm run demo:admin')}`);
    console.log(`   3. Update UI to use real data instead of mocks`);
    console.log('');
  } catch (error) {
    spinner.fail(`Demo population failed: ${error.message}`);
    console.error(chalk.red(error.stack));
    process.exit(1);
  }
}

// CLI configuration
program
  .name('populate-full-demo')
  .description('Create comprehensive demo data matching UI mock data richness')
  .version('1.0.0');

program
  .command('run')
  .description('Populate comprehensive demo data')
  .option('--force', 'Overwrite existing data')
  .option('--verbose', 'Show detailed output')
  .action(async (options) => {
    await populateFullDemo(options);
  });

// Default to run command if no arguments
if (process.argv.length === 2) {
  populateFullDemo();
} else {
  program.parse();
}
