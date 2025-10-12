<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Progress } from '$lib/components/ui/progress';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Filter,
  Search,
  User,
  X,
} from 'lucide-svelte';

// Props
export let processes = [];
export let filters = {
  status: null,
  timeframe: null,
  search: '',
  department: null,
  priority: null,
  template: null,
};
export let onClearFilters = () => {};
export let onProcessSelect = (process) => {};
export let loading = false;

// Local state
let searchInput = filters.search || '';
let showFilters = false;

// Apply search filter
function handleSearch() {
  filters.search = searchInput;
}

// Filter processes based on current filters
$: filteredProcesses = processes.filter((process) => {
  let matches = true;

  // Search filter
  if (filters.search) {
    const search = filters.search.toLowerCase();
    matches =
      matches &&
      (process.process_name?.toLowerCase().includes(search) ||
        process.employee_name?.toLowerCase().includes(search) ||
        process.employee_department?.toLowerCase().includes(search));
  }

  // Status filter
  if (filters.status) {
    if (filters.status === 'needs_attention') {
      matches =
        matches &&
        (process.status === 'pending_approval' ||
          process.overdue_tasks > 0 ||
          (process.target_completion_date &&
            new Date(process.target_completion_date) <=
              new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)));
    } else {
      matches = matches && process.status === filters.status;
    }
  }

  // Timeframe filter
  if (filters.timeframe) {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (filters.timeframe) {
      case 'ending_soon':
        matches =
          matches &&
          process.status === 'active' &&
          process.target_completion_date &&
          new Date(process.target_completion_date) <= sevenDaysFromNow;
        break;
      case 'recent_completed':
        matches =
          matches &&
          process.status === 'completed' &&
          process.actual_completion_date &&
          new Date(process.actual_completion_date) >= thirtyDaysAgo;
        break;
      case 'this_month':
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        matches =
          matches &&
          ((process.actual_start_date && new Date(process.actual_start_date) >= thisMonthStart) ||
            (process.actual_completion_date &&
              new Date(process.actual_completion_date) >= thisMonthStart));
        break;
    }
  }

  // Department filter
  if (filters.department) {
    matches = matches && process.employee_department === filters.department;
  }

  // Priority filter
  if (filters.priority) {
    matches = matches && process.priority === filters.priority;
  }

  // Template filter
  if (filters.template) {
    matches = matches && process.template_id === filters.template;
  }

  return matches;
});

// Get status display info
function getStatusInfo(process) {
  switch (process.status) {
    case 'active':
      return { label: 'Active', color: 'bg-blue-100 text-blue-800' };
    case 'pending_approval':
      return { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-800' };
    case 'completed':
      return { label: 'Completed', color: 'bg-green-100 text-green-800' };
    case 'on_hold':
      return { label: 'On Hold', color: 'bg-gray-100 text-gray-800' };
    default:
      return { label: process.status, color: 'bg-gray-100 text-gray-800' };
  }
}

// Get priority color
function getPriorityColor(priority) {
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

// Format date
function formatDate(dateString) {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Get active filter description
function getFilterDescription() {
  const activeFilters = [];

  if (filters.status) {
    if (filters.status === 'needs_attention') {
      activeFilters.push('Needs Attention');
    } else {
      activeFilters.push(`Status: ${filters.status.replace('_', ' ')}`);
    }
  }

  if (filters.timeframe) {
    switch (filters.timeframe) {
      case 'ending_soon':
        activeFilters.push('Ending Soon');
        break;
      case 'recent_completed':
        activeFilters.push('Recently Completed');
        break;
      case 'this_month':
        activeFilters.push("This Month's Activity");
        break;
    }
  }

  if (filters.search) {
    activeFilters.push(`Search: "${filters.search}"`);
  }

  if (filters.department) {
    activeFilters.push(`Department: ${filters.department}`);
  }

  if (filters.priority) {
    activeFilters.push(`Priority: ${filters.priority}`);
  }

  if (filters.template) {
    activeFilters.push('Template-based');
  }

  return activeFilters.join(', ') || 'All Processes';
}

// Get unique departments
$: departments = [
  ...new Set(processes.filter((p) => p.employee_department).map((p) => p.employee_department)),
];
</script>

<div class="space-y-6" id="process-list-section">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-xl font-semibold text-gray-900">Offboarding Processes</h3>
      <p class="text-sm text-gray-600 mt-1">{getFilterDescription()}</p>
    </div>
    
    <div class="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        on:click={() => showFilters = !showFilters}
        class="flex items-center gap-2"
      >
        <Filter class="w-4 h-4" />
        Filters
      </Button>
      
      {#if Object.values(filters).some(f => f !== null && f !== '')}
        <Button variant="outline" size="sm" on:click={onClearFilters}>
          <X class="w-4 h-4 mr-1" />
          Clear
        </Button>
      {/if}
    </div>
  </div>

  <!-- Filters Panel -->
  {#if showFilters}
    <Card>
      <CardHeader>
        <CardTitle class="text-base">Filter Options</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Search -->
          <div>
            <Label for="process-search">Search</Label>
            <div class="relative">
              <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="process-search"
                placeholder="Process, employee, department..."
                bind:value={searchInput}
                on:input={handleSearch}
                class="pl-10"
              />
            </div>
          </div>
          
          <!-- Status -->
          <div>
            <Label for="status-filter">Status</Label>
            <select 
              id="status-filter"
              bind:value={filters.status}
              class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value={null}>All Statuses</option>
              <option value="active">Active</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
              <option value="needs_attention">Needs Attention</option>
            </select>
          </div>
          
          <!-- Department -->
          <div>
            <Label for="department-filter">Department</Label>
            <select 
              id="department-filter"
              bind:value={filters.department}
              class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value={null}>All Departments</option>
              {#each departments as dept}
                <option value={dept}>{dept}</option>
              {/each}
            </select>
          </div>
          
          <!-- Priority -->
          <div>
            <Label for="priority-filter">Priority</Label>
            <select 
              id="priority-filter"
              bind:value={filters.priority}
              class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value={null}>All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="standard">Standard</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  {/if}

  <!-- Process List -->
  <div class="space-y-4">
    {#if loading}
      <!-- Loading State -->
      {#each Array(5) as _}
        <Card>
          <CardContent class="p-6">
            <div class="animate-pulse">
              <div class="flex items-center justify-between">
                <div class="space-y-2 flex-1">
                  <div class="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div class="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div class="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      {/each}
    {:else if filteredProcesses.length > 0}
      <!-- Process Cards -->
      {#each filteredProcesses as process}
        <Card 
          class="hover:shadow-lg transition-shadow cursor-pointer"
          on:click={() => onProcessSelect(process)}
        >
          <CardContent class="p-6">
            <div class="flex items-center justify-between">
              <!-- Process Info -->
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h4 class="font-semibold text-gray-900">{process.process_name}</h4>
                  <Badge class={getStatusInfo(process).color}>
                    {getStatusInfo(process).label}
                  </Badge>
                  {#if process.priority && process.priority !== 'standard'}
                    <Badge variant="outline" class={getPriorityColor(process.priority)}>
                      {process.priority}
                    </Badge>
                  {/if}
                </div>
                
                <div class="flex items-center gap-6 text-sm text-gray-600">
                  <div class="flex items-center gap-1">
                    <User class="w-4 h-4" />
                    <span>{process.employee_name}</span>
                  </div>
                  
                  {#if process.employee_department}
                    <div class="flex items-center gap-1">
                      <Building2 class="w-4 h-4" />
                      <span>{process.employee_department}</span>
                    </div>
                  {/if}
                  
                  {#if process.target_completion_date}
                    <div class="flex items-center gap-1">
                      <Calendar class="w-4 h-4" />
                      <span>Due: {formatDate(process.target_completion_date)}</span>
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
              
              <!-- Progress and Actions -->
              <div class="flex items-center gap-4">
                <div class="text-right min-w-0">
                  <div class="text-sm font-medium text-gray-900">
                    {Math.round(process.completion_percentage || 0)}% complete
                  </div>
                  <Progress 
                    value={process.completion_percentage || 0} 
                    class="w-24 h-2 mt-1"
                  />
                  <div class="text-xs text-gray-500 mt-1">
                    {process.completed_tasks || 0} of {process.total_tasks || 0} tasks
                  </div>
                </div>
                
                <ChevronRight class="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      {/each}
    {:else}
      <!-- Empty State -->
      <Card>
        <CardContent class="flex flex-col items-center justify-center py-12">
          <Clock class="w-12 h-12 text-gray-300 mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">No processes found</h3>
          <p class="text-gray-500 text-center">
            {#if Object.values(filters).some(f => f !== null && f !== '')}
              No processes match your current filters. Try adjusting your search criteria.
            {:else}
              No offboarding processes have been created yet.
            {/if}
          </p>
          {#if Object.values(filters).some(f => f !== null && f !== '')}
            <Button variant="outline" class="mt-4" on:click={onClearFilters}>
              Clear Filters
            </Button>
          {/if}
        </CardContent>
      </Card>
    {/if}
  </div>
</div>