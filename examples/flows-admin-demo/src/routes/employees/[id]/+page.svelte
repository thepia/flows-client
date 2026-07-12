<script lang="ts">
import { AlertCircle, CheckCircle, Clock, X } from 'lucide-svelte';
import { onMount } from 'svelte';
import { page } from '$app/stores';
import { employees, enrollments, loadDemoData } from '$lib/stores/data';
import type { DocumentStatus, TaskStatus } from '$lib/types';

// Load data on component mount if not already loaded
onMount(() => {
  if ($employees.length === 0) {
    loadDemoData();
  }
});

$: employeeId = $page.params.id;
$: employee = $employees.find((e) => e.id === employeeId);
$: enrollment = $enrollments.find((e) => e.employeeId === employeeId);

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
		{employee ? `${employee.firstName} ${employee.lastName}` : 'Employee'} - {$client?.name || 'Flows Admin'}
	</title>
</svelte:head>

{#if !employee}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<h1 class="text-2xl font-bold text-gray-900 mb-2">Employee Not Found</h1>
			<p class="text-gray-600 mb-4">The employee you're looking for doesn't exist.</p>
			<Button href="/">Return to Dashboard</Button>
		</div>
	</div>
{:else}
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
							<h1 class="text-2xl font-bold text-gray-900">
								{employee.firstName} {employee.lastName}
							</h1>
							<p class="text-sm text-gray-500">{employee.position} • {employee.department}</p>
						</div>
					</div>
					<div class="flex space-x-3">
						<Button variant="outline">Send Message</Button>
						<Button variant="outline">Generate Report</Button>
						<Button>Update Status</Button>
					</div>
				</div>
			</div>
		</header>

		<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<!-- Employee Info -->
				<div class="lg:col-span-1 space-y-6">
					<Card>
						<CardHeader>
							<CardTitle class="flex items-center space-x-2">
								<User class="w-5 h-5" />
								<span>Employee Information</span>
							</CardTitle>
						</CardHeader>
						<CardContent class="space-y-4">
							<div class="flex items-center justify-center mb-6">
								<div class="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
									<span class="text-2xl font-bold text-primary">
										{employee.firstName[0]}{employee.lastName[0]}
									</span>
								</div>
							</div>

							<div class="space-y-3">
								<div class="flex items-center space-x-3">
									<Mail class="w-4 h-4 text-gray-400" />
									<span class="text-sm">{employee.email}</span>
								</div>
								
								{#if employee.phone}
									<div class="flex items-center space-x-3">
										<Phone class="w-4 h-4 text-gray-400" />
										<span class="text-sm">{employee.phone}</span>
									</div>
								{/if}
								
								<div class="flex items-center space-x-3">
									<MapPin class="w-4 h-4 text-gray-400" />
									<span class="text-sm">{employee.location}</span>
								</div>
								
								<div class="flex items-center space-x-3">
									<Building class="w-4 h-4 text-gray-400" />
									<span class="text-sm">{employee.department}</span>
								</div>
								
								<div class="flex items-center space-x-3">
									<Calendar class="w-4 h-4 text-gray-400" />
									<span class="text-sm">Started {formatDate(employee.startDate)}</span>
								</div>
								
								{#if employee.manager}
									<div class="flex items-center space-x-3">
										<User class="w-4 h-4 text-gray-400" />
										<span class="text-sm">Reports to {employee.manager}</span>
									</div>
								{/if}
							</div>

							<div class="pt-4 border-t">
								<div class="flex items-center justify-between">
									<span class="text-sm font-medium">Status</span>
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
										{employee.status === 'active' ? 'text-green-600 bg-green-50' : 
										  employee.status === 'pending' ? 'text-yellow-600 bg-yellow-50' :
										  'text-gray-600 bg-gray-50'}">
										{employee.status}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>

					{#if enrollment}
						<Card>
							<CardHeader>
								<CardTitle>Onboarding Progress</CardTitle>
							</CardHeader>
							<CardContent>
								<div class="space-y-4">
									<div>
										<div class="flex items-center justify-between mb-2">
											<span class="text-sm font-medium">Overall Progress</span>
											<span class="text-sm font-bold {enrollment.completionPercentage >= 80 ? 'text-green-600' : enrollment.completionPercentage >= 50 ? 'text-yellow-600' : 'text-red-600'}">
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
						<Card>
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
						<Card>
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
						<Card>
							<CardContent class="text-center py-12">
								<User class="w-12 h-12 text-gray-400 mx-auto mb-4" />
								<h3 class="text-lg font-medium text-gray-900 mb-2">No Enrollment Data</h3>
								<p class="text-gray-500">
									This employee doesn't have any enrollment information yet.
								</p>
							</CardContent>
						</Card>
					{/if}
				</div>
			</div>
		</main>
	</div>
{/if}