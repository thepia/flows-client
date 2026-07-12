import type {
  Application,
  Client,
  Employee,
  EmployeeEnrollment,
  Invitation,
  Person,
  PersonEnrollment,
} from '$lib/types';

// Mock client data
export const mockClient: Client = {
  id: 'client-nets-001',
  name: 'Nets A/S',
  code: 'nets',
  domain: 'nets.thepia.net',
  tier: 'free',
  status: 'active',
  region: 'EU',
};

// Mock applications
export const mockApplications: Application[] = [
  {
    id: 'app-onboarding-001',
    clientId: 'client-nets-001',
    name: 'Employee Onboarding',
    code: 'onboarding',
    type: 'onboarding',
    status: 'active',
    version: '1.0.0',
  },
  {
    id: 'app-offboarding-001',
    clientId: 'client-nets-001',
    name: 'Employee Offboarding',
    code: 'offboarding',
    type: 'offboarding',
    status: 'active',
    version: '1.0.0',
  },
];

// Mock people (employees and associates)
export const mockPeople: Person[] = [
  {
    id: 'person-001',
    email: 'anna.hansen@nets.eu',
    firstName: 'Anna',
    lastName: 'Hansen',
    department: 'Engineering',
    position: 'Senior Software Engineer',
    startDate: '2024-01-15',
    employmentStatus: 'active',
    phone: '+45 12 34 56 78',
    manager: 'Lars Nielsen',
    location: 'Copenhagen, Denmark',
  },
  {
    id: 'person-002',
    email: 'erik.larsen@nets.eu',
    firstName: 'Erik',
    lastName: 'Larsen',
    department: 'Product',
    position: 'Product Manager',
    startDate: '2024-02-01',
    employmentStatus: 'active',
    phone: '+45 87 65 43 21',
    manager: 'Maria Andersen',
    location: 'Copenhagen, Denmark',
  },
  {
    id: 'person-003',
    email: 'sofia.berg@nets.eu',
    firstName: 'Sofia',
    lastName: 'Berg',
    department: 'Design',
    position: 'UX Designer',
    startDate: '2024-03-01',
    employmentStatus: 'future',
    phone: '+45 23 45 67 89',
    manager: 'Peter Olsen',
    location: 'Stockholm, Sweden',
  },
  {
    id: 'person-004',
    email: 'magnus.johansson@nets.eu',
    firstName: 'Magnus',
    lastName: 'Johansson',
    department: 'Engineering',
    position: 'DevOps Engineer',
    startDate: '2023-12-01',
    employmentStatus: 'former',
    phone: '+46 70 123 45 67',
    manager: 'Lars Nielsen',
    location: 'Stockholm, Sweden',
  },
  // Associates
  {
    id: 'person-005',
    email: 'john.board@nets.eu',
    firstName: 'John',
    lastName: 'Board',
    department: 'Board',
    position: 'Board Member',
    startDate: '2023-01-01',
    associateStatus: 'board_member',
    phone: '+45 11 22 33 44',
    location: 'Copenhagen, Denmark',
  },
  {
    id: 'person-006',
    email: 'jane.consultant@external.com',
    firstName: 'Jane',
    lastName: 'Consultant',
    department: 'Strategy',
    position: 'Strategy Consultant',
    startDate: '2024-06-01',
    associateStatus: 'consultant',
    phone: '+45 55 66 77 88',
    location: 'Remote',
  },
];

// Backward compatibility: Export employees with old format
export const mockEmployees: Employee[] = mockPeople.map((person) => ({
  ...person,
  status:
    person.employmentStatus === 'active'
      ? 'active'
      : person.employmentStatus === 'former'
        ? 'previous'
        : person.employmentStatus === 'future'
          ? 'future'
          : 'other',
}));

// Mock enrollment data
export const mockPersonEnrollments: PersonEnrollment[] = [
  {
    personId: 'person-001',
    onboardingCompleted: true,
    documentsStatus: [
      {
        id: 'doc-001',
        name: 'Employment Contract',
        type: 'contract',
        status: 'verified',
        uploadedAt: '2024-01-10T10:00:00Z',
        reviewedAt: '2024-01-12T14:30:00Z',
        reviewedBy: 'HR Team',
      },
      {
        id: 'doc-002',
        name: 'ID Verification',
        type: 'id_verification',
        status: 'verified',
        uploadedAt: '2024-01-10T10:30:00Z',
        reviewedAt: '2024-01-12T14:35:00Z',
        reviewedBy: 'HR Team',
      },
    ],
    tasksStatus: [
      {
        id: 'task-001',
        title: 'Complete IT Setup',
        description: 'Set up laptop, email, and access credentials',
        category: 'equipment',
        status: 'completed',
        assignedAt: '2024-01-15T09:00:00Z',
        completedAt: '2024-01-15T16:00:00Z',
        assignedBy: 'IT Department',
        priority: 'high',
      },
    ],
    lastActivity: '2024-01-15T16:00:00Z',
    completionPercentage: 100,
  },
  {
    personId: 'person-002',
    onboardingCompleted: true,
    documentsStatus: [
      {
        id: 'doc-003',
        name: 'Employment Contract',
        type: 'contract',
        status: 'verified',
        uploadedAt: '2024-01-25T11:00:00Z',
        reviewedAt: '2024-01-26T10:00:00Z',
        reviewedBy: 'HR Team',
      },
    ],
    tasksStatus: [
      {
        id: 'task-002',
        title: 'Product Training',
        description: 'Complete product knowledge training modules',
        category: 'training',
        status: 'completed',
        assignedAt: '2024-02-01T09:00:00Z',
        completedAt: '2024-02-05T17:00:00Z',
        assignedBy: 'Product Team',
        priority: 'medium',
      },
    ],
    lastActivity: '2024-02-05T17:00:00Z',
    completionPercentage: 100,
  },
  {
    personId: 'person-003',
    onboardingCompleted: false,
    documentsStatus: [
      {
        id: 'doc-004',
        name: 'Employment Contract',
        type: 'contract',
        status: 'pending',
        uploadedAt: '2024-02-25T14:00:00Z',
      },
      {
        id: 'doc-005',
        name: 'Tax Forms',
        type: 'tax_form',
        status: 'uploaded',
        uploadedAt: '2024-02-26T09:30:00Z',
      },
    ],
    tasksStatus: [
      {
        id: 'task-003',
        title: 'Design Tools Setup',
        description: 'Install and configure Figma, Adobe Creative Suite',
        category: 'equipment',
        status: 'in_progress',
        assignedAt: '2024-03-01T09:00:00Z',
        dueDate: '2024-03-05T17:00:00Z',
        assignedBy: 'Design Team',
        priority: 'high',
      },
      {
        id: 'task-004',
        title: 'Complete Company Handbook',
        description: 'Read and acknowledge company policies',
        category: 'compliance',
        status: 'not_started',
        assignedAt: '2024-03-01T09:00:00Z',
        dueDate: '2024-03-10T17:00:00Z',
        assignedBy: 'HR Team',
        priority: 'medium',
      },
    ],
    lastActivity: '2024-03-02T15:30:00Z',
    completionPercentage: 45,
  },
];

// Mock invitations
export const mockInvitations: Invitation[] = [
  {
    id: 'inv-001',
    companyEmail: 'lars.petersen@nets.eu',
    privateEmail: 'lars.p.dev@gmail.com',
    firstName: 'Lars',
    lastName: 'Petersen',
    department: 'Engineering',
    position: 'Frontend Developer',
    invitationType: 'onboarding',
    status: 'sent',
    createdAt: '2024-03-15T10:00:00Z',
    sentAt: '2024-03-15T10:05:00Z',
    expiresAt: '2024-03-22T10:00:00Z',
    createdBy: 'Anna Hansen',
    invitationCode: 'NETS-ONBOARD-A1B2C3',
    applicationId: 'app-onboarding-001',
  },
  {
    id: 'inv-002',
    companyEmail: 'mette.sorensen@nets.eu',
    privateEmail: 'mette.s.marketing@outlook.com',
    firstName: 'Mette',
    lastName: 'Sørensen',
    department: 'Marketing',
    position: 'Marketing Specialist',
    invitationType: 'offboarding',
    status: 'pending',
    createdAt: '2024-03-16T14:30:00Z',
    expiresAt: '2024-03-23T14:30:00Z',
    createdBy: 'Erik Larsen',
    invitationCode: 'NETS-OFFBOARD-D4E5F6',
    applicationId: 'app-offboarding-001',
  },
  {
    id: 'inv-003',
    companyEmail: 'john.smith@nets.eu',
    privateEmail: 'j.smith.security@protonmail.com',
    firstName: 'John',
    lastName: 'Smith',
    department: 'Consulting',
    position: 'Security Consultant',
    invitationType: 'onboarding',
    status: 'expired',
    createdAt: '2024-03-01T09:00:00Z',
    sentAt: '2024-03-01T09:15:00Z',
    expiresAt: '2024-03-08T09:00:00Z',
    createdBy: 'Anna Hansen',
    invitationCode: 'NETS-ONBOARD-G7H8I9',
    applicationId: 'app-onboarding-001',
  },
];

// Backward compatibility: Export enrollments with old format
export const mockEnrollments: EmployeeEnrollment[] = mockPersonEnrollments.map((enrollment) => ({
  ...enrollment,
  employeeId: enrollment.personId,
}));

// Helper functions to get related data
export function getPersonEnrollment(personId: string): PersonEnrollment | undefined {
  return mockPersonEnrollments.find((e) => e.personId === personId);
}

export function getPersonInvitations(personId: string): Invitation[] {
  const person = mockPeople.find((p) => p.id === personId);
  if (!person) return [];

  return mockInvitations.filter(
    (inv) => inv.companyEmail === person.email || inv.privateEmail === person.email
  );
}

// Backward compatibility functions
export function getEmployeeEnrollment(employeeId: string): EmployeeEnrollment | undefined {
  return mockEnrollments.find((e) => e.employeeId === employeeId);
}

export function getEmployeeInvitations(employeeId: string): Invitation[] {
  const employee = mockEmployees.find((e) => e.id === employeeId);
  if (!employee) return [];

  return mockInvitations.filter(
    (inv) => inv.companyEmail === employee.email || inv.privateEmail === employee.email
  );
}

export function getApplicationByType(type: 'onboarding' | 'offboarding'): Application | undefined {
  return mockApplications.find((app) => app.type === type);
}
