import { get, writable } from 'svelte/store';
import { getCurrentClientId } from '$lib/utils/client-persistence';
import { reportSupabaseError } from '../config/errorReporting.js';
import { supabaseClientStore } from '../contexts/supabase-context.js';
import type {
  Application,
  Client,
  DocumentStatus,
  Employee,
  EmployeeEnrollment,
  Invitation,
  Person,
  PersonEnrollment,
  TaskStatus,
} from '../types.js';

// Get current Supabase client from store
function getCurrentSupabaseClient() {
  const client = get(supabaseClientStore);
  if (!client) {
    throw new Error('Supabase client not available. Please ensure authentication is set up.');
  }
  return client;
}

// Simple hash function for browser (demo purposes)
async function generateSimpleHash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Store state with progress tracking
export const loading = writable(false);
export const loadingProgress = writable({
  stage: '',
  current: 0,
  total: 0,
  message: '',
});
export const error = writable<string | null>(null);

// Data stores
export const client = writable<Client | null>(null);
export const clients = writable<Client[]>([]);
export const applications = writable<Application[]>([]);
export const people = writable<Person[]>([]);
export const totalPeopleCount = writable<number>(0); // Total count without loading all data
export const enrollments = writable<PersonEnrollment[]>([]);
export const documents = writable<DocumentStatus[]>([]);
export const tasks = writable<TaskStatus[]>([]);
export const invitations = writable<Invitation[]>([]);

// Backward compatibility
export const employees = people; // Alias for backward compatibility

// Helper function to transform database person to UI format
function transformPerson(dbPerson: any): Person {
  return {
    id: dbPerson.id,
    email: dbPerson.company_email,
    firstName: dbPerson.first_name,
    lastName: dbPerson.last_name,
    department: dbPerson.department,
    position: dbPerson.position,
    startDate: dbPerson.start_date,
    employmentStatus: dbPerson.employment_status,
    associateStatus: dbPerson.associate_status,
    phone: '', // Not in database schema
    manager: dbPerson.manager || '',
    location: dbPerson.location,
  };
}

// Backward compatibility: transform person to old employee format
function transformPersonToEmployee(dbPerson: any): Employee {
  const mapToLegacyStatus = (
    employmentStatus: string | null,
    _associateStatus: string | null
  ): string => {
    if (employmentStatus === 'active') return 'active';
    if (employmentStatus === 'former') return 'previous';
    if (employmentStatus === 'future') return 'future';
    return 'other';
  };

  return {
    id: dbPerson.id,
    email: dbPerson.company_email,
    firstName: dbPerson.first_name,
    lastName: dbPerson.last_name,
    department: dbPerson.department,
    position: dbPerson.position,
    startDate: dbPerson.start_date,
    status: mapToLegacyStatus(dbPerson.employment_status, dbPerson.associate_status),
    employmentStatus: dbPerson.employment_status,
    associateStatus: dbPerson.associate_status,
    phone: '', // Not in database schema
    manager: dbPerson.manager || '',
    location: dbPerson.location,
  };
}

// Helper function to transform database person enrollment to UI format
function transformPersonEnrollment(
  dbEnrollment: any,
  dbDocuments: any[],
  dbTasks: any[]
): PersonEnrollment {
  // Transform documents
  const documentsStatus = dbDocuments.map(
    (doc: any): DocumentStatus => ({
      id: doc.id,
      name: doc.name,
      type: doc.type,
      status: doc.status,
      uploadedAt: doc.uploaded_at,
      reviewedAt: doc.reviewed_at,
      reviewedBy: doc.reviewed_by,
    })
  );

  // Transform tasks
  const tasksStatus = dbTasks.map(
    (task: any): TaskStatus => ({
      id: task.id,
      title: task.title,
      description: task.description,
      category: task.category,
      status: task.status,
      assignedAt: task.assigned_at,
      completedAt: task.completed_at,
      dueDate: task.due_date,
      assignedBy: task.assigned_by,
      priority: task.priority,
    })
  );

  return {
    personId: dbEnrollment.person_id,
    onboardingCompleted: dbEnrollment.onboarding_completed,
    documentsStatus,
    tasksStatus,
    lastActivity: dbEnrollment.last_activity,
    completionPercentage: dbEnrollment.completion_percentage,
  };
}

// Backward compatibility: transform to old employee enrollment format
function transformToEmployeeEnrollment(
  dbEnrollment: any,
  dbDocuments: any[],
  dbTasks: any[]
): EmployeeEnrollment {
  const personEnrollment = transformPersonEnrollment(dbEnrollment, dbDocuments, dbTasks);
  return {
    ...personEnrollment,
    employeeId: dbEnrollment.person_id, // Map person_id to employeeId for backward compatibility
  };
}

// Helper function to transform database invitation to UI format
function transformInvitation(dbInvitation: any): Invitation {
  const clientData = dbInvitation.client_data || {};

  return {
    id: dbInvitation.id,
    companyEmail: clientData.company_email || '',
    privateEmail: clientData.private_email || '',
    firstName: clientData.first_name || '',
    lastName: clientData.last_name || '',
    department: clientData.department || '',
    position: clientData.position || '',
    invitationType: dbInvitation.app_code === 'onboarding' ? 'onboarding' : 'offboarding',
    status: dbInvitation.status,
    createdAt: dbInvitation.created_at,
    sentAt: dbInvitation.first_used_at,
    expiresAt: dbInvitation.expires_at,
    acceptedAt: dbInvitation.accepted_at,
    createdBy: dbInvitation.created_by,
    invitationCode: dbInvitation.invitation_code || '',
    applicationId: dbInvitation.app_id,
  };
}

// Load all clients from Supabase
export async function loadAllClients() {
  try {
    // Get current Supabase client from store
    const supabase = getCurrentSupabaseClient();

    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .order('legal_name');

    if (clientsError) {
      await reportSupabaseError('clients', 'select', clientsError);
      throw clientsError;
    }

    if (clientsData) {
      const transformedClients: Client[] = clientsData.map((clientData: any) => ({
        id: clientData.id,
        name: clientData.legal_name,
        code: clientData.client_code,
        domain: clientData.domain,
        tier: clientData.tier,
        status: clientData.status,
        region: clientData.region || 'EU',
      }));
      clients.set(transformedClients);
      return transformedClients;
    }
    return [];
  } catch (err) {
    console.error('Failed to load clients:', err);
    return [];
  }
}

// Load data for a specific client
export async function loadClientData(clientId: string) {
  loading.set(true);
  error.set(null);

  try {
    // Get current Supabase client from store
    const supabase = getCurrentSupabaseClient();

    // Load specific client data
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError) {
      await reportSupabaseError('clients', 'select', clientError, { id: clientId });
      throw clientError;
    }

    if (clientData) {
      const transformedClient: Client = {
        id: clientData.id,
        name: clientData.legal_name,
        code: clientData.client_code,
        domain: clientData.domain,
        tier: clientData.tier,
        status: clientData.status,
        region: clientData.region || 'EU',
      };
      client.set(transformedClient);

      // Load rest of the data using the existing logic...
      await loadClientSpecificData(clientData.id);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error loading client data';
    error.set(errorMessage);
    console.error('Error loading client data:', err);
  } finally {
    loading.set(false);
  }
}

// Helper function to load client-specific data
async function loadClientSpecificData(clientId: string) {
  loading.set(true);
  error.set(null);

  // Get current Supabase client from store
  const supabase = getCurrentSupabaseClient();

  // Reset progress
  loadingProgress.set({
    stage: 'Initializing',
    current: 0,
    total: 7,
    message: 'Starting data load...',
  });

  try {
    // Step 1: Load client data
    loadingProgress.set({
      stage: 'Client',
      current: 1,
      total: 6,
      message: 'Loading client information...',
    });

    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError) {
      await reportSupabaseError('clients', 'select', clientError, { filter: clientId });
      throw clientError;
    }

    if (clientData) {
      const transformedClient: Client = {
        id: clientData.id,
        name: clientData.legal_name,
        code: clientData.client_code,
        domain: clientData.domain,
        tier: clientData.tier,
        status: clientData.status,
        region: clientData.region || 'EU',
      };
      client.set(transformedClient);

      // Step 2: Load applications
      loadingProgress.set({
        stage: 'Applications',
        current: 2,
        total: 6,
        message: 'Loading applications...',
      });

      const { data: appsData, error: appsError } = await supabase
        .from('client_applications')
        .select('*')
        .eq('client_id', clientData.id);

      if (appsError) {
        await reportSupabaseError('client_applications', 'select', appsError, {
          client_id: clientData.id,
        });
        throw appsError;
      }

      if (appsData && appsData.length > 0) {
        const transformedApps: Application[] = appsData.map((app: any) => ({
          id: app.id,
          clientId: app.client_id,
          name: app.app_name,
          code: app.app_code,
          type: app.app_code.includes('offboarding') ? 'offboarding' : 'onboarding',
          status: app.status,
          version: app.app_version || '1.0.0',
          description: app.app_description,
          features: Array.isArray(app.features) ? app.features : [],
          configuration: app.configuration || {},
          permissions: app.permissions || {},
          maxConcurrentUsers: app.max_concurrent_users || 50,
          lastAccessed: app.last_accessed,
          createdAt: app.created_at,
        }));
        console.log('📱 Applications loaded from database:', transformedApps);
        applications.set(transformedApps);
      } else {
        // Fallback to mock applications if none found in database
        const mockApps: Application[] = [
          {
            id: 'app-offboarding-001',
            clientId: clientData.id,
            name: 'Employee Offboarding',
            code: 'offboarding',
            type: 'offboarding',
            status: 'active',
            version: '1.0.0',
            description: 'Task-oriented employee offboarding and departure management',
            features: ['task-management', 'document-upload', 'compliance-tracking'],
            configuration: {},
            permissions: {},
            maxConcurrentUsers: 50,
            lastAccessed: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
          {
            id: 'app-onboarding-001',
            clientId: clientData.id,
            name: 'Employee Onboarding',
            code: 'onboarding',
            type: 'onboarding',
            status: 'active',
            version: '1.0.0',
            description: 'Streamlined employee onboarding and setup',
            features: ['invitation-management', 'document-collection', 'task-tracking'],
            configuration: {},
            permissions: {},
            maxConcurrentUsers: 50,
            lastAccessed: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
        ];
        console.log('📱 Applications using mock data:', mockApps);
        applications.set(mockApps);
      }

      // Step 3: Get total people count first, then load first page
      loadingProgress.set({
        stage: 'People Count',
        current: 3,
        total: 7, // Increased total steps
        message: 'Getting total people count...',
      });

      // Get total count without loading data
      const { count: peopleCount, error: countError } = await supabase
        .from('people')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientData.id);

      if (countError) {
        await reportSupabaseError('people', 'count', countError, {
          client_id: clientData.id,
        });
        throw countError;
      }

      // Step 4: Load first page of people data
      loadingProgress.set({
        stage: 'People Data',
        current: 4,
        total: 7,
        message: `Loading first 50 of ${peopleCount || 0} people...`,
      });

      const { data: peopleData, error: peopleError } = await supabase
        .from('people')
        .select('*')
        .eq('client_id', clientData.id)
        .limit(50) // Limit initial load to 50 people for performance
        .order('created_at', { ascending: false }); // Most recent first

      if (peopleError) {
        await reportSupabaseError('people', 'select', peopleError, {
          client_id: clientData.id,
        });
        throw peopleError;
      }

      if (peopleData) {
        const transformedPeople: Person[] = peopleData.map(transformPerson);
        people.set(transformedPeople);

        // Set the total count from the count query
        totalPeopleCount.set(peopleCount || 0);

        // Backward compatibility: also set employees store with transformed data
        const transformedEmployees: Employee[] = peopleData.map(transformPersonToEmployee);
        employees.set(transformedEmployees);

        // Load enrollments, documents, and tasks efficiently using bulk queries
        const personIds = peopleData.map((p) => p.id);

        // Step 5: Bulk load enrollments
        loadingProgress.set({
          stage: 'Enrollments',
          current: 5,
          total: 7,
          message: `Loading enrollments for ${peopleData.length} people...`,
        });

        const { data: allEnrollments } = await supabase
          .from('people_enrollments')
          .select('*')
          .in('person_id', personIds);

        // Step 6: Bulk load documents and tasks
        loadingProgress.set({
          stage: 'Documents & Tasks',
          current: 6,
          total: 7,
          message: 'Loading documents and tasks...',
        });

        // Bulk load documents using person_id
        const { data: documentsData } = await supabase
          .from('documents')
          .select('*')
          .in('person_id', personIds);

        // Bulk load tasks using person_id
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*')
          .in('person_id', personIds);

        // Create lookup maps for efficient data association
        const enrollmentMap = new Map(allEnrollments?.map((e) => [e.person_id, e]) || []);
        const documentsMap = new Map<string, any[]>();
        const tasksMap = new Map<string, any[]>();

        // Group documents by person_id
        documentsData?.forEach((doc) => {
          const personId = doc.person_id;
          if (!documentsMap.has(personId)) {
            documentsMap.set(personId, []);
          }
          documentsMap.get(personId)?.push(doc);
        });

        // Group tasks by person_id
        tasksData?.forEach((task) => {
          const personId = task.person_id;
          if (!tasksMap.has(personId)) {
            tasksMap.set(personId, []);
          }
          tasksMap.get(personId)?.push(task);
        });

        // Build enrollment data efficiently
        const enrollmentsData: PersonEnrollment[] = [];
        const employeeEnrollmentsData: EmployeeEnrollment[] = [];

        peopleData.forEach((person) => {
          const enrollment = enrollmentMap.get(person.id);
          const personDocs = documentsMap.get(person.id) || [];
          const personTasks = tasksMap.get(person.id) || [];

          if (enrollment) {
            enrollmentsData.push(transformPersonEnrollment(enrollment, personDocs, personTasks));

            // Backward compatibility
            employeeEnrollmentsData.push(
              transformToEmployeeEnrollment(enrollment, personDocs, personTasks)
            );
          }
        });

        enrollments.set(enrollmentsData);

        // Store all documents and tasks for global access
        if (documentsData) {
          documents.set(
            documentsData.map(
              (doc: any): DocumentStatus => ({
                id: doc.id,
                name: doc.name,
                type: doc.type,
                status: doc.status,
                uploadedAt: doc.uploaded_at,
                reviewedAt: doc.reviewed_at,
                reviewedBy: doc.reviewed_by,
              })
            )
          );
        }

        if (tasksData) {
          tasks.set(
            tasksData.map(
              (task: any): TaskStatus => ({
                id: task.id,
                title: task.title,
                description: task.description,
                category: task.category,
                status: task.status,
                assignedAt: task.assigned_at,
                completedAt: task.completed_at,
                dueDate: task.due_date,
                assignedBy: task.assigned_by,
                priority: task.priority,
              })
            )
          );
        }
      }

      // Step 7: Load invitations
      loadingProgress.set({
        stage: 'Invitations',
        current: 7,
        total: 7,
        message: 'Loading invitations...',
      });

      const { data: invitationsData, error: invitationsError } = await supabase
        .from('invitations')
        .select(
          `
          *,
          client_applications!inner(app_code)
        `
        )
        .eq('client_id', clientData.id);

      if (invitationsError) {
        await reportSupabaseError('invitations', 'select', invitationsError, {
          client_id: clientData.id,
        });
        throw invitationsError;
      }

      if (invitationsData) {
        const transformedInvitations: Invitation[] = invitationsData.map((inv: any) => {
          const transformed = transformInvitation(inv);
          // Add app_code for invitationType
          if (inv.client_applications?.app_code) {
            transformed.invitationType =
              inv.client_applications.app_code === 'onboarding' ? 'onboarding' : 'offboarding';
          }
          return transformed;
        });
        invitations.set(transformedInvitations);
      }
    }
  } catch (err) {
    console.error('Error loading demo data:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to load demo data';
    error.set(errorMessage);

    // Report the overall data loading error
    await reportSupabaseError('general', 'select', err, {
      operation: 'loadDemoData',
      stage: 'unknown',
    });
  } finally {
    loading.set(false);
    loadingProgress.set({
      stage: 'Complete',
      current: 7,
      total: 7,
      message: 'Data loading complete!',
    });
  }
}

// Load demo data with authenticated Supabase client
export async function loadDemoDataWithClient(authenticatedSupabase: any) {
  loading.set(true);
  error.set(null);

  try {
    // Get current client from localStorage (single source of truth)
    const currentClientId = getCurrentClientId();
    console.log(`[loadDemoDataWithClient] Loading data for client: ${currentClientId}`);

    // If no client ID, we have a problem
    if (!currentClientId) {
      console.error('[loadDemoDataWithClient] No client ID available!');
      error.set('No client selected. Please refresh the page.');
      return;
    }

    // Load the selected client using authenticated client
    const { data: clientData, error: clientError } = await authenticatedSupabase
      .from('clients')
      .select('*')
      .eq('client_code', currentClientId)
      .single();

    if (clientError) {
      console.error(
        `[loadDemoDataWithClient] Error loading client ${currentClientId}:`,
        clientError
      );

      // If it's a PGRST116 error (no rows), try the default client
      if (clientError.code === 'PGRST116') {
        console.log(
          `[loadDemoDataWithClient] Client ${currentClientId} not found, trying default: hygge-hvidlog`
        );

        const { data: fallbackData, error: fallbackError } = await authenticatedSupabase
          .from('clients')
          .select('*')
          .eq('client_code', 'hygge-hvidlog')
          .single();

        if (!fallbackError && fallbackData) {
          console.log('[loadDemoDataWithClient] Using default client: hygge-hvidlog');
          await loadClientDataWithClient(fallbackData.id, authenticatedSupabase);
          return;
        }
      }

      // Clear any stale data on error
      client.set(null);
      applications.set([]);
      people.set([]);
      enrollments.set([]);
      documents.set([]);
      tasks.set([]);
      invitations.set([]);
      totalPeopleCount.set(0);

      await reportSupabaseError('clients', 'select', clientError, {
        client_code: currentClientId,
        operation: 'loadDemoDataWithClient',
      });
      return;
    }

    if (clientData) {
      console.log(
        `[loadDemoDataWithClient] Successfully loaded client: ${clientData.client_code} (${clientData.legal_name})`
      );
      await loadClientDataWithClient(clientData.id, authenticatedSupabase);
    } else {
      // This shouldn't happen with .single() but handle it anyway
      error.set(`Client "${currentClientId}" returned no data.`);
      console.error(`[loadDemoDataWithClient] No data returned for client: ${currentClientId}`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to load demo data';
    error.set(errorMessage);
    console.error('Error loading demo data:', err);

    // Clear any stale data on error
    client.set(null);
    applications.set([]);
    people.set([]);
    enrollments.set([]);
    documents.set([]);
    tasks.set([]);
    invitations.set([]);
    totalPeopleCount.set(0);

    await reportSupabaseError('general', 'select', err, {
      operation: 'loadDemoDataWithClient',
    });
  } finally {
    loading.set(false);
  }
}

// Load demo data using current client from localStorage (legacy - uses anonymous client)
export async function loadDemoData() {
  loading.set(true);
  error.set(null);

  try {
    // Get current Supabase client from store
    const supabase = getCurrentSupabaseClient();

    // Get current client from localStorage (single source of truth)
    const currentClientId = getCurrentClientId();
    console.log(`[loadDemoData] Loading data for client: ${currentClientId}`);

    // If no client ID, we have a problem
    if (!currentClientId) {
      console.error('[loadDemoData] No client ID available!');
      error.set('No client selected. Please refresh the page.');
      return;
    }

    // Load the selected client
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('client_code', currentClientId)
      .single();

    if (clientError) {
      console.error(`[loadDemoData] Error loading client ${currentClientId}:`, clientError);

      // If it's a PGRST116 error (no rows), try the default client
      if (clientError.code === 'PGRST116') {
        console.log(
          `[loadDemoData] Client ${currentClientId} not found, trying default: hygge-hvidlog`
        );

        const { data: fallbackData, error: fallbackError } = await supabase
          .from('clients')
          .select('*')
          .eq('client_code', 'hygge-hvidlog')
          .single();

        if (!fallbackError && fallbackData) {
          console.log('[loadDemoData] Using default client: hygge-hvidlog');
          await loadClientData(fallbackData.id);
          return;
        }
      }

      error.set(`Unable to load client data. Please check your database connection.`);

      // Clear any stale data
      client.set(null);
      applications.set([]);
      people.set([]);
      enrollments.set([]);
      documents.set([]);
      tasks.set([]);
      invitations.set([]);
      totalPeopleCount.set(0);

      await reportSupabaseError('clients', 'select', clientError, {
        client_code: currentClientId,
        operation: 'loadDemoData',
      });
      return;
    }

    if (clientData) {
      console.log(
        `[loadDemoData] Successfully loaded client: ${clientData.client_code} (${clientData.legal_name})`
      );
      await loadClientData(clientData.id);
    } else {
      // This shouldn't happen with .single() but handle it anyway
      error.set(`Client "${currentClientId}" returned no data.`);
      console.error(`[loadDemoData] No data returned for client: ${currentClientId}`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to load demo data';
    error.set(errorMessage);
    console.error('Error loading demo data:', err);

    // Clear any stale data on error
    client.set(null);
    applications.set([]);
    people.set([]);
    enrollments.set([]);
    documents.set([]);
    tasks.set([]);
    invitations.set([]);
    totalPeopleCount.set(0);

    await reportSupabaseError('general', 'select', err, {
      operation: 'loadDemoData',
    });
  } finally {
    loading.set(false);
  }
}

// Helper function to get employee enrollment
export function getEmployeeEnrollment(employeeId: string) {
  let result: EmployeeEnrollment | undefined;
  enrollments.subscribe((enrollments) => {
    result = enrollments.find((e) => e.employeeId === employeeId);
  })();
  return result;
}

// Helper function to get employee invitations
export function getEmployeeInvitations(employeeId: string) {
  let employee: Employee | undefined;
  let result: Invitation[] = [];

  employees.subscribe((employees) => {
    employee = employees.find((e) => e.id === employeeId);
  })();

  if (employee) {
    invitations.subscribe((invitations) => {
      result = invitations.filter(
        (inv) => inv.companyEmail === employee?.email || inv.privateEmail === employee?.email
      );
    })();
  }

  return result;
}

// Helper function to get application by type
export function getApplicationByType(type: 'onboarding' | 'offboarding') {
  let result: Application | undefined;
  applications.subscribe((applications) => {
    result = applications.find((app) => app.type === type);
  })();
  return result;
}

// Create a new invitation in the database
export async function createInvitation(invitationData: {
  companyEmail: string;
  privateEmail: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  invitationType: 'onboarding' | 'offboarding';
  associationStartDate?: string;
  associationEndDate?: string;
}) {
  try {
    // Get current client data
    let currentClient: Client | null = null;
    client.subscribe((c) => (currentClient = c))();

    if (!currentClient) {
      throw new Error('No client data available');
    }

    // Get the application for this invitation type
    const application = getApplicationByType(invitationData.invitationType);
    if (!application) {
      throw new Error(`No ${invitationData.invitationType} application found`);
    }

    // Generate invitation code (uppercase per database constraint)
    const invitationCode = `${currentClient.code.toUpperCase()}-${Date.now()}`;

    // Generate JWT token with proper structure
    const _timestamp = Date.now();
    const jwtPayload = {
      iss: 'api.thepia.com',
      aud: 'flows.thepia.net',
      sub: `inv-${invitationCode}`,
      exp: Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000), // 7 days
      iat: Math.floor(Date.now() / 1000),
      invitation: {
        invitee: {
          fullName: `${invitationData.firstName} ${invitationData.lastName}`,
          companyEmail: invitationData.companyEmail,
          privateEmail: invitationData.privateEmail,
        },
        position: invitationData.position,
        department: invitationData.department,
        type: invitationData.invitationType,
        // Optional association dates
        ...(invitationData.associationStartDate || invitationData.associationEndDate
          ? {
              association: {
                ...(invitationData.associationStartDate
                  ? { startDate: invitationData.associationStartDate }
                  : {}),
                ...(invitationData.associationEndDate
                  ? { endDate: invitationData.associationEndDate }
                  : {}),
              },
            }
          : {}),
      },
    };

    // Generate JWT token hash
    const jwtTokenHash = await generateSimpleHash(JSON.stringify(jwtPayload));

    // Set expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Prepare invitation data for database
    const dbInvitationData = {
      client_id: currentClient.id,
      app_id: application.id,
      invitation_code: invitationCode,
      jwt_token_hash: jwtTokenHash,
      client_data: {
        company_email: invitationData.companyEmail,
        private_email: invitationData.privateEmail,
        first_name: invitationData.firstName,
        last_name: invitationData.lastName,
        department: invitationData.department,
        position: invitationData.position,
      },
      status: 'pending',
      expires_at: expiresAt.toISOString(),
      created_by: 'admin@thepia.com', // In production, this would be the current user
    };

    // Insert into database
    const { data: newInvitation, error } = await supabase
      .from('invitations')
      .insert(dbInvitationData)
      .select(
        `
        *,
        client_applications!inner(app_code)
      `
      )
      .single();

    if (error) {
      await reportSupabaseError('invitations', 'insert', error, {
        client_id: currentClient.id,
        app_id: application.id,
      });
      throw error;
    }

    // Transform to UI format
    const transformedInvitation = transformInvitation(newInvitation);
    if (newInvitation.client_applications?.app_code) {
      transformedInvitation.invitationType =
        newInvitation.client_applications.app_code === 'onboarding' ? 'onboarding' : 'offboarding';
    }

    // Update local store
    invitations.update((current) => [...current, transformedInvitation]);

    return transformedInvitation;
  } catch (err) {
    console.error('Error creating invitation:', err);
    await reportSupabaseError('invitations', 'insert', err, {
      operation: 'createInvitation',
      invitationData,
    });
    throw err;
  }
}

// Create a new employee in the database
export async function createEmployee(employeeData: {
  firstName: string;
  lastName: string;
  companyEmail: string;
  department: string;
  position: string;
  location: string;
  manager?: string;
  startDate?: string;
  endDate?: string;
  employmentType: 'full_time' | 'part_time' | 'contractor' | 'intern';
  workLocation: 'office' | 'remote' | 'hybrid';
  status: 'active' | 'previous' | 'future' | 'other';
  securityClearance: 'low' | 'medium' | 'high';
}) {
  try {
    // Get current client data
    let currentClient: Client | null = null;
    client.subscribe((c) => (currentClient = c))();

    if (!currentClient) {
      throw new Error('No client data available');
    }

    // Generate employee code (using client code + timestamp)
    const employeeCode = `${currentClient.code}-emp-${Date.now()}`;

    // Map new status values to legacy database values (temporary until schema update)
    const mapStatusToLegacy = (status: 'active' | 'previous' | 'future' | 'other'): string => {
      switch (status) {
        case 'active':
          return 'active';
        case 'previous':
          return 'offboarded';
        case 'future':
          return 'future';
        case 'other':
          return 'pending';
        default:
          return 'active';
      }
    };

    // Prepare employee data for database
    const dbEmployeeData = {
      client_id: currentClient.id,
      employee_code: employeeCode,
      first_name: employeeData.firstName,
      last_name: employeeData.lastName,
      company_email: employeeData.companyEmail,
      department: employeeData.department,
      position: employeeData.position,
      location: employeeData.location,
      manager: employeeData.manager || null,
      start_date: employeeData.startDate || null,
      end_date: employeeData.endDate || null,
      employment_type: employeeData.employmentType,
      work_location: employeeData.workLocation,
      status: mapStatusToLegacy(employeeData.status),
      security_clearance: employeeData.securityClearance,
      skills: [],
      languages: [],
    };

    // Insert into database
    const { data: newPerson, error } = await supabase
      .from('people')
      .insert(dbEmployeeData)
      .select('*')
      .single();

    if (error) {
      await reportSupabaseError('people', 'insert', error, {
        client_id: currentClient.id,
        person_code: employeeCode,
      });
      throw error;
    }

    // Transform to UI format
    const transformedPerson = transformPerson(newPerson);
    const transformedEmployee = transformPersonToEmployee(newPerson);

    // Update local stores
    people.update((current) => [...current, transformedPerson]);
    employees.update((current) => [...current, transformedEmployee]);

    return transformedEmployee;
  } catch (err) {
    console.error('Error creating employee:', err);
    await reportSupabaseError('employees', 'insert', err, {
      operation: 'createEmployee',
      employeeData,
    });
    throw err;
  }
}

// Get meaningful business metrics for dashboard
export async function getClientMetrics() {
  try {
    // Get current Supabase client from store
    const supabase = getCurrentSupabaseClient();

    // Get current client data
    let currentClient: Client | null = null;
    client.subscribe((c) => (currentClient = c))();

    if (!currentClient) {
      throw new Error('No client data available');
    }

    // Count people actually in onboarding processes (incomplete enrollments)
    const { data: onboardingPeople, error: onboardingError } = await supabase
      .from('people_enrollments')
      .select('person_id')
      .eq('onboarding_completed', false)
      .lt('completion_percentage', 100);

    let onboardingCount = 0;
    if (!onboardingError && onboardingPeople) {
      onboardingCount = onboardingPeople.length;
    } else {
      console.warn('Error loading onboarding enrollments:', onboardingError);
    }

    // Count people actually in offboarding processes
    const { data: offboardingProcesses, error: offboardingError } = await supabase
      .from('offboarding_processes')
      .select('employee_uid')
      .eq('client_id', currentClient.id)
      .in('status', ['draft', 'pending_approval', 'active']); // Not completed/cancelled

    let offboardingCount = 0;
    if (!offboardingError && offboardingProcesses) {
      offboardingCount = offboardingProcesses.length;
    } else {
      console.warn('Error loading offboarding processes:', offboardingError);
    }

    // If no processes exist, fall back to invitation counts
    if (offboardingCount === 0) {
      const { data: invitationData, error: invitationError } = await supabase
        .from('invitations')
        .select(
          `
          client_data,
          client_applications!inner(app_code)
        `
        )
        .eq('client_id', currentClient.id)
        .eq('status', 'pending');

      if (!invitationError && invitationData) {
        offboardingCount = invitationData.filter(
          (inv) => inv.client_applications?.app_code === 'offboarding'
        ).length;
      }
    }

    console.log(
      `Metrics: ${onboardingCount} people in onboarding, ${offboardingCount} people in offboarding`
    );

    return {
      onboardingCount,
      offboardingCount,
    };
  } catch (err) {
    console.error('Error getting client metrics:', err);
    await reportSupabaseError('general', 'metrics', err, {
      operation: 'getClientMetrics',
    });

    // Return fallback values instead of throwing
    return {
      onboardingCount: 0,
      offboardingCount: 0,
    };
  }
}
