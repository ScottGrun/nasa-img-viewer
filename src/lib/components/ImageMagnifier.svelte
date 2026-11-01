<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import {
		clampLens,
		clampZoom,
		DEFAULT_LENS,
		defaultZoom,
		minimapMarker,
		minimapOrigin,
		minimapSize,
		nativeZoom,
		nextMinimapCorner,
		visibleBox,
		wheelLens,
		wheelZoom,
		type MinimapCorner
	} from '#lib/magnifier.js';

	interface Props {
		/** Image shown in the glass: the sharpest version loaded so far. */
		src: string;
		/** Image for the minimap thumbnail; an already loaded one, never the original. */
		thumbSrc: string;
		/** Pixel width of `src`'s full-resolution image, as far as is known. */
		sourceWidth?: number;
		/** Whether a sharper version is still on its way. */
		loading?: boolean;
		/** Appended to the hint while the glass is on. */
		hintExtra?: string;
		/** While true (e.g. during an entrance animation) the glass stays off. */
		suspended?: boolean;
		children: Snippet;
	}

	const {
		src,
		thumbSrc,
		sourceWidth,
		loading = false,
		hintExtra = '',
		suspended = false,
		children
	}: Props = $props();

	type Spot = { x: number; y: number; clientX: number; clientY: number; w: number; h: number };

	const viewport = () => ({
		w: document.documentElement.clientWidth,
		h: document.documentElement.clientHeight
	});
	const fadeMs = () =>
		typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
			? 0
			: 200;

	let button: HTMLButtonElement | undefined = $state(undefined);
	let enabled = $state(true);
	let corner: MinimapCorner = $state('right');
	/** Glass diameter the user chose; persists until the image changes. */
	let lens = $state(DEFAULT_LENS);
	let userZoom: number | undefined = $state(undefined);
	/** Pointer position relative to the image plus the image's size; null hides the glass. */
	let spot = $state<Spot | null>(null);

	const native = $derived(nativeZoom(sourceWidth, spot?.w));
	const zoom = $derived(clampZoom(userZoom ?? defaultZoom(native), native));
	const active = $derived(enabled && spot !== null);

	const isMouse = (event: PointerEvent) =>
		event.pointerType === 'mouse' || event.pointerType === 'pen';

	const track = (clientX: number, clientY: number) => {
		if (!button) return;
		const rect = button.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return;
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
				{ cx: clientX, cy: clientY, r: clampLens(lens, viewport()) / 2 },
				visible,
				minimapSize({ w: rect.width, h: rect.height })
			);
		}
	};

	const onPointer = (event: PointerEvent) => {
		if (suspended || !isMouse(event)) return;
		track(event.clientX, event.clientY);
	};

	/** Shows the glass at a known mouse position without waiting for the next move. */
	export const activateAt = (clientX: number, clientY: number) => {
		if (suspended || !button) return;
		const rect = button.getBoundingClientRect();
		const inside =
			clientX >= rect.left &&
			clientX <= rect.right &&
			clientY >= rect.top &&
			clientY <= rect.bottom;
		if (inside) track(clientX, clientY);
	};

	const onLeave = (event: PointerEvent) => {
		if (isMouse(event)) spot = null;
	};

	const onClick = (event: MouseEvent) => {
		if ((event as PointerEvent).pointerType === 'touch') return;
		enabled = !enabled;
	};

	// Non-passive wheel listener so the page can be kept from scrolling while the glass is active.
	$effect(() => {
		const el = button;
		if (!el) return;
		const onWheel = (event: WheelEvent) => {
			if (suspended || !enabled || spot === null) return;
			event.preventDefault();
			if (event.ctrlKey || event.metaKey) lens = wheelLens(lens, event.deltaY, viewport());
			else userZoom = wheelZoom(zoom, event.deltaY, native);
			track(event.clientX, event.clientY);
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
	class="m-0 block h-full w-full border-0 bg-transparent p-0 {active
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

{#if spot}
	{@const hintBox = visibleBox(
		{ left: spot.clientX - spot.x, top: spot.clientY - spot.y, w: spot.w, h: spot.h },
		viewport()
	)}
	{#if hintBox}
		<div
			aria-hidden="true"
			data-testid="magnifier-hint"
			transition:fade={{ duration: fadeMs() }}
			class="pointer-events-none fixed top-0 left-0 z-30 rounded-full bg-black/55 px-3 py-1 text-xs whitespace-nowrap text-white/90"
			style="transform:translate({hintBox.left + 12}px,{hintBox.top + 12}px)"
		>
			{enabled
				? `Scroll to zoom · Ctrl + scroll to resize · Click to turn off${hintExtra}`
				: 'Click to turn on magnifier'}
		</div>
	{/if}
{/if}

{#if active && spot}
	{@const diameter = clampLens(lens, viewport())}
	{@const radius = diameter / 2}
	{@const display = { w: spot.w, h: spot.h }}
	{@const map = minimapSize(display)}
	{@const marker = minimapMarker(spot, display, zoom, diameter, map)}
	{@const visible = visibleBox(
		{ left: spot.clientX - spot.x, top: spot.clientY - spot.y, w: spot.w, h: spot.h },
		{ w: document.documentElement.clientWidth, h: document.documentElement.clientHeight }
	)}
	{@const origin = visible ? minimapOrigin(visible, map, corner) : undefined}
	{#if origin}
		<div
			aria-hidden="true"
			data-testid="magnifier-minimap"
			class="pointer-events-none fixed top-0 left-0 z-40 overflow-hidden rounded-md border border-white bg-neutral-50 shadow-lg ring-1 ring-black/20"
			style="width:{map.w}px;height:{map.h}px;transform:translate({origin.left}px,{origin.top}px)"
		>
			<img src={thumbSrc} alt="" class="block size-full max-w-none" />
			<div
				data-testid="magnifier-marker"
				class="absolute top-0 left-0 rounded-full border-2 border-white outline outline-1 outline-black/60"
				style="width:{marker.d}px;height:{marker.d}px;transform:translate({marker.cx -
					marker.d / 2}px,{marker.cy - marker.d / 2}px);box-shadow:0 0 0 999px rgba(0,0,0,0.45)"
			></div>
		</div>
	{/if}
	<div
		aria-hidden="true"
		data-testid="magnifier-glass"
		class="pointer-events-none fixed top-0 left-0 z-50 overflow-hidden rounded-full border-4 border-white bg-neutral-50 shadow-xl ring-1 ring-black/20"
		style="width:{diameter}px;height:{diameter}px;transform:translate({spot.clientX -
			radius}px,{spot.clientY - radius}px)"
	>
		<img
			{src}
			alt=""
			class="absolute top-0 left-0 max-w-none select-none"
			style="width:{spot.w * zoom}px;height:{spot.h * zoom}px;transform:translate({radius -
				spot.x * zoom}px,{radius - spot.y * zoom}px)"
		/>
		{#if loading}
			<div
				class="absolute right-3 bottom-3 size-5 animate-spin rounded-full border-2 border-white/40 border-t-white drop-shadow"
			></div>
		{/if}
	</div>
{/if}
