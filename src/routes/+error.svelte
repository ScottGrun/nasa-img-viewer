<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>{page.status} | NASA Image Viewer</title>
</svelte:head>

<main class="py-16 text-center">
	<p class="font-mono text-sm text-neutral-600">{page.status}</p>
	<h1 class="mt-2 text-2xl font-extrabold text-primary-dark">
		{page.error?.message ?? 'Something went wrong'}
	</h1>
	<a
		href={resolve('/')}
		class="mt-6 inline-block text-sm font-semibold text-primary-dark transition-colors hover:text-nasa-red"
		>Back to home</a
	>
</main>
