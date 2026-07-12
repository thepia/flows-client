<script lang="ts">
// Props
export let processes = [];
export let employees = [];
export let onFilterByStatus = (_status) => {};
export let onFilterByTimeframe = (_timeframe) => {};
export let onViewProcess = (_process) => {};
export let onCreateOffboarding = () => {};
export let loading = false;

// Calculate stats
$: stats = calculateStats(processes, employees);
$: actionableProcesses = processes.filter((p) => needsUserAction(p)).slice(0, 5);

function calculateStats(processes, _employees) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const recentlyCompleted = processes.filter(
    (p) =>
      p.status === 'completed' &&
      p.actual_completion_date &&
      new Date(p.actual_completion_date) >= thirtyDaysAgo
  );

  const endingSoon = processes.filter(
    (p) =>
      p.status === 'active' &&
      p.target_completion_date &&
      new Date(p.target_completion_date) <= sevenDaysFromNow
  );

  const activeProcesses = processes.filter((p) => p.status === 'active');

  const pastYearCompleted = processes.filter(
    (p) =>
      p.status === 'completed' &&
      p.actual_completion_date &&
      new Date(p.actual_completion_date) >= oneYearAgo
  );

  const overdue = processes.filter(
    (p) =>
      p.status === 'active' && p.target_completion_date && new Date(p.target_completion_date) < now
  );

  const pendingApproval = processes.filter((p) => p.status === 'pending_approval');

  // Calculate average completion time for recent processes
  const completedWithDuration = recentlyCompleted.filter(
    (p) => p.actual_start_date && p.actual_completion_date
  );

  const avgCompletionDays =
    completedWithDuration.length > 0
      ? Math.round(
          completedWithDuration.reduce((sum, p) => {
            const start = new Date(p.actual_start_date);
            const end = new Date(p.actual_completion_date);
            return sum + (end - start) / (1000 * 60 * 60 * 24);
          }, 0) / completedWithDuration.length
        )
      : 0;

  return {
    recentlyCompleted: recentlyCompleted.length,
    endingSoon: endingSoon.length,
    activeProcesses: activeProcesses.length,
    pastYearCompleted: pastYearCompleted.length,
    overdue: overdue.length,
    pendingApproval: pendingApproval.length,
    avgCompletionDays,
    totalProcesses: processes.length,
  };
}

function needsUserAction(process) {
  return (
    process.status === 'pending_approval' ||
    (process.status === 'active' && process.overdue_tasks > 0) ||
    (process.status === 'active' &&
      process.target_completion_date &&
      new Date(process.target_completion_date) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))
  );
}

function _getUrgencyColor(process) {
  if (process.status === 'pending_approval') return 'border-yellow-200 bg-yellow-50';
  if (process.overdue_tasks > 0) return 'border-red-200 bg-red-50';
  if (process.priority === 'urgent') return 'border-red-200 bg-red-50';
  if (process.priority === 'high') return 'border-orange-200 bg-orange-50';
  return 'border-blue-200 bg-blue-50';
}

function _formatDateShort(dateString) {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function _getActionText(process) {
  if (process.status === 'pending_approval') return 'Needs approval';
  if (process.overdue_tasks > 0) return `${process.overdue_tasks} overdue tasks`;
  if (process.target_completion_date) {
    const daysUntil = Math.ceil(
      (new Date(process.target_completion_date) - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil <= 0) return 'Overdue';
    if (daysUntil <= 3) return `Due in ${daysUntil} days`;
  }
  return 'Review needed';
}
</script>

<div class="space-y-6">
  <!-- Header with Create Button -->
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Offboarding Overview</h2>
      <p class="text-gray-600 mt-1">Monitor ongoing processes and key metrics</p>
    </div>
    <Button data-testid="create-offboarding-button" on:click={onCreateOffboarding} class="flex items-center gap-2">
      <UserMinus class="w-4 h-4" />
      Create Offboarding
    </Button>
  </div>

  <!-- Key Metrics Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <!-- Active Processes -->
    <Card data-testid="metric-card-active" class="hover:shadow-lg transition-shadow cursor-pointer" on:click={() => onFilterByStatus('active')}>
      <CardContent class="pt-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Active Processes</p>
            <p class="text-2xl font-bold text-blue-600 metric-value">{stats.activeProcesses}</p>
            <p class="text-xs text-gray-500 mt-1">Currently running</p>
          </div>
          <Activity class="w-8 h-8 text-blue-500" />
        </div>
      </CardContent>
    </Card>

    <!-- Ending Soon -->
    <Card data-testid="metric-card-ending-soon" class="hover:shadow-lg transition-shadow cursor-pointer" on:click={() => onFilterByTimeframe('ending_soon')}>
      <CardContent class="pt-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Ending Soon</p>
            <p class="text-2xl font-bold text-orange-600 metric-value">{stats.endingSoon}</p>
            <p class="text-xs text-gray-500 mt-1">Due within 7 days</p>
          </div>
          <Timer class="w-8 h-8 text-orange-500" />
        </div>
      </CardContent>
    </Card>

    <!-- Recently Completed -->
    <Card data-testid="metric-card-completed" class="hover:shadow-lg transition-shadow cursor-pointer" on:click={() => onFilterByTimeframe('recent_completed')}>
      <CardContent class="pt-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Recently Completed</p>
            <p class="text-2xl font-bold text-green-600 metric-value">{stats.recentlyCompleted}</p>
            <p class="text-xs text-gray-500 mt-1">Last 30 days</p>
          </div>
          <CheckCircle class="w-8 h-8 text-green-500" />
        </div>
      </CardContent>
    </Card>

    <!-- Needs Attention -->
    <Card data-testid="metric-card-attention" class="hover:shadow-lg transition-shadow cursor-pointer" on:click={() => onFilterByStatus('needs_attention')}>
      <CardContent class="pt-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Needs Attention</p>
            <p class="text-2xl font-bold text-red-600 metric-value">{stats.overdue + stats.pendingApproval}</p>
            <p class="text-xs text-gray-500 mt-1">Overdue or pending</p>
          </div>
          <AlertTriangle class="w-8 h-8 text-red-500" />
        </div>
      </CardContent>
    </Card>
  </div>

  <!-- Additional Stats Row -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <!-- Past Year Performance -->
    <Card>
      <CardContent class="pt-6">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-medium text-gray-600">Past Year Completed</p>
          <BarChart3 class="w-4 h-4 text-gray-400" />
        </div>
        <p class="text-xl font-bold">{stats.pastYearCompleted}</p>
        <p class="text-xs text-gray-500">Total offboardings</p>
      </CardContent>
    </Card>

    <!-- Average Completion Time -->
    <Card>
      <CardContent class="pt-6">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-medium text-gray-600">Avg. Completion Time</p>
          <Clock class="w-4 h-4 text-gray-400" />
        </div>
        <p class="text-xl font-bold">{stats.avgCompletionDays} days</p>
        <p class="text-xs text-gray-500">Recent processes</p>
      </CardContent>
    </Card>

    <!-- Success Rate -->
    <Card>
      <CardContent class="pt-6">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-medium text-gray-600">Completion Rate</p>
          <Target class="w-4 h-4 text-gray-400" />
        </div>
        <p class="text-xl font-bold">
          {stats.totalProcesses > 0 ? Math.round((stats.pastYearCompleted / stats.totalProcesses) * 100) : 0}%
        </p>
        <p class="text-xs text-gray-500">Successfully completed</p>
      </CardContent>
    </Card>
  </div>

  <!-- Action Required Section -->
  {#if actionableProcesses.length > 0}
    <Card data-testid="processes-requiring-action">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <AlertTriangle class="w-5 h-5 text-orange-500" />
          Processes Requiring Your Action
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-3">
          {#each actionableProcesses as process}
            <button 
              data-testid="actionable-process-{process.id || process.process_name}"
              class="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow {getUrgencyColor(process)} w-full text-left"
              on:click={() => onViewProcess(process)}
            >
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <h4 class="font-medium text-sm">{process.process_name}</h4>
                  <Badge variant="outline" class="text-xs">
                    {process.employee_department || 'Unknown Dept'}
                  </Badge>
                </div>
                <p class="text-xs text-gray-600 mt-1">
                  {getActionText(process)} • Due: {formatDateShort(process.target_completion_date)}
                </p>
              </div>
              
              <div class="flex items-center gap-3">
                <div class="text-right">
                  <p class="text-sm font-medium">{Math.round(process.completion_percentage || 0)}%</p>
                  <Progress value={process.completion_percentage || 0} class="h-1 w-16" />
                </div>
                <ChevronRight class="w-4 h-4 text-gray-400" />
              </div>
            </button>
          {/each}
          
          {#if actionableProcesses.length >= 5}
            <Button data-testid="action-view-all-needs-attention" variant="outline" class="w-full" on:click={() => onFilterByStatus('needs_attention')}>
              View All Processes Needing Action
            </Button>
          {/if}
        </div>
      </CardContent>
    </Card>
  {/if}

  <!-- Quick Actions -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <!-- Recent Activity -->
    <Card>
      <CardHeader>
        <CardTitle class="text-lg">Quick Filters</CardTitle>
      </CardHeader>
      <CardContent class="space-y-2">
        <Button 
          data-testid="quick-filter-overdue"
          variant="outline" 
          class="w-full justify-start" 
          on:click={() => onFilterByStatus('overdue')}
        >
          <AlertTriangle class="w-4 h-4 mr-2 text-red-500" />
          Overdue Processes ({stats.overdue})
        </Button>
        
        <Button 
          data-testid="quick-filter-pending-approval"
          variant="outline" 
          class="w-full justify-start" 
          on:click={() => onFilterByStatus('pending_approval')}
        >
          <UserCheck class="w-4 h-4 mr-2 text-yellow-500" />
          Pending Approvals ({stats.pendingApproval})
        </Button>
        
        <Button 
          data-testid="quick-filter-this-month"
          variant="outline" 
          class="w-full justify-start" 
          on:click={() => onFilterByTimeframe('this_month')}
        >
          <Calendar class="w-4 h-4 mr-2 text-blue-500" />
          This Month's Activity
        </Button>
      </CardContent>
    </Card>

    <!-- Performance Insights -->
    <Card data-testid="performance-insights">
      <CardHeader>
        <CardTitle class="text-lg">Performance Insights</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">On-time completion rate</span>
          <span class="font-medium" data-testid="completion-rate">
            {stats.totalProcesses > 0 ? Math.round(((stats.totalProcesses - stats.overdue) / stats.totalProcesses) * 100) : 0}%
          </span>
        </div>
        
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Processes this month</span>
          <span class="font-medium">{stats.recentlyCompleted + stats.activeProcesses}</span>
        </div>
        
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Average process duration</span>
          <span class="font-medium" data-testid="avg-duration">{stats.avgCompletionDays} days</span>
        </div>
        
        {#if stats.recentlyCompleted > 0}
          <div class="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
            <TrendingUp class="w-4 h-4" />
            <span>{stats.recentlyCompleted} successful completions recently</span>
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      {#each Array(4) as _}
        <Card>
          <CardContent class="pt-6">
            <div class="animate-pulse">
              <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div class="h-8 bg-gray-200 rounded w-1/2 mb-1"></div>
              <div class="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          </CardContent>
        </Card>
      {/each}
    </div>
  {/if}
</div>