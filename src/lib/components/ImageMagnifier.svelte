<script lang="ts">
	import type { Snippet } from 'svelte';
	import { pickBySize } from '#lib/images.js';
	import {
		clampZoom,
		defaultZoom,
		minimapMarker,
		minimapOrigin,
		minimapSize,
		nativeZoom,
		nextMinimapCorner,
		visibleBox,
		wheelZoom,
		type MinimapCorner
	} from '#lib/magnifier.js';
	import type { AssetManifestItem } from '#lib/types.js';

	interface Props {
		images: AssetManifestItem[];
		/** Original pixel width from metadata, used until the original has loaded. */
		originalWidth?: number;
		children: Snippet;
	}

	const { images, originalWidth, children }: Props = $props();

	type Spot = { x: number; y: number; clientX: number; clientY: number; w: number; h: number };

	const DIAMETER = 260;
	const RADIUS = DIAMETER / 2;

	interface Connection {
		saveData?: boolean;
	}

	const hrefs = $derived(images.map((image) => image.href));
	const saveData =
		typeof navigator === 'undefined'
			? undefined
			: (navigator as Navigator & { connection?: Connection }).connection?.saveData;
	const magnifySrc = $derived(
		pickBySize(
			hrefs,
			saveData
				? ['large', 'medium', 'small', 'thumb']
				: ['orig', 'large', 'medium', 'small', 'thumb']
		)
	);

	let button: HTMLButtonElement | undefined = $state(undefined);
	let enabled = $state(true);
	/** Set on the first mouse hover; the original is not requested before that. */
	let wanted = $state(false);
	let loadedSrc: string | undefined = $state(undefined);
	let loadedWidth: number | undefined = $state(undefined);
	let failed = $state(false);
	let corner: MinimapCorner = $state('right');
	let userZoom: number | undefined = $state(undefined);
	let displaySrc: string | undefined = $state(undefined);
	/** Pointer position relative to the image plus the image's size; null hides the glass. */
	let spot = $state<Spot | null>(null);

	const native = $derived(nativeZoom(loadedWidth ?? originalWidth, spot?.w));
	const zoom = $derived(clampZoom(userZoom ?? defaultZoom(native), native));
	const active = $derived(enabled && spot !== null);
	const loading = $derived(wanted && !loadedSrc && !failed);

	const isMouse = (event: PointerEvent) =>
		event.pointerType === 'mouse' || event.pointerType === 'pen';

	const track = (clientX: number, clientY: number) => {
		if (!button) return;
		const rect = button.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return;
		displaySrc = button.querySelector('img')?.currentSrc || displaySrc;
		spot = {
			x: clientX - rect.left,
			y: clientY - rect.top,
			clientX,
			clientY,
			w: rect.width,
			h: rect.height
		};
		const visible = visibleBox(
			{ left: rect.left, top: rect.top, w: rect.width, h: rect.height },
			{ w: document.documentElement.clientWidth, h: document.documentElement.clientHeight }
		);
		if (visible) {
			corner = nextMinimapCorner(
				corner,
				{ cx: clientX, cy: clientY, r: RADIUS },
				visible,
				minimapSize({ w: rect.width, h: rect.height })
			);
		}
	};

	const onPointer = (event: PointerEvent) => {
		if (!isMouse(event)) return;
		wanted = true;
		track(event.clientX, event.clientY);
	};

	const onLeave = (event: PointerEvent) => {
		if (isMouse(event)) spot = null;
	};

	const onClick = (event: MouseEvent) => {
		if ((event as PointerEvent).pointerType === 'touch') return;
		enabled = !enabled;
	};

	// Load the high-resolution version once, after the first hover.
	$effect(() => {
		const src = magnifySrc;
		if (!wanted || !src) return;
		let stale = false;
		const img = new Image();
		img.src = src;
		img
			.decode()
			.then(() => {
				if (stale) return;
				loadedWidth = img.naturalWidth;
				loadedSrc = src;
			})
			.catch(() => {
				if (!stale) failed = true;
			});
		return () => {
			stale = true;
		};
	});

	// Non-passive wheel listener so the page can be kept from scrolling while the glass is active.
	$effect(() => {
		const el = button;
		if (!el) return;
		const onWheel = (event: WheelEvent) => {
			if (!enabled || spot === null) return;
			event.preventDefault();
			track(event.clientX, event.clientY);
			userZoom = wheelZoom(zoom, event.deltaY, native);
		};
		el.addEventListener('wheel', onWheel, { passive: false });
		return () => el.removeEventListener('wheel', onWheel);
	});

	// The image moves under a still mouse when the page scrolls or resizes: hide until the next move.
	$effect(() => {
		const hide = () => (spot = null);
		window.addEventListener('scroll', hide, { passive: true });
		window.addEventListener('resize', hide);
		window.addEventListener('blur', hide);
		document.documentElement.addEventListener('mouseleave', hide);
		return () => {
			window.removeEventListener('scroll', hide);
			window.removeEventListener('resize', hide);
			window.removeEventListener('blur', hide);
			document.documentElement.removeEventListener('mouseleave', hide);
		};
	});
</script>

<button
	bind:this={button}
	type="button"
	aria-label="Toggle image magnifier"
	aria-pressed={enabled}
	class="m-0 block w-full border-0 bg-transparent p-0 {active
		? 'cursor-none'
		: enabled
			? 'cursor-default'
			: 'cursor-zoom-in'}"
	onpointerenter={onPointer}
	onpointermove={onPointer}
	onpointerleave={onLeave}
	onclick={onClick}
>
	{@render children()}
</button>

{#if active && spot}
	{@const display = { w: spot.w, h: spot.h }}
	{@const map = minimapSize(display)}
	{@const marker = minimapMarker(spot, display, zoom, DIAMETER, map)}
	{@const visible = visibleBox(
		{ left: spot.clientX - spot.x, top: spot.clientY - spot.y, w: spot.w, h: spot.h },
		{ w: document.documentElement.clientWidth, h: document.documentElement.clientHeight }
	)}
	{@const origin = visible ? minimapOrigin(visible, map, corner) : undefined}
	{#if origin && displaySrc}
		<div
			aria-hidden="true"
			data-testid="magnifier-minimap"
			class="pointer-events-none fixed top-0 left-0 z-40 overflow-hidden rounded-md border border-white bg-neutral-50 shadow-lg ring-1 ring-black/20"
			style="width:{map.w}px;height:{map.h}px;transform:translate({origin.left}px,{origin.top}px)"
		>
			<img src={displaySrc} alt="" class="block size-full max-w-none" />
			<div
				data-testid="magnifier-marker"
				class="absolute top-0 left-0 rounded-full border-2 border-white outline outline-1 outline-black/60"
				style="width:{marker.d}px;height:{marker.d}px;transform:translate({marker.cx -
					marker.d / 2}px,{marker.cy - marker.d / 2}px);box-shadow:0 0 0 999px rgba(0,0,0,0.45)"
			></div>
		</div>
	{/if}
	{@const shown = loadedSrc ?? displaySrc}
	<div
		aria-hidden="true"
		data-testid="magnifier-glass"
		class="pointer-events-none fixed top-0 left-0 z-50 overflow-hidden rounded-full border-4 border-white bg-neutral-50 shadow-xl ring-1 ring-black/20"
		style="width:{DIAMETER}px;height:{DIAMETER}px;transform:translate({spot.clientX -
			RADIUS}px,{spot.clientY - RADIUS}px)"
	>
		{#if shown}
			<img
				src={shown}
				alt=""
				class="absolute top-0 left-0 max-w-none select-none"
				style="width:{spot.w * zoom}px;height:{spot.h * zoom}px;transform:translate({RADIUS -
					spot.x * zoom}px,{RADIUS - spot.y * zoom}px)"
			/>
		{/if}
		{#if loading}
			<div
				class="absolute right-3 bottom-3 size-5 animate-spin rounded-full border-2 border-white/40 border-t-white drop-shadow"
			></div>
		{/if}
	</div>
{/if}
