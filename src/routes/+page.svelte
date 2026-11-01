<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { Snapshot } from './$types';
	import InfiniteGallery, { type Loaded } from '#lib/components/InfiniteGallery.svelte';
	import DateRangeSlider from '#lib/components/DateRangeSlider.svelte';
	import { effectiveRange, parseYearParams, withoutYears } from '#lib/years.js';
	import CategoryPill from '#lib/components/CategoryCarousel/CategoryPill.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Infinite scroll state, restored on Back. It only applies while the search matches the URL.
	let loaded = $state<Loaded | undefined>(undefined);

	export const snapshot: Snapshot<Loaded | undefined> = {
		capture: () => $state.snapshot(loaded),
		restore: (value) => {
			loaded = value;
		}
	};

	const searchTerm = $derived(
		page.url.searchParams.get('q') ||
			([...page.url.searchParams].find(
				([name, value]) => value && !['year_start', 'year_end', 'page'].includes(name)
			)?.[1] ??
				'')
	);

	// Pills and the header search keep the chosen years
	const yearQuery = $derived(
		['year_start', 'year_end']
			.filter((name) => page.url.searchParams.has(name))
			.map((name) => `&${name}=${encodeURIComponent(page.url.searchParams.get(name) ?? '')}`)
			.join('')
	);
	const maxYear = new Date().getFullYear();
	const yearsSet = $derived.by(() => {
		const { start, end } = parseYearParams(page.url.searchParams, maxYear);
		return start !== undefined || end !== undefined;
	});
	const resetSearch = $derived(withoutYears(page.url.searchParams));
	const range = $derived(effectiveRange(page.url.searchParams, maxYear));
	const emptyMessage = $derived(
		(searchTerm ? `No images found for "${searchTerm}"` : 'No images found') +
			(yearsSet ? ` between ${range.start} and ${range.end}` : '')
	);
	const title = $derived(searchTerm ? `${searchTerm} | NASA Image Viewer` : 'NASA Image Viewer');

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

<svelte:head>
	<title>{title}</title>
</svelte:head>

<nav class="mb-3 no-scrollbar flex gap-4 overflow-x-scroll py-1">
	{#each categories as category (category.label)}
		<CategoryPill
			label={category.label}
			query={category.query + yearQuery}
			imageUrl={category.imageUrl}
			isActive={parsedParams.includes(category.label)}
		/>
	{/each}
</nav>
<DateRangeSlider />
<main>
	<InfiniteGallery
		key={page.url.search}
		query={page.url.search}
		images={data.images}
		hasMore={data.hasMore}
		bind:loaded
	>
		{#snippet empty()}
			<div class="py-16 text-center">
				<p class="text-lg font-semibold text-primary-dark">
					{emptyMessage}
				</p>
				<a
					href={yearsSet && resetSearch ? resolve(`/?${resetSearch}`) : resolve('/')}
					class="mt-4 inline-block text-sm font-semibold text-primary-dark transition-colors hover:text-nasa-red"
					>{yearsSet ? 'Reset years' : 'Back to home'}</a
				>
			</div>
		{/snippet}
	</InfiniteGallery>
</main>
