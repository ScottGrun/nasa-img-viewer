<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Search from '$lib/assets/icons/Search.svelte';
	import TextInput from './TextInput.svelte';

	// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
	const { Story } = defineMeta({
		title: 'Components/TextInput',
		component: TextInput,
		tags: ['autodocs']
	});
</script>

{#snippet search()}
	<Search />
{/snippet}

<Story name="Primary" />
<Story name="With Icon" args={{ icon: search }} />
