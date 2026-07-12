<script lang="ts">
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { client, createEmployee, loadDemoData } from '$lib/stores/data';

// Form data
let formData = {
  firstName: '',
  lastName: '',
  companyEmail: '',
  department: '',
  position: '',
  location: '',
  manager: '',
  startDate: '',
  endDate: '',
  employmentType: 'full_time' as 'full_time' | 'part_time' | 'contractor' | 'intern',
  workLocation: 'office' as 'office' | 'remote' | 'hybrid',
  status: 'active' as 'active' | 'previous' | 'future' | 'other',
  securityClearance: 'low' as 'low' | 'medium' | 'high',
};

// UI state
let hasEndDate = false;

// Form state
let _isSubmitting = false;
let _showSuccess = false;
let createdEmployee: any = null;
let _error: string | null = null;

// Load data on mount
onMount(() => {
  if ($client === null) {
    loadDemoData();
  }
});

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

async function _handleSubmit() {
  if (
    !formData.firstName ||
    !formData.lastName ||
    !formData.companyEmail ||
    !formData.department ||
    !formData.position ||
    !formData.location
  ) {
    return;
  }

  _isSubmitting = true;
  _error = null;

  try {
    // Create employee using the real Supabase function
    createdEmployee = await createEmployee({
      firstName: formData.firstName,
      lastName: formData.lastName,
      companyEmail: formData.companyEmail,
      department: formData.department,
      position: formData.position,
      location: formData.location,
      manager: formData.manager,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      employmentType: formData.employmentType,
      workLocation: formData.workLocation,
      status: formData.status,
      securityClearance: formData.securityClearance,
    });

    _showSuccess = true;
  } catch (err) {
    console.error('Failed to create employee:', err);
    _error = err instanceof Error ? err.message : 'Failed to create employee';
  } finally {
    _isSubmitting = false;
  }
}

function _resetForm() {
  formData = {
    firstName: '',
    lastName: '',
    companyEmail: '',
    department: '',
    position: '',
    location: '',
    manager: '',
    startDate: '',
    endDate: '',
    employmentType: 'full_time',
    workLocation: 'office',
    status: 'active',
    securityClearance: 'low',
  };
  hasEndDate = false;
  _showSuccess = false;
  createdEmployee = null;
  _error = null;
}

// Clear end date when checkbox is unchecked
$: if (!hasEndDate) {
  formData.endDate = '';
}

function _navigateToEmployee() {
  if (createdEmployee) {
    goto(`/employees/${createdEmployee.id}`);
  }
}
</script>

<svelte:head>
	<title>Create Employee - Flows Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center space-x-4 mb-4">
				<Button variant="outline" size="sm" on:click={() => goto('/')}>
					<ArrowLeft class="w-4 h-4 mr-2" />
					Back to Dashboard
				</Button>
				<div>
					<h1 class="text-2xl font-bold text-gray-900">Create New Employee</h1>
					<p class="text-gray-600">Add a new employee to the {$client?.name || 'system'}</p>
				</div>
			</div>
		</div>

		{#if showSuccess && createdEmployee}
			<!-- Success Message -->
			<Card class="mb-8 border-green-300 bg-green-50">
				<CardContent class="pt-6">
					<div class="flex items-start space-x-3">
						<div class="flex-shrink-0">
							<div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
								<UserPlus class="w-4 h-4 text-white" />
							</div>
						</div>
						<div class="flex-1">
							<h3 class="text-lg font-medium text-green-800 mb-2">Employee Created Successfully!</h3>
							<div class="grid grid-cols-2 gap-4 text-sm text-green-700 mb-4">
								<div>
									<span class="font-medium">Name:</span>
									<div class="mt-1">{createdEmployee.firstName} {createdEmployee.lastName}</div>
								</div>
								<div>
									<span class="font-medium">Email:</span>
									<div class="mt-1">{createdEmployee.email}</div>
								</div>
								<div>
									<span class="font-medium">Department:</span>
									<div class="mt-1">{createdEmployee.department}</div>
								</div>
								<div>
									<span class="font-medium">Employee Code:</span>
									<div class="mt-1 font-mono">{createdEmployee.id}</div>
								</div>
							</div>
						</div>
					</div>

					<div class="flex space-x-3 mt-4">
						<Button on:click={navigateToEmployee}>
							View Employee
						</Button>
						<Button variant="outline" on:click={resetForm}>
							Create Another
						</Button>
					</div>
				</CardContent>
			</Card>
		{:else}
			<!-- Employee Form -->
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<div class="lg:col-span-2">
					<Card>
						<CardHeader>
							<CardTitle>Employee Information</CardTitle>
							<CardDescription>
								Enter the employee details for the new team member
							</CardDescription>
						</CardHeader>
						<CardContent class="space-y-6">
							<!-- Personal Information -->
							<fieldset>
								<legend class="block text-sm font-medium text-gray-700 mb-3">
									Personal Information
								</legend>
								<div class="grid grid-cols-2 gap-4">
									<div>
										<label for="firstName" class="block text-sm font-medium text-gray-700 mb-2">
											First Name *
										</label>
										<input
											id="firstName"
											type="text"
											bind:value={formData.firstName}
											required
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
											placeholder="Enter first name"
										>
									</div>
									
									<div>
										<label for="lastName" class="block text-sm font-medium text-gray-700 mb-2">
											Last Name *
										</label>
										<input
											id="lastName"
											type="text"
											bind:value={formData.lastName}
											required
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
											placeholder="Enter last name"
										>
									</div>
								</div>

								<div>
									<label for="companyEmail" class="block text-sm font-medium text-gray-700 mb-2">
										Company Email *
									</label>
									<input
										id="companyEmail"
										type="email"
										bind:value={formData.companyEmail}
										required
										class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
										placeholder="employee@{$client?.domain || 'company.com'}"
									>
								</div>
							</fieldset>

							<!-- Job Information -->
							<fieldset>
								<legend class="block text-sm font-medium text-gray-700 mb-3">
									Job Information
								</legend>
								<div class="grid grid-cols-2 gap-4">
									<div>
										<label for="department" class="block text-sm font-medium text-gray-700 mb-2">
											Department *
										</label>
										<select
											id="department"
											bind:value={formData.department}
											required
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
										>
											<option value="">Select department</option>
											{#each departments as dept}
												<option value={dept}>{dept}</option>
											{/each}
										</select>
									</div>
									
									<div>
										<label for="position" class="block text-sm font-medium text-gray-700 mb-2">
											Position *
										</label>
										<input
											id="position"
											type="text"
											bind:value={formData.position}
											required
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
											placeholder="e.g. Senior Software Engineer"
										>
									</div>
								</div>

								<div class="grid grid-cols-2 gap-4">
									<div>
										<label for="location" class="block text-sm font-medium text-gray-700 mb-2">
											Location *
										</label>
										<select
											id="location"
											bind:value={formData.location}
											required
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
										>
											<option value="">Select location</option>
											{#each locations as loc}
												<option value={loc}>{loc}</option>
											{/each}
										</select>
									</div>
									
									<div>
										<label for="manager" class="block text-sm font-medium text-gray-700 mb-2">
											Manager
										</label>
										<input
											id="manager"
											type="text"
											bind:value={formData.manager}
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
											placeholder="e.g. John Smith"
										>
									</div>
								</div>
							</fieldset>

							<!-- Employment Details -->
							<fieldset>
								<legend class="block text-sm font-medium text-gray-700 mb-3">
									Employment Details
								</legend>
								<div class="grid grid-cols-2 gap-4">
									<div>
										<label for="startDate" class="block text-sm font-medium text-gray-700 mb-2">
											Start Date
										</label>
										<input
											id="startDate"
											type="date"
											bind:value={formData.startDate}
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
										>
									</div>
									
									<div>
										<div class="flex items-center space-x-3 mb-2">
											<input
												id="hasEndDate"
												type="checkbox"
												bind:checked={hasEndDate}
												class="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
											>
											<label for="hasEndDate" class="text-sm font-medium text-gray-700">
												Set End Date
											</label>
										</div>
										{#if hasEndDate}
											<input
												id="endDate"
												type="date"
												bind:value={formData.endDate}
												class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
											>
										{:else}
											<div class="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 text-sm">
												None (permanent employment)
											</div>
										{/if}
									</div>
								</div>

								<div class="grid grid-cols-2 gap-4">
									<div>
										<label for="employmentType" class="block text-sm font-medium text-gray-700 mb-2">
											Employment Type
										</label>
										<select
											id="employmentType"
											bind:value={formData.employmentType}
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
										>
											<option value="full_time">Full Time</option>
											<option value="part_time">Part Time</option>
											<option value="contractor">Contractor</option>
											<option value="intern">Intern</option>
										</select>
									</div>
									
									<div>
										<label for="workLocation" class="block text-sm font-medium text-gray-700 mb-2">
											Work Location
										</label>
										<select
											id="workLocation"
											bind:value={formData.workLocation}
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
										>
											<option value="office">Office</option>
											<option value="remote">Remote</option>
											<option value="hybrid">Hybrid</option>
										</select>
									</div>
								</div>

								<div class="grid grid-cols-2 gap-4">
									<div>
										<label for="status" class="block text-sm font-medium text-gray-700 mb-2">
											Overall Status
										</label>
										<select
											id="status"
											bind:value={formData.status}
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
										>
											<option value="active">Active</option>
											<option value="previous">Previous</option>
											<option value="future">Future</option>
											<option value="other">Other</option>
										</select>
										<p class="text-xs text-gray-500 mt-1">Overall employment status with the company</p>
									</div>
									
									<div>
										<label for="securityClearance" class="block text-sm font-medium text-gray-700 mb-2">
											Security Clearance
										</label>
										<select
											id="securityClearance"
											bind:value={formData.securityClearance}
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
										>
											<option value="low">Low</option>
											<option value="medium">Medium</option>
											<option value="high">High</option>
										</select>
									</div>
								</div>
							</fieldset>

							<!-- Error Display -->
							{#if error}
								<div class="p-4 border border-red-300 rounded-md bg-red-50">
									<div class="flex">
										<div class="flex-shrink-0">
											<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
												<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
											</svg>
										</div>
										<div class="ml-3">
											<h3 class="text-sm font-medium text-red-800">Error creating employee</h3>
											<div class="mt-2 text-sm text-red-700">
												<p>{error}</p>
											</div>
										</div>
									</div>
								</div>
							{/if}

							<div class="flex justify-end space-x-3 pt-6">
								<Button variant="outline" on:click={() => goto('/')}>
									Cancel
								</Button>
								<Button 
									on:click={handleSubmit}
									disabled={isSubmitting || !formData.firstName || !formData.lastName || !formData.companyEmail || !formData.department || !formData.position || !formData.location}
								>
									{#if isSubmitting}
										<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
										Creating...
									{:else}
										<Save class="w-4 h-4 mr-2" />
										Create Employee
									{/if}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>

				<!-- Preview Panel -->
				<div class="lg:col-span-1">
					<Card class="sticky top-4">
						<CardHeader>
							<CardTitle class="text-lg">Preview</CardTitle>
							<CardDescription>Review the employee information</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="space-y-4 text-sm">
								<div class="flex justify-between">
									<span class="text-gray-500">Name:</span>
									<span class="font-medium">{formData.firstName} {formData.lastName}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-500">Email:</span>
									<span class="font-medium break-all">{formData.companyEmail}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-500">Department:</span>
									<span class="font-medium">{formData.department}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-500">Position:</span>
									<span class="font-medium">{formData.position}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-500">Location:</span>
									<span class="font-medium">{formData.location}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-500">Type:</span>
									<span class="font-medium capitalize">{formData.employmentType.replace('_', ' ')}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-500">Work:</span>
									<span class="font-medium capitalize">{formData.workLocation}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-500">Status:</span>
									<span class="font-medium capitalize">{formData.status.replace('_', ' ')}</span>
								</div>
								{#if formData.startDate}
									<div class="flex justify-between">
										<span class="text-gray-500">Start Date:</span>
										<span class="font-medium">{new Date(formData.startDate).toLocaleDateString()}</span>
									</div>
								{/if}
								<div class="flex justify-between">
									<span class="text-gray-500">Client:</span>
									<span class="font-medium">{$client?.name || 'Loading...'}</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		{/if}
	</div>
</div>