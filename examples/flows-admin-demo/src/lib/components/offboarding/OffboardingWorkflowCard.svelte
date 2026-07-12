<script lang="ts">
import { createEventDispatcher } from 'svelte';
import type { OffboardingWorkflow } from '$lib/types/offboarding';

export let workflow: OffboardingWorkflow;

const dispatch = createEventDispatcher();

function _getStatusColor(status: string): string {
  switch (status) {
    case 'initiated':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'knowledge_transfer':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'coordination':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'verification':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function _getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'standard':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'low':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function _formatDate(dateString: string | undefined): string {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString();
}

function calculateProgress(): number {
  // Calculate progress based on workflow status
  switch (workflow.status) {
    case 'initiated':
      return 10;
    case 'knowledge_transfer':
      return 35;
    case 'coordination':
      return 65;
    case 'verification':
      return 85;
    case 'completed':
      return 100;
    case 'cancelled':
      return 0;
    default:
      return 0;
  }
}

function getDaysRemaining(): number | null {
  if (!workflow.final_completion_deadline) return null;
  const deadline = new Date(workflow.final_completion_deadline);
  const today = new Date();
  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function _getStatusMessage(): string {
  switch (workflow.status) {
    case 'initiated':
      return 'Workflow started, awaiting knowledge transfer';
    case 'knowledge_transfer':
      return 'Knowledge transfer in progress';
    case 'coordination':
      return 'Coordinating stakeholder communications';
    case 'verification':
      return 'Final verification and documentation';
    case 'completed':
      return 'Offboarding completed successfully';
    case 'cancelled':
      return 'Workflow was cancelled';
    default:
      return 'Status unknown';
  }
}

function _handleViewDetails() {
  dispatch('view-details', { workflowId: workflow.id });
}

function _handleRefresh() {
  dispatch('refresh');
}

$: progress = calculateProgress();
$: daysRemaining = getDaysRemaining();
</script>

<Card class="hover:shadow-md transition-shadow duration-200">
  <CardHeader class="pb-3">
    <div class="flex items-start justify-between">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-2">
          <Badge variant="outline" class={getStatusColor(workflow.status)}>
            {workflow.status.replace(/_/g, ' ').toUpperCase()}
          </Badge>
          <Badge variant="secondary" class={getPriorityColor(workflow.priority)}>
            {workflow.priority.toUpperCase()}
          </Badge>
          {#if workflow.credit_consumed}
            <Badge variant="outline" class="bg-green-50 text-green-700 border-green-200">
              €{workflow.credit_amount} CHARGED
            </Badge>
          {/if}
        </div>
        
        <h3 class="text-lg font-semibold text-gray-900 truncate">
          Employee UID: {workflow.employee_uid.slice(0, 8)}...
        </h3>
        
        <p class="text-sm text-gray-600 mt-1">
          {getStatusMessage()}
        </p>
      </div>
      
      <Button variant="ghost" size="sm" on:click={handleViewDetails}>
        <MoreHorizontal class="w-4 h-4" />
      </Button>
    </div>

    <!-- Progress Bar -->
    <div class="mt-4">
      <div class="flex items-center justify-between text-sm text-gray-600 mb-2">
        <span>Progress</span>
        <span>{progress}%</span>
      </div>
      <Progress value={progress} class="h-2" />
    </div>
  </CardHeader>

  <CardContent class="pt-0">
    <div class="grid grid-cols-2 gap-4 text-sm">
      <div class="space-y-2">
        <div class="flex items-center gap-2 text-gray-600">
          <Building class="w-4 h-4" />
          <span>Department:</span>
          <span class="font-medium text-gray-900">
            {workflow.department_category || 'Not specified'}
          </span>
        </div>
        
        <div class="flex items-center gap-2 text-gray-600">
          <User class="w-4 h-4" />
          <span>Seniority:</span>
          <span class="font-medium text-gray-900">
            {workflow.seniority_level || 'Not specified'}
          </span>
        </div>

        <div class="flex items-center gap-2 text-gray-600">
          <Calendar class="w-4 h-4" />
          <span>Started:</span>
          <span class="font-medium text-gray-900">
            {formatDate(workflow.initiated_date)}
          </span>
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex items-center gap-2 text-gray-600">
          <Clock class="w-4 h-4" />
          <span>Est. Hours:</span>
          <span class="font-medium text-gray-900">
            {workflow.estimated_knowledge_transfer_hours}h
          </span>
        </div>

        <div class="flex items-center gap-2 text-gray-600">
          <Calendar class="w-4 h-4" />
          <span>Last Day:</span>
          <span class="font-medium text-gray-900">
            {formatDate(workflow.expected_last_day)}
          </span>
        </div>

        {#if daysRemaining !== null}
          <div class="flex items-center gap-2 text-gray-600">
            <AlertCircle class="w-4 h-4" />
            <span>Deadline:</span>
            <span class="font-medium" class:text-red-600={daysRemaining < 7} class:text-yellow-600={daysRemaining >= 7 && daysRemaining < 14} class:text-gray-900={daysRemaining >= 14}>
              {daysRemaining > 0 ? `${daysRemaining} days` : 'Overdue'}
            </span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Workflow Indicators -->
    <div class="mt-4 pt-4 border-t border-gray-200">
      <div class="flex items-center justify-between text-xs text-gray-500">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-1">
            <CheckCircle class={`w-3 h-3 ${workflow.knowledge_transfer_completed ? 'text-green-500' : 'text-gray-400'}`} />
            <span class={workflow.knowledge_transfer_completed ? 'text-green-600' : 'text-gray-500'}>
              Knowledge Transfer
            </span>
          </div>
          <div class="flex items-center gap-1">
            <CheckCircle class={`w-3 h-3 ${workflow.compliance_verified ? 'text-green-500' : 'text-gray-400'}`} />
            <span class={workflow.compliance_verified ? 'text-green-600' : 'text-gray-500'}>
              Compliance
            </span>
          </div>
          <div class="flex items-center gap-1">
            <CheckCircle class={`w-3 h-3 ${workflow.exit_interview_completed ? 'text-green-500' : 'text-gray-400'}`} />
            <span class={workflow.exit_interview_completed ? 'text-green-600' : 'text-gray-500'}>
              Exit Interview
            </span>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          on:click={handleViewDetails}
          class="text-blue-600 hover:text-blue-700 p-1"
        >
          View Details
          <ArrowRight class="w-3 h-3 ml-1" />
        </Button>
      </div>
    </div>

    <!-- Key Relationships Summary -->
    {#if workflow.has_client_relationships || workflow.has_vendor_relationships || workflow.has_team_leadership_responsibilities}
      <div class="mt-3 pt-3 border-t border-gray-100">
        <div class="flex items-center gap-3 text-xs">
          <span class="text-gray-500">Key Areas:</span>
          <div class="flex items-center gap-2">
            {#if workflow.has_client_relationships}
              <Badge variant="outline" class="text-xs py-0 px-2">Client Relations</Badge>
            {/if}
            {#if workflow.has_vendor_relationships}
              <Badge variant="outline" class="text-xs py-0 px-2">Vendor Relations</Badge>
            {/if}
            {#if workflow.has_team_leadership_responsibilities}
              <Badge variant="outline" class="text-xs py-0 px-2">Team Leadership</Badge>
            {/if}
            {#if workflow.has_critical_system_knowledge}
              <Badge variant="outline" class="text-xs py-0 px-2">System Knowledge</Badge>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </CardContent>
</Card>

<style>
  :global(.workflow-card) {
    transition: all 0.2s ease-in-out;
  }
  
  :global(.workflow-card:hover) {
    transform: translateY(-1px);
  }
</style>