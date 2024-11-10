<script lang="ts">
	import Masonary from '$lib/components/Masonary/Masonary.svelte';
	import type { SearchResponse } from '$lib/types';
	import { onMount } from 'svelte';

	interface Props {
		keywords?: string[];
		parentImageId: string;
		class?: string;
	}

	interface RelatedImages {
		url: string;
		description: string;
		title: string;
		nasaId: string;
	}

	const { keywords, parentImageId, class: className }: Props = $props();
	let relatedImages: RelatedImages[] = $state([]);

	const fetchImages = async (keywords: string[]) => {
		const res = await fetch(
			`https://images-api.nasa.gov/search?q=${encodeURIComponent(keywords.join(' '))}&media_type=image`
		);
		// Await the json() promise and assign the result
		const parsedData: SearchResponse = await res.json();
		return parsedData.collection.items.map((image) => {
			const imageData = image.data[0];
			return {
				url: image.links[0].href, // this grabs the thumbnail from each image
				description: imageData.description,
				title: imageData.title,
				nasaId: imageData.nasa_id
			};
		});
	};

	onMount(async () => {
		if (keywords && keywords.length > 0) {
			let images = [];
			images = await fetchImages(keywords);
			if (relatedImages.length > 3) {
				images = await fetchImages(keywords.slice(0, 5));
			}

			relatedImages = images.filter((el) => el.nasaId !== parentImageId);
		}
	});
</script>

{#if relatedImages.length > 0}
	<section class={className}>
		<h2 class="mb-4 text-2xl font-bold text-neutral-900">Related images</h2>
		<Masonary images={relatedImages} />
	</section>
{/if}
