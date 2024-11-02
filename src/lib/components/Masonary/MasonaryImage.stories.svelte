<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import MasonaryImage from './MasonaryImage.svelte';

	// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
	const { Story } = defineMeta({
		title: 'Components/MasonaryImage',
		component: MasonaryImage,
		tags: ['autodocs'],
		args: {
			url: 'https://picsum.photos/seed/picsumm/600/400',
			title: 'A car in the desert',
			description: 'A car in the desert with large sand dunes around it',
			nasaId: 'ABC123'
		}
	});
</script>

<Story name="Primary" />
