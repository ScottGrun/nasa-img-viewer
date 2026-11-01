<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import type { Snapshot } from './$types';
	import { dedupeImages, type GalleryImage } from '#lib/images.js';
	import CategoryPill from '#lib/components/CategoryCarousel/CategoryPill.svelte';
	import Masonary from '#lib/components/Masonary/Masonary.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	interface Loaded {
		search: string;
		batches: GalleryImage[][];
		nextPage: number;
		hasMore: boolean;
	}

	// State for infinite scroll. It only applies while `search` matches the URL; otherwise the
	// freshly loaded data wins, so a new search resets without an effect.
	let loaded = $state<Loaded | undefined>(undefined);
	const initial: Loaded = $derived({
		search: page.url.search,
		batches: [dedupeImages(data.images, new Set())],
		nextPage: 2,
		hasMore: data.hasMore
	});
	const current = $derived(loaded && loaded.search === page.url.search ? loaded : initial);
	const total = $derived(current.batches.reduce((sum, batch) => sum + batch.length, 0));

	export const snapshot: Snapshot<Loaded | undefined> = {
		capture: () => $state.snapshot(current),
		restore: (value) => {
			loaded = value;
		}
	};

	let failedSearch: string | undefined = $state(undefined);
	const failed = $derived(failedSearch === page.url.search);
	let sentinel: HTMLElement | undefined = $state(undefined);
	let inFlight: { search: string; controller: AbortController } | undefined;

	const loadMore = async () => {
		const snap = current;
		if (!snap.hasMore || inFlight?.search === snap.search) return;
		inFlight?.controller.abort();
		const request = { search: snap.search, controller: new AbortController() };
		inFlight = request;

		try {
			const params = new SvelteURLSearchParams(snap.search);
			params.set('page', String(snap.nextPage));
			const res = await fetch(`/api/search?${params}`, { signal: request.controller.signal });
			if (!res.ok) throw new Error(`Request failed with ${res.status}`);
			const body = (await res.json()) as { images: GalleryImage[]; hasMore: boolean };
			// The search changed while this was in flight
			if (page.url.search !== snap.search) return;

			const seen = new Set(current.batches.flat().map((image) => image.nasaId));
			loaded = {
				search: snap.search,
				batches: [...current.batches, dedupeImages(body.images, seen)],
				nextPage: snap.nextPage + 1,
				hasMore: body.hasMore
			};
		} catch {
			if (!request.controller.signal.aborted && page.url.search === snap.search) {
				failedSearch = snap.search;
			}
		} finally {
			if (inFlight === request) inFlight = undefined;
		}
	};

	const retry = () => {
		failedSearch = undefined;
	};

	// Re-created whenever the state changes, so an observer always reports the sentinel's current
	// visibility (covering the case where a batch adds nothing new and it's still on screen).
	$effect(() => {
		// Track what should restart observation
		void [current.search, current.nextPage, current.hasMore];
		if (!sentinel || !current.hasMore || failed) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) void loadMore();
			},
			{ rootMargin: '800px 0px' }
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	});

	const searchTerm = $derived(
		page.url.searchParams.get('q') || (page.url.searchParams.values().next().value ?? '')
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
			query={category.query}
			imageUrl={category.imageUrl}
			isActive={parsedParams.includes(category.label)}
		/>
	{/each}
</nav>
<main>
	{#if total === 0}
		<div class="py-16 text-center">
			<p class="text-lg font-semibold text-primary-dark">
				{searchTerm ? `No images found for "${searchTerm}"` : 'No images found'}
			</p>
			<a
				href={resolve('/')}
				class="mt-4 inline-block text-sm font-semibold text-primary-dark transition-colors hover:text-nasa-red"
				>Back to home</a
			>
		</div>
	{:else}
		<Masonary images={current.batches.flat()} />
		<div bind:this={sentinel} aria-hidden="true"></div>
		<div class="py-6 text-center text-xs text-neutral-500">
			{#if failed}
				<span>Couldn't load more images.</span>
				<button type="button" class="ml-1 font-semibold underline" onclick={retry}>Retry</button>
			{:else if !current.hasMore}
				<span>No more images</span>
			{/if}
		</div>
	{/if}
</main>
