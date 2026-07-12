#!/usr/bin/env node

/**
 * Rich Demo Data Population Script
 *
 * Creates comprehensive demo data with variety and richness
 * matching and exceeding the mock data scope for compelling demos.
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
 * Create comprehensive employee dataset
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
      employment_status: 'future',
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
      employment_status: 'former',
      security_clearance: 'high',
      employment_type: 'full_time',
      work_location: 'hybrid',
      skills: ['Kubernetes', 'Docker', 'AWS', 'CI/CD', 'Infrastructure as Code'],
      languages: ['Swedish', 'English'],
    },
    // Additional employees for richer demo
    {
      person_code: 'emp-005',
      first_name: 'Lars',
      last_name: 'Petersen',
      company_email: 'lars.petersen@nets.eu',
      department: 'Engineering',
      position: 'Frontend Developer',
      location: 'Copenhagen, Denmark',
      manager: 'Anna Hansen',
      start_date: '2024-03-20',
      employment_status: 'future',
      security_clearance: 'medium',
      employment_type: 'full_time',
      work_location: 'hybrid',
      skills: ['React', 'Vue.js', 'TypeScript', 'CSS', 'Testing'],
      languages: ['Danish', 'English', 'German'],
    },
    {
      person_code: 'emp-006',
      first_name: 'Mette',
      last_name: 'Sørensen',
      company_email: 'mette.sorensen@nets.eu',
      department: 'Marketing',
      position: 'Marketing Specialist',
      location: 'Copenhagen, Denmark',
      manager: 'Erik Larsen',
      start_date: '2023-11-15',
      end_date: '2024-03-20',
      employment_status: 'active',
      security_clearance: 'low',
      employment_type: 'full_time',
      work_location: 'office',
      skills: [
        'Digital Marketing',
        'Content Strategy',
        'Analytics',
        'Social Media',
        'Brand Management',
      ],
      languages: ['Danish', 'English', 'French'],
    },
    {
      person_code: 'emp-007',
      first_name: 'John',
      last_name: 'Smith',
      company_email: 'john.smith@nets.eu',
      department: 'Security',
      position: 'Security Consultant',
      location: 'Copenhagen, Denmark',
      manager: 'Security Director',
      start_date: '2024-03-01',
      associate_status: 'contractor',
      security_clearance: 'high',
      employment_type: 'full_time',
      work_location: 'office',
      skills: ['Cybersecurity', 'Risk Assessment', 'Compliance', 'Audit', 'GDPR'],
      languages: ['English', 'Danish'],
    },
    {
      person_code: 'emp-008',
      first_name: 'Astrid',
      last_name: 'Lindberg',
      company_email: 'astrid.lindberg@nets.eu',
      department: 'Finance',
      position: 'Financial Analyst',
      location: 'Stockholm, Sweden',
      manager: 'Finance Director',
      start_date: '2024-01-08',
      employment_status: 'active',
      security_clearance: 'high',
      employment_type: 'full_time',
      work_location: 'hybrid',
      skills: ['Financial Analysis', 'Excel', 'SQL', 'Risk Management', 'Compliance'],
      languages: ['Swedish', 'English', 'Norwegian'],
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
 * Create employee enrollments with variety
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
    {
      person_code: 'emp-005',
      onboarding_completed: false,
      completion_percentage: 0,
      mentor: 'Anna Hansen',
      buddy_program: true,
      last_activity: '2024-03-15T10:00:00Z',
    },
    {
      person_code: 'emp-006',
      onboarding_completed: true,
      completion_date: '2023-11-22T17:00:00Z',
      completion_percentage: 100,
      mentor: 'Erik Larsen',
      buddy_program: true,
      offboarding_initiated: true,
      offboarding_completed: false,
      offboarding_reason: 'position_elimination',
      offboarding_initiated_date: '2024-03-16T09:00:00Z',
      exit_interview_completed: false,
      knowledge_transfer_completed: false,
      equipment_returned: false,
      access_revoked: false,
      final_payroll: false,
      last_activity: '2024-03-16T14:30:00Z',
    },
    {
      person_code: 'emp-007',
      onboarding_completed: false,
      completion_percentage: 20,
      mentor: 'Security Director',
      buddy_program: false,
      last_activity: '2024-03-08T09:00:00Z',
    },
    {
      person_code: 'emp-008',
      onboarding_completed: true,
      completion_date: '2024-01-15T17:00:00Z',
      completion_percentage: 100,
      mentor: 'Finance Director',
      buddy_program: true,
      last_activity: '2024-01-15T17:00:00Z',
    },
  ];

  const createdEnrollments = [];
  for (const enrollData of enrollmentsData) {
    const employee = employees.find((e) => e.person_code === enrollData.person_code);
    if (!employee) continue;

    const { person_code, ...enrollmentData } = enrollData;
    const enrollment = await apiCall('people_enrollments', 'POST', {
      ...enrollmentData,
      person_id: employee.id,
    });
    createdEnrollments.push(enrollment[0]);
  }

  return createdEnrollments;
}

/**
 * Create comprehensive documents dataset
 */
async function createDocuments(employees) {
  const documentsData = [
    // Anna Hansen - Complete set
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
          reviewed_by: 'Security Team',
        },
        {
          name: 'GDPR Consent Form',
          type: 'gdpr_consent',
          employment_status: 'verified',
          uploaded_at: '2024-01-10T11:00:00Z',
          reviewed_at: '2024-01-12T15:00:00Z',
          reviewed_by: 'Compliance Team',
        },
      ],
    },
    // Erik Larsen - Product role specific
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
        {
          name: 'Product NDA',
          type: 'other',
          employment_status: 'verified',
          uploaded_at: '2024-01-25T13:00:00Z',
          reviewed_at: '2024-01-26T12:00:00Z',
          reviewed_by: 'Legal Team',
        },
      ],
    },
    // Sofia Berg - Pending onboarding
    {
      person_code: 'emp-003',
      documents: [
        {
          name: 'Employment Contract',
          type: 'contract',
          employment_status: 'future',
          uploaded_at: '2024-02-25T14:00:00Z',
        },
        {
          name: 'Tax Forms',
          type: 'tax_form',
          employment_status: 'uploaded',
          uploaded_at: '2024-02-26T09:30:00Z',
        },
        {
          name: 'Design Portfolio Review',
          type: 'other',
          employment_status: 'uploaded',
          uploaded_at: '2024-02-26T10:00:00Z',
        },
      ],
    },
    // Magnus Johansson - Offboarded
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
    // Mette Sørensen - Offboarding in progress
    {
      person_code: 'emp-006',
      documents: [
        {
          name: 'Termination Notice',
          type: 'termination_notice',
          employment_status: 'future',
          uploaded_at: '2024-03-16T09:00:00Z',
        },
        {
          name: 'Marketing Campaign Handover',
          type: 'knowledge_transfer',
          employment_status: 'uploaded',
          uploaded_at: '2024-03-16T14:00:00Z',
        },
      ],
    },
    // John Smith - Security consultant
    {
      person_code: 'emp-007',
      documents: [
        {
          name: 'Contractor Agreement',
          type: 'contract',
          employment_status: 'verified',
          uploaded_at: '2024-03-01T09:00:00Z',
          reviewed_at: '2024-03-02T10:00:00Z',
          reviewed_by: 'Legal Team',
        },
        {
          name: 'Security Clearance Form',
          type: 'other',
          employment_status: 'future',
          uploaded_at: '2024-03-01T10:00:00Z',
        },
      ],
    },
    // Astrid Lindberg - Finance
    {
      person_code: 'emp-008',
      documents: [
        {
          name: 'Employment Contract',
          type: 'contract',
          employment_status: 'verified',
          uploaded_at: '2024-01-02T10:00:00Z',
          reviewed_at: '2024-01-03T14:00:00Z',
          reviewed_by: 'HR Team',
        },
        {
          name: 'Financial Compliance Certification',
          type: 'financial_disclosure',
          employment_status: 'verified',
          uploaded_at: '2024-01-02T11:00:00Z',
          reviewed_at: '2024-01-03T15:00:00Z',
          reviewed_by: 'Compliance Team',
        },
        {
          name: 'Background Check Results',
          type: 'other',
          employment_status: 'verified',
          uploaded_at: '2024-01-05T09:00:00Z',
          reviewed_at: '2024-01-05T16:00:00Z',
          reviewed_by: 'Security Team',
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
        person_id: employee.id,
      });
      createdDocuments.push(document[0]);
    }
  }

  return createdDocuments;
}

/**
 * Create comprehensive tasks dataset
 */
async function createTasks(employees) {
  const tasksData = [
    // Anna Hansen - Completed onboarding
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
        {
          title: 'Security Clearance Verification',
          description: 'Complete high-level security clearance process',
          category: 'security',
          employment_status: 'completed',
          priority: 'high',
          assigned_by: 'Security Team',
          assigned_at: '2024-01-12T09:00:00Z',
          completed_at: '2024-01-19T17:00:00Z',
        },
      ],
    },
    // Erik Larsen - Product manager
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
    // Sofia Berg - Pending onboarding
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
        {
          title: 'Design System Familiarization',
          description: 'Learn Nets design system and brand guidelines',
          category: 'training',
          employment_status: 'not_started',
          priority: 'medium',
          assigned_by: 'Design Team',
          assigned_at: '2024-03-01T10:00:00Z',
          due_date: '2024-03-08T17:00:00Z',
        },
      ],
    },
    // Magnus Johansson - Offboarded
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
    // Mette Sørensen - Offboarding in progress
    {
      person_code: 'emp-006',
      tasks: [
        {
          title: 'Campaign Handover',
          description: 'Transfer ownership of active marketing campaigns',
          category: 'knowledge_transfer',
          employment_status: 'in_progress',
          priority: 'high',
          assigned_by: 'Erik Larsen',
          assigned_at: '2024-03-16T09:00:00Z',
          due_date: '2024-03-18T17:00:00Z',
        },
        {
          title: 'Brand Asset Organization',
          description: 'Organize and document brand assets and guidelines',
          category: 'knowledge_transfer',
          employment_status: 'not_started',
          priority: 'medium',
          assigned_by: 'Marketing Director',
          assigned_at: '2024-03-16T10:00:00Z',
          due_date: '2024-03-20T17:00:00Z',
        },
      ],
    },
    // John Smith - Security consultant
    {
      person_code: 'emp-007',
      tasks: [
        {
          title: 'Security Assessment Training',
          description: 'Complete Nets-specific security protocols training',
          category: 'training',
          employment_status: 'in_progress',
          priority: 'high',
          assigned_by: 'Security Director',
          assigned_at: '2024-03-01T09:00:00Z',
          due_date: '2024-03-15T17:00:00Z',
        },
        {
          title: 'Access Credential Setup',
          description: 'Set up high-security access credentials and tokens',
          category: 'security',
          employment_status: 'not_started',
          priority: 'high',
          assigned_by: 'IT Security',
          assigned_at: '2024-03-01T10:00:00Z',
          due_date: '2024-03-10T17:00:00Z',
        },
      ],
    },
    // Astrid Lindberg - Finance
    {
      person_code: 'emp-008',
      tasks: [
        {
          title: 'Financial Systems Training',
          description: 'Learn Nets financial reporting and analysis systems',
          category: 'training',
          employment_status: 'completed',
          priority: 'high',
          assigned_by: 'Finance Director',
          assigned_at: '2024-01-08T09:00:00Z',
          completed_at: '2024-01-12T17:00:00Z',
        },
        {
          title: 'Compliance Certification',
          description: 'Complete financial compliance and audit training',
          category: 'compliance',
          employment_status: 'completed',
          priority: 'high',
          assigned_by: 'Compliance Team',
          assigned_at: '2024-01-10T09:00:00Z',
          completed_at: '2024-01-15T17:00:00Z',
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
        person_id: employee.id,
      });
      createdTasks.push(task[0]);
    }
  }

  return createdTasks;
}

/**
 * Generate comprehensive invitations
 */
function generateJWTHash(employee, appCode) {
  const jwtPayload = {
    iss: 'api.thepia.com',
    aud: 'flows.thepia.net',
    sub: `inv-${employee.person_code}-${Date.now()}`,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
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

async function createRichInvitations(clientId, applications, employees) {
  const appMap = {};
  for (const app of applications) {
    appMap[app.app_code] = app.id;
  }

  const invitationsData = [
    {
      person_code: 'emp-005', // Lars - new onboarding invitation
      app_code: 'onboarding',
      employment_status: 'future',
      created_by: 'Anna Hansen',
      permissions: ['document_upload', 'task_completion', 'training_access'],
    },
    {
      person_code: 'emp-006', // Mette - offboarding invitation
      app_code: 'offboarding',
      employment_status: 'future',
      created_by: 'Erik Larsen',
      permissions: ['document_upload', 'equipment_return', 'exit_interview'],
    },
    {
      person_code: 'emp-007', // John - expired onboarding invitation
      app_code: 'onboarding',
      employment_status: 'expired',
      created_by: 'Anna Hansen',
      permissions: ['document_upload', 'security_clearance', 'training_access'],
    },
  ];

  const createdInvitations = [];
  for (const invData of invitationsData) {
    const employee = employees.find((e) => e.person_code === invData.person_code);
    const appId = appMap[invData.app_code];

    if (!employee || !appId) continue;

    const jwtHash = generateJWTHash(employee, invData.app_code);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Adjust expiration for expired invitation
    if (invData.status === 'expired') {
      expiresAt.setDate(expiresAt.getDate() - 14); // 2 weeks ago
    }

    const invitation = await apiCall('invitations', 'POST', {
      client_id: clientId,
      app_id: appId,
      jwt_token_hash: jwtHash,
      permissions: invData.permissions,
      restrictions: {
        max_sessions: 5,
        person_code: employee.person_code,
        department: employee.department,
      },
      employment_status: invData.status,
      expires_at: expiresAt.toISOString(),
      created_by: invData.created_by,
      client_data: {
        person_id: employee.id,
        person_code: employee.person_code,
        department: employee.department,
        position: employee.position,
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
async function populateRichDemo(_options = {}) {
  const spinner = ora('Populating rich demo data...').start();

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

    // Create invitations
    spinner.start('Creating rich invitations...');
    const invitations = await createRichInvitations(client.id, applications, employees);
    spinner.succeed(`Created ${invitations.length} invitations`);

    // Display summary
    console.log(chalk.green.bold('\\n✅ Rich demo data population completed!\\n'));
    console.log(chalk.cyan('📊 Rich Demo Data Summary:'));
    console.log(`   Client:       ${chalk.white(client.legal_name)}`);
    console.log(`   Employees:    ${chalk.white(employees.length)} (vs 4 in mock)`);
    console.log(`   Enrollments:  ${chalk.white(enrollments.length)}`);
    console.log(`   Documents:    ${chalk.white(documents.length)} (vs ~8 in mock)`);
    console.log(`   Tasks:        ${chalk.white(tasks.length)} (vs ~6 in mock)`);
    console.log(`   Invitations:  ${chalk.white(invitations.length)} (vs 3 in mock)`);

    console.log(chalk.cyan('\\n👥 Employee Status Distribution:'));
    const statusCounts = employees.reduce((acc, emp) => {
      acc[emp.status] = (acc[emp.status] || 0) + 1;
      return acc;
    }, {});
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   • ${status}: ${count} employees`);
    });

    console.log(chalk.cyan('\\n📄 Document Status Distribution:'));
    const docStatusCounts = documents.reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1;
      return acc;
    }, {});
    Object.entries(docStatusCounts).forEach(([status, count]) => {
      console.log(`   • ${status}: ${count} documents`);
    });

    console.log(chalk.cyan('\\n✅ Task Status Distribution:'));
    const taskStatusCounts = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});
    Object.entries(taskStatusCounts).forEach(([status, count]) => {
      console.log(`   • ${status}: ${count} tasks`);
    });

    console.log(chalk.yellow('\\n🔗 Next Steps:'));
    console.log(`   1. Verify rich data: Check Supabase dashboard api schema`);
    console.log(`   2. Launch demo: ${chalk.green('pnpm run demo:admin')}`);
    console.log(`   3. Update UI to connect to real database`);
    console.log(`   4. Compare with mock data completeness`);
    console.log('');
  } catch (error) {
    spinner.fail(`Rich demo population failed: ${error.message}`);
    console.error(chalk.red(error.stack));
    process.exit(1);
  }
}

// CLI configuration
program
  .name('populate-rich-demo')
  .description('Create rich demo data exceeding UI mock data scope')
  .version('1.0.0');

program
  .command('run')
  .description('Populate comprehensive rich demo data')
  .option('--force', 'Overwrite existing data')
  .option('--verbose', 'Show detailed output')
  .action(async (options) => {
    await populateRichDemo(options);
  });

// Default to run command if no arguments
if (process.argv.length === 2) {
  populateRichDemo();
} else {
  program.parse();
}
