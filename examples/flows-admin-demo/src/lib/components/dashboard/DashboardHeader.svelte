<script lang="ts">
// Props
export const clientName: string = '';
export const loading: boolean = false;
</script>

<!-- Header -->
<header class="bg-white border-b border-gray-200">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex justify-between items-center py-6">
			<div>
				<a href="/" class="hover:opacity-75 transition-opacity">
					<h1 class="text-2xl font-bold text-gray-900">Flows Admin Dashboard</h1>
				</a>
				<p class="text-sm text-gray-500">
					{#if loading}
						Loading...
					{:else}
						{clientName} - Employee Management
					{/if}
				</p>
			</div>
			<div class="flex space-x-3">
				{#if $page.url.pathname !== '/'}
					<Button variant="outline" href="/">
						<Home class="w-4 h-4 mr-2" />
						Dashboard
					</Button>
				{/if}
				<Button variant="outline" href="/people/new">
					<UserPlus class="w-4 h-4 mr-2" />
					New Person
				</Button>
				<Button variant="outline" href="/invitations/new">
					<UserPlus class="w-4 h-4 mr-2" />
					New Invitation
				</Button>
				<Button 
					variant={$page.url.pathname === '/settings' ? 'default' : 'outline'} 
					href="/settings"
				>
					<Settings class="w-4 h-4 mr-2" />
					Settings
				</Button>
				<Button>View Reports</Button>
			</div>
		</div>
	</div>
</header>