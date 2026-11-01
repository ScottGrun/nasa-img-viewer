<script lang="ts">
	import { twMerge } from 'tailwind-merge';
	import type { GalleryImage } from '#lib/images.js';
	import MasonaryImage from './MasonaryImage.svelte';

	interface Props {
		images: GalleryImage[];
		class?: string;
	}

	const { images, class: className }: Props = $props();
</script>

<div class={twMerge('columns-1 gap-2 md:columns-2 lg:columns-3', className)}>
	{#each images as image (image.nasaId)}
		<MasonaryImage {...image} class="mb-2 w-full " />
	{/each}
</div>
