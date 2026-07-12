<script lang="ts">
import { onMount } from 'svelte';
import { client, invitations, loadDemoData } from '$lib/stores/data';
import type { Invitation } from '$lib/types';

// Filtering and sorting state
let statusFilter = 'all'; // 'all' | 'pending' | 'used' | 'expired' | 'revoked'
let typeFilter = 'all'; // 'all' | 'onboarding' | 'offboarding'
let sortBy = 'created'; // 'created' | 'expires' | 'name'
let sortOrder = 'desc'; // 'asc' | 'desc'
let searchQuery = '';

// Invitation management state
let activeInvitationDropdown: string | null = null;

// Load data on component mount
onMount(() => {
  if ($client === null) {
    loadDemoData();
  }
});

// Filtered and sorted invitations
$: filteredInvitations = $invitations
  .filter((invitation) => {
    // Status filter
    if (statusFilter !== 'all' && invitation.status !== statusFilter) return false;

    // Type filter
    if (typeFilter !== 'all' && invitation.invitationType !== typeFilter) return false;

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchableText =
        `${invitation.firstName} ${invitation.lastName} ${invitation.companyEmail} ${invitation.department} ${invitation.position}`.toLowerCase();
      if (!searchableText.includes(query)) return false;
    }

    return true;
  })
  .sort((a, b) => {
    let valueA: any, valueB: any;

    switch (sortBy) {
      case 'created':
        valueA = new Date(a.createdAt).getTime();
        valueB = new Date(b.createdAt).getTime();
        break;
      case 'expires':
        valueA = new Date(a.expiresAt).getTime();
        valueB = new Date(b.expiresAt).getTime();
        break;
      case 'name':
        valueA = `${a.firstName} ${a.lastName}`.toLowerCase();
        valueB = `${b.firstName} ${b.lastName}`.toLowerCase();
        break;
      default:
        return 0;
    }

    if (sortOrder === 'asc') {
      return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
    } else {
      return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
    }
  });

// Invitation management functions
function _toggleInvitationDropdown(invitationId: string) {
  activeInvitationDropdown = activeInvitationDropdown === invitationId ? null : invitationId;
}

function _shareInvitationCode(invitationCode: string) {
  navigator.clipboard.writeText(invitationCode);
  console.log(`Shared invitation code: ${invitationCode}`);
  // TODO: Show toast notification
  activeInvitationDropdown = null;
}

function _viewInvitationDetails(invitation: Invitation) {
  console.log('Viewing invitation details:', invitation);
  // TODO: Open modal with full invitation details
  activeInvitationDropdown = null;
}

function _resendInvitation(invitation: Invitation) {
  console.log('Resending invitation:', invitation);
  // TODO: Implement resend functionality
  activeInvitationDropdown = null;
}

function _revokeInvitation(invitation: Invitation) {
  if (
    confirm(
      `Are you sure you want to revoke the invitation for ${invitation.firstName} ${invitation.lastName}?`
    )
  ) {
    console.log('Revoking invitation:', invitation);
    // TODO: Implement revoke functionality via Supabase
    activeInvitationDropdown = null;
  }
}

function _getStatusColor(status: string) {
  switch (status) {
    case 'pending':
      return 'text-yellow-600 bg-yellow-50';
    case 'used':
      return 'text-green-600 bg-green-50';
    case 'expired':
      return 'text-red-600 bg-red-50';
    case 'revoked':
      return 'text-gray-600 bg-gray-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

function _resetFilters() {
  statusFilter = 'all';
  typeFilter = 'all';
  searchQuery = '';
  sortBy = 'created';
  sortOrder = 'desc';
}
</script>

<svelte:head>
	<title>Invitations - Flows Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center space-x-4">
					<Button variant="outline" size="sm" on:click={() => goto('/')}>
						<ArrowLeft class="w-4 h-4 mr-2" />
						Back to Dashboard
					</Button>
					<div>
						<h1 class="text-2xl font-bold text-gray-900">Invitation History</h1>
						<p class="text-gray-600">Manage all invitations for {$client?.name || 'system'}</p>
					</div>
				</div>
				<Button href="/invitations/new">
					<UserPlus class="w-4 h-4 mr-2" />
					New Invitation
				</Button>
			</div>
		</div>

		{#if $loading}
			<!-- Loading State -->
			<div class="flex items-center justify-center py-16">
				<LoadingAnimation message="Loading invitation history..." size="lg" />
			</div>
		{:else if $error}
			<!-- Error State -->
			<Card class="border-red-300 bg-red-50">
				<CardContent class="pt-6">
					<p class="text-red-800">Error loading invitations: {$error}</p>
				</CardContent>
			</Card>
		{:else}
			<!-- Filters and Search -->
			<Card class="mb-6">
				<CardHeader>
					<CardTitle class="flex items-center gap-2 text-lg">
						<Filter class="w-5 h-5" />
						Filters & Search
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
						<!-- Search -->
						<div class="lg:col-span-2">
							<label for="search" class="block text-sm font-medium text-gray-700 mb-1">
								Search
							</label>
							<input
								id="search"
								type="text"
								bind:value={searchQuery}
								placeholder="Search by name, email, department..."
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
							>
						</div>

						<!-- Status Filter -->
						<div>
							<label for="statusFilter" class="block text-sm font-medium text-gray-700 mb-1">
								Status
							</label>
							<select
								id="statusFilter"
								bind:value={statusFilter}
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
							>
								<option value="all">All Statuses</option>
								<option value="pending">Pending</option>
								<option value="used">Used</option>
								<option value="expired">Expired</option>
								<option value="revoked">Revoked</option>
							</select>
						</div>

						<!-- Type Filter -->
						<div>
							<label for="typeFilter" class="block text-sm font-medium text-gray-700 mb-1">
								Type
							</label>
							<select
								id="typeFilter"
								bind:value={typeFilter}
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
							>
								<option value="all">All Types</option>
								<option value="onboarding">Onboarding</option>
								<option value="offboarding">Offboarding</option>
							</select>
						</div>

						<!-- Sort -->
						<div>
							<label for="sortBy" class="block text-sm font-medium text-gray-700 mb-1">
								Sort By
							</label>
							<div class="flex space-x-2">
								<select
									id="sortBy"
									bind:value={sortBy}
									class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
								>
									<option value="created">Created</option>
									<option value="expires">Expires</option>
									<option value="name">Name</option>
								</select>
								<button
									on:click={() => sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'}
									class="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
									title="Toggle sort order"
								>
									{sortOrder === 'asc' ? '↑' : '↓'}
								</button>
							</div>
						</div>
					</div>

					<!-- Filter Summary & Reset -->
					<div class="flex items-center justify-between mt-4 pt-4 border-t">
						<div class="text-sm text-gray-600">
							Showing {filteredInvitations.length} of {$invitations.length} invitations
						</div>
						<Button variant="outline" size="sm" on:click={resetFilters}>
							Reset Filters
						</Button>
					</div>
				</CardContent>
			</Card>

			<!-- Invitations Table -->
			<Card>
				<CardHeader>
					<CardTitle>All Invitations</CardTitle>
					<CardDescription>
						Complete history of all invitations sent to employees
					</CardDescription>
				</CardHeader>
				<CardContent>
					{#if filteredInvitations.length === 0}
						<div class="text-center py-12">
							<UserPlus class="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<h3 class="text-lg font-medium text-gray-900 mb-2">No invitations found</h3>
							<p class="text-gray-600 mb-4">
								{searchQuery || statusFilter !== 'all' || typeFilter !== 'all' 
									? 'Try adjusting your filters to see more results.'
									: 'Get started by creating your first invitation.'}
							</p>
							{#if !searchQuery && statusFilter === 'all' && typeFilter === 'all'}
								<Button href="/invitations/new">
									<UserPlus class="w-4 h-4 mr-2" />
									Create First Invitation
								</Button>
							{/if}
						</div>
					{:else}
						<div class="space-y-4">
							{#each filteredInvitations as invitation}
								<div class="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
									<div class="flex items-center space-x-4">
										<div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
											<UserPlus class="w-5 h-5 text-primary" />
										</div>
										<div>
											<h4 class="font-medium text-gray-900">
												{invitation.firstName} {invitation.lastName}
											</h4>
											<p class="text-sm text-gray-500">{invitation.companyEmail}</p>
											<p class="text-xs text-gray-400">{invitation.privateEmail}</p>
											<div class="flex items-center space-x-4 mt-1">
												<span class="text-xs text-gray-400">
													{invitation.position} • {invitation.department}
												</span>
												<span class="text-xs text-gray-400">
													{invitation.invitationType === 'onboarding' ? 'Onboarding' : 'Offboarding'}
												</span>
											</div>
										</div>
									</div>
									
									<div class="flex items-center space-x-4">
										<div class="text-right text-sm">
											<div class="text-gray-900 font-medium">
												Created {new Date(invitation.createdAt).toLocaleDateString()}
											</div>
											<div class="text-gray-500">
												Expires {new Date(invitation.expiresAt).toLocaleDateString()}
											</div>
											{#if invitation.sentAt}
												<div class="text-gray-500">
													Sent {new Date(invitation.sentAt).toLocaleDateString()}
												</div>
											{/if}
										</div>
										
										<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(invitation.status)}">
											{invitation.status}
										</span>
										
										<!-- Invitation Management Dropdown -->
										<div class="relative">
											<Button 
												variant="outline" 
												size="sm"
												on:click={() => toggleInvitationDropdown(invitation.id)}
											>
												<MoreVertical class="w-4 h-4" />
											</Button>
											
											{#if activeInvitationDropdown === invitation.id}
												<div class="absolute right-0 top-8 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
													<div class="py-1">
														<button
															class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
															on:click={() => viewInvitationDetails(invitation)}
														>
															<Eye class="w-4 h-4 mr-2" />
															View Details
														</button>
														
														{#if invitation.invitationCode}
															<button
																class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
																on:click={() => shareInvitationCode(invitation.invitationCode)}
															>
																<Share class="w-4 h-4 mr-2" />
																Share Invitation Code
															</button>
														{/if}
														
														{#if invitation.status === 'pending'}
															<button
																class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
																on:click={() => resendInvitation(invitation)}
															>
																<RefreshCw class="w-4 h-4 mr-2" />
																Resend
															</button>
															
															<button
																class="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
																on:click={() => revokeInvitation(invitation)}
															>
																<XCircle class="w-4 h-4 mr-2" />
																Revoke
															</button>
														{/if}
														
														{#if invitation.status === 'expired'}
															<button
																class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
																on:click={() => resendInvitation(invitation)}
															>
																<RefreshCw class="w-4 h-4 mr-2" />
																Recreate
															</button>
														{/if}
													</div>
												</div>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>
		{/if}
	</div>
</div>

<!-- Close invitation dropdown when clicking outside -->
{#if activeInvitationDropdown}
	<div 
		class="fixed inset-0 z-5"
		on:click={() => activeInvitationDropdown = null}
		on:keydown={(e) => e.key === 'Escape' && (activeInvitationDropdown = null)}
		role="button"
		tabindex="0"
	></div>
{/if}