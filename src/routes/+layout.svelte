<script lang="ts">
	import '../app.css';
	import { resolve } from '$app/paths';
	import { navigating, page } from '$app/state';
	import Logo from '#lib/assets/icons/Logo.svelte';
	import Search from '#lib/assets/icons/Search.svelte';
	import TextInput from '#lib/components/TextInput/TextInput.svelte';
	let { children } = $props();

	// Only show the bar once a navigation has been pending for a moment, so fast ones don't flash.
	const SHOW_AFTER_MS = 100;
	let showProgress = $state(false);
	$effect(() => {
		if (!navigating.to) {
			showProgress = false;
			return;
		}
		const timer = setTimeout(() => (showProgress = true), SHOW_AFTER_MS);
		return () => clearTimeout(timer);
	});
</script>

{#snippet searchIcon()}
	<Search />
{/snippet}

{#if showProgress}
	<div
		role="progressbar"
		aria-label="Loading page"
		data-progress
		class="progress pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 bg-nasa-red"
	></div>
{/if}

<div class="mx-auto min-h-screen max-w-[1440px] px-4 xl:p-0" data-sveltekit-preload-data="hover">
	<header class="pt-7 pb-4">
		<nav class="gap flex w-full items-center gap-4">
			<a href={resolve('/')}>
				<span class="sr-only">Home</span>
				<Logo />
			</a>
			<form class="w-full" action="/">
				<label for="img-search" class="sr-only">Search for images</label>
				<TextInput
					type="text"
					id="img-search"
					name="q"
					placeholder="Search for Apollo, wind tunnel, rogers dry lakebed"
					value={page.url.searchParams.get('q') ?? ''}
					icon={searchIcon}
				/>
				{#if page.route.id === '/'}
					{#each ['year_start', 'year_end'] as name (name)}
						{@const value = page.url.searchParams.get(name)}
						{#if value !== null}
							<input type="hidden" {name} {value} />
						{/if}
					{/each}
				{/if}
			</form>
		</nav>
	</header>
	{@render children()}
</div>

<style>
	.progress {
		transform-origin: left;
		animation: progress-grow 10s cubic-bezier(0.1, 0.6, 0.2, 1) forwards;
	}

	@keyframes progress-grow {
		from {
			transform: scaleX(0.05);
		}
		to {
			transform: scaleX(0.92);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.progress {
			animation: none;
			opacity: 0.7;
		}
	}
</style>
