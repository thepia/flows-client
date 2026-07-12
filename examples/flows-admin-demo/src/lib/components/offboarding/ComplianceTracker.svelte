<script lang="ts">
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-svelte';
import { createEventDispatcher } from 'svelte';
import { isSupabaseAuthenticatedStore, supabaseClientStore } from '$lib/contexts/supabase-context';
import type {
  OffboardingComplianceCheck,
  OffboardingWorkflow,
  UpdateComplianceCheckRequest,
} from '$lib/types/offboarding';

export let workflow: OffboardingWorkflow;
export const complianceChecks: OffboardingComplianceCheck[] = [];
export const readonly = false;

const dispatch = createEventDispatcher();

// Get Supabase client from context
// Use global stores directly

let _loading = false;
let _error: string | null = null;
let _showUpdateModal = false;
let selectedCheck: OffboardingComplianceCheck | null = null;

// Form data for updating compliance checks
let updateData: Partial<UpdateComplianceCheckRequest> = {
  status: 'pending',
  completion_evidence: '',
  verified_by: '',
  verification_date: '',
  waiver_reason: '',
};

function resetUpdateForm() {
  updateData = {
    status: 'pending',
    completion_evidence: '',
    verified_by: '',
    verification_date: '',
    waiver_reason: '',
  };
}

function _getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'not_applicable':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'waived':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function _getCriticalityColor(criticality: string): string {
  switch (criticality) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'important':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'standard':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'optional':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function _getRiskColor(risk: string | undefined): string {
  if (!risk) return 'bg-gray-100 text-gray-800 border-gray-200';
  switch (risk) {
    case 'severe':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'minimal':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function _getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return CheckCircle;
    case 'in_progress':
      return Clock;
    case 'waived':
      return XCircle;
    case 'not_applicable':
      return XCircle;
    default:
      return AlertCircle;
  }
}

function _formatComplianceType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function _formatDate(dateString: string | undefined): string {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString();
}

function isOverdue(check: OffboardingComplianceCheck): boolean {
  if (
    !check.due_date ||
    check.status === 'completed' ||
    check.status === 'waived' ||
    check.status === 'not_applicable'
  ) {
    return false;
  }
  return new Date(check.due_date) < new Date();
}

function _getDaysUntilDue(check: OffboardingComplianceCheck): number | null {
  if (!check.due_date) return null;
  const dueDate = new Date(check.due_date);
  const today = new Date();
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function calculateProgress(): number {
  if (complianceChecks.length === 0) return 0;
  const completed = complianceChecks.filter(
    (check) =>
      check.status === 'completed' || check.status === 'waived' || check.status === 'not_applicable'
  ).length;
  return (completed / complianceChecks.length) * 100;
}

function getGroupedChecks() {
  const groups = {
    critical: complianceChecks.filter((c) => c.criticality === 'critical'),
    important: complianceChecks.filter((c) => c.criticality === 'important'),
    standard: complianceChecks.filter((c) => c.criticality === 'standard'),
    optional: complianceChecks.filter((c) => c.criticality === 'optional'),
  };
  return groups;
}

async function _handleUpdateCheck() {
  if (!selectedCheck) return;

  try {
    _loading = true;
    _error = null;

    // Check authentication
    if (!$isSupabaseAuthenticatedStore || !$supabaseClientStore) {
      throw new Error('Please sign in to update compliance checks');
    }

    const updates: any = {
      status: updateData.status,
    };

    if (updateData.completion_evidence?.trim()) {
      updates.completion_evidence = updateData.completion_evidence.trim();
    }

    if (updateData.verified_by?.trim()) {
      updates.verified_by = updateData.verified_by.trim();
    }

    if (updateData.verification_date) {
      updates.verification_date = updateData.verification_date;
    }

    if (updateData.status === 'waived' && updateData.waiver_reason?.trim()) {
      updates.waiver_reason = updateData.waiver_reason.trim();
    }

    if (updateData.status === 'completed') {
      updates.completed_date = new Date().toISOString().split('T')[0];
      if (!updates.verification_date) {
        updates.verification_date = new Date().toISOString().split('T')[0];
      }
    }

    const { error: updateError } = await $supabaseClientStore
      .from('offboarding_compliance_checks')
      .update(updates)
      .eq('id', selectedCheck.id);

    if (updateError) throw updateError;

    _showUpdateModal = false;
    selectedCheck = null;
    resetUpdateForm();
    dispatch('refresh');
  } catch (err) {
    console.error('Error updating compliance check:', err);
    _error = err instanceof Error ? err.message : 'Failed to update compliance check';
  } finally {
    _loading = false;
  }
}

function _openUpdateModal(check: OffboardingComplianceCheck) {
  selectedCheck = check;
  updateData = {
    id: check.id,
    status: check.status,
    completion_evidence: check.completion_evidence || '',
    verified_by: check.verified_by || '',
    verification_date: check.verification_date || '',
    waiver_reason: check.waiver_reason || '',
  };
  _showUpdateModal = true;
}

async function _quickUpdateStatus(check: OffboardingComplianceCheck, newStatus: string) {
  try {
    _loading = true;
    _error = null;

    // Check authentication
    if (!$isSupabaseAuthenticatedStore || !$supabaseClientStore) {
      throw new Error('Please sign in to update compliance checks');
    }

    const updates: any = { status: newStatus };

    if (newStatus === 'completed') {
      updates.completed_date = new Date().toISOString().split('T')[0];
      updates.verification_date = new Date().toISOString().split('T')[0];
    } else if (newStatus === 'in_progress') {
      // Clear completion date if moving back to in progress
      updates.completed_date = null;
    }

    const { error: updateError } = await $supabaseClientStore
      .from('offboarding_compliance_checks')
      .update(updates)
      .eq('id', check.id);

    if (updateError) throw updateError;

    dispatch('refresh');
  } catch (err) {
    console.error('Error updating compliance check:', err);
    _error = err instanceof Error ? err.message : 'Failed to update compliance check';
  } finally {
    _loading = false;
  }
}

$: progress = calculateProgress();
$: groupedChecks = getGroupedChecks();
$: overdueChecks = complianceChecks.filter(isOverdue);
$: criticalPendingChecks = complianceChecks.filter(
  (c) =>
    c.criticality === 'critical' &&
    c.status !== 'completed' &&
    c.status !== 'waived' &&
    c.status !== 'not_applicable'
);
</script>

<Card>
  <CardHeader>
    <div class="flex items-center justify-between">
      <CardTitle class="flex items-center gap-2">
        <ShieldCheck class="w-5 h-5" />
        Compliance Tracking
      </CardTitle>
      <div class="flex items-center gap-2">
        {#if overdueChecks.length > 0}
          <Badge variant="destructive" class="animate-pulse">
            {overdueChecks.length} Overdue
          </Badge>
        {/if}
        {#if criticalPendingChecks.length > 0}
          <Badge variant="outline" class="border-red-200 text-red-800">
            {criticalPendingChecks.length} Critical Pending
          </Badge>
        {/if}
      </div>
    </div>
  </CardHeader>

  <CardContent class="space-y-6">
    {#if error}
      <Alert variant="destructive">
        <AlertTriangle class="w-4 h-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    {/if}

    <!-- Progress Summary -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
      <div class="text-center">
        <p class="text-2xl font-bold text-gray-900">{complianceChecks.length}</p>
        <p class="text-sm text-gray-600">Total Checks</p>
      </div>
      <div class="text-center">
        <p class="text-2xl font-bold text-green-600">
          {complianceChecks.filter(c => c.status === 'completed').length}
        </p>
        <p class="text-sm text-gray-600">Completed</p>
      </div>
      <div class="text-center">
        <p class="text-2xl font-bold text-red-600">{overdueChecks.length}</p>
        <p class="text-sm text-gray-600">Overdue</p>
      </div>
      <div class="text-center">
        <p class="text-2xl font-bold text-orange-600">{criticalPendingChecks.length}</p>
        <p class="text-sm text-gray-600">Critical Pending</p>
      </div>
    </div>

    <!-- Overall Progress -->
    <div class="space-y-2">
      <div class="flex items-center justify-between text-sm">
        <span class="font-medium">Compliance Progress</span>
        <span>{Math.round(progress)}% Complete</span>
      </div>
      <Progress value={progress} class="h-3" />
    </div>

    <!-- Compliance Checks by Priority -->
    <div class="space-y-6">
      {#each Object.entries(groupedChecks) as [priority, checks]}
        {#if checks.length > 0}
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Badge variant="outline" class={getCriticalityColor(priority)}>
                {priority.toUpperCase()}
              </Badge>
              <span class="text-sm text-gray-500">({checks.length} items)</span>
            </h3>

            <div class="space-y-3">
              {#each checks as check (check.id)}
                {@const daysUntilDue = getDaysUntilDue(check)}
                {@const overdue = isOverdue(check)}
                
                <Card class="border-l-4" 
                      class:border-l-red-500={overdue} 
                      class:border-l-green-500={check.status === 'completed'} 
                      class:border-l-blue-500={!overdue && check.status !== 'completed'}
                      class:bg-red-50={overdue}
                >
                  <CardContent class="p-4">
                    <div class="flex items-start justify-between">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-2">
                          <svelte:component this={getStatusIcon(check.status)} 
                                          class="w-4 h-4" 
                                          class:text-green-500={check.status === 'completed'}
                                          class:text-blue-500={check.status === 'in_progress'}
                                          class:text-yellow-500={check.status === 'pending'}
                                          class:text-gray-500={check.status === 'not_applicable' || check.status === 'waived'}
                          />
                          <h4 class="font-medium text-gray-900">
                            {formatComplianceType(check.compliance_type)}
                          </h4>
                          <Badge variant="outline" class={getStatusColor(check.status)}>
                            {check.status.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                          {#if check.non_compliance_risk}
                            <Badge variant="outline" class={getRiskColor(check.non_compliance_risk)}>
                              {check.non_compliance_risk.toUpperCase()} RISK
                            </Badge>
                          {/if}
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <span class="font-medium">Responsible:</span>
                            {check.responsible_party || 'Not assigned'}
                          </div>
                          <div>
                            <span class="font-medium">Due Date:</span>
                            <span class:text-red-600={overdue} class:font-medium={overdue}>
                              {formatDate(check.due_date)}
                              {#if daysUntilDue !== null}
                                ({daysUntilDue > 0 ? `${daysUntilDue} days left` : `${Math.abs(daysUntilDue)} days overdue`})
                              {/if}
                            </span>
                          </div>
                          <div>
                            <span class="font-medium">Coordinator:</span>
                            {check.coordinator_assigned || 'Not assigned'}
                          </div>
                        </div>

                        {#if check.completion_evidence}
                          <div class="mb-3">
                            <span class="text-sm font-medium text-gray-700">Evidence:</span>
                            <p class="text-sm text-gray-600 mt-1">{check.completion_evidence}</p>
                          </div>
                        {/if}

                        {#if check.waiver_reason}
                          <div class="mb-3">
                            <span class="text-sm font-medium text-gray-700">Waiver Reason:</span>
                            <p class="text-sm text-gray-600 mt-1">{check.waiver_reason}</p>
                          </div>
                        {/if}

                        {#if check.business_impact_if_missed || check.legal_impact_if_missed}
                          <div class="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <h5 class="text-sm font-medium text-yellow-800 mb-1">Impact if Missed:</h5>
                            {#if check.business_impact_if_missed}
                              <p class="text-sm text-yellow-700">
                                <span class="font-medium">Business:</span> {check.business_impact_if_missed}
                              </p>
                            {/if}
                            {#if check.legal_impact_if_missed}
                              <p class="text-sm text-yellow-700">
                                <span class="font-medium">Legal:</span> {check.legal_impact_if_missed}
                              </p>
                            {/if}
                          </div>
                        {/if}

                        {#if check.depends_on_employer_systems || check.depends_on_third_party}
                          <div class="mb-3">
                            <span class="text-sm font-medium text-gray-700">Dependencies:</span>
                            <div class="flex items-center gap-2 mt-1">
                              {#if check.depends_on_employer_systems}
                                <Badge variant="outline" class="text-xs">Employer Systems</Badge>
                              {/if}
                              {#if check.depends_on_third_party}
                                <Badge variant="outline" class="text-xs">Third Party</Badge>
                              {/if}
                            </div>
                            {#if check.dependency_description}
                              <p class="text-sm text-gray-600 mt-1">{check.dependency_description}</p>
                            {/if}
                          </div>
                        {/if}

                        {#if check.verified_by && check.verification_date}
                          <div class="text-sm text-green-600">
                            <CheckCircle class="w-4 h-4 inline mr-1" />
                            Verified by {check.verified_by} on {formatDate(check.verification_date)}
                          </div>
                        {/if}
                      </div>

                      {#if !readonly}
                        <div class="flex items-center gap-1 ml-4">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            on:click={() => openUpdateModal(check)}
                          >
                            <Edit class="w-3 h-3" />
                          </Button>
                        </div>
                      {/if}
                    </div>

                    <!-- Quick Actions -->
                    {#if !readonly && check.status !== 'completed' && check.status !== 'waived'}
                      <div class="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                        {#if check.status === 'pending'}
                          <Button 
                            size="sm" 
                            variant="outline" 
                            on:click={() => quickUpdateStatus(check, 'in_progress')}
                          >
                            Start Progress
                          </Button>
                        {/if}
                        {#if check.status === 'in_progress'}
                          <Button 
                            size="sm" 
                            variant="default" 
                            on:click={() => quickUpdateStatus(check, 'completed')}
                          >
                            Mark Complete
                          </Button>
                        {/if}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          on:click={() => openUpdateModal(check)}
                        >
                          Update Details
                        </Button>
                      </div>
                    {/if}
                  </CardContent>
                </Card>
              {/each}
            </div>
          </div>
        {/if}
      {/each}

      {#if complianceChecks.length === 0}
        <div class="text-center py-8 text-gray-500">
          <ShieldCheck class="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No compliance checks found for this workflow</p>
          <p class="text-sm mt-1">Compliance checks are automatically created based on workflow complexity</p>
        </div>
      {/if}
    </div>
  </CardContent>
</Card>

<!-- Update Compliance Check Modal -->
{#if showUpdateModal && selectedCheck}
  <Dialog bind:open={showUpdateModal}>
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle>
          Update Compliance Check: {formatComplianceType(selectedCheck.compliance_type)}
        </DialogTitle>
      </DialogHeader>

      <form on:submit|preventDefault={handleUpdateCheck} class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="status">Status *</Label>
            <Select bind:value={updateData.status}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="not_applicable">Not Applicable</SelectItem>
                <SelectItem value="waived">Waived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="verification_date">Verification Date</Label>
            <Input
              id="verification_date"
              type="date"
              bind:value={updateData.verification_date}
            />
          </div>
        </div>

        <div class="space-y-2">
          <Label for="verified_by">Verified By</Label>
          <Input
            id="verified_by"
            bind:value={updateData.verified_by}
            placeholder="Role or name of person who verified"
          />
        </div>

        <div class="space-y-2">
          <Label for="completion_evidence">Completion Evidence</Label>
          <Textarea
            id="completion_evidence"
            bind:value={updateData.completion_evidence}
            placeholder="Describe how this compliance check was completed..."
            rows={3}
          />
        </div>

        {#if updateData.status === 'waived'}
          <div class="space-y-2">
            <Label for="waiver_reason">Waiver Reason *</Label>
            <Textarea
              id="waiver_reason"
              bind:value={updateData.waiver_reason}
              placeholder="Explain why this compliance check is being waived..."
              rows={3}
              required
            />
          </div>
        {/if}

        <div class="flex items-center justify-end gap-3 pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            on:click={() => showUpdateModal = false}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {#if loading}
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            {/if}
            Update Check
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
{/if}