// Create process records directly in the demo app
import { supabaseClientStore } from '../lib/contexts/supabase-context';
import { get } from 'svelte/store';

// Get current Supabase client from store
function getCurrentSupabaseClient() {
  const client = get(supabaseClientStore);
  if (!client) {
    throw new Error('Authentication required - please sign in to run this script');
  }
  return client;
}

export async function createProcessRecords() {
  console.log('🔄 Creating process records...');
  console.log(
    '🔗 Supabase URL:',
    import.meta.env?.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'using fallback'
  );

  try {
    const supabase = getCurrentSupabaseClient();

    // Get the current client (Hygge & Hvidløg)
    const { data: clients, error: clientError } = await supabase
      .from('clients')
      .select('id, client_code')
      .eq('client_code', 'hygge-hvidlog')
      .single();

    if (clientError) {
      console.error('❌ Error fetching client:', clientError);
      return;
    }

    if (!clients) {
      console.error('❌ Hygge & Hvidløg client not found');
      return;
    }

    console.log(`📊 Working with client: ${clients.client_code}`);

    // Get all people for this client
    const { data: people, error: peopleError } = await supabase
      .from('people')
      .select('id, person_code, first_name, last_name, department, position')
      .eq('client_id', clients.id);

    if (peopleError) {
      console.error('❌ Error fetching people:', peopleError);
      return;
    }

    console.log(`👥 Found ${people?.length || 0} people`);

    if (!people || people.length === 0) {
      console.error('❌ No people found for client');
      return;
    }

    // Create enrollment records for onboarding (70% of people)
    const enrollmentCount = Math.floor(people.length * 0.7);
    const enrollments = [];

    for (let i = 0; i < enrollmentCount; i++) {
      const person = people[i];
      const completionPercentage = Math.floor(Math.random() * 80) + 10; // 10-90%

      enrollments.push({
        person_id: person.id,
        onboarding_completed: completionPercentage >= 95,
        completion_percentage: completionPercentage,
        mentor: 'Demo Mentor',
        buddy_program: Math.random() > 0.5,
        last_activity: new Date().toISOString(),
      });
    }

    // Insert enrollment records
    if (enrollments.length > 0) {
      const { error: enrollmentError } = await supabase
        .from('people_enrollments')
        .upsert(enrollments, { onConflict: 'person_id' });

      if (enrollmentError) {
        console.error('❌ Error creating enrollments:', enrollmentError);
      } else {
        console.log(`✅ Created ${enrollments.length} enrollment records`);
      }
    }

    // Create offboarding template if needed
    let { data: template, error: templateFetchError } = await supabase
      .from('offboarding_templates')
      .select('id')
      .eq('client_id', clients.id)
      .eq('is_default', true)
      .single();

    if (templateFetchError && templateFetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('❌ Error fetching template:', templateFetchError);
      return;
    }

    if (!template) {
      const { data: newTemplate, error: templateError } = await supabase
        .from('offboarding_templates')
        .insert({
          client_id: clients.id,
          name: 'Standard Offboarding Process',
          description: 'Default offboarding process for all employees',
          template_type: 'company_wide',
          estimated_duration_days: 14,
          complexity_score: 2,
          is_active: true,
          is_default: true,
          requires_manager_approval: true,
          requires_hr_approval: true,
          auto_assign_tasks: true,
          created_by: 'system-demo',
        })
        .select('id')
        .single();

      if (templateError) {
        console.error('❌ Error creating template:', templateError);
        return;
      }
      template = newTemplate;
      console.log('✅ Created offboarding template');
    }

    // Create offboarding processes (15% of people = ~180 for 1,200 people)
    const processCount = Math.floor(people.length * 0.15);
    const processes = [];
    const statuses = ['draft', 'pending_approval', 'active'];
    const priorities = ['low', 'medium', 'high'];

    for (let i = 0; i < processCount; i++) {
      const person = people[i + enrollmentCount]; // Use different people than enrollment
      if (!person) break;

      processes.push({
        client_id: clients.id,
        template_id: template.id,
        employee_uid: person.person_code,
        employee_department: person.department,
        employee_role: person.position,
        process_name: `${person.first_name} ${person.last_name} Offboarding`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        target_completion_date: new Date(
          Date.now() + (Math.floor(Math.random() * 30) + 15) * 24 * 60 * 60 * 1000
        ).toISOString(),
        estimated_completion_percentage: Math.floor(Math.random() * 60) + 10,
        created_by: 'demo-system',
      });
    }

    // Insert process records
    if (processes.length > 0) {
      const { error: processError } = await supabase
        .from('offboarding_processes')
        .insert(processes);

      if (processError) {
        console.error('❌ Error creating processes:', processError);
      } else {
        console.log(`✅ Created ${processes.length} offboarding processes`);
      }
    }

    console.log('🎉 Process creation completed!');
    console.log(`📊 Summary: ${enrollments.length} onboarding, ${processes.length} offboarding`);

    return {
      enrollments: enrollments.length,
      processes: processes.length,
    };
  } catch (error) {
    console.error('💥 Error creating process records:', error);
    throw error;
  }
}
