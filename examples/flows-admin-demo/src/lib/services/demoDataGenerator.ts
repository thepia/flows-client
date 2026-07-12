import { get } from 'svelte/store';
import { supabaseClientStore } from '../contexts/supabase-context';

// Get current Supabase client from store
function getCurrentSupabaseClient() {
  const client = get(supabaseClientStore);
  if (!client) {
    throw new Error('Authentication required - please sign in to access demo data generation');
  }
  return client;
}

import type { DemoGenerationConfig, Employee, Invitation } from '../types.js';

// Demo data templates based on our comprehensive demo company profiles
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
    ],
    locations: ['Copenhagen', 'Aarhus', 'Berlin', 'Amsterdam'],
    positions: {
      'Product Development': [
        'Senior Product Manager',
        'Product Designer',
        'UX Researcher',
        'Product Analyst',
      ],
      Marketing: ['Marketing Manager', 'Content Creator', 'Social Media Manager', 'Brand Manager'],
      Operations: ['Operations Manager', 'Supply Chain Analyst', 'Logistics Coordinator'],
      'R&D': ['Food Scientist', 'Research Associate', 'Lab Technician', 'Innovation Manager'],
      Sales: ['Sales Manager', 'Account Executive', 'Business Development', 'Key Account Manager'],
      'Quality Assurance': ['QA Manager', 'Quality Inspector', 'Compliance Officer'],
    },
  },
  'meridian-brands': {
    name: 'Meridian Brands International',
    domain: 'meridianbrands.com',
    departments: [
      'Product Management',
      'Global Marketing',
      'Supply Chain',
      'Digital Innovation',
      'Regional Sales',
      'Corporate Strategy',
    ],
    locations: ['New York', 'London', 'Singapore', 'São Paulo', 'Mumbai', 'Tokyo'],
    positions: {
      'Product Management': [
        'VP Product',
        'Senior Product Manager',
        'Product Marketing Manager',
        'Category Manager',
      ],
      'Global Marketing': [
        'Global Marketing Director',
        'Brand Manager',
        'Digital Marketing Manager',
        'Creative Director',
      ],
      'Supply Chain': [
        'Supply Chain Director',
        'Procurement Manager',
        'Logistics Manager',
        'Vendor Relations',
      ],
      'Digital Innovation': [
        'Digital Transformation Lead',
        'Data Scientist',
        'AI/ML Engineer',
        'Platform Architect',
      ],
      'Regional Sales': [
        'Regional Sales Director',
        'Sales Manager',
        'Channel Partner Manager',
        'Customer Success',
      ],
      'Corporate Strategy': [
        'Strategy Director',
        'Business Analyst',
        'M&A Manager',
        'Financial Planning',
      ],
    },
  },
};

// Realistic name pools
const FIRST_NAMES = [
  'Emma',
  'Liam',
  'Olivia',
  'Noah',
  'Ava',
  'Ethan',
  'Sophia',
  'Mason',
  'Isabella',
  'William',
  'Mia',
  'James',
  'Charlotte',
  'Benjamin',
  'Amelia',
  'Lucas',
  'Harper',
  'Henry',
  'Evelyn',
  'Alexander',
  'Abigail',
  'Michael',
  'Emily',
  'Daniel',
  'Elizabeth',
  'Jacob',
  'Sofia',
  'Logan',
  'Avery',
  'Jackson',
  'Ella',
  'Sebastian',
  'Madison',
  'Jack',
  'Scarlett',
  'Owen',
  'Victoria',
  'Samuel',
  'Aria',
  'Matthew',
  'Grace',
  'Carter',
  'Chloe',
  'Luke',
  'Camila',
  'Jayden',
  'Penelope',
  'Gabriel',
  'Riley',
  'Anthony',
];

const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Walker',
  'Young',
  'Allen',
  'King',
  'Wright',
  'Scott',
  'Torres',
  'Nguyen',
  'Hill',
  'Flores',
  'Green',
  'Adams',
  'Nelson',
  'Baker',
  'Hall',
  'Rivera',
  'Campbell',
  'Mitchell',
  'Carter',
  'Roberts',
];

// Generate random date within range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Generate realistic employee data
function generateEmployee(
  companyCode: string,
  department: string,
  position: string,
  location: string,
  index: number
): Partial<Employee> {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const company = DEMO_COMPANIES[companyCode as keyof typeof DEMO_COMPANIES];

  const startDate = randomDate(new Date(2020, 0, 1), new Date());
  const statuses: ('active' | 'previous' | 'future')[] = [
    'active',
    'active',
    'active',
    'active',
    'previous',
    'future',
  ];
  const status = statuses[Math.floor(Math.random() * statuses.length)];

  const employeeId = `${companyCode}-${String(index).padStart(4, '0')}`;

  return {
    person_code: employeeId,
    company_email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${index}@${company.domain}`,
    first_name: firstName,
    last_name: lastName,
    department,
    position,
    location,
    start_date: startDate.toISOString().split('T')[0],
    employment_status: status === 'previous' ? 'former' : status === 'future' ? 'future' : 'active',
    employment_type: 'full_time',
    work_location: Math.random() > 0.5 ? 'office' : Math.random() > 0.5 ? 'remote' : 'hybrid',
    security_clearance: Math.random() > 0.8 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low',
    manager:
      Math.random() > 0.7
        ? `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`
        : undefined,
  };
}

// Generate realistic invitation data
function generateInvitation(
  companyCode: string,
  applicationType: 'onboarding' | 'offboarding'
): Partial<Invitation> {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const company = DEMO_COMPANIES[companyCode as keyof typeof DEMO_COMPANIES];

  const departments = company.departments;
  const department = departments[Math.floor(Math.random() * departments.length)];
  const positions = company.positions[department as keyof typeof company.positions];
  const position = positions[Math.floor(Math.random() * positions.length)];

  const statuses: ('pending' | 'sent' | 'accepted' | 'expired')[] = [
    'pending',
    'sent',
    'sent',
    'accepted',
    'expired',
  ];
  const status = statuses[Math.floor(Math.random() * statuses.length)];

  const createdAt = randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
  const expiresAt = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    companyEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.domain}`,
    privateEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gmail.com`,
    firstName,
    lastName,
    department,
    position,
    invitationType: applicationType,
    status,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    sentAt: status !== 'pending' ? createdAt.toISOString() : undefined,
    acceptedAt:
      status === 'accepted'
        ? new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
    createdBy: 'Demo System',
    invitationCode: Math.random().toString(36).substring(2, 15),
  };
}

export async function generateDemoDataForCompany(
  config: DemoGenerationConfig,
  progressCallback?: (progress: number, message: string) => void
): Promise<void> {
  progressCallback?.(0, 'Initializing data generation...');

  // Get current Supabase client from store
  const supabase = getCurrentSupabaseClient();

  // Get the demo company info
  const { data: clientData, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('client_code', config.companyId)
    .single();

  if (clientError || !clientData) {
    throw new Error(`Demo company ${config.companyId} not found`);
  }

  const companyInfo = DEMO_COMPANIES[config.companyId as keyof typeof DEMO_COMPANIES];
  if (!companyInfo) {
    throw new Error(`No demo data template for company ${config.companyId}`);
  }

  progressCallback?.(10, 'Creating employee profiles...');

  // Generate employees
  const employees: any[] = [];
  const employeesPerDept = Math.ceil(config.employeeCount / companyInfo.departments.length);
  let employeeIndex = 1;

  for (const department of companyInfo.departments) {
    const positions = companyInfo.positions[department as keyof typeof companyInfo.positions];

    for (let i = 0; i < employeesPerDept && employees.length < config.employeeCount; i++) {
      const position = positions[i % positions.length];
      const location =
        companyInfo.locations[Math.floor(Math.random() * companyInfo.locations.length)];

      const employee = generateEmployee(
        config.companyId,
        department,
        position,
        location,
        employeeIndex++
      );
      employees.push({
        ...employee,
        client_id: clientData.id,
        id: crypto.randomUUID(),
      });
    }
  }

  progressCallback?.(30, 'Inserting employee data...');

  // Insert employees in batches
  const batchSize = 50;
  for (let i = 0; i < employees.length; i += batchSize) {
    const batch = employees.slice(i, i + batchSize);
    const { error } = await supabase.from('people').insert(batch);

    if (error) {
      console.error('Error inserting employees batch:', error);
      throw error;
    }
  }

  progressCallback?.(50, 'Creating process invitations...');

  // Get application IDs for this client
  const { data: applications, error: appsError } = await supabase
    .from('client_applications')
    .select('*')
    .eq('client_id', clientData.id);

  if (appsError) {
    throw appsError;
  }

  // Generate invitations
  const invitations: any[] = [];
  const onboardingApp = applications?.find((app) => app.app_code === 'onboarding');
  const offboardingApp = applications?.find((app) => app.app_code === 'offboarding');

  // Generate onboarding invitations
  if (onboardingApp && config.onboardingCount > 0) {
    for (let i = 0; i < config.onboardingCount; i++) {
      const invitation = generateInvitation(config.companyId, 'onboarding');
      invitations.push({
        ...invitation,
        client_id: clientData.id,
        app_id: onboardingApp.id,
        id: crypto.randomUUID(),
      });
    }
  }

  // Generate offboarding invitations
  if (offboardingApp && config.offboardingCount > 0) {
    for (let i = 0; i < config.offboardingCount; i++) {
      const invitation = generateInvitation(config.companyId, 'offboarding');
      invitations.push({
        ...invitation,
        client_id: clientData.id,
        app_id: offboardingApp.id,
        id: crypto.randomUUID(),
      });
    }
  }

  progressCallback?.(70, 'Inserting invitation data...');

  // Insert invitations
  if (invitations.length > 0) {
    const { error } = await supabase.from('invitations').insert(invitations);

    if (error) {
      console.error('Error inserting invitations:', error);
      throw error;
    }
  }

  progressCallback?.(85, 'Creating enrollment records...');

  // Generate some enrollment records for active employees
  const activeEmployees = employees
    .filter((emp) => emp.status === 'active')
    .slice(0, Math.min(20, employees.length));
  const enrollments: any[] = [];

  for (const employee of activeEmployees) {
    enrollments.push({
      person_id: employee.id,
      onboarding_completed: Math.random() > 0.3,
      completion_percentage: Math.floor(Math.random() * 100),
      last_activity: randomDate(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        new Date()
      ).toISOString(),
    });
  }

  if (enrollments.length > 0) {
    const { error } = await supabase.from('people_enrollments').insert(enrollments);

    if (error) {
      console.error('Error inserting enrollments:', error);
      // Don't throw here, enrollments are optional
    }
  }

  progressCallback?.(100, 'Data generation completed successfully');
}
