import { get } from 'svelte/store';
import { supabaseClientStore } from '../contexts/supabase-context';

// Get current Supabase client from store
function getCurrentSupabaseClient() {
  const client = get(supabaseClientStore);
  if (!client) {
    throw new Error('Authentication required - please sign in to access demo data cleanup');
  }
  return client;
}

export async function resetDemoDataForCompany(
  companyCode: string,
  progressCallback?: (progress: number, message: string) => void
): Promise<void> {
  progressCallback?.(0, 'Starting data cleanup...');

  // Get current Supabase client from store
  const supabase = getCurrentSupabaseClient();

  // Get the demo company info
  const { data: clientData, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('client_code', companyCode)
    .single();

  if (clientError || !clientData) {
    throw new Error(`Demo company ${companyCode} not found`);
  }

  progressCallback?.(20, 'Removing employee enrollments...');

  // Delete enrollments first (has foreign keys)
  const { error: enrollmentsError } = await supabase
    .from('people_enrollments')
    .delete()
    .eq('client_id', clientData.id);

  if (enrollmentsError) {
    console.error('Error deleting enrollments:', enrollmentsError);
  }

  progressCallback?.(40, 'Removing tasks and documents...');

  // Get all people for this client to clean up their related data
  const { data: people } = await supabase
    .from('people')
    .select('id')
    .eq('client_id', clientData.id);

  if (people && people.length > 0) {
    const personIds = people.map((person) => person.id);

    // Delete tasks (still using employee_id column for backward compatibility)
    const { error: tasksError } = await supabase
      .from('tasks')
      .delete()
      .in('employee_id', personIds);

    if (tasksError) {
      console.error('Error deleting tasks:', tasksError);
    }

    // Delete documents (still using employee_id column for backward compatibility)
    const { error: documentsError } = await supabase
      .from('documents')
      .delete()
      .in('employee_id', personIds);

    if (documentsError) {
      console.error('Error deleting documents:', documentsError);
    }
  }

  progressCallback?.(60, 'Removing invitations...');

  // Delete invitations
  const { error: invitationsError } = await supabase
    .from('invitations')
    .delete()
    .eq('client_id', clientData.id);

  if (invitationsError) {
    console.error('Error deleting invitations:', invitationsError);
  }

  progressCallback?.(80, 'Removing people...');

  // Delete people
  const { error: peopleError } = await supabase
    .from('people')
    .delete()
    .eq('client_id', clientData.id);

  if (peopleError) {
    console.error('Error deleting people:', peopleError);
    throw peopleError;
  }

  progressCallback?.(100, 'Data cleanup completed successfully');
}

export async function exportDemoData(companyCode: string): Promise<object> {
  // Get the demo company info
  const { data: clientData, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('client_code', companyCode)
    .single();

  if (clientError || !clientData) {
    throw new Error(`Demo company ${companyCode} not found`);
  }

  // Export all data
  const [peopleResult, invitationsResult, enrollmentsResult] = await Promise.all([
    supabase.from('people').select('*').eq('client_id', clientData.id),
    supabase.from('invitations').select('*').eq('client_id', clientData.id),
    supabase.from('people_enrollments').select('*').eq('client_id', clientData.id),
  ]);

  return {
    company: clientData,
    people: peopleResult.data || [],
    employees: peopleResult.data || [], // Backward compatibility
    invitations: invitationsResult.data || [],
    enrollments: enrollmentsResult.data || [],
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
  };
}

export async function getDemoMetrics(companyCode?: string): Promise<{
  totalCompanies: number;
  totalEmployees: number;
  activeProcesses: number;
  completedProcesses: number;
  totalDocuments: number;
  totalTasks: number;
  lastUpdated: string;
}> {
  let clientFilter = {};

  if (companyCode) {
    const { data: clientData } = await supabase
      .from('clients')
      .select('id')
      .eq('client_code', companyCode)
      .single();

    if (clientData) {
      clientFilter = { client_id: clientData.id };
    }
  }

  // Get metrics
  const [companiesResult, peopleResult, invitationsResult, documentsResult, tasksResult] =
    await Promise.all([
      supabase.from('clients').select('id', { count: 'exact' }).ilike('client_code', '%demo%'),
      supabase.from('people').select('id', { count: 'exact' }).match(clientFilter),
      supabase.from('invitations').select('id, status', { count: 'exact' }).match(clientFilter),
      supabase.from('documents').select('id', { count: 'exact' }).match(clientFilter),
      supabase.from('tasks').select('id', { count: 'exact' }).match(clientFilter),
    ]);

  const invitations = invitationsResult.data || [];
  const activeProcesses = invitations.filter((inv) =>
    ['pending', 'sent'].includes(inv.status)
  ).length;
  const completedProcesses = invitations.filter((inv) => inv.status === 'accepted').length;

  return {
    totalCompanies: companiesResult.count || 0,
    totalEmployees: peopleResult.count || 0,
    activeProcesses,
    completedProcesses,
    totalDocuments: documentsResult.count || 0,
    totalTasks: tasksResult.count || 0,
    lastUpdated: new Date().toISOString(),
  };
}
