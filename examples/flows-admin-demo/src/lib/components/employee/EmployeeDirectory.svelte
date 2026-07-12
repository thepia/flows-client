<script lang="ts">
import type { Employee, EmployeeEnrollment } from '$lib/types';

// Props
export let employees: Employee[];
export const enrollments: EmployeeEnrollment[] = [];
export const loading: boolean = false;
export const onEmployeeSelect: ((employee: Employee) => void) | undefined = undefined;

// Helper function to get employee enrollment
function _getEmployeeEnrollment(employeeId: string): EmployeeEnrollment | undefined {
  return enrollments.find((e) => e.employeeId === employeeId);
}
</script>

<!-- Employee List -->
<Card>
	<CardHeader>
		<div class="flex items-center justify-between">
			<div>
				<CardTitle>People Directory</CardTitle>
				<CardDescription>
					Manage employees and associates
				</CardDescription>
			</div>
			<Button href="/people/new">
				<UserPlus class="w-4 h-4 mr-2" />
				New Person
			</Button>
		</div>
	</CardHeader>
	<CardContent>
		{#if loading}
			<!-- Loading skeleton -->
			<div class="space-y-4">
				{#each Array(3) as _}
					<div class="flex items-center justify-between p-4 border rounded-lg animate-pulse">
						<div class="flex items-center space-x-4">
							<div class="w-10 h-10 bg-gray-200 rounded-full"></div>
							<div>
								<div class="w-32 h-4 bg-gray-200 rounded mb-2"></div>
								<div class="w-24 h-3 bg-gray-200 rounded mb-1"></div>
								<div class="w-40 h-3 bg-gray-200 rounded"></div>
							</div>
						</div>
						<div class="flex items-center space-x-4">
							<div class="w-16 h-6 bg-gray-200 rounded"></div>
							<div class="w-20 h-8 bg-gray-200 rounded"></div>
						</div>
					</div>
				{/each}
			</div>
		{:else if employees.length === 0}
			<!-- Empty state -->
			<div class="text-center py-12">
				<div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<span class="text-2xl text-gray-400">👥</span>
				</div>
				<h3 class="text-lg font-medium text-gray-900 mb-2">No people found</h3>
				<p class="text-gray-600 mb-4">Get started by adding your first person.</p>
			</div>
		{:else}
			<!-- Employee list -->
			<div class="space-y-4">
				{#each employees as employee}
					{@const enrollment = getEmployeeEnrollment(employee.id)}
					<EmployeeCard 
						{employee} 
						{enrollment} 
						onSelect={onEmployeeSelect}
					/>
				{/each}
			</div>
		{/if}
	</CardContent>
</Card>