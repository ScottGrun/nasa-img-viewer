<script lang="ts">
	import Logo from '$lib/assets/icons/Logo.svelte';
	import Search from '$lib/assets/icons/Search.svelte';
	import TextInput from '$lib/components/TextInput.svelte';
	import '../app.css';
	let { children } = $props();
</script>

{#snippet searchIcon()}
	<Search />
{/snippet}

<div class="px-4">
	<header class="py-7">
		<nav class="gap flex w-full items-center gap-4">
			<a href="/" class=" p-1.5">
				<span class="sr-only">Home</span>
				<Logo />
			</a>
			<form class="w-full">
				<label for="img-search" class="sr-only">Search for images</label>
				<TextInput type="text" id="img-search" name="img-search" icon={searchIcon} />
			</form>
		</nav>
	</header>
	{@render children()}
</div>
