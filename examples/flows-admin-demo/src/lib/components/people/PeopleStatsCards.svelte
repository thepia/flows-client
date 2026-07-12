<script lang="ts">
export let totalPeople: number;
export let activeEmployees: number;
export let associates: number;
export let futureEmployees: number;
</script>

<!-- Statistics Cards -->
<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
	<Card>
		<CardContent class="pt-6">
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<Users class="h-8 w-8 text-blue-600" />
				</div>
				<div class="ml-5 w-0 flex-1">
					<dl>
						<dt class="text-sm font-medium text-gray-500 truncate">Total People</dt>
						<dd class="text-lg font-medium text-gray-900">{totalPeople}</dd>
					</dl>
				</div>
			</div>
		</CardContent>
	</Card>

	<Card>
		<CardContent class="pt-6">
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<div class="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
						<div class="h-4 w-4 bg-green-600 rounded-full"></div>
					</div>
				</div>
				<div class="ml-5 w-0 flex-1">
					<dl>
						<dt class="text-sm font-medium text-gray-500 truncate">Active Employees</dt>
						<dd class="text-lg font-medium text-gray-900">{activeEmployees}</dd>
					</dl>
				</div>
			</div>
		</CardContent>
	</Card>

	<Card>
		<CardContent class="pt-6">
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<Briefcase class="h-8 w-8 text-purple-600" />
				</div>
				<div class="ml-5 w-0 flex-1">
					<dl>
						<dt class="text-sm font-medium text-gray-500 truncate">Associates</dt>
						<dd class="text-lg font-medium text-gray-900">{associates}</dd>
					</dl>
				</div>
			</div>
		</CardContent>
	</Card>

	<Card>
		<CardContent class="pt-6">
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<div class="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
						<div class="h-4 w-4 bg-orange-600 rounded-full"></div>
					</div>
				</div>
				<div class="ml-5 w-0 flex-1">
					<dl>
						<dt class="text-sm font-medium text-gray-500 truncate">Future Employees</dt>
						<dd class="text-lg font-medium text-gray-900">{futureEmployees}</dd>
					</dl>
				</div>
			</div>
		</CardContent>
	</Card>
</div>