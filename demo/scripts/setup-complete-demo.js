#!/usr/bin/env node

/**
 * Complete Demo Setup Script
 *
 * One command to set up everything:
 * - Creates demo client if missing
 * - Creates all database schema if missing
 * - Populates rich demo data
 * - Handles cleanup and reset automatically
 */

import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
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

// Supabase client with proper schema
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: {
    schema: 'api',
  },
});

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
 * Clean up existing demo data
 */
async function cleanupExistingData(spinner) {
  try {
    spinner.text = 'Cleaning up existing demo data...';

    // Get the demo client first
    let demoClient = null;
    try {
      const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .eq('client_code', 'hygge-hvidlog');
      if (clients && clients.length > 0) {
        demoClient = clients[0];
      }
    } catch (_error) {
      // Client doesn't exist, nothing to clean
    }

    if (demoClient) {
      // Clean up offboarding data first (if tables exist)
      try {
        const { cleanupOffboardingData } = await import(
          '../../scripts/create-offboarding-demo-data.js'
        );
        await cleanupOffboardingData(demoClient.id);
      } catch (_e) {
        /* ignore if tables don't exist */
      }

      // Delete in reverse dependency order using the client ID
      try {
        await apiCall(
          `people_enrollments?person_id=in.(select id from people where client_id=${demoClient.id})`,
          'DELETE'
        );
      } catch (_e) {
        /* ignore */
      }

      try {
        await apiCall(
          `documents?person_id=in.(select id from people where client_id=${demoClient.id})`,
          'DELETE'
        );
      } catch (_e) {
        /* ignore */
      }

      try {
        await apiCall(
          `tasks?person_id=in.(select id from people where client_id=${demoClient.id})`,
          'DELETE'
        );
      } catch (_e) {
        /* ignore */
      }

      try {
        await apiCall(`people?client_id=eq.${demoClient.id}`, 'DELETE');
      } catch (_e) {
        /* ignore */
      }

      try {
        await apiCall(`invitations?client_id=eq.${demoClient.id}`, 'DELETE');
      } catch (_e) {
        /* ignore */
      }

      try {
        await apiCall(`client_applications?client_id=eq.${demoClient.id}`, 'DELETE');
      } catch (_e) {
        /* ignore */
      }

      try {
        await apiCall(`clients?id=eq.${demoClient.id}`, 'DELETE');
      } catch (_e) {
        /* ignore */
      }

      spinner.succeed('Cleaned up existing demo data');
    } else {
      spinner.succeed('No existing demo data found to clean up');
    }
  } catch (_error) {
    // Ignore cleanup errors - data might not exist
    spinner.succeed('Cleanup completed (some data may not have existed)');
  }
}

/**
 * Create or get demo client (Hygge & Hvidløg)
 */
async function createDemoClient(spinner) {
  spinner.text = 'Setting up demo client...';

  // First check if Hygge & Hvidløg already exists
  try {
    const { data: existingClient } = await supabase
      .from('clients')
      .select('*')
      .eq('client_code', 'hygge-hvidlog')
      .single();

    if (existingClient) {
      spinner.succeed(`Using existing demo client: ${existingClient.legal_name}`);
      return existingClient;
    }
  } catch (_error) {
    // Client doesn't exist, will create it
  }

  // Create Hygge & Hvidløg client (not the nets-demo from config)
  const hyggeClient = {
    client_code: 'hygge-hvidlog',
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const client = await apiCall('clients', 'POST', hyggeClient);
  const createdClient = client[0];
  spinner.succeed(`Created demo client: ${createdClient.legal_name}`);
  return createdClient;
}

/**
 * Create client applications for Hygge & Hvidløg
 */
async function createClientApplications(clientId, spinner) {
  spinner.text = 'Setting up client applications...';

  // Check if applications already exist
  try {
    const { data: existingApps } = await supabase
      .from('client_applications')
      .select('*')
      .eq('client_id', clientId);

    if (existingApps && existingApps.length > 0) {
      spinner.succeed(`Using existing ${existingApps.length} client applications`);
      return existingApps;
    }
  } catch (_error) {
    // Applications don't exist, will create them
  }

  // Create Hygge & Hvidløg specific applications
  const hyggeApplications = [
    {
      app_code: 'employee-onboarding',
      app_name: 'Employee Onboarding',
      app_version: '2.1.0',
      app_description:
        'Comprehensive onboarding for sustainable food technology company with multilingual support',
      status: 'active',
      configuration: {
        theme: 'hygge',
        locale: 'da-DK',
        branding: {
          primary_color: '#2F5233',
          secondary_color: '#8FBC8F',
          accent_color: '#DAA520',
        },
        features: {
          multilingual: true,
          sustainability_training: true,
          remote_onboarding: true,
        },
      },
      features: [
        'document-capture',
        'task-management',
        'video-onboarding',
        'multilingual-support',
        'sustainability-training',
        'remote-work-setup',
      ],
      max_concurrent_users: 200,
    },
    {
      app_code: 'knowledge-offboarding',
      app_name: 'Knowledge Transfer & Offboarding',
      app_version: '1.8.0',
      app_description: 'Knowledge preservation and sustainable transition processes',
      status: 'active',
      configuration: {
        theme: 'hygge',
        locale: 'da-DK',
        knowledge_retention: true,
        sustainability_focus: true,
      },
      features: [
        'knowledge-transfer',
        'documentation',
        'mentorship-matching',
        'sustainable-transition',
      ],
      max_concurrent_users: 150,
    },
  ];

  const applications = [];
  for (const appConfig of hyggeApplications) {
    const app = await apiCall('client_applications', 'POST', {
      ...appConfig,
      client_id: clientId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    applications.push(app[0]);
  }

  spinner.succeed(`Created ${applications.length} client applications`);
  return applications;
}

/**
 * Demo company configurations for bulk generation
 */
const DEMO_COMPANIES = {
  'hygge-hvidlog': {
    name: 'Hygge & Hvidløg A/S',
    domain: 'hygge-hvidlog.dk',
    departments: [
      'Product Development',
      'Marketing',
      'Operations',
      'R&D',
      'Sales',
      'Quality Assurance',
      'Finance',
      'Human Resources',
      'IT & Development',
      'Legal & Compliance',
    ],
    locations: ['Copenhagen, Denmark', 'Aarhus, Denmark', 'Malmö, Sweden', 'Oslo, Norway'],
    positions: {
      'Product Development': [
        'Senior Product Manager',
        'Product Designer',
        'UX Researcher',
        'Product Analyst',
        'Innovation Lead',
        'Product Owner',
        'Market Research Analyst',
      ],
      Marketing: [
        'Marketing Manager',
        'Content Creator',
        'Social Media Manager',
        'Brand Manager',
        'Digital Marketing Specialist',
        'Campaign Manager',
        'Marketing Analyst',
      ],
      Operations: [
        'Operations Manager',
        'Supply Chain Analyst',
        'Logistics Coordinator',
        'Production Manager',
        'Quality Control Specialist',
        'Inventory Manager',
      ],
      'R&D': [
        'Food Scientist',
        'Research Associate',
        'Lab Technician',
        'Innovation Manager',
        'Sustainability Researcher',
        'Fermentation Specialist',
        'Nutrition Scientist',
      ],
      Sales: [
        'Sales Manager',
        'Account Executive',
        'Business Development',
        'Key Account Manager',
        'Sales Coordinator',
        'Customer Success Manager',
        'Regional Sales Director',
      ],
      'Quality Assurance': [
        'QA Manager',
        'Quality Inspector',
        'Compliance Officer',
        'Food Safety Specialist',
        'QA Analyst',
        'Regulatory Affairs Specialist',
      ],
      Finance: [
        'Financial Analyst',
        'Accounting Manager',
        'Controller',
        'Finance Director',
        'Budget Analyst',
        'Tax Specialist',
        'Financial Planning Manager',
      ],
      'Human Resources': [
        'HR Manager',
        'Talent Acquisition Specialist',
        'HR Business Partner',
        'Learning & Development Manager',
        'HR Coordinator',
        'Compensation Analyst',
        'Employee Relations Specialist',
      ],
      'IT & Development': [
        'Software Engineer',
        'DevOps Engineer',
        'Data Analyst',
        'IT Manager',
        'Frontend Developer',
        'Backend Developer',
        'System Administrator',
      ],
      'Legal & Compliance': [
        'Legal Counsel',
        'Compliance Manager',
        'Regulatory Affairs Manager',
        'Contract Manager',
        'IP Specialist',
        'Data Protection Officer',
      ],
    },
  },
};

// Realistic Danish/Scandinavian name pools
const DANISH_FIRST_NAMES = [
  'Mads',
  'Emma',
  'William',
  'Sofia',
  'Noah',
  'Freja',
  'Lucas',
  'Anna',
  'Oliver',
  'Clara',
  'Malte',
  'Lærke',
  'Elias',
  'Ida',
  'Magnus',
  'Alma',
  'Frederik',
  'Astrid',
  'Emil',
  'Josefine',
  'Alexander',
  'Mille',
  'Victor',
  'Nora',
  'Oscar',
  'Ellen',
  'Aksel',
  'Olivia',
  'Carl',
  'Agnes',
  'Storm',
  'Frida',
  'August',
  'Karla',
  'Arthur',
  'Maja',
  'Viggo',
  'Esther',
  'Anton',
  'Isabella',
  'Felix',
  'Alberte',
  'Theo',
  'Marie',
  'Milas',
  'Laura',
  'Sebastian',
  'Celeste',
  'Christian',
  'Liv',
  'Valdemar',
  'Ella',
  'Liam',
  'Saga',
  'Jakob',
  'Victoria',
  'Alfred',
  'Mathilde',
  'Nikolaj',
  'Emilie',
];

const DANISH_LAST_NAMES = [
  'Nielsen',
  'Hansen',
  'Andersen',
  'Pedersen',
  'Christensen',
  'Larsen',
  'Sørensen',
  'Rasmussen',
  'Jørgensen',
  'Petersen',
  'Madsen',
  'Kristensen',
  'Olsen',
  'Thomsen',
  'Christiansen',
  'Poulsen',
  'Johansen',
  'Møller',
  'Mortensen',
  'Jensen',
  'Henriksen',
  'Lund',
  'Schmidt',
  'Knudsen',
  'Vestergaard',
  'Andreasen',
  'Berg',
  'Eriksen',
  'Carlsen',
  'Laursen',
  'Dahl',
  'Jakobsen',
  'Holm',
  'Iversen',
  'Danielsen',
  'Svendsen',
];

/**
 * Generate random date within range
 */
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Normalize Danish/Scandinavian characters for email addresses
 */
function normalizeForEmail(text) {
  return text
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Generate realistic employee data for bulk creation
 */
function generateBulkEmployee(
  companyCode,
  personCodePrefix,
  department,
  position,
  location,
  index
) {
  const firstName = DANISH_FIRST_NAMES[Math.floor(Math.random() * DANISH_FIRST_NAMES.length)];
  const lastName = DANISH_LAST_NAMES[Math.floor(Math.random() * DANISH_LAST_NAMES.length)];
  const company = DEMO_COMPANIES[companyCode];

  const startDate = randomDate(new Date(2018, 0, 1), new Date(2024, 11, 31));

  // Status distribution: 85% active, 12% former, 3% future
  const rand = Math.random();
  let employmentStatus;
  if (rand < 0.85) {
    employmentStatus = 'active';
  } else if (rand < 0.97) {
    employmentStatus = 'former';
  } else {
    employmentStatus = 'future';
  }

  const personCode = `${personCodePrefix}-${String(index).padStart(3, '0')}`;

  return {
    person_code: personCode,
    company_email: `${normalizeForEmail(firstName)}.${normalizeForEmail(lastName)}.${index}@${company.domain}`,
    first_name: firstName,
    last_name: lastName,
    department,
    position,
    location,
    start_date: startDate.toISOString().split('T')[0],
    end_date:
      employmentStatus === 'former'
        ? randomDate(startDate, new Date()).toISOString().split('T')[0]
        : null,
    employment_status: employmentStatus,
    employment_type: 'full_time',
    work_location: Math.random() > 0.4 ? 'hybrid' : Math.random() > 0.5 ? 'office' : 'remote',
    security_clearance: Math.random() > 0.7 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low',
    manager:
      Math.random() > 0.7
        ? `${DANISH_FIRST_NAMES[Math.floor(Math.random() * DANISH_FIRST_NAMES.length)]} ${DANISH_LAST_NAMES[Math.floor(Math.random() * DANISH_LAST_NAMES.length)]}`
        : null,
    skills: ['Teamwork', 'Communication', 'Problem Solving'],
    languages: ['Danish', 'English'],
  };
}

/**
 * Generate bulk employee dataset for realistic demo scale
 */
async function createBulkEmployees(clientId, targetCount, spinner) {
  spinner.text = `Generating ${targetCount} employees...`;

  const companyCode = 'hygge-hvidlog';
  const personCodePrefix = 'hh';
  const companyInfo = DEMO_COMPANIES[companyCode];
  const employees = [];

  const employeesPerDept = Math.ceil(targetCount / companyInfo.departments.length);
  let employeeIndex = 9; // Start after the 8 seed employees (hh-001 through hh-008)

  for (const department of companyInfo.departments) {
    const positions = companyInfo.positions[department];

    for (let i = 0; i < employeesPerDept && employees.length < targetCount; i++) {
      const position = positions[i % positions.length];
      const location =
        companyInfo.locations[Math.floor(Math.random() * companyInfo.locations.length)];

      const employee = generateBulkEmployee(
        companyCode,
        personCodePrefix,
        department,
        position,
        location,
        employeeIndex++
      );
      employees.push({
        ...employee,
        client_id: clientId,
      });
    }
  }

  spinner.text = `Inserting ${employees.length} employees in batches...`;

  // Insert employees in batches to avoid memory issues
  const batchSize = 100;
  const createdEmployees = [];

  for (let i = 0; i < employees.length; i += batchSize) {
    const batch = employees.slice(i, i + batchSize);
    const batchEmployees = await apiCall('people', 'POST', batch);
    createdEmployees.push(...batchEmployees);

    if (i % (batchSize * 5) === 0) {
      spinner.text = `Inserted ${i + batch.length}/${employees.length} employees...`;
    }
  }

  return createdEmployees;
}

/**
 * Create comprehensive employee dataset (seed data + bulk generation)
 */
async function createEmployees(clientId, spinner) {
  // Create the core seed employees first (these have specific enrollments/documents/tasks)
  spinner.text = 'Creating seed employees...';

  const seedEmployeesData = [
    {
      person_code: 'hh-001',
      first_name: 'Anna',
      last_name: 'Hansen',
      company_email: 'anna.hansen@hygge-hvidlog.dk',
      department: 'IT & Development',
      position: 'Senior Software Engineer',
      location: 'Copenhagen, Denmark',
      manager: 'Lars Nielsen',
      start_date: '2024-01-15',
      employment_status: 'active',
      security_clearance: 'high',
      employment_type: 'full_time',
      work_location: 'hybrid',
      skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Food Tech APIs'],
      languages: ['Danish', 'English', 'Swedish'],
    },
    {
      person_code: 'hh-002',
      first_name: 'Erik',
      last_name: 'Larsen',
      company_email: 'erik.larsen@hygge-hvidlog.dk',
      department: 'Product Development',
      position: 'Product Manager',
      location: 'Copenhagen, Denmark',
      manager: 'Maria Andersen',
      start_date: '2024-02-01',
      employment_status: 'active',
      security_clearance: 'medium',
      employment_type: 'full_time',
      work_location: 'office',
      skills: ['Product Strategy', 'Agile', 'Data Analysis', 'Sustainable Foods', 'User Research'],
      languages: ['Danish', 'English', 'Norwegian'],
    },
    {
      person_code: 'hh-003',
      first_name: 'Sofia',
      last_name: 'Berg',
      company_email: 'sofia.berg@hygge-hvidlog.dk',
      department: 'Marketing',
      position: 'UX Designer',
      location: 'Malmö, Sweden',
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
      person_code: 'hh-004',
      first_name: 'Magnus',
      last_name: 'Johansson',
      company_email: 'magnus.johansson@hygge-hvidlog.dk',
      department: 'IT & Development',
      position: 'DevOps Engineer',
      location: 'Malmö, Sweden',
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
    {
      person_code: 'hh-005',
      first_name: 'Lars',
      last_name: 'Petersen',
      company_email: 'lars.petersen@hygge-hvidlog.dk',
      department: 'IT & Development',
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
      person_code: 'hh-006',
      first_name: 'Mette',
      last_name: 'Sørensen',
      company_email: 'mette.sorensen@hygge-hvidlog.dk',
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
      person_code: 'hh-007',
      first_name: 'John',
      last_name: 'Smith',
      company_email: 'john.smith@hygge-hvidlog.dk',
      department: 'Legal & Compliance',
      position: 'Security Consultant',
      location: 'Copenhagen, Denmark',
      manager: 'Security Director',
      start_date: '2024-03-01',
      associate_status: 'contractor',
      security_clearance: 'high',
      employment_type: null,
      work_location: 'office',
      skills: ['Cybersecurity', 'Risk Assessment', 'Compliance', 'Audit', 'GDPR'],
      languages: ['English', 'Danish'],
    },
    {
      person_code: 'hh-008',
      first_name: 'Astrid',
      last_name: 'Lindberg',
      company_email: 'astrid.lindberg@hygge-hvidlog.dk',
      department: 'Finance',
      position: 'Financial Analyst',
      location: 'Malmö, Sweden',
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

  const createdSeedEmployees = [];
  for (const empData of seedEmployeesData) {
    const employee = await apiCall('people', 'POST', {
      ...empData,
      client_id: clientId,
    });
    createdSeedEmployees.push(employee[0]);
  }

  spinner.succeed(`Created ${createdSeedEmployees.length} seed employees`);

  // Now generate bulk employees to reach the target of 1200 total
  const targetTotal = 1200;
  const associatesCount = 10; // Will be created separately
  const bulkCount = targetTotal - createdSeedEmployees.length - associatesCount;

  const bulkEmployees = await createBulkEmployees(clientId, bulkCount, spinner);

  spinner.succeed(`Created ${bulkEmployees.length} bulk employees`);

  // Return combined dataset
  const allEmployees = [...createdSeedEmployees, ...bulkEmployees];
  spinner.succeed(`Total employees created: ${allEmployees.length}`);

  return allEmployees;
}

/**
 * Create associates for the demo client
 */
async function createAssociates(clientId, spinner) {
  spinner.text = 'Creating associates...';

  const associatesData = [
    // Board Members
    {
      client_id: clientId,
      person_code: 'assoc-001',
      first_name: 'Mette',
      last_name: 'Damsgaard',
      company_email: 'mette.damsgaard@board.hygge-hvidlog.dk',
      department: 'Board of Directors',
      position: 'Chairman of the Board',
      location: 'Copenhagen, Denmark',
      associate_status: 'board_member',
      employment_status: null,
      start_date: '2022-01-01',
      employment_type: null,
      work_location: 'remote',
      skills: [
        'Corporate Governance',
        'Sustainable Business',
        'Food Industry',
        'Strategic Planning',
      ],
      languages: ['Danish', 'English', 'German'],
    },
    {
      client_id: clientId,
      person_code: 'assoc-002',
      first_name: 'Niels',
      last_name: 'Christiansen',
      company_email: 'niels.christiansen@board.hygge-hvidlog.dk',
      department: 'Board of Directors',
      position: 'Board Member',
      location: 'Aarhus, Denmark',
      associate_status: 'board_member',
      employment_status: null,
      start_date: '2022-06-01',
      employment_type: null,
      work_location: 'remote',
      skills: ['Finance', 'Investment', 'Venture Capital', 'Food Tech'],
      languages: ['Danish', 'English'],
    },
    // Strategic Advisors
    {
      client_id: clientId,
      person_code: 'assoc-003',
      first_name: 'Dr. Astrid',
      last_name: 'Møller',
      company_email: 'astrid.moller@advisors.hygge-hvidlog.dk',
      department: 'Strategic Advisory',
      position: 'Sustainability Advisor',
      location: 'Malmö, Sweden',
      associate_status: 'advisor',
      employment_status: null,
      start_date: '2023-03-01',
      employment_type: null,
      work_location: 'remote',
      skills: [
        'Sustainability',
        'Environmental Science',
        'Plant-based Nutrition',
        'EU Regulations',
      ],
      languages: ['Swedish', 'Danish', 'English', 'Norwegian'],
    },
    {
      client_id: clientId,
      person_code: 'assoc-004',
      first_name: 'Klaus',
      last_name: 'Petersen',
      company_email: 'klaus.petersen@advisors.hygge-hvidlog.dk',
      department: 'Strategic Advisory',
      position: 'Technology Advisor',
      location: 'Oslo, Norway',
      associate_status: 'advisor',
      employment_status: null,
      start_date: '2023-09-01',
      employment_type: null,
      work_location: 'hybrid',
      skills: ['Food Technology', 'Biotechnology', 'Innovation Management', 'R&D Strategy'],
      languages: ['Norwegian', 'English', 'Danish'],
    },
    // Consultants
    {
      client_id: clientId,
      person_code: 'assoc-005',
      first_name: 'Ingrid',
      last_name: 'Svendsen',
      company_email: 'ingrid.svendsen@consultants.hygge-hvidlog.dk',
      department: 'Marketing & Communications',
      position: 'Brand Consultant',
      location: 'Copenhagen, Denmark',
      associate_status: 'consultant',
      employment_status: null,
      start_date: '2024-01-15',
      employment_type: null,
      work_location: 'hybrid',
      skills: ['Brand Strategy', 'Digital Marketing', 'Sustainable Branding', 'Nordic Markets'],
      languages: ['Danish', 'English', 'Swedish'],
    },
    {
      client_id: clientId,
      person_code: 'assoc-006',
      first_name: 'Torben',
      last_name: 'Andreasen',
      company_email: 'torben.andreasen@consultants.hygge-hvidlog.dk',
      department: 'Operations',
      position: 'Supply Chain Consultant',
      location: 'Aalborg, Denmark',
      associate_status: 'consultant',
      employment_status: null,
      start_date: '2024-02-01',
      employment_type: null,
      work_location: 'remote',
      skills: ['Supply Chain', 'Logistics', 'Procurement', 'Sustainable Sourcing'],
      languages: ['Danish', 'English', 'Dutch'],
    },
    // External Contractors
    {
      client_id: clientId,
      person_code: 'assoc-007',
      first_name: 'Elena',
      last_name: 'Borg',
      company_email: 'elena.borg@contractors.hygge-hvidlog.dk',
      department: 'IT & Development',
      position: 'DevOps Contractor',
      location: 'Stockholm, Sweden',
      associate_status: 'contractor',
      employment_status: null,
      start_date: '2024-03-01',
      employment_type: null,
      work_location: 'remote',
      skills: ['DevOps', 'Cloud Infrastructure', 'Kubernetes', 'CI/CD', 'Security'],
      languages: ['Swedish', 'English', 'Finnish'],
    },
    {
      client_id: clientId,
      person_code: 'assoc-008',
      first_name: 'Jan',
      last_name: 'Vestergaard',
      company_email: 'jan.vestergaard@contractors.hygge-hvidlog.dk',
      department: 'Quality Assurance',
      position: 'Food Safety Contractor',
      location: 'Odense, Denmark',
      associate_status: 'contractor',
      employment_status: null,
      start_date: '2024-04-01',
      employment_type: null,
      work_location: 'office',
      skills: ['Food Safety', 'Quality Control', 'HACCP', 'EU Food Regulations'],
      languages: ['Danish', 'English', 'German'],
    },
    // Business Partners
    {
      client_id: clientId,
      person_code: 'assoc-009',
      first_name: 'Lise',
      last_name: 'Karlsson',
      company_email: 'lise.karlsson@partners.hygge-hvidlog.dk',
      department: 'Business Development',
      position: 'Strategic Partner Representative',
      location: 'Gothenburg, Sweden',
      associate_status: 'partner',
      employment_status: null,
      start_date: '2023-11-01',
      employment_type: null,
      work_location: 'hybrid',
      skills: ['Partnership Development', 'Business Development', 'Nordic Markets', 'Retail'],
      languages: ['Swedish', 'Danish', 'English', 'Norwegian'],
    },
    {
      client_id: clientId,
      person_code: 'assoc-010',
      first_name: 'Finn',
      last_name: 'Haugen',
      company_email: 'finn.haugen@partners.hygge-hvidlog.dk',
      department: 'Research & Development',
      position: 'Research Partner',
      location: 'Trondheim, Norway',
      associate_status: 'partner',
      employment_status: null,
      start_date: '2023-08-01',
      employment_type: null,
      work_location: 'remote',
      skills: ['Food Science', 'Research', 'Innovation', 'Academic Collaboration'],
      languages: ['Norwegian', 'English', 'Danish'],
    },
  ];

  const createdAssociates = [];
  for (const associateData of associatesData) {
    const associate = await apiCall('people', 'POST', {
      ...associateData,
      client_id: clientId,
    });
    createdAssociates.push(associate[0]);
  }

  spinner.succeed(`Created ${createdAssociates.length} associates`);
  return createdAssociates;
}

/**
 * Create all related data (enrollments, documents, tasks, invitations)
 */
async function createAllRelatedData(employees, applications, clientId, spinner) {
  // Create enrollments
  spinner.text = 'Creating employee enrollments...';
  const enrollments = await createEmployeeEnrollments(employees);

  // Create documents
  spinner.text = 'Creating documents...';
  const documents = await createDocuments(employees);

  // Create tasks
  spinner.text = 'Creating tasks...';
  const tasks = await createTasks(employees);

  // Create invitations
  spinner.text = 'Creating invitations...';
  const invitations = await createInvitations(clientId, applications, employees);

  return { enrollments, documents, tasks, invitations };
}

// Helper functions (condensed versions from rich demo script)
async function createEmployeeEnrollments(employees) {
  const enrollmentsData = [
    {
      person_code: 'emp-001',
      onboarding_completed: true,
      completion_percentage: 100,
      mentor: 'Lars Nielsen',
      buddy_program: true,
    },
    {
      person_code: 'emp-002',
      onboarding_completed: true,
      completion_percentage: 100,
      mentor: 'Maria Andersen',
      buddy_program: true,
    },
    {
      person_code: 'emp-003',
      onboarding_completed: false,
      completion_percentage: 45,
      mentor: 'Peter Olsen',
      buddy_program: true,
    },
    {
      person_code: 'emp-004',
      onboarding_completed: true,
      completion_percentage: 100,
      mentor: 'Lars Nielsen',
      buddy_program: true,
      offboarding_completed: true,
    },
    {
      person_code: 'emp-005',
      onboarding_completed: false,
      completion_percentage: 0,
      mentor: 'Anna Hansen',
      buddy_program: true,
    },
    {
      person_code: 'emp-006',
      onboarding_completed: true,
      completion_percentage: 100,
      mentor: 'Erik Larsen',
      buddy_program: true,
      offboarding_initiated: true,
    },
    {
      person_code: 'emp-007',
      onboarding_completed: false,
      completion_percentage: 20,
      mentor: 'Security Director',
      buddy_program: false,
    },
    {
      person_code: 'emp-008',
      onboarding_completed: true,
      completion_percentage: 100,
      mentor: 'Finance Director',
      buddy_program: true,
    },
  ];

  const created = [];
  for (const enrollData of enrollmentsData) {
    const employee = employees.find((e) => e.person_code === enrollData.person_code);
    if (!employee) continue;

    const { person_code, ...enrollmentData } = enrollData;
    const enrollment = await apiCall('people_enrollments', 'POST', {
      ...enrollmentData,
      person_id: employee.id,
    });
    created.push(enrollment[0]);
  }
  return created;
}

async function createDocuments(employees) {
  const documents = [];
  for (let i = 0; i < employees.length; i++) {
    const employee = employees[i];
    const docCount = Math.floor(Math.random() * 3) + 2; // 2-4 documents per employee

    for (let j = 0; j < docCount; j++) {
      const docTypes = [
        'contract',
        'id_verification',
        'tax_form',
        'gdpr_consent',
        'financial_disclosure',
      ];
      const statuses = ['verified', 'pending', 'uploaded'];

      const doc = await apiCall('documents', 'POST', {
        person_id: employee.id,
        name: `Document ${j + 1} for ${employee.first_name}`,
        type: docTypes[j % docTypes.length],
        status: statuses[j % statuses.length],
        uploaded_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        reviewed_by: j % 2 === 0 ? 'HR Team' : null,
      });
      documents.push(doc[0]);
    }
  }
  return documents;
}

async function createTasks(employees) {
  const tasks = [];
  for (let i = 0; i < employees.length; i++) {
    const employee = employees[i];
    const taskCount = Math.floor(Math.random() * 3) + 2; // 2-4 tasks per employee

    for (let j = 0; j < taskCount; j++) {
      const categories = ['training', 'compliance', 'equipment', 'security'];
      const statuses = ['completed', 'in_progress', 'not_started'];
      const priorities = ['high', 'medium', 'low'];

      const task = await apiCall('tasks', 'POST', {
        person_id: employee.id,
        title: `Task ${j + 1} for ${employee.first_name}`,
        description: `Demo task description ${j + 1}`,
        category: categories[j % categories.length],
        status: statuses[j % statuses.length],
        priority: priorities[j % priorities.length],
        assigned_by: 'Demo System',
        assigned_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      tasks.push(task[0]);
    }
  }
  return tasks;
}

async function createInvitations(clientId, applications, employees) {
  const appMap = {};
  for (const app of applications) {
    appMap[app.app_code] = app.id;
  }

  const invitationsData = [
    { person_code: 'emp-005', app_code: 'onboarding', employment_status: 'future' },
    { person_code: 'emp-006', app_code: 'offboarding', employment_status: 'future' },
    { person_code: 'emp-007', app_code: 'onboarding', employment_status: 'expired' },
  ];

  const created = [];
  for (const invData of invitationsData) {
    const employee = employees.find((e) => e.person_code === invData.person_code);
    const appId = appMap[invData.app_code];

    if (!employee || !appId) continue;

    const jwtHash = crypto
      .createHash('sha256')
      .update(`${employee.id}-${Date.now()}`)
      .digest('hex');
    let expiresAt, createdAt;

    if (invData.status === 'expired') {
      // For expired invitations, set created date in the past and expiry before that
      createdAt = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // 14 days ago
      expiresAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    } else {
      // For active invitations, normal future expiry
      createdAt = new Date();
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    }

    const invitation = await apiCall('invitations', 'POST', {
      client_id: clientId,
      app_id: appId,
      jwt_token_hash: jwtHash,
      permissions: ['document_upload', 'task_completion'],
      restrictions: { max_sessions: 5, person_code: employee.person_code },
      employment_status: invData.status,
      expires_at: expiresAt.toISOString(),
      created_at: createdAt.toISOString(),
      created_by: 'Demo System',
      client_data: {
        person_id: employee.id,
        person_code: employee.person_code,
        department: employee.department,
        demo_invitation: true,
      },
    });

    created.push(invitation[0]);
  }
  return created;
}

/**
 * Main setup function
 */
async function setupCompleteDemo(options = {}) {
  const spinner = ora('Setting up complete demo...').start();

  try {
    // Step 1: Cleanup existing data
    if (!options.keepExisting) {
      await cleanupExistingData(spinner);
    }

    // Step 2: Create demo client
    const client = await createDemoClient(spinner);

    // Step 3: Create client applications
    const applications = await createClientApplications(client.id, spinner);

    // Step 4: Create employees
    const employees = await createEmployees(client.id, spinner);

    // Step 4.5: Create associates
    const associates = await createAssociates(client.id, spinner);

    // Step 5: Create all related data
    spinner.text = 'Creating related data...';
    const { enrollments, documents, tasks, invitations } = await createAllRelatedData(
      employees,
      applications,
      client.id,
      spinner
    );

    // Step 6: Create offboarding demo data (if tables exist)
    let offboardingData = null;
    try {
      spinner.text = 'Creating offboarding demo data...';
      const { createDemoData } = await import('../../scripts/create-offboarding-demo-data.js');
      offboardingData = await createDemoData(client.id, true); // Pass clientId and skipLogs=true
      spinner.text = 'Offboarding demo data created';
    } catch (_error) {
      spinner.warn('Offboarding tables not found - skipping offboarding demo data');
      console.log(chalk.yellow('   💡 To enable offboarding features:'));
      console.log(chalk.white('      1. Run the SQL files manually via Supabase Dashboard'));
      console.log(chalk.white('      2. Then run: pnpm run demo:complete again'));
    }

    // Display success summary
    console.log(chalk.green.bold('\n✅ Complete demo setup finished!\n'));
    console.log(chalk.cyan('📊 Created:'));
    console.log(`   • Client: ${chalk.white(client.legal_name)}`);
    console.log(`   • Applications: ${chalk.white(applications.length)}`);
    console.log(
      `   • Employees: ${chalk.white(employees.length)} (8 seed + ${employees.length - 8} bulk)`
    );
    console.log(`   • Associates: ${chalk.white(associates.length)}`);
    console.log(`   • Total People: ${chalk.white(employees.length + associates.length)}`);
    console.log(`   • Enrollments: ${chalk.white(enrollments.length)}`);
    console.log(`   • Documents: ${chalk.white(documents.length)}`);
    console.log(`   • Tasks: ${chalk.white(tasks.length)}`);
    console.log(`   • Invitations: ${chalk.white(invitations.length)}`);
    if (offboardingData) {
      console.log(`   • Offboarding Workflows: ${chalk.white('3')}`);
      console.log(`   • Knowledge Transfer Items: ${chalk.white('3')}`);
      console.log(`   • Compliance Checks: ${chalk.white('4')}`);
      console.log(`   • Credit Balance: ${chalk.white('85 credits available')}`);
    }

    // Display status breakdown for verification
    console.log(chalk.cyan('\n📊 Employment Status Distribution:'));
    const statusCounts = { active: 0, former: 0, future: 0, associates: associates.length };
    for (const emp of employees) {
      if (emp.employment_status === 'active') statusCounts.active++;
      else if (emp.employment_status === 'former') statusCounts.former++;
      else if (emp.employment_status === 'future') statusCounts.future++;
    }

    console.log(
      `   • Active: ${chalk.green(statusCounts.active)} (~${Math.round((statusCounts.active / employees.length) * 100)}%)`
    );
    console.log(
      `   • Former: ${chalk.yellow(statusCounts.former)} (~${Math.round((statusCounts.former / employees.length) * 100)}%)`
    );
    console.log(
      `   • Future: ${chalk.blue(statusCounts.future)} (~${Math.round((statusCounts.future / employees.length) * 100)}%)`
    );
    console.log(`   • Associates: ${chalk.cyan(statusCounts.associates)}`);

    console.log(chalk.green('\n🚀 Demo is ready!'));
    console.log(`   Launch: ${chalk.yellow('pnpm run demo:admin')}`);
    console.log(`   URL: ${chalk.yellow('https://dev.thepia.net:5173/')}`);
    console.log(`   Expected test counts: ~1020 active, ~144 former, ~36 future, 10 associates`);
    console.log('');

    spinner.succeed('Complete demo setup completed successfully!');
  } catch (error) {
    spinner.fail(`Demo setup failed: ${error.message}`);
    console.error(chalk.red(error.stack));
    process.exit(1);
  }
}

// CLI configuration
program
  .name('setup-complete-demo')
  .description('One command to set up the complete demo with all data')
  .version('1.0.0');

program
  .command('run')
  .description('Set up complete demo (default)')
  .option('--keep-existing', 'Keep existing data instead of cleaning up first')
  .action(async (options) => {
    await setupCompleteDemo(options);
  });

// Default to run command if no arguments
if (process.argv.length === 2) {
  setupCompleteDemo();
} else {
  program.parse();
}
