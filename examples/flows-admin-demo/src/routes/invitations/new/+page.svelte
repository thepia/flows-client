<script lang="ts">
import { onMount } from 'svelte';
import { applications, client, createInvitation, employees, loadDemoData } from '$lib/stores/data';
import type { Employee, Invitation } from '$lib/types';

// Form data
let formData = {
  firstName: '',
  lastName: '',
  companyEmail: '',
  privateEmail: '',
  department: '',
  position: '',
  invitationType: 'onboarding' as 'onboarding' | 'offboarding',
  expiresInDays: 7,
  associationStartDate: '',
  associationEndDate: '',
};

// Form state
let _isSubmitting = false;
let _showSuccess = false;
let generatedInvitation: Partial<Invitation> | null = null;
let _error: string | null = null;

// Employee selection state
let selectedEmployee: Employee | null = null;
let employeeSearchQuery = '';
let _showEmployeeDropdown = false;
let employeeSearchContainer: HTMLDivElement;

// Load data on mount
onMount(() => {
  if ($client === null || $applications.length === 0 || $employees.length === 0) {
    loadDemoData();
  }

  // Add click outside listener
  document.addEventListener('click', handleClickOutside);

  // Cleanup
  return () => {
    document.removeEventListener('click', handleClickOutside);
  };
});

// Department options
const _departments = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'HR',
  'Finance',
  'Operations',
  'Customer Success',
  'Legal',
];

// Employee search and selection functions
$: filteredEmployees = $employees
  .filter(
    (employee) =>
      `${employee.firstName} ${employee.lastName}`
        .toLowerCase()
        .includes(employeeSearchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
      employee.department.toLowerCase().includes(employeeSearchQuery.toLowerCase())
  )
  .slice(0, 10); // Limit to 10 results

function _selectEmployee(employee: Employee) {
  selectedEmployee = employee;
  employeeSearchQuery = `${employee.firstName} ${employee.lastName}`;
  _showEmployeeDropdown = false;

  // Auto-populate form fields from selected employee
  formData.firstName = employee.firstName;
  formData.lastName = employee.lastName;
  formData.companyEmail = employee.email;
  formData.department = employee.department;
  formData.position = employee.position;

  // Set invitation type to offboarding for existing employees
  formData.invitationType = 'offboarding';

  // Set association dates from employee data
  if (employee.startDate) {
    // Use employee's start date as association start date
    formData.associationStartDate = employee.startDate;
  }

  // Set association end date to 90 days in the future (for offboarding)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 90);
  formData.associationEndDate = futureDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

  // Generate a personal email suggestion
  if (!formData.privateEmail) {
    const emailParts = employee.email.split('@');
    if (emailParts.length === 2) {
      // Create a personal email suggestion (firstname.lastname@gmail.com)
      const personalEmail = `${employee.firstName.toLowerCase()}.${employee.lastName.toLowerCase()}@gmail.com`;
      formData.privateEmail = personalEmail;
    }
  }
}

function _clearEmployeeSelection() {
  selectedEmployee = null;
  employeeSearchQuery = '';
  _showEmployeeDropdown = false;

  // Clear form fields
  formData.firstName = '';
  formData.lastName = '';
  formData.companyEmail = '';
  formData.privateEmail = '';
  formData.department = '';
  formData.position = '';
  formData.invitationType = 'onboarding';
}

function _handleEmployeeSearch() {
  _showEmployeeDropdown = employeeSearchQuery.length > 0 && !selectedEmployee;
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  if (employeeSearchContainer && !employeeSearchContainer.contains(event.target as Node)) {
    _showEmployeeDropdown = false;
  }
}

function _generateInvitationCode(clientCode: string, type: string): string {
  const typePrefix = type === 'onboarding' ? 'ONBOARD' : 'OFFBOARD';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${clientCode.toUpperCase()}-${typePrefix}-${random}`;
}

async function _handleSubmit() {
  if (
    !formData.firstName ||
    !formData.lastName ||
    !formData.companyEmail ||
    !formData.privateEmail ||
    !formData.department ||
    !formData.position
  ) {
    return;
  }

  _isSubmitting = true;
  _error = null;

  try {
    // Create invitation using the real Supabase function
    generatedInvitation = await createInvitation({
      companyEmail: formData.companyEmail,
      privateEmail: formData.privateEmail,
      firstName: formData.firstName,
      lastName: formData.lastName,
      department: formData.department,
      position: formData.position,
      invitationType: formData.invitationType,
      ...(formData.associationStartDate
        ? { associationStartDate: formData.associationStartDate }
        : {}),
      ...(formData.associationEndDate ? { associationEndDate: formData.associationEndDate } : {}),
    });

    _showSuccess = true;
  } catch (err) {
    console.error('Failed to create invitation:', err);
    _error = err instanceof Error ? err.message : 'Failed to create invitation';
  } finally {
    _isSubmitting = false;
  }
}

function _resetForm() {
  formData = {
    firstName: '',
    lastName: '',
    companyEmail: '',
    privateEmail: '',
    department: '',
    position: '',
    invitationType: 'onboarding',
    expiresInDays: 7,
    associationStartDate: '',
    associationEndDate: '',
  };

  // Clear employee selection
  selectedEmployee = null;
  employeeSearchQuery = '';
  _showEmployeeDropdown = false;

  _showSuccess = false;
  generatedInvitation = null;
  _error = null;
}

function _copyInvitationLink() {
  if (generatedInvitation && $client) {
    const link = `https://${$client.domain}/invitation/${generatedInvitation.invitationCode}`;
    navigator.clipboard.writeText(link);
  }
}
</script>

<svelte:head>
	<title>Create Invitation - Flows Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="bg-white border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between py-6">
				<div class="flex items-center space-x-4">
					<Button variant="ghost" href="/" class="p-2">
						<ArrowLeft class="w-5 h-5" />
					</Button>
					<div>
						<h1 class="text-2xl font-bold text-gray-900">Create New Invitation</h1>
						<p class="text-sm text-gray-500">Send an invitation for employee onboarding or offboarding</p>
					</div>
				</div>
				<div class="flex space-x-3">
					<Button variant="outline" on:click={resetForm}>
						Reset Form
					</Button>
				</div>
			</div>
		</div>
	</header>

	<main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{#if showSuccess && generatedInvitation}
			<!-- Success Message -->
			<Card class="mb-8 border-green-200 bg-green-50">
				<CardHeader>
					<CardTitle class="flex items-center space-x-2 text-green-800">
						<UserPlus class="w-5 h-5" />
						<span>Invitation Created Successfully!</span>
					</CardTitle>
					<CardDescription class="text-green-700">
						The invitation has been generated and is ready to be sent.
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="bg-white border border-green-200 rounded-lg p-4">
						<div class="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span class="font-medium">Invitation Code:</span>
								<div class="font-mono text-lg mt-1">{generatedInvitation.invitationCode}</div>
							</div>
							<div>
								<span class="font-medium">Expires:</span>
								<div class="mt-1">{new Date(generatedInvitation.expiresAt || '').toLocaleDateString()}</div>
							</div>
						</div>
						
						<div class="mt-4 pt-4 border-t border-green-200">
							<span class="font-medium">Invitation Link:</span>
							<div class="flex items-center space-x-2 mt-1">
								<code class="flex-1 p-2 bg-gray-100 rounded text-sm">
									https://{$client?.domain}/invitation/{generatedInvitation.invitationCode}
								</code>
								<Button variant="outline" size="sm" on:click={copyInvitationLink}>
									Copy
								</Button>
							</div>
						</div>
					</div>

					<div class="flex space-x-3">
						<Button on:click={resetForm}>
							Create Another
						</Button>
						<Button variant="outline" href="/">
							Return to Dashboard
						</Button>
					</div>
				</CardContent>
			</Card>
		{:else}
			<!-- Invitation Form -->
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<div class="lg:col-span-2">
					<Card>
						<CardHeader>
							<CardTitle>Invitation Details</CardTitle>
							<CardDescription>
								Enter the employee information for the invitation
							</CardDescription>
						</CardHeader>
						<CardContent class="space-y-6">
							<!-- Employee Selection (Optional) -->
							<fieldset>
								<legend class="block text-sm font-medium text-gray-700 mb-2">
									Quick Select Employee <span class="text-gray-500 text-xs">(Optional - for offboarding)</span>
								</legend>
								<div class="relative" bind:this={employeeSearchContainer}>
									<div class="flex items-center space-x-2">
										<div class="relative flex-1">
											<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
											<input
												bind:value={employeeSearchQuery}
												on:input={handleEmployeeSearch}
												on:focus={() => handleEmployeeSearch()}
												placeholder="Search employees by name, email, or department..."
												class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
											>
										</div>
										{#if selectedEmployee}
											<Button variant="outline" size="sm" on:click={clearEmployeeSelection}>
												<X class="w-4 h-4" />
											</Button>
										{/if}
									</div>

									<!-- Employee Search Dropdown -->
									{#if showEmployeeDropdown && filteredEmployees.length > 0}
										<div class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
											{#each filteredEmployees as employee}
												<button
													type="button"
													class="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
													on:click={() => selectEmployee(employee)}
												>
													<div class="flex items-center justify-between">
														<div>
															<div class="font-medium text-gray-900">
																{employee.firstName} {employee.lastName}
															</div>
															<div class="text-sm text-gray-500">
																{employee.email} • {employee.department}
															</div>
															<div class="text-xs text-gray-400">
																{employee.position}
															</div>
														</div>
														<div class="text-xs text-gray-400 capitalize">
															{employee.status}
														</div>
													</div>
												</button>
											{/each}
										</div>
									{/if}

									<!-- Selected Employee Display -->
									{#if selectedEmployee}
										<div class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
											<div class="flex items-start justify-between">
												<div>
													<div class="font-medium text-blue-900">
														Selected: {selectedEmployee.firstName} {selectedEmployee.lastName}
													</div>
													<div class="text-sm text-blue-700">
														{selectedEmployee.email} • {selectedEmployee.department}
													</div>
													<div class="text-xs text-blue-600 mt-1">
														Form fields and association dates have been auto-populated
														{#if selectedEmployee.startDate}
															<br>• Association start: {selectedEmployee.startDate} (from employee start date)
														{/if}
														<br>• Association end: 90 days from today (offboarding default)
													</div>
												</div>
											</div>
										</div>
									{/if}
								</div>
							</fieldset>

							<!-- Invitation Type -->
							<fieldset>
								<legend class="block text-sm font-medium text-gray-700 mb-2">
									Invitation Type
								</legend>
								<div class="grid grid-cols-2 gap-4">
									<label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors {formData.invitationType === 'onboarding' ? 'border-primary bg-primary/5' : ''}">
										<input 
											type="radio" 
											bind:group={formData.invitationType} 
											value="onboarding"
											class="sr-only"
										>
										<div class="flex items-center space-x-3">
											<UserPlus class="w-5 h-5 text-green-600" />
											<div>
												<div class="font-medium">Onboarding</div>
												<div class="text-sm text-gray-500">New employee joining</div>
											</div>
										</div>
									</label>
									
									<label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors {formData.invitationType === 'offboarding' ? 'border-primary bg-primary/5' : ''}">
										<input 
											type="radio" 
											bind:group={formData.invitationType} 
											value="offboarding"
											class="sr-only"
										>
										<div class="flex items-center space-x-3">
											<UserPlus class="w-5 h-5 text-red-600" />
											<div>
												<div class="font-medium">Offboarding</div>
												<div class="text-sm text-gray-500">Employee departing</div>
											</div>
										</div>
									</label>
								</div>
							</fieldset>

							<!-- Personal Information -->
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

							<!-- Email Addresses -->
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
										placeholder="employee@nets.eu"
									>
								</div>
								<div>
									<label for="privateEmail" class="block text-sm font-medium text-gray-700 mb-2">
										Private Email *
									</label>
									<input
										id="privateEmail"
										type="email"
										bind:value={formData.privateEmail}
										required
										class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
										placeholder="personal@example.com"
									>
								</div>
							</div>

							<!-- Job Information -->
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

							<!-- Association Dates (Optional) -->
							<fieldset>
								<legend class="block text-sm font-medium text-gray-700 mb-3">
									Association Dates <span class="text-gray-500 text-xs">(Optional)</span>
								</legend>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label for="associationStartDate" class="block text-sm font-medium text-gray-700 mb-2">
											Association Start Date
										</label>
										<input
											id="associationStartDate"
											type="date"
											bind:value={formData.associationStartDate}
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
										>
										<p class="text-xs text-gray-500 mt-1">
											{#if selectedEmployee}
												Auto-filled from employee start date
											{:else}
												When the official association begins
											{/if}
										</p>
									</div>
									<div>
										<label for="associationEndDate" class="block text-sm font-medium text-gray-700 mb-2">
											Association End Date
										</label>
										<input
											id="associationEndDate"
											type="date"
											bind:value={formData.associationEndDate}
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
										>
										<p class="text-xs text-gray-500 mt-1">
											{#if selectedEmployee}
												Auto-set to 90 days from today (offboarding default)
											{:else}
												When the official association ends
											{/if}
										</p>
									</div>
								</div>
							</fieldset>

							<!-- Expiration -->
							<div>
								<label for="expiresIn" class="block text-sm font-medium text-gray-700 mb-2">
									Invitation Expires In
								</label>
								<select
									id="expiresIn"
									bind:value={formData.expiresInDays}
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
								>
									<option value={1}>1 day</option>
									<option value={3}>3 days</option>
									<option value={7}>7 days (recommended)</option>
									<option value={14}>14 days</option>
									<option value={30}>30 days</option>
								</select>
							</div>

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
											<h3 class="text-sm font-medium text-red-800">Error creating invitation</h3>
											<div class="mt-2 text-sm text-red-700">
												<p>{error}</p>
											</div>
										</div>
									</div>
								</div>
							{/if}

							<div class="flex justify-end space-x-3 pt-6">
								<Button variant="outline" href="/">
									Cancel
								</Button>
								<Button 
									on:click={handleSubmit}
									disabled={isSubmitting || !formData.firstName || !formData.lastName || !formData.companyEmail || !formData.privateEmail || !formData.department || !formData.position}
								>
									{#if isSubmitting}
										<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
										Creating...
									{:else}
										<Send class="w-4 h-4 mr-2" />
										Create Invitation
									{/if}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>

				<!-- Preview Panel -->
				<div class="lg:col-span-1">
					<Card>
						<CardHeader>
							<CardTitle>Preview</CardTitle>
							<CardDescription>
								How the invitation will appear
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="space-y-4">
								<div class="p-4 border rounded-lg bg-gray-50">
									<div class="space-y-2">
										<div class="font-medium">
											{formData.firstName || 'First'} {formData.lastName || 'Last'}
										</div>
										<div class="text-sm text-gray-600">
											{formData.email || 'email@example.com'}
										</div>
										<div class="text-sm text-gray-600">
											{formData.position || 'Position'} • {formData.department || 'Department'}
										</div>
									</div>
								</div>

								<div class="space-y-3 text-sm">
									<div class="flex justify-between">
										<span class="text-gray-500">Type:</span>
										<span class="capitalize font-medium">{formData.invitationType}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-gray-500">Client:</span>
										<span class="font-medium">{$client?.name || 'Loading...'}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-gray-500">Domain:</span>
										<span class="font-medium">{$client?.domain || 'Loading...'}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-gray-500">Expires:</span>
										<span class="font-medium">{formData.expiresInDays} day{formData.expiresInDays !== 1 ? 's' : ''}</span>
									</div>
								</div>

								{#if formData.invitationType}
									{@const app = $applications.find(a => a.type === formData.invitationType)}
									{#if app}
										<div class="pt-4 border-t">
											<div class="text-sm">
												<div class="font-medium text-gray-700 mb-1">Application:</div>
												<div class="text-gray-600">{app.name}</div>
												<div class="text-xs text-gray-500 mt-1">Version {app.version}</div>
											</div>
										</div>
									{/if}
								{/if}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		{/if}
	</main>
</div>