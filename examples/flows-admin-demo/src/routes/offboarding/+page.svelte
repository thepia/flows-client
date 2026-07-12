<script lang="ts">
import { employees } from '$lib/stores/data';

// Filter employees who are leaving (status: previous) or in offboarding process
$: offboardingEmployees = $employees.filter(
  (emp) => emp.status === 'previous' || emp.status === 'other'
);

$: activeEmployees = $employees.filter((emp) => emp.status === 'active').length;
$: departmentStats = $employees.reduce(
  (acc, emp) => {
    if (!acc[emp.department]) acc[emp.department] = { total: 0, offboarding: 0 };
    acc[emp.department].total++;
    if (emp.status === 'previous' || emp.status === 'other') {
      acc[emp.department].offboarding++;
    }
    return acc;
  },
  {} as Record<string, { total: number; offboarding: number }>
);
</script>

<svelte:head>
  <title>Employee Offboarding</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Employee Offboarding</h1>
      <p class="text-gray-600 mt-1">Manage employees leaving the organization</p>
    </div>
    <Button href="/invitations/new">
      <Plus class="w-4 h-4 mr-2" />
      Start Offboarding Process
    </Button>
  </div>

  <!-- Statistics Overview -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-medium">Currently Offboarding</CardTitle>
        <UserMinus class="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">{offboardingEmployees.length}</div>
        <p class="text-xs text-muted-foreground">Employees in transition</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-medium">Active Employees</CardTitle>
        <Users class="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">{activeEmployees}</div>
        <p class="text-xs text-muted-foreground">Current workforce</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-medium">Total Employees</CardTitle>
        <Users class="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">{$employees.length}</div>
        <p class="text-xs text-muted-foreground">All employee records</p>
      </CardContent>
    </Card>
  </div>

  <!-- Department Breakdown -->
  {#if Object.keys(departmentStats).length > 0}
    <Card>
      <CardHeader>
        <CardTitle>Offboarding by Department</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          {#each Object.entries(departmentStats) as [department, stats]}
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <p class="font-medium">{department}</p>
                <p class="text-sm text-gray-500">
                  {stats.offboarding} of {stats.total} employees leaving
                </p>
              </div>
              <div class="text-right">
                <p class="text-sm font-medium">
                  {stats.total > 0 ? Math.round((stats.offboarding / stats.total) * 100) : 0}%
                </p>
              </div>
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>
  {/if}

  <!-- Employee Directory -->
  <Card>
    <CardHeader>
      <CardTitle>Offboarding Employees</CardTitle>
    </CardHeader>
    <CardContent>
      {#if $loading}
        <div class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span class="ml-2 text-gray-600">Loading employees...</span>
        </div>
      {:else if offboardingEmployees.length > 0}
        <EmployeeDirectory employees={offboardingEmployees} compact={true} />
      {:else}
        <div class="text-center py-8">
          <UserMinus class="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">No employees currently offboarding</h3>
          <p class="text-gray-500 mb-4">Start the offboarding process for departing employees</p>
          <Button href="/invitations/new">
            <Plus class="w-4 h-4 mr-2" />
            Create Offboarding Invitation
          </Button>
        </div>
      {/if}
    </CardContent>
  </Card>
</div>