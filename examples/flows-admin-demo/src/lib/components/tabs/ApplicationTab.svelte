<script lang="ts">
import { createEventDispatcher } from 'svelte';
import type { Application } from '$lib/types';

export let app: Application;

const _dispatch = createEventDispatcher();

// Clear application type determination
$: isOffboardingApp = app.type === 'offboarding';
$: isOnboardingApp = app.type === 'onboarding';
</script>

<div class="space-y-6" data-testid="application-content">
  {#if isOffboardingApp}
    <!-- Task-Oriented Offboarding Application -->
    <div class="space-y-6">
      <!-- Application Header -->
      <div class="flex justify-between items-start">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <h2 class="text-xl font-semibold text-gray-900">{app.name}</h2>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {
              app.status === 'active' ? 'bg-green-100 text-green-800' :
              app.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
              app.status === 'deprecated' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }">
              {app.status}
            </span>
            <span class="text-sm text-gray-400">v{app.version}</span>
          </div>
          <p class="text-sm text-gray-500 mt-1">
            Task-oriented employee offboarding and departure management
          </p>
          <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span>Process Templates</span>
            <span>Task Management</span>
            <span>Department-Specific</span>
          </div>
        </div>
      </div>
      
      <!-- Offboarding Dashboard -->
      <OffboardingDashboard />
    </div>
  {:else if isOnboardingApp}
    <!-- Metrics-Based Onboarding Application -->
    <div class="space-y-8">
      <!-- Application Dashboard Header -->
      <div class="flex justify-between items-start">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <h2 class="text-xl font-semibold text-gray-900">{app.name}</h2>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {
              app.status === 'active' ? 'bg-green-100 text-green-800' :
              app.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
              app.status === 'deprecated' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }">
              {app.status}
            </span>
            <span class="text-sm text-gray-400">v{app.version}</span>
          </div>
          <p class="text-sm text-gray-500 mt-1">
            {app.description || 'Onboarding Management Application'}
          </p>
          <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span>Max Users: {app.maxConcurrentUsers}</span>
            <span>Features: {app.features.length}</span>
            {#if app.lastAccessed}
              <span>Last Accessed: {new Date(app.lastAccessed).toLocaleDateString()}</span>
            {/if}
          </div>
        </div>
        <Button variant="outline" href="/invitations/new">
          <UserPlus class="w-4 h-4 mr-2" />
          New Invitation
        </Button>
      </div>

      <!-- Application Metrics -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white p-6 rounded-lg shadow-sm border">
          <p class="text-sm font-medium text-gray-600">Active Invitations</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">
            {$invitations.filter(inv => inv.applicationId === app.id && inv.status === 'sent').length}
          </p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-sm border">
          <p class="text-sm font-medium text-gray-600">Pending Invitations</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">
            {$invitations.filter(inv => inv.applicationId === app.id && inv.status === 'pending').length}
          </p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-sm border">
          <p class="text-sm font-medium text-gray-600">People Assigned</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">
            {$employees.filter(emp => emp.status === 'active').length}
          </p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-sm border">
          <p class="text-sm font-medium text-gray-600">Completed This Month</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">
            {$invitations.filter(inv => inv.applicationId === app.id && inv.status === 'accepted').length}
          </p>
        </div>
      </div>

      <!-- Application Features & Configuration -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Features -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="px-6 py-4 border-b">
            <h3 class="text-lg font-medium text-gray-900">Application Features</h3>
          </div>
          <div class="p-6">
            {#if app.features.length > 0}
              <div class="grid grid-cols-1 gap-3">
                {#each app.features as feature}
                  <div class="flex items-center gap-3">
                    <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span class="text-sm text-gray-700 capitalize">
                      {feature.replace(/-/g, ' ').replace(/_/g, ' ')}
                    </span>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="text-sm text-gray-500">No features configured</p>
            {/if}
          </div>
        </div>

        <!-- Configuration -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="px-6 py-4 border-b">
            <h3 class="text-lg font-medium text-gray-900">Configuration</h3>
          </div>
          <div class="p-6">
            {#if Object.keys(app.configuration).length > 0}
              <div class="space-y-3">
                {#each Object.entries(app.configuration) as [key, value]}
                  <div class="flex justify-between items-start">
                    <span class="text-sm font-medium text-gray-600 capitalize">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span class="text-sm text-gray-900 text-right max-w-48 truncate">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="text-sm text-gray-500">No configuration set</p>
            {/if}
          </div>
        </div>
      </div>

      <!-- Application-specific Invitations -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="px-6 py-4 border-b">
          <h3 class="text-lg font-medium text-gray-900">Recent {app.name} Invitations</h3>
        </div>
        <div class="divide-y">
          {#each $invitations.filter(inv => inv.applicationId === app.id).slice(0, 5) as invitation}
            <div class="px-6 py-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-900">
                    {invitation.firstName} {invitation.lastName}
                  </p>
                  <p class="text-sm text-gray-500">{invitation.companyEmail}</p>
                </div>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {
                  invitation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  invitation.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                  invitation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }">
                  {invitation.status}
                </span>
              </div>
            </div>
          {/each}
          {#if $invitations.filter(inv => inv.applicationId === app.id).length === 0}
            <div class="px-6 py-8 text-center text-gray-500">
              No invitations for this application yet
            </div>
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <!-- Generic Application View -->
    <div class="text-center py-12">
      <div class="text-gray-500">
        <p class="text-lg font-medium">Unknown Application Type</p>
        <p class="text-sm mt-2">Application type "{app.type}" is not supported</p>
      </div>
    </div>
  {/if}
</div>