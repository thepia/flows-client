<script lang="ts">
import { AlertTriangle, CheckCircle, Clock, FileText, Pause, Play } from 'lucide-svelte';

// Props
export let processes = [];
export let onProcessSelect = (_process) => {};
export let onCreateProcess = () => {};
export const onUpdateProcessStatus = (_processId, _status) => {};
export let loading = false;

// Local state
let _selectedProcess = null;

// Get status color and icon
function _getStatusInfo(status) {
  switch (status) {
    case 'draft':
      return { color: 'bg-gray-100 text-gray-800', icon: FileText };
    case 'pending_approval':
      return { color: 'bg-yellow-100 text-yellow-800', icon: Clock };
    case 'active':
      return { color: 'bg-blue-100 text-blue-800', icon: Play };
    case 'completed':
      return { color: 'bg-green-100 text-green-800', icon: CheckCircle };
    case 'cancelled':
      return { color: 'bg-red-100 text-red-800', icon: Pause };
    case 'overdue':
      return { color: 'bg-red-100 text-red-800', icon: AlertTriangle };
    default:
      return { color: 'bg-gray-100 text-gray-800', icon: FileText };
  }
}

// Get priority color
function _getPriorityColor(priority) {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800';
    case 'high':
      return 'bg-orange-100 text-orange-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Calculate days until/past deadline
function getDaysUntilDeadline(targetDate) {
  if (!targetDate) return null;
  const target = new Date(targetDate);
  const today = new Date();
  const diffTime = target - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Format deadline text
function _formatDeadlineText(targetDate) {
  const days = getDaysUntilDeadline(targetDate);
  if (days === null) return 'No deadline set';
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `${days} days remaining`;
}

// Handle process selection
function _selectProcess(process) {
  _selectedProcess = process;
  onProcessSelect(process);
}

// Format percentage
function _formatPercentage(value) {
  return Math.round(value || 0);
}
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Offboarding Processes</h2>
      <p class="text-gray-600 mt-1">Manage active and completed offboarding processes</p>
    </div>
    <Button on:click={onCreateProcess} class="flex items-center gap-2">
      <Play class="w-4 h-4" />
      Start New Process
    </Button>
  </div>

  <!-- Process Stats Summary -->
  {#if processes.length > 0}
    {@const activeCount = processes.filter(p => p.status === 'active').length}
    {@const completedCount = processes.filter(p => p.status === 'completed').length}
    {@const overdueCount = processes.filter(p => p.status === 'overdue').length}
    {@const pendingCount = processes.filter(p => p.status === 'pending_approval').length}
    
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Active</p>
              <p class="text-2xl font-bold">{activeCount}</p>
            </div>
            <Play class="w-8 h-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Pending</p>
              <p class="text-2xl font-bold">{pendingCount}</p>
            </div>
            <Clock class="w-8 h-8 text-yellow-500" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Overdue</p>
              <p class="text-2xl font-bold">{overdueCount}</p>
            </div>
            <AlertTriangle class="w-8 h-8 text-red-500" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Completed</p>
              <p class="text-2xl font-bold">{completedCount}</p>
            </div>
            <CheckCircle class="w-8 h-8 text-green-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  {/if}

  <!-- Process Cards -->
  <div class="space-y-4">
    {#each processes as process}
      {@const statusInfo = getStatusInfo(process.status)}
      {@const StatusIcon = statusInfo.icon}
      {@const daysUntilDeadline = getDaysUntilDeadline(process.target_completion_date)}
      {@const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0}
      
      <Card 
        class="hover:shadow-lg transition-shadow cursor-pointer {selectedProcess?.id === process.id ? 'ring-2 ring-blue-500' : ''}"
        on:click={() => selectProcess(process)}
      >
        <CardContent class="p-6">
          <div class="flex items-start justify-between">
            <!-- Process Info -->
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="text-lg font-semibold text-gray-900">{process.process_name}</h3>
                <Badge class={statusInfo.color}>
                  <StatusIcon class="w-3 h-3 mr-1" />
                  {process.status.replace('_', ' ')}
                </Badge>
                <Badge class={getPriorityColor(process.priority)}>
                  {process.priority}
                </Badge>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <!-- Employee Info -->
                <div class="flex items-center gap-2 text-sm text-gray-600">
                  <User class="w-4 h-4" />
                  <div>
                    <p class="font-medium">Employee</p>
                    <p class="text-xs">{process.employee_department || 'Unknown'} • {process.employee_role || 'Unknown'}</p>
                  </div>
                </div>
                
                <!-- Template Info -->
                <div class="flex items-center gap-2 text-sm text-gray-600">
                  <FileText class="w-4 h-4" />
                  <div>
                    <p class="font-medium">Template</p>
                    <p class="text-xs">{process.template_name || 'Custom Process'}</p>
                  </div>
                </div>
                
                <!-- Deadline -->
                <div class="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar class="w-4 h-4 {isOverdue ? 'text-red-500' : ''}" />
                  <div>
                    <p class="font-medium {isOverdue ? 'text-red-600' : ''}">Deadline</p>
                    <p class="text-xs {isOverdue ? 'text-red-500' : ''}">
                      {formatDeadlineText(process.target_completion_date)}
                    </p>
                  </div>
                </div>
                
                <!-- Task Progress -->
                <div class="flex items-center gap-2 text-sm text-gray-600">
                  <CheckSquare class="w-4 h-4" />
                  <div>
                    <p class="font-medium">Progress</p>
                    <p class="text-xs">{process.completed_tasks || 0} of {process.total_tasks || 0} tasks</p>
                  </div>
                </div>
              </div>
              
              <!-- Progress Bar -->
              <div class="mb-4">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-gray-700">Completion Progress</span>
                  <span class="text-sm text-gray-500">{formatPercentage(process.completion_percentage)}%</span>
                </div>
                <Progress value={process.completion_percentage || 0} class="h-2" />
              </div>
              
              <!-- Task Status Breakdown -->
              <div class="flex items-center gap-4 text-sm">
                {#if process.completed_tasks > 0}
                  <div class="flex items-center gap-1 text-green-600">
                    <CheckCircle class="w-4 h-4" />
                    <span>{process.completed_tasks} completed</span>
                  </div>
                {/if}
                
                {#if process.in_progress_tasks > 0}
                  <div class="flex items-center gap-1 text-blue-600">
                    <Play class="w-4 h-4" />
                    <span>{process.in_progress_tasks} in progress</span>
                  </div>
                {/if}
                
                {#if process.overdue_tasks > 0}
                  <div class="flex items-center gap-1 text-red-600">
                    <AlertTriangle class="w-4 h-4" />
                    <span>{process.overdue_tasks} overdue</span>
                  </div>
                {/if}
              </div>
            </div>
            
            <!-- Actions -->
            <div class="flex items-center gap-2 ml-4">
              <Button variant="ghost" size="sm">
                <MoreHorizontal class="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    {/each}
  </div>

  <!-- Empty State -->
  {#if processes.length === 0 && !loading}
    <Card>
      <CardContent class="flex flex-col items-center justify-center py-12">
        <Users class="w-12 h-12 text-gray-300 mb-4" />
        <h3 class="text-lg font-medium text-gray-900 mb-2">No offboarding processes</h3>
        <p class="text-gray-500 text-center mb-4">
          Start managing employee offboarding by creating your first process.
        </p>
        <Button on:click={onCreateProcess}>
          <Play class="w-4 h-4 mr-2" />
          Start First Process
        </Button>
      </CardContent>
    </Card>
  {/if}

  <!-- Loading State -->
  {#if loading}
    <div class="space-y-4">
      {#each Array(3) as _}
        <Card>
          <CardContent class="p-6">
            <div class="animate-pulse">
              <div class="flex items-center gap-3 mb-4">
                <div class="h-6 bg-gray-200 rounded w-48"></div>
                <div class="h-6 bg-gray-200 rounded w-20"></div>
                <div class="h-6 bg-gray-200 rounded w-16"></div>
              </div>
              <div class="grid grid-cols-4 gap-4 mb-4">
                <div class="h-10 bg-gray-200 rounded"></div>
                <div class="h-10 bg-gray-200 rounded"></div>
                <div class="h-10 bg-gray-200 rounded"></div>
                <div class="h-10 bg-gray-200 rounded"></div>
              </div>
              <div class="h-2 bg-gray-200 rounded mb-4"></div>
              <div class="flex gap-4">
                <div class="h-5 bg-gray-200 rounded w-24"></div>
                <div class="h-5 bg-gray-200 rounded w-20"></div>
                <div class="h-5 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      {/each}
    </div>
  {/if}
</div>

