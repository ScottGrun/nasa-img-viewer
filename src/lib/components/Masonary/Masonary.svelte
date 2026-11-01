<script lang="ts">
	import { twMerge } from 'tailwind-merge';
	import type { GalleryImage } from '#lib/images.js';
	import MasonaryImage from './MasonaryImage.svelte';

	interface Props {
		images: GalleryImage[];
		class?: string;
	}

	const { images, class: className }: Props = $props();

	// Matches the md and lg breakpoints. Three is the server-rendered default; the wrapper stacks
	// the columns on small screens until this runs.
	let columnCount = $state(3);

	$effect(() => {
		const md = window.matchMedia('(min-width: 768px)');
		const lg = window.matchMedia('(min-width: 1024px)');
		const update = () => {
			columnCount = lg.matches ? 3 : md.matches ? 2 : 1;
		};
		update();
		md.addEventListener('change', update);
		lg.addEventListener('change', update);
		return () => {
			md.removeEventListener('change', update);
			lg.removeEventListener('change', update);
		};
	});

	// Each image goes in the currently shortest column. This only depends on earlier images, so
	// appending more never moves the ones already on screen, unlike CSS columns.
	const columns = $derived.by(() => {
		const result = Array.from({ length: columnCount }, () => ({
			height: 0,
			images: [] as GalleryImage[]
		}));
		for (const image of images) {
			const shortest = result.reduce((a, b) => (b.height < a.height ? b : a));
			shortest.images.push(image);
			shortest.height += image.width && image.height ? image.height / image.width : 1;
		}
		return result;
	});
</script>

<div class={twMerge('flex flex-col gap-2 md:flex-row', className)}>
	{#each columns as column, i (i)}
		<div class="flex min-w-0 flex-1 flex-col" data-masonary-column>
			{#each column.images as image (image.nasaId)}
				<MasonaryImage {...image} class="mb-2 w-full" />
			{/each}
		</div>
	{/each}
</div>
