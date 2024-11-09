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

<div class="mx-auto max-w-[1440px] px-4" data-sveltekit-preload-data="tap">
	<header class="py-7">
		<nav class="gap flex w-full items-center gap-4">
			<a href="/" class=" p-1.5">
				<span class="sr-only">Home</span>
				<Logo />
			</a>
			<form class="w-full" action="/" data-sveltekit-reload>
				<label for="img-search" class="sr-only">Search for images</label>
				<TextInput type="text" id="img-search" name="q" icon={searchIcon} />
			</form>
		</nav>
	</header>
	{@render children()}
</div>
