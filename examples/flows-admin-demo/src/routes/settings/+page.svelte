<script lang="ts">
</script>

<svelte:head>
	<title>Settings - Flows Admin Demo</title>
</svelte:head>

<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<!-- Header -->
	<div class="flex items-center gap-4 mb-8">
		<button
			on:click={() => goto('/')}
			class="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
			aria-label="Back to main page"
		>
			<ArrowLeft class="w-4 h-4" />
		</button>
		
		<div class="flex items-center gap-3">
			<Settings class="w-6 h-6 text-gray-600" />
			<h1 class="text-2xl font-bold text-gray-900">Settings</h1>
		</div>
	</div>

	<!-- Settings Panel -->
	<SettingsPanel />
</main>