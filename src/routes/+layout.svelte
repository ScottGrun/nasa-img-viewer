<script lang="ts">
	import '../app.css';
	import Logo from '$lib/assets/icons/Logo.svelte';
	import Search from '$lib/assets/icons/Search.svelte';
	import TextInput from '$lib/components/TextInput/TextInput.svelte';
	let { children } = $props();
</script>

{#snippet searchIcon()}
	<Search />
{/snippet}

<div
	class="mx-auto min-h-screen max-w-[1440px] px-4 xl:p-0"
	data-sveltekit-preload-data="hover"
	data-sveltekit-reload
>
	<header class="pb-4 pt-7">
		<nav class="gap flex w-full items-center gap-4">
			<a href="/">
				<span class="sr-only">Home</span>
				<Logo />
			</a>
			<form class="w-full" action="/" data-sveltekit-reload>
				<label for="img-search" class="sr-only">Search for images</label>
				<TextInput
					type="text"
					id="img-search"
					name="q"
					placeholder="Search for Apollo, wind tunnel, rogers dry lakebed"
					icon={searchIcon}
				/>
			</form>
		</nav>
	</header>
	{@render children()}
</div>
