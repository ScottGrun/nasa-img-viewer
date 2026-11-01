<script lang="ts" module>
	import type { GalleryImage } from '#lib/images.js';

	export interface Loaded {
		key: string;
		batches: GalleryImage[][];
		nextPage: number;
		hasMore: boolean;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { SvelteSet, SvelteURLSearchParams } from 'svelte/reactivity';
	import { dedupeImages } from '#lib/images.js';
	import { LOAD_MORE_ROOT_MARGIN } from '#lib/infinite.js';
	import Masonary from '#lib/components/Masonary/Masonary.svelte';

	interface Props {
		/** Identifies what is being listed. Loaded state only applies while it matches. */
		key: string;
		/** Query string for /api/search, without `page`. Must be the same for every page. */
		query: string;
		images: GalleryImage[];
		hasMore: boolean;
		/** An image that must never be listed, such as the one being viewed. */
		exclude?: string;
		/** Batches loaded so far, so the route can snapshot and restore them. */
		loaded?: Loaded;
		class?: string;
		/** Shown when nothing is listed and nothing more can load. */
		empty?: Snippet;
	}

	let {
		key,
		query,
		images,
		hasMore,
		exclude,
		loaded = $bindable(undefined),
		class: className,
		empty
	}: Props = $props();

	// Loaded state only applies while `key` matches; otherwise the fresh props win, so a new
	// search or image resets without an effect.
	const initial: Loaded = $derived({
		key,
		batches: [dedupeImages(images, new SvelteSet(exclude ? [exclude] : []))],
		nextPage: 2,
		hasMore
	});
	const current = $derived(loaded && loaded.key === key ? loaded : initial);
	const total = $derived(current.batches.reduce((sum, batch) => sum + batch.length, 0));

	let failedKey: string | undefined = $state(undefined);
	const failed = $derived(failedKey === key);
	let sentinel: HTMLElement | undefined = $state(undefined);
	let inFlight: { key: string; controller: AbortController } | undefined;

	const loadMore = async () => {
		const snap = current;
		if (!snap.hasMore || inFlight?.key === snap.key) return;
		inFlight?.controller.abort();
		const request = { key: snap.key, controller: new AbortController() };
		inFlight = request;

		try {
			const params = new SvelteURLSearchParams(query);
			params.set('page', String(snap.nextPage));
			const res = await fetch(`/api/search?${params}`, { signal: request.controller.signal });
			if (!res.ok) throw new Error(`Request failed with ${res.status}`);
			const body = (await res.json()) as { images: GalleryImage[]; hasMore: boolean };
			// What is listed changed while this was in flight
			if (key !== snap.key) return;

			const seen = new SvelteSet(current.batches.flat().map((image) => image.nasaId));
			if (exclude) seen.add(exclude);
			loaded = {
				key: snap.key,
				batches: [...current.batches, dedupeImages(body.images, seen)],
				nextPage: snap.nextPage + 1,
				hasMore: body.hasMore
			};
		} catch {
			if (!request.controller.signal.aborted && key === snap.key) failedKey = snap.key;
		} finally {
			if (inFlight === request) inFlight = undefined;
		}
	};

	const retry = () => {
		failedKey = undefined;
	};

	// Abandon a request when the gallery goes away, e.g. on navigating to another image
	$effect(() => () => inFlight?.controller.abort());

	// Re-created whenever the state changes, so an observer always reports the sentinel's current
	// visibility (covering the case where a batch adds nothing new and it's still on screen).
	$effect(() => {
		// Track what should restart observation
		void [current.key, current.nextPage, current.hasMore];
		if (!sentinel || !current.hasMore || failed) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) void loadMore();
			},
			{ rootMargin: LOAD_MORE_ROOT_MARGIN }
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	});
</script>

{#if total === 0 && !current.hasMore}
	{@render empty?.()}
{:else}
	<Masonary images={current.batches.flat()} class={className} />
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
