<script lang="ts">
import { createEventDispatcher } from 'svelte';
import { page } from '$app/stores';
import {
  isSupabaseAuthenticatedStore,
  supabaseClientStore,
} from '$lib/contexts/supabase-context.ts';
import type { CreateOffboardingWorkflowRequest } from '$lib/types/offboarding';

const dispatch = createEventDispatcher();

// Get Supabase client from context
// Use global stores directly

let _open = true;
let _loading = false;
let _error: string | null = null;

// Form data
let formData: Partial<CreateOffboardingWorkflowRequest> = {
  client_id: '',
  employee_uid: '',
  expected_last_day: '',
  department_category: '',
  seniority_level: 'mid_level',
  workflow_complexity: 'standard',
  priority: 'standard',
};

// Additional workflow flags
let workflowFlags = {
  has_client_relationships: false,
  has_vendor_relationships: false,
  has_critical_system_knowledge: false,
  has_team_leadership_responsibilities: false,
  has_specialized_processes: false,
  requires_legal_review: false,
  requires_security_clearance_review: false,
  requires_client_notification: false,
};

let estimatedHours = 8;
let numberOfReports = 0;
let numberOfRelationships = 0;

// Initialize with client ID from URL
$: {
  const clientId = $page.url.searchParams.get('client') || 'demo-client-1';
  formData.client_id = clientId;
}

function handleClose() {
  _open = false;
  dispatch('close');
}

function generateEmployeeUID(): string {
  // Generate a random 16-character UID for demo purposes
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function calculateWorkflowComplexity(): 'simple' | 'standard' | 'complex' | 'executive' {
  let complexityScore = 0;

  // Base complexity by seniority
  switch (formData.seniority_level) {
    case 'junior':
      complexityScore += 1;
      break;
    case 'mid_level':
      complexityScore += 2;
      break;
    case 'senior':
      complexityScore += 3;
      break;
    case 'principal':
      complexityScore += 4;
      break;
    case 'leadership':
      complexityScore += 5;
      break;
    case 'executive':
      complexityScore += 6;
      break;
  }

  // Add complexity factors
  if (workflowFlags.has_client_relationships) complexityScore += 2;
  if (workflowFlags.has_vendor_relationships) complexityScore += 2;
  if (workflowFlags.has_critical_system_knowledge) complexityScore += 2;
  if (workflowFlags.has_team_leadership_responsibilities) complexityScore += 3;
  if (workflowFlags.has_specialized_processes) complexityScore += 1;
  if (workflowFlags.requires_legal_review) complexityScore += 2;
  if (workflowFlags.requires_security_clearance_review) complexityScore += 3;
  if (numberOfReports > 0) complexityScore += Math.min(numberOfReports / 2, 3);
  if (numberOfRelationships > 5) complexityScore += 2;

  // Determine complexity level
  if (complexityScore <= 3) return 'simple';
  if (complexityScore <= 6) return 'standard';
  if (complexityScore <= 10) return 'complex';
  return 'executive';
}

function calculateEstimatedHours(): number {
  let baseHours = 4;

  // Add hours based on complexity factors
  if (workflowFlags.has_client_relationships) baseHours += 4;
  if (workflowFlags.has_vendor_relationships) baseHours += 3;
  if (workflowFlags.has_critical_system_knowledge) baseHours += 6;
  if (workflowFlags.has_team_leadership_responsibilities) baseHours += 8;
  if (workflowFlags.has_specialized_processes) baseHours += 2;

  // Add hours for direct reports and relationships
  baseHours += numberOfReports * 1.5;
  baseHours += Math.min(numberOfRelationships * 0.5, 6);

  return Math.round(baseHours);
}

// Auto-calculate complexity and hours when flags change
$: {
  formData.workflow_complexity = calculateWorkflowComplexity();
  estimatedHours = calculateEstimatedHours();
}

async function _handleSubmit() {
  try {
    _loading = true;
    _error = null;

    // Check authentication
    if (!$isSupabaseAuthenticatedStore || !$supabaseClientStore) {
      throw new Error('Please sign in to create workflows');
    }

    // Validate required fields
    if (!formData.employee_uid?.trim()) {
      throw new Error('Employee UID is required');
    }

    if (!formData.client_id) {
      throw new Error('Client ID is required');
    }

    // Generate UID if not provided
    if (!formData.employee_uid || formData.employee_uid.trim() === '') {
      formData.employee_uid = generateEmployeeUID();
    }

    // Calculate deadlines
    const today = new Date();
    const expectedLastDay = formData.expected_last_day
      ? new Date(formData.expected_last_day)
      : new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days from now

    const knowledgeTransferDeadline = new Date(expectedLastDay.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days before last day
    const finalDeadline = new Date(expectedLastDay.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days after last day

    // Create the workflow
    const { data: workflow, error: workflowError } = await $supabaseClientStore
      .from('offboarding_workflows')
      .insert({
        client_id: formData.client_id,
        employee_uid: formData.employee_uid.trim(),
        workflow_type: 'offboarding',
        expected_last_day: expectedLastDay.toISOString().split('T')[0],
        knowledge_transfer_deadline: knowledgeTransferDeadline.toISOString().split('T')[0],
        final_completion_deadline: finalDeadline.toISOString().split('T')[0],
        department_category: formData.department_category || null,
        seniority_level: formData.seniority_level,
        workflow_complexity: formData.workflow_complexity,
        priority: formData.priority,
        estimated_knowledge_transfer_hours: estimatedHours,
        number_of_direct_reports: numberOfReports,
        number_of_key_relationships: numberOfRelationships,
        ...workflowFlags,
        created_by: 'admin_interface',
      })
      .select()
      .single();

    if (workflowError) throw workflowError;

    // Create default compliance checks using the database function
    const { error: complianceError } = await $supabaseClientStore.rpc(
      'create_default_compliance_checks',
      {
        p_workflow_id: workflow.id,
        p_complexity: formData.workflow_complexity,
      }
    );

    if (complianceError) {
      console.warn('Failed to create default compliance checks:', complianceError);
      // Don't fail the entire workflow creation for this
    }

    dispatch('created', { workflow });
    handleClose();
  } catch (err) {
    console.error('Error creating workflow:', err);
    _error = err instanceof Error ? err.message : 'Failed to create workflow';
  } finally {
    _loading = false;
  }
}

function _fillDemoData() {
  formData = {
    ...formData,
    employee_uid: generateEmployeeUID(),
    expected_last_day: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    department_category: 'technical',
    seniority_level: 'senior',
    priority: 'standard',
  };

  workflowFlags = {
    has_client_relationships: true,
    has_vendor_relationships: false,
    has_critical_system_knowledge: true,
    has_team_leadership_responsibilities: true,
    has_specialized_processes: true,
    requires_legal_review: false,
    requires_security_clearance_review: false,
    requires_client_notification: true,
  };

  numberOfReports = 3;
  numberOfRelationships = 8;
}
</script>

<Dialog bind:open>
  <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle class="flex items-center gap-2">
        <User class="w-5 h-5" />
        Create New Offboarding Workflow
      </DialogTitle>
    </DialogHeader>

    <form on:submit|preventDefault={handleSubmit} class="space-y-6">
      {#if error}
        <Alert variant="destructive">
          <AlertTriangle class="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      {/if}

      {#if !$isSupabaseAuthenticatedStore}
        <Alert variant="warning">
          <AlertTriangle class="w-4 h-4" />
          <AlertDescription>
            Please sign in to create workflows. <a href="/auth-test" class="underline">Go to Auth Test page →</a>
          </AlertDescription>
        </Alert>
      {/if}

      <!-- Demo Data Button -->
      <div class="flex justify-end">
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          on:click={fillDemoData}
        >
          Fill Demo Data
        </Button>
      </div>

      <!-- Basic Information -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium flex items-center gap-2">
          <User class="w-4 h-4" />
          Employee Information
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="employee_uid">Employee UID *</Label>
            <Input
              id="employee_uid"
              bind:value={formData.employee_uid}
              placeholder="Enter anonymous employee UID"
              required
            />
            <p class="text-xs text-muted-foreground">
              Anonymous identifier from Shadow platform
            </p>
          </div>

          <div class="space-y-2">
            <Label for="expected_last_day">Expected Last Day</Label>
            <Input
              id="expected_last_day"
              type="date"
              bind:value={formData.expected_last_day}
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="space-y-2">
            <Label for="department_category">Department</Label>
            <Select bind:value={formData.department_category}>
              <option value="">Select department</option>
              <option value="technical">Technical</option>
              <option value="sales">Sales</option>
              <option value="operations">Operations</option>
              <option value="leadership">Leadership</option>
              <option value="support">Support</option>
              <option value="marketing">Marketing</option>
              <option value="finance">Finance</option>
              <option value="hr">Human Resources</option>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="seniority_level">Seniority Level *</Label>
            <Select bind:value={formData.seniority_level}>
              <option value="junior">Junior</option>
              <option value="mid_level">Mid Level</option>
              <option value="senior">Senior</option>
              <option value="principal">Principal</option>
              <option value="leadership">Leadership</option>
              <option value="executive">Executive</option>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="priority">Priority</Label>
            <Select bind:value={formData.priority}>
              <option value="low">Low</option>
              <option value="standard">Standard</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
          </div>
        </div>
      </div>

      <!-- Workflow Characteristics -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium flex items-center gap-2">
          <Building class="w-4 h-4" />
          Workflow Characteristics
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="space-y-2">
            <Label for="num_reports">Direct Reports</Label>
            <Input
              id="num_reports"
              type="number"
              min="0"
              bind:value={numberOfReports}
              placeholder="0"
            />
          </div>

          <div class="space-y-2">
            <Label for="num_relationships">Key Relationships</Label>
            <Input
              id="num_relationships"
              type="number"
              min="0"
              bind:value={numberOfRelationships}
              placeholder="0"
            />
          </div>

          <div class="space-y-2">
            <Label>Estimated Hours</Label>
            <Input
              value={estimatedHours}
              disabled
              class="bg-gray-50"
            />
            <p class="text-xs text-muted-foreground">Auto-calculated</p>
          </div>
        </div>

        <!-- Knowledge & Responsibilities -->
        <div class="space-y-3">
          <Label>Knowledge & Responsibilities</Label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label class="flex items-center space-x-2">
              <Checkbox bind:checked={workflowFlags.has_client_relationships} />
              <span class="text-sm">Has client relationships</span>
            </label>
            <label class="flex items-center space-x-2">
              <Checkbox bind:checked={workflowFlags.has_vendor_relationships} />
              <span class="text-sm">Has vendor relationships</span>
            </label>
            <label class="flex items-center space-x-2">
              <Checkbox bind:checked={workflowFlags.has_critical_system_knowledge} />
              <span class="text-sm">Has critical system knowledge</span>
            </label>
            <label class="flex items-center space-x-2">
              <Checkbox bind:checked={workflowFlags.has_team_leadership_responsibilities} />
              <span class="text-sm">Has team leadership responsibilities</span>
            </label>
            <label class="flex items-center space-x-2">
              <Checkbox bind:checked={workflowFlags.has_specialized_processes} />
              <span class="text-sm">Has specialized processes</span>
            </label>
          </div>
        </div>

        <!-- Special Requirements -->
        <div class="space-y-3">
          <Label>Special Requirements</Label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label class="flex items-center space-x-2">
              <Checkbox bind:checked={workflowFlags.requires_legal_review} />
              <span class="text-sm">Requires legal review</span>
            </label>
            <label class="flex items-center space-x-2">
              <Checkbox bind:checked={workflowFlags.requires_security_clearance_review} />
              <span class="text-sm">Requires security clearance review</span>
            </label>
            <label class="flex items-center space-x-2">
              <Checkbox bind:checked={workflowFlags.requires_client_notification} />
              <span class="text-sm">Requires client notification</span>
            </label>
          </div>
        </div>

        <!-- Calculated Complexity -->
        <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-blue-900">Calculated Complexity:</span>
            <span class="text-sm font-bold text-blue-900 uppercase">
              {formData.workflow_complexity}
            </span>
          </div>
          <p class="text-xs text-blue-700 mt-1">
            Based on seniority, responsibilities, and requirements
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-4 border-t">
        <Button 
          type="button" 
          variant="outline" 
          on:click={handleClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || !formData.employee_uid?.trim() || !$isSupabaseAuthenticatedStore}
        >
          {#if loading}
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          {/if}
          Create Workflow
        </Button>
      </div>
    </form>
  </DialogContent>
</Dialog>

<style>
  :global(.create-workflow-modal) {
    max-height: 90vh;
    overflow-y: auto;
  }
</style>