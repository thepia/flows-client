<script lang="ts">
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  CheckSquare,
  Clock,
  Download,
  FileText,
  Play,
  User,
} from 'lucide-svelte';

// Props
export let process = null;
export let tasks = [];
export let onTaskUpdate = (_taskId, _updates) => {};
export let onTaskComplete = (_taskId) => {};
export let onTaskStart = (_taskId) => {};
export let onAddNote = (_taskId, _note) => {};
export let onUploadDocument = (_taskId, _file) => {};
export let loading = false;

// Local state
let _selectedTask = null;
let newNote = '';
let showCompleted = true;

// Filter tasks
$: filteredTasks = tasks.filter((task) => {
  if (!showCompleted && task.status === 'completed') return false;
  return true;
});

// Group tasks by status
$: tasksByStatus = {
  pending: filteredTasks.filter((t) => t.status === 'pending'),
  in_progress: filteredTasks.filter((t) => t.status === 'in_progress'),
  completed: filteredTasks.filter((t) => t.status === 'completed'),
  blocked: filteredTasks.filter((t) => t.status === 'blocked'),
};

// Get status info
function _getStatusInfo(status) {
  switch (status) {
    case 'pending':
      return { color: 'bg-gray-100 text-gray-800', icon: Clock };
    case 'in_progress':
      return { color: 'bg-blue-100 text-blue-800', icon: Play };
    case 'completed':
      return { color: 'bg-green-100 text-green-800', icon: CheckCircle };
    case 'blocked':
      return { color: 'bg-red-100 text-red-800', icon: AlertTriangle };
    default:
      return { color: 'bg-gray-100 text-gray-800', icon: Clock };
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

// Get task type icon
function _getTaskTypeIcon(type) {
  switch (type) {
    case 'access_revocation':
      return User;
    case 'asset_recovery':
      return Download;
    case 'documentation':
      return FileText;
    case 'handover':
      return ArrowRight;
    case 'approval':
      return CheckSquare;
    default:
      return FileText;
  }
}

// Format date
function _formatDate(dateString) {
  if (!dateString) return 'No due date';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

// Check if task is overdue
function _isOverdue(dueDateString) {
  if (!dueDateString) return false;
  return new Date(dueDateString) < new Date();
}

// Handle task action
async function _handleTaskAction(task, action) {
  switch (action) {
    case 'start':
      await onTaskStart(task.id);
      break;
    case 'complete':
      await onTaskComplete(task.id);
      break;
    case 'pause':
      await onTaskUpdate(task.id, { status: 'pending' });
      break;
  }
}

// Add note to task
async function _addNote(taskId) {
  if (!newNote.trim()) return;

  await onAddNote(taskId, newNote.trim());
  newNote = '';
}

// Handle file upload
function _handleFileUpload(taskId, event) {
  const file = event.target.files[0];
  if (file) {
    onUploadDocument(taskId, file);
  }
}
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">
        {process?.process_name || 'Process Tasks'}
      </h2>
      <p class="text-gray-600 mt-1">
        Manage tasks for {process?.employee_name || 'the current process'}
      </p>
    </div>
    <div class="flex items-center gap-2">
      <Button 
        variant={showCompleted ? 'default' : 'outline'}
        size="sm"
        on:click={() => showCompleted = !showCompleted}
      >
        {showCompleted ? 'Hide' : 'Show'} Completed
      </Button>
    </div>
  </div>

  <!-- Process Progress Summary -->
  {#if process}
    <Card>
      <CardContent class="pt-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="text-center">
            <p class="text-2xl font-bold text-blue-600">{tasksByStatus.in_progress.length}</p>
            <p class="text-sm text-gray-600">In Progress</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-gray-600">{tasksByStatus.pending.length}</p>
            <p class="text-sm text-gray-600">Pending</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-green-600">{tasksByStatus.completed.length}</p>
            <p class="text-sm text-gray-600">Completed</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-red-600">{tasksByStatus.blocked.length}</p>
            <p class="text-sm text-gray-600">Blocked</p>
          </div>
        </div>
        
        <div class="mt-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium">Overall Progress</span>
            <span class="text-sm text-gray-500">{Math.round((process.completion_percentage || 0))}%</span>
          </div>
          <Progress value={process.completion_percentage || 0} class="h-2" />
        </div>
      </CardContent>
    </Card>
  {/if}

  <!-- Task Kanban Board -->
  <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
    <!-- Pending Tasks -->
    <div class="space-y-4">
      <h3 class="font-semibold text-gray-900 flex items-center gap-2">
        <Clock class="w-4 h-4" />
        Pending ({tasksByStatus.pending.length})
      </h3>
      
      {#each tasksByStatus.pending as task}
        {@const statusInfo = getStatusInfo(task.status)}
        {@const StatusIcon = statusInfo.icon}
        {@const TypeIcon = getTaskTypeIcon(task.task_type)}
        {@const taskOverdue = isOverdue(task.due_date)}
        
        <Card class="hover:shadow-md transition-shadow">
          <CardContent class="p-4">
            <div class="space-y-3">
              <div class="flex items-start justify-between">
                <h4 class="font-medium text-sm">{task.title}</h4>
                <Badge class={getPriorityColor(task.priority)} size="sm">
                  {task.priority}
                </Badge>
              </div>
              
              <p class="text-xs text-gray-600">{task.description}</p>
              
              <div class="flex items-center gap-2 text-xs text-gray-500">
                <TypeIcon class="w-3 h-3" />
                <span>{task.task_type.replace('_', ' ')}</span>
              </div>
              
              {#if task.due_date}
                <div class="flex items-center gap-2 text-xs {taskOverdue ? 'text-red-600' : 'text-gray-500'}">
                  <Calendar class="w-3 h-3" />
                  <span>{formatDate(task.due_date)}</span>
                  {#if taskOverdue}
                    <AlertTriangle class="w-3 h-3" />
                  {/if}
                </div>
              {/if}
              
              <div class="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  class="text-xs"
                  on:click={() => handleTaskAction(task, 'start')}
                  disabled={loading}
                >
                  <Play class="w-3 h-3 mr-1" />
                  Start
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      {/each}
    </div>

    <!-- In Progress Tasks -->
    <div class="space-y-4">
      <h3 class="font-semibold text-gray-900 flex items-center gap-2">
        <Play class="w-4 h-4 text-blue-500" />
        In Progress ({tasksByStatus.in_progress.length})
      </h3>
      
      {#each tasksByStatus.in_progress as task}
        {@const statusInfo = getStatusInfo(task.status)}
        {@const TypeIcon = getTaskTypeIcon(task.task_type)}
        {@const taskOverdue = isOverdue(task.due_date)}
        
        <Card class="hover:shadow-md transition-shadow border-blue-200">
          <CardContent class="p-4">
            <div class="space-y-3">
              <div class="flex items-start justify-between">
                <h4 class="font-medium text-sm">{task.title}</h4>
                <Badge class={getPriorityColor(task.priority)} size="sm">
                  {task.priority}
                </Badge>
              </div>
              
              <p class="text-xs text-gray-600">{task.description}</p>
              
              <div class="flex items-center gap-2 text-xs text-gray-500">
                <TypeIcon class="w-3 h-3" />
                <span>{task.task_type.replace('_', ' ')}</span>
              </div>
              
              {#if task.due_date}
                <div class="flex items-center gap-2 text-xs {taskOverdue ? 'text-red-600' : 'text-gray-500'}">
                  <Calendar class="w-3 h-3" />
                  <span>{formatDate(task.due_date)}</span>
                  {#if taskOverdue}
                    <AlertTriangle class="w-3 h-3" />
                  {/if}
                </div>
              {/if}
              
              <div class="flex gap-2">
                <Button 
                  size="sm" 
                  variant="default"
                  class="text-xs"
                  on:click={() => handleTaskAction(task, 'complete')}
                  disabled={loading}
                >
                  <CheckCircle class="w-3 h-3 mr-1" />
                  Complete
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  class="text-xs"
                  on:click={() => handleTaskAction(task, 'pause')}
                  disabled={loading}
                >
                  <Pause class="w-3 h-3 mr-1" />
                  Pause
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      {/each}
    </div>

    <!-- Blocked Tasks -->
    <div class="space-y-4">
      <h3 class="font-semibold text-gray-900 flex items-center gap-2">
        <AlertTriangle class="w-4 h-4 text-red-500" />
        Blocked ({tasksByStatus.blocked.length})
      </h3>
      
      {#each tasksByStatus.blocked as task}
        {@const TypeIcon = getTaskTypeIcon(task.task_type)}
        
        <Card class="hover:shadow-md transition-shadow border-red-200">
          <CardContent class="p-4">
            <div class="space-y-3">
              <div class="flex items-start justify-between">
                <h4 class="font-medium text-sm">{task.title}</h4>
                <Badge class={getPriorityColor(task.priority)} size="sm">
                  {task.priority}
                </Badge>
              </div>
              
              <p class="text-xs text-gray-600">{task.description}</p>
              
              <div class="flex items-center gap-2 text-xs text-gray-500">
                <TypeIcon class="w-3 h-3" />
                <span>{task.task_type.replace('_', ' ')}</span>
              </div>
              
              {#if task.blocking_reason}
                <div class="text-xs text-red-600 bg-red-50 p-2 rounded">
                  <strong>Blocked:</strong> {task.blocking_reason}
                </div>
              {/if}
              
              <Button 
                size="sm" 
                variant="outline"
                class="text-xs"
                on:click={() => selectedTask = task}
              >
                <Edit class="w-3 h-3 mr-1" />
                Resolve
              </Button>
            </div>
          </CardContent>
        </Card>
      {/each}
    </div>

    <!-- Completed Tasks -->
    {#if showCompleted}
      <div class="space-y-4">
        <h3 class="font-semibold text-gray-900 flex items-center gap-2">
          <CheckCircle class="w-4 h-4 text-green-500" />
          Completed ({tasksByStatus.completed.length})
        </h3>
        
        {#each tasksByStatus.completed as task}
          {@const TypeIcon = getTaskTypeIcon(task.task_type)}
          
          <Card class="hover:shadow-md transition-shadow border-green-200 opacity-75">
            <CardContent class="p-4">
              <div class="space-y-3">
                <div class="flex items-start justify-between">
                  <h4 class="font-medium text-sm line-through">{task.title}</h4>
                  <Badge variant="outline" size="sm" class="text-green-600">
                    Completed
                  </Badge>
                </div>
                
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <TypeIcon class="w-3 h-3" />
                  <span>{task.task_type.replace('_', ' ')}</span>
                </div>
                
                {#if task.completed_at}
                  <div class="text-xs text-gray-500">
                    Completed {formatDate(task.completed_at)}
                  </div>
                {/if}
              </div>
            </CardContent>
          </Card>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Task Detail Modal/Panel -->
  {#if selectedTask}
    <Card class="mt-6">
      <CardHeader>
        <div class="flex items-center justify-between">
          <CardTitle>{selectedTask.title}</CardTitle>
          <Button variant="ghost" on:click={() => selectedTask = null}>
            ×
          </Button>
        </div>
      </CardHeader>
      <CardContent class="space-y-4">
        <p class="text-sm text-gray-600">{selectedTask.description}</p>
        
        <!-- Task Notes -->
        <div>
          <Label>Add Note</Label>
          <div class="flex gap-2 mt-1">
            <Textarea 
              bind:value={newNote}
              placeholder="Add a note about this task..."
              class="flex-1"
            />
            <Button 
              on:click={() => addNote(selectedTask.id)}
              disabled={!newNote.trim() || loading}
            >
              <MessageSquare class="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <!-- File Upload -->
        <div>
          <Label>Upload Document</Label>
          <Input 
            type="file" 
            on:change={(e) => handleFileUpload(selectedTask.id, e)}
            class="mt-1"
          />
        </div>
      </CardContent>
    </Card>
  {/if}

  <!-- Empty State -->
  {#if filteredTasks.length === 0 && !loading}
    <Card>
      <CardContent class="flex flex-col items-center justify-center py-12">
        <CheckSquare class="w-12 h-12 text-gray-300 mb-4" />
        <h3 class="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
        <p class="text-gray-500 text-center">
          {#if !showCompleted}
            All tasks are completed. Toggle "Show Completed" to see them.
          {:else}
            This process doesn't have any tasks yet.
          {/if}
        </p>
      </CardContent>
    </Card>
  {/if}
</div>