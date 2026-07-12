<script lang="ts">
import { AlertCircle, CheckCircle, Clock, X } from 'lucide-svelte';
import { onMount } from 'svelte';
import { page } from '$app/stores';
import { enrollments, loadDemoData, people } from '$lib/stores/data';
import type { DocumentStatus, TaskStatus } from '$lib/types';

// Load data on component mount if not already loaded
onMount(() => {
  if ($people.length === 0) {
    loadDemoData();
  }
});

$: personId = $page.params.id;
$: person = $people.find((p) => p.id === personId);
$: enrollment = $enrollments.find((e) => e.personId === personId || e.employeeId === personId);

// Edit mode state
let isEditing = false;
let editFormData: any = {};
let _isSaving = false;
let _saveError: string | null = null;

// Department options
const _departments = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'Operations',
  'Finance',
  'HR',
  'Legal',
  'Customer Success',
];

// Location options
const _locations = [
  'Copenhagen, Denmark',
  'Stockholm, Sweden',
  'Oslo, Norway',
  'Helsinki, Finland',
  'Remote - Europe',
  'London, UK',
  'Berlin, Germany',
];

// Associate status options
const _associateStatuses = [
  { value: 'board_member', label: 'Board Member' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'advisor', label: 'Advisor' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'partner', label: 'Partner' },
  { value: 'other', label: 'Other' },
];

// Initialize edit form when entering edit mode
$: if (isEditing && person) {
  editFormData = {
    firstName: person.firstName || '',
    lastName: person.lastName || '',
    email: person.email || '',
    department: person.department || '',
    position: person.position || '',
    location: person.location || '',
    manager: person.manager || '',
    startDate: person.startDate || '',
    endDate: person.endDate || '',
    employmentType: person.employmentType || 'full_time',
    workLocation: person.workLocation || 'office',
    employmentStatus: person.employmentStatus || null,
    associateStatus: person.associateStatus || null,
    securityClearance: person.securityClearance || 'low',
  };
}

// Determine person type
$: personType = person?.employmentStatus ? 'employee' : 'associate';

function _startEditing() {
  isEditing = true;
  _saveError = null;
}

function _cancelEditing() {
  isEditing = false;
  editFormData = {};
  _saveError = null;
}

async function _saveChanges() {
  if (!person) return;

  _isSaving = true;
  _saveError = null;

  try {
    // TODO: Implement actual save function to Supabase
    // For now, just simulate a save
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update the local store (in real implementation, this would come from Supabase response)
    people.update((people) =>
      people.map((p) => (p.id === person.id ? { ...p, ...editFormData } : p))
    );

    isEditing = false;
  } catch (err) {
    console.error('Failed to save person:', err);
    _saveError = err instanceof Error ? err.message : 'Failed to save changes';
  } finally {
    _isSaving = false;
  }
}

// Toggle between employee and associate when editing
function _togglePersonType() {
  if (editFormData.employmentStatus) {
    // Currently employee, switch to associate
    editFormData.employmentStatus = null;
    editFormData.associateStatus = 'consultant';
  } else {
    // Currently associate, switch to employee
    editFormData.employmentStatus = 'active';
    editFormData.associateStatus = null;
  }
}

function _getStatusIcon(status: DocumentStatus['status'] | TaskStatus['status']) {
  switch (status) {
    case 'completed':
    case 'verified':
      return CheckCircle;
    case 'in_progress':
    case 'uploaded':
      return Clock;
    case 'pending':
    case 'not_started':
      return AlertCircle;
    case 'rejected':
    case 'overdue':
      return X;
    default:
      return Clock;
  }
}

function _getStatusColor(status: DocumentStatus['status'] | TaskStatus['status']) {
  switch (status) {
    case 'completed':
    case 'verified':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'in_progress':
    case 'uploaded':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'pending':
    case 'not_started':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'rejected':
    case 'overdue':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

function _getPriorityColor(priority: TaskStatus['priority']) {
  switch (priority) {
    case 'high':
      return 'text-red-600';
    case 'medium':
      return 'text-yellow-600';
    case 'low':
      return 'text-green-600';
    default:
      return 'text-gray-600';
  }
}

function _formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function _formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<svelte:head>
	<title>
		{person ? `${person.firstName} ${person.lastName}` : 'Person'} - {$client?.name || 'Flows Admin'}
	</title>
</svelte:head>

{#if !person}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center" data-testid="person-not-found">
		<div class="text-center">
			<h1 class="text-2xl font-bold text-gray-900 mb-2">Person Not Found</h1>
			<p class="text-gray-600 mb-4">The person you're looking for doesn't exist.</p>
			<Button href="/people">Return to People</Button>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50" data-testid="person-detail">
		<!-- Header -->
		<header class="bg-white border-b border-gray-200">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex items-center justify-between py-6">
					<div class="flex items-center space-x-4">
						<Button variant="ghost" href="/people" class="p-2" data-testid="back-to-people">
							<ArrowLeft class="w-5 h-5" />
						</Button>
						<div data-testid="person-header">
							<h1 class="text-2xl font-bold text-gray-900" data-testid="person-name">
								{person.firstName} {person.lastName}
							</h1>
							<p class="text-sm text-gray-500">
	<span data-testid="person-position">{person.position}</span> • {person.department}
								{#if personType === 'employee'}
									<span class="text-blue-600" data-testid="employment-status"> • Employee</span>
								{:else}
									<span class="text-purple-600" data-testid="associate-type"> • Associate ({person.associateStatus?.replace('_', ' ')})</span>
								{/if}
							</p>
						</div>
					</div>
					<div class="flex space-x-3">
						{#if !isEditing}
							<Button variant="outline">Send Message</Button>
							<Button variant="outline">Generate Report</Button>
							<Button on:click={startEditing} data-testid="edit-person-button">
								<Edit class="w-4 h-4 mr-2" />
								Edit Details
							</Button>
						{:else}
							<Button variant="outline" on:click={cancelEditing} disabled={isSaving} data-testid="cancel-edit-button">
								Cancel
							</Button>
							<Button on:click={saveChanges} disabled={isSaving} data-testid="save-changes-button">
								{#if isSaving}
									<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
									Saving...
								{:else}
									<Save class="w-4 h-4 mr-2" />
									Save Changes
								{/if}
							</Button>
						{/if}
					</div>
				</div>
			</div>
		</header>

		<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<!-- Person Info -->
				<div class="lg:col-span-1 space-y-6">
					<Card>
						<CardHeader>
							<CardTitle class="flex items-center space-x-2">
								<User class="w-5 h-5" />
								<span>Person Information</span>
							</CardTitle>
						</CardHeader>
						<CardContent class="space-y-4">
							{#if !isEditing}
								<!-- View Mode -->
								<div class="flex items-center justify-center mb-6">
									<div class="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
										<span class="text-2xl font-bold text-primary">
											{person.firstName[0]}{person.lastName[0]}
										</span>
									</div>
								</div>

								<div class="space-y-3">
									<div class="flex items-center space-x-3">
										<Mail class="w-4 h-4 text-gray-400" />
										<span class="text-sm" data-testid="person-email">{person.email}</span>
									</div>
									
									{#if person.phone}
										<div class="flex items-center space-x-3">
											<Phone class="w-4 h-4 text-gray-400" />
											<span class="text-sm">{person.phone}</span>
										</div>
									{/if}
									
									<div class="flex items-center space-x-3">
										<MapPin class="w-4 h-4 text-gray-400" />
										<span class="text-sm">{person.location}</span>
									</div>
									
									<div class="flex items-center space-x-3">
										<Building class="w-4 h-4 text-gray-400" />
										<span class="text-sm" data-testid="person-department">{person.department}</span>
									</div>
									
									{#if person.startDate}
										<div class="flex items-center space-x-3">
											<Calendar class="w-4 h-4 text-gray-400" />
											<span class="text-sm">Started {formatDate(person.startDate)}</span>
										</div>
									{/if}
									
									{#if person.manager}
										<div class="flex items-center space-x-3">
											<User class="w-4 h-4 text-gray-400" />
											<span class="text-sm">Reports to {person.manager}</span>
										</div>
									{/if}
								</div>

								<div class="pt-4 border-t space-y-2">
									<div class="flex items-center justify-between">
										<span class="text-sm font-medium">Type</span>
										<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
											{personType === 'employee' ? 'text-blue-600 bg-blue-50' : 'text-purple-600 bg-purple-50'}">
											{personType}
										</span>
									</div>
									
									{#if personType === 'employee'}
										<div class="flex items-center justify-between">
											<span class="text-sm font-medium">Employment Status</span>
											<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
												{person.employmentStatus === 'active' ? 'text-green-600 bg-green-50' : 
												  person.employmentStatus === 'future' ? 'text-yellow-600 bg-yellow-50' :
												  'text-gray-600 bg-gray-50'}">
												{person.employmentStatus}
											</span>
										</div>
									{:else}
										<div class="flex items-center justify-between">
											<span class="text-sm font-medium">Associate Type</span>
											<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-purple-600 bg-purple-50">
												{person.associateStatus?.replace('_', ' ')}
											</span>
										</div>
									{/if}
								</div>
							{:else}
								<!-- Edit Mode -->
								<div class="space-y-4" data-testid="person-edit-form">
									{#if saveError}
										<div class="p-3 border border-red-300 rounded-md bg-red-50 text-red-700 text-sm">
											{saveError}
										</div>
									{/if}

									<!-- Person Type Toggle -->
									<div>
										<div class="block text-sm font-medium text-gray-700 mb-2">Person Type</div>
										<div class="flex items-center space-x-4">
											<Button 
												variant={editFormData.employmentStatus ? "default" : "outline"} 
												size="sm"
												on:click={() => {
													editFormData.employmentStatus = 'active';
													editFormData.associateStatus = null;
												}}
											>
												Employee
											</Button>
											<Button 
												variant={editFormData.associateStatus ? "default" : "outline"} 
												size="sm"
												on:click={() => {
													editFormData.employmentStatus = null;
													editFormData.associateStatus = 'consultant';
												}}
											>
												Associate
											</Button>
										</div>
									</div>

									<!-- Name Fields -->
									<div class="grid grid-cols-2 gap-3">
										<div>
											<label for="firstName" class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
											<input
												id="firstName"
												name="firstName"
												type="text"
												bind:value={editFormData.firstName}
												class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
											>
										</div>
										<div>
											<label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
											<input
												id="lastName"
												name="lastName"
												type="text"
												bind:value={editFormData.lastName}
												class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
											>
										</div>
									</div>

									<!-- Email -->
									<div>
										<label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
										<input
											id="email"
											name="email"
											type="email"
											bind:value={editFormData.email}
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
										>
									</div>

									<!-- Department -->
									<div>
										<label for="department" class="block text-sm font-medium text-gray-700 mb-1">Department</label>
										<select
											id="department"
											bind:value={editFormData.department}
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
										>
											<option value="">Select department</option>
											{#each departments as dept}
												<option value={dept}>{dept}</option>
											{/each}
										</select>
									</div>

									<!-- Position -->
									<div>
										<label for="position" class="block text-sm font-medium text-gray-700 mb-1">Position</label>
										<input
											id="position"
											type="text"
											bind:value={editFormData.position}
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
										>
									</div>

									<!-- Location -->
									<div>
										<label for="location" class="block text-sm font-medium text-gray-700 mb-1">Location</label>
										<select
											id="location"
											bind:value={editFormData.location}
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
										>
											<option value="">Select location</option>
											{#each locations as loc}
												<option value={loc}>{loc}</option>
											{/each}
										</select>
									</div>

									<!-- Manager -->
									<div>
										<label for="manager" class="block text-sm font-medium text-gray-700 mb-1">Manager</label>
										<input
											id="manager"
											type="text"
											bind:value={editFormData.manager}
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
										>
									</div>

									<!-- Status Fields -->
									{#if editFormData.employmentStatus}
										<!-- Employee Status Fields -->
										<div>
											<label for="employmentStatus" class="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
											<select
												id="employmentStatus"
												bind:value={editFormData.employmentStatus}
												class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
											>
												<option value="active">Active</option>
												<option value="former">Former</option>
												<option value="future">Future</option>
											</select>
										</div>
										
										<div>
											<label for="employmentType" class="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
											<select
												id="employmentType"
												bind:value={editFormData.employmentType}
												class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
											>
												<option value="full_time">Full Time</option>
												<option value="part_time">Part Time</option>
												<option value="contractor">Contractor</option>
												<option value="intern">Intern</option>
											</select>
										</div>
									{:else}
										<!-- Associate Status Fields -->
										<div>
											<label for="associateStatus" class="block text-sm font-medium text-gray-700 mb-1">Associate Type</label>
											<select
												id="associateStatus"
												bind:value={editFormData.associateStatus}
												class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
											>
												{#each associateStatuses as status}
													<option value={status.value}>{status.label}</option>
												{/each}
											</select>
										</div>
									{/if}

									<!-- Work Location -->
									<div>
										<label for="workLocation" class="block text-sm font-medium text-gray-700 mb-1">Work Location</label>
										<select
											id="workLocation"
											bind:value={editFormData.workLocation}
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
										>
											<option value="office">Office</option>
											<option value="remote">Remote</option>
											<option value="hybrid">Hybrid</option>
										</select>
									</div>

									<!-- Start Date -->
									<div>
										<label for="startDate" class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
										<input
											id="startDate"
											type="date"
											bind:value={editFormData.startDate}
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
										>
									</div>
								</div>
							{/if}
						</CardContent>
					</Card>

					{#if enrollment}
						<Card data-testid="enrollment-progress">
							<CardHeader>
								<CardTitle>Onboarding Progress</CardTitle>
							</CardHeader>
							<CardContent>
								<div class="space-y-4">
									<div>
										<div class="flex items-center justify-between mb-2">
											<span class="text-sm font-medium">Overall Progress</span>
											<span class="text-sm font-bold {enrollment.completionPercentage >= 80 ? 'text-green-600' : enrollment.completionPercentage >= 50 ? 'text-yellow-600' : 'text-red-600'}" data-testid="completion-percentage">
												{enrollment.completionPercentage}%
											</span>
										</div>
										<div class="w-full bg-gray-200 rounded-full h-2">
											<div 
												class="h-2 rounded-full transition-all duration-300 {enrollment.completionPercentage >= 80 ? 'bg-green-600' : enrollment.completionPercentage >= 50 ? 'bg-yellow-600' : 'bg-red-600'}"
												style="width: {enrollment.completionPercentage}%"
											></div>
										</div>
									</div>

									<div class="grid grid-cols-2 gap-4 pt-4">
										<div class="text-center">
											<div class="text-lg font-bold text-blue-600">
												{enrollment.documentsStatus.length}
											</div>
											<div class="text-xs text-gray-500">Documents</div>
										</div>
										<div class="text-center">
											<div class="text-lg font-bold text-purple-600">
												{enrollment.tasksStatus.length}
											</div>
											<div class="text-xs text-gray-500">Tasks</div>
										</div>
									</div>

									<div class="pt-2 text-xs text-gray-500">
										Last activity: {formatDateTime(enrollment.lastActivity)}
									</div>
								</div>
							</CardContent>
						</Card>
					{/if}
				</div>

				<!-- Documents and Tasks -->
				<div class="lg:col-span-2 space-y-6">
					{#if enrollment}
						<!-- Documents -->
						<Card data-testid="documents-section">
							<CardHeader>
								<CardTitle class="flex items-center space-x-2">
									<FileText class="w-5 h-5" />
									<span>Documents</span>
								</CardTitle>
								<CardDescription>
									Track document upload and verification status
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div class="space-y-4">
									{#each enrollment.documentsStatus as doc}
										{@const StatusIcon = getStatusIcon(doc.status)}
										<div class="flex items-center justify-between p-4 border rounded-lg {getStatusColor(doc.status)}">
											<div class="flex items-center space-x-3">
												<StatusIcon class="w-5 h-5" />
												<div>
													<h4 class="font-medium">{doc.name}</h4>
													<p class="text-sm opacity-75 capitalize">{doc.type.replace('_', ' ')}</p>
													{#if doc.uploadedAt}
														<p class="text-xs opacity-60">
															Uploaded {formatDateTime(doc.uploadedAt)}
														</p>
													{/if}
												</div>
											</div>
											
											<div class="flex items-center space-x-3">
												<div class="text-right">
													<div class="text-sm font-medium capitalize">{doc.status}</div>
													{#if doc.reviewedAt}
														<div class="text-xs opacity-75">
															Reviewed {formatDateTime(doc.reviewedAt)}
														</div>
													{/if}
													{#if doc.reviewedBy}
														<div class="text-xs opacity-60">by {doc.reviewedBy}</div>
													{/if}
												</div>
												
												{#if doc.status === 'uploaded' || doc.status === 'verified'}
													<Button variant="outline" size="sm">
														<Download class="w-4 h-4" />
													</Button>
												{/if}
											</div>
										</div>
										
										{#if doc.comments}
											<div class="ml-8 p-3 bg-gray-50 rounded text-sm text-gray-600">
												<strong>Comments:</strong> {doc.comments}
											</div>
										{/if}
									{/each}
								</div>
							</CardContent>
						</Card>

						<!-- Tasks -->
						<Card data-testid="tasks-section">
							<CardHeader>
								<CardTitle class="flex items-center space-x-2">
									<CheckCircle class="w-5 h-5" />
									<span>Tasks</span>
								</CardTitle>
								<CardDescription>
									Onboarding tasks and their completion status
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div class="space-y-4">
									{#each enrollment.tasksStatus as task}
										{@const StatusIcon = getStatusIcon(task.status)}
										<div class="flex items-center justify-between p-4 border rounded-lg {getStatusColor(task.status)}">
											<div class="flex items-center space-x-3">
												<StatusIcon class="w-5 h-5" />
												<div>
													<h4 class="font-medium">{task.title}</h4>
													<p class="text-sm opacity-75">{task.description}</p>
													<div class="flex items-center space-x-4 mt-1">
														<span class="text-xs opacity-60 capitalize">
															{task.category.replace('_', ' ')}
														</span>
														<span class="text-xs {getPriorityColor(task.priority)} font-medium">
															{task.priority} priority
														</span>
													</div>
													<p class="text-xs opacity-60 mt-1">
														Assigned {formatDateTime(task.assignedAt)} by {task.assignedBy}
													</p>
												</div>
											</div>
											
											<div class="text-right">
												<div class="text-sm font-medium capitalize">
													{task.status.replace('_', ' ')}
												</div>
												{#if task.dueDate}
													<div class="text-xs opacity-75">
														Due {formatDateTime(task.dueDate)}
													</div>
												{/if}
												{#if task.completedAt}
													<div class="text-xs opacity-60">
														Completed {formatDateTime(task.completedAt)}
													</div>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							</CardContent>
						</Card>
					{:else}
						<Card data-testid="no-enrollment-message">
							<CardContent class="text-center py-12">
								<User class="w-12 h-12 text-gray-400 mx-auto mb-4" />
								<h3 class="text-lg font-medium text-gray-900 mb-2">No Enrollment Data</h3>
								<p class="text-gray-500">
									This person doesn't have any enrollment information yet.
								</p>
							</CardContent>
						</Card>
					{/if}
				</div>
			</div>
		</main>
	</div>
{/if}