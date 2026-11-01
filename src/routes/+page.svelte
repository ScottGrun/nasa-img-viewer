<script lang="ts">
	import { page } from '$app/state';
	import CategoryPill from '#lib/components/CategoryCarousel/CategoryPill.svelte';
	import Masonary from '#lib/components/Masonary/Masonary.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const images = $derived(data.images);

	const categories = [
		{
			label: 'Apollo 11',
			query: 'q=Apollo 11',
			imageUrl: 'https://images-assets.nasa.gov/image/S69-25861/S69-25861~thumb.jpg',
			description:
				'Historic first lunar landing mission including launch preparation, crew training, and the moonwalk that changed history'
		},
		{
			label: 'Lakebed',
			query: 'q=Lakebed',
			imageUrl: 'https://images-assets.nasa.gov/image/ET62-00268/ET62-00268~thumb.jpg',
			description:
				'Natural landing strips at Edwards Air Force Base used for experimental aircraft and Space Shuttle landings'
		},
		{
			label: 'Wind Tunnel',
			query: 'q=Wind tunnel',
			imageUrl: 'https://images-assets.nasa.gov/image/AC76-1511-2/AC76-1511-2~thumb.jpg',
			description:
				'Aerodynamic testing facilities where aircraft and spacecraft designs are perfected through flow visualization'
		},
		{
			label: 'Tilt Rotor',
			query: 'q=Tilt Rotor',
			imageUrl:
				'https://images-assets.nasa.gov/image/ARC-1989-AC89-0246-7/ARC-1989-AC89-0246-7~thumb.jpg',
			description:
				'Revolutionary aircraft combining helicopter hovering with fixed-wing cruise flight capabilities'
		},
		{
			label: 'Gemini',
			query: 'q=Gemini',
			imageUrl: 'https://images-assets.nasa.gov/image/S65-63194/S65-63194~thumb.jpg',
			description:
				'Two-person spacecraft program that pioneered spacewalks and orbital rendezvous before Apollo'
		},
		{
			label: 'Rovers',
			query: 'q=Rovers',
			imageUrl: 'https://images-assets.nasa.gov/image/PIA04928/PIA04928~thumb.jpg',
			description:
				'Robotic and crewed exploration vehicles designed for lunar and planetary surface operations'
		},
		{
			label: 'Chase Plane',
			query: 'q=Chase Plane',
			imageUrl: 'https://images-assets.nasa.gov/image/S77-30022/S77-30022~thumb.jpg',
			description:
				'Support aircraft that photograph and monitor experimental flights for safety and documentation'
		},
		{
			label: 'Desert Testing',
			query: 'q=Desert Testing',
			imageUrl: 'https://images-assets.nasa.gov/image/s77-28209/s77-28209~thumb.jpg',
			description:
				'Field testing of space hardware and training exercises in desert environments similar to lunar terrain'
		},
		{
			label: 'Astronauts',
			query: 'q=Astronauts',
			imageUrl: 'https://images-assets.nasa.gov/image/S69-31743/S69-31743~thumb.jpg',
			description:
				'The men and women who fly in space, from Mercury pioneers to modern space station crews'
		},
		{
			label: 'Space Shuttle',
			query: 'q=Space shuttle',
			imageUrl: 'https://images-assets.nasa.gov/image/S69-31743/S69-31743~thumb.jpg',
			description:
				"NASA's reusable spaceplane that carried crews and cargo to orbit for three decades"
		},
		{
			label: 'Navy Recovery',
			query: 'q=Navy Recovery',
			imageUrl: 'https://images-assets.nasa.gov/image/KSC-2014-3919/KSC-2014-3919~thumb.jpg',
			description:
				'Ships and helicopters that retrieved astronauts and spacecraft after ocean splashdowns'
		}
	];

	const parsedParams = $derived(page.url.searchParams.values().toArray());
</script>

<nav class="mb-3 no-scrollbar flex gap-4 overflow-x-scroll py-1">
	{#each categories as category (category.label)}
		<CategoryPill
			label={category.label}
			query={category.query}
			imageUrl={category.imageUrl}
			isActive={parsedParams.includes(category.label)}
		/>
	{/each}
</nav>
<main>
	<Masonary {images} />
</main>
