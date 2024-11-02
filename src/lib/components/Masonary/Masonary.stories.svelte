<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Masonary from './Masonary.svelte';

	// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
	const { Story } = defineMeta({
		title: 'Components/Masonary',
		component: Masonary,
		tags: ['autodocs'],

		args: {
			images: new Array(9).fill(undefined, 0, 9).map((_, idx) => ({
				url:
					idx % 2 == 0
						? 'https://picsum.photos/seed/picsumm/500/300'
						: 'https://picsum.photos/seed/picsumm/600/400',
				description: `Alt text for example image ${idx}`,

				title: `Test Image ${idx}`,

				nasaId: String(idx)
			}))
		}
	});
</script>

<Story name="Primary" />
