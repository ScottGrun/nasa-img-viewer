<script lang="ts">
	import InfiniteGallery, { type Loaded } from '#lib/components/InfiniteGallery.svelte';
	import type { GalleryImage } from '#lib/images.js';

	interface Props {
		nasaId: string;
		images: GalleryImage[];
		hasMore: boolean;
		query: string;
		loaded?: Loaded;
		class?: string;
	}

	let {
		nasaId,
		images,
		hasMore,
		query,
		loaded = $bindable(undefined),
		class: className
	}: Props = $props();
</script>

{#if images.length > 0 || hasMore}
	<section class={className}>
		<h2 class="mb-4 text-2xl font-bold text-primary-dark">Related images</h2>
		<InfiniteGallery key={nasaId} {query} {images} {hasMore} exclude={nasaId} bind:loaded />
	</section>
{/if}
