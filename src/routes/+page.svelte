<script lang="ts">
	import Masonary from '$lib/components/Masonary/Masonary.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const images = data.items.map((image) => {
		const imageData = image.data[0];
		return {
			url: image.links[0].href, // this grabs the thumbnail from each image
			description: imageData.description,
			title: imageData.title,
			nasaId: imageData.nasa_id
		};
	});
</script>

<main>
	<Masonary {images} />
</main>
