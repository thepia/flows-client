<script lang="ts">
// Props
export let totalEmployees: number;
export let onboardingCount: number;
export let offboardingCount: number;
export let pendingInvitations: number;
export const loading: boolean = false;
</script>

<!-- Dashboard Stats -->
<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
	<MetricCard 
		title="Total Employees"
		value={totalEmployees}
		description="All registered employees"
		icon={Users}
	/>
	
	<MetricCard 
		title="Onboarding"
		value={onboardingCount}
		description="Active onboarding processes"
		icon={UserPlus}
		color="info"
		loading={loading}
	/>
	
	<MetricCard 
		title="Offboarding"
		value={offboardingCount}
		description="Active offboarding processes"
		icon={UserX}
		color="warning"
		loading={loading}
	/>
	
	<MetricCard 
		title="Open Invitations"
		value={pendingInvitations}
		description="Awaiting response"
		icon={AlertCircle}
		color="info"
	/>
</div>