<script lang="ts">
	import Masonary from '#lib/components/Masonary/Masonary.svelte';
	import type { GalleryImage } from '#lib/images.js';

	interface Props {
		images: GalleryImage[];
		class?: string;
	}

	const { images, class: className }: Props = $props();
</script>

{#if images.length > 0}
	<section class={className}>
		<h2 class="mb-4 text-2xl font-bold text-primary-dark">Related images</h2>
		<Masonary {images} />
	</section>
{/if}
