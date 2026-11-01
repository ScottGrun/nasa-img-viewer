<script lang="ts">
	import '../app.css';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Logo from '#lib/assets/icons/Logo.svelte';
	import Search from '#lib/assets/icons/Search.svelte';
	import TextInput from '#lib/components/TextInput/TextInput.svelte';
	let { children } = $props();
</script>

{#snippet searchIcon()}
	<Search />
{/snippet}

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
			</form>
		</nav>
	</header>
	{@render children()}
</div>
