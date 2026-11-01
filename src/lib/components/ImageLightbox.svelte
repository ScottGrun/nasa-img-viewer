<script lang="ts">
	import { pickBySize } from '#lib/images.js';
	import { fitSize, LIGHTBOX_BACKGROUND } from '#lib/magnifier.js';
	import type { AssetManifestItem } from '#lib/types.js';
	import ImageMagnifier from './ImageMagnifier.svelte';

	type Rect = { left: number; top: number; width: number; height: number };

	interface Props {
		images: AssetManifestItem[];
		alt?: string;
		/** Original pixel width from metadata, used until the original has loaded. */
		originalWidth?: number;
		/** The already loaded image from the page, shown instantly while the original loads. */
		initial: {
			src: string;
			aspect: number;
			/** The page image's rect when opened, the start of the entrance animation. */
			rect?: Rect;
			/** Mouse position at the opening click, if it was a mouse. */
			pointer?: { x: number; y: number };
		};
		/** The page image's current rect, where the exit animation lands. */
		targetRect?: () => Rect | undefined;
		onclose: () => void;
	}

	const { images, alt = '', originalWidth, initial, targetRect, onclose }: Props = $props();

	interface Connection {
		saveData?: boolean;
	}

	let dialog: HTMLDialogElement | undefined = $state(undefined);
	let viewportW = $state(window.innerWidth);
	let viewportH = $state(window.innerHeight);
	let loadedSrc: string | undefined = $state(undefined);
	let loadedWidth: number | undefined = $state(undefined);
	let failed = $state(false);
	/** True during the entrance animation: the original is not swapped in and the glass stays off. */
	let animating = $state(true);
	/** True once closing has started: the glass is gone and further close requests are ignored. */
	let closing = $state(false);
	let entrance: Animation[] = [];
	let overlay: HTMLDivElement | undefined = $state(undefined);
	let closeButtonEl: HTMLButtonElement | undefined = $state(undefined);
	let pictureEl: HTMLDivElement | undefined = $state(undefined);
	let magnifier: ReturnType<typeof ImageMagnifier> | undefined = $state(undefined);

	const saveData = (navigator as Navigator & { connection?: Connection }).connection?.saveData;
	const hrefs = $derived(images.map((image) => image.href));
	const sharpSrc = $derived(
		pickBySize(
			hrefs,
			saveData
				? ['large', 'medium', 'small', 'thumb']
				: ['orig', 'large', 'medium', 'small', 'thumb']
		)
	);

	const shownSrc = $derived(animating ? initial.src : (loadedSrc ?? initial.src));
	const sourceWidth = $derived(loadedWidth ?? originalWidth);
	const loading = $derived(!loadedSrc && !failed);
	const size = $derived(fitSize(initial.aspect, { w: viewportW, h: viewportH }, sourceWidth));

	const isUsable = (rect: Rect | undefined): rect is Rect =>
		rect !== undefined &&
		rect.width > 0 &&
		rect.height > 0 &&
		rect.left < window.innerWidth &&
		rect.top < window.innerHeight &&
		rect.left + rect.width > 0 &&
		rect.top + rect.height > 0;

	/** Transform that maps the picture's laid-out rect onto `rect`. */
	const transformTo = (rect: Rect, layout: DOMRect) =>
		`translate(${rect.left - layout.left}px, ${rect.top - layout.top}px) scale(${rect.width / layout.width}, ${rect.height / layout.height})`;

	// Modal dialog: top layer, focus trap, inert page, Esc and focus return come from the platform.
	// Page scroll is locked while open and restored afterwards. The picture grows from the page
	// image's rect (FLIP, transform only) while the backdrop and close button fade in.
	$effect(() => {
		const el = dialog;
		const picture = pictureEl;
		if (!el || !picture) return;
		const root = document.documentElement;
		const scrollY = window.scrollY;
		const previousOverflow = root.style.overflow;
		root.style.overflow = 'hidden';
		let stale = false;
		let lastPointer = initial.pointer;
		const onMove = (event: PointerEvent) => {
			if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
				lastPointer = { x: event.clientX, y: event.clientY };
			}
		};
		window.addEventListener('pointermove', onMove, { passive: true });

		el.showModal();
		const to = picture.getBoundingClientRect();
		const from = initial.rect;
		const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const ease = 'cubic-bezier(0.2, 0, 0, 1)';
		const fadeKeys = [{ opacity: 0 }, { opacity: 1 }];
		const animations: Animation[] = [];
		let duration = 280;
		if (reduced) {
			duration = 80;
			animations.push(picture.animate(fadeKeys, { duration, easing: 'linear' }));
		} else if (isUsable(from) && to.width > 0 && to.height > 0) {
			const transform = transformTo(from, to);
			animations.push(
				picture.animate([{ transform }, { transform: 'none' }], { duration, easing: ease })
			);
		} else {
			duration = 180;
			animations.push(
				picture.animate(
					[
						{ opacity: 0, transform: 'scale(0.96)' },
						{ opacity: 1, transform: 'none' }
					],
					{ duration, easing: ease }
				)
			);
		}
		for (const target of [overlay, closeButtonEl]) {
			if (target) animations.push(target.animate(fadeKeys, { duration, easing: 'linear' }));
		}

		entrance = animations;
		Promise.all(animations.map((animation) => animation.finished))
			.then(() => {
				if (stale) return;
				animating = false;
				// The glass maths reads the picture's rect, so it waits until the picture has stopped.
				if (lastPointer) magnifier?.activateAt(lastPointer.x, lastPointer.y);
			})
			.catch(() => {
				// Cancelled by closing: nothing to do.
			});

		return () => {
			stale = true;
			for (const animation of animations) animation.cancel();
			entrance = [];
			window.removeEventListener('pointermove', onMove);
			root.style.overflow = previousOverflow;
			if (el.open) el.close();
			window.scrollTo(0, scrollY);
		};
	});

	// Swap to the original once it has decoded; a stale result (closed meanwhile) is ignored.
	$effect(() => {
		const src = sharpSrc;
		if (!src) return;
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

	// The one way out for Esc, the X button and the backdrop: the picture flies back to the page
	// image (transform only) while the backdrop and close button fade out, then the dialog closes.
	const requestClose = () => {
		const el = dialog;
		const picture = pictureEl;
		if (closing || !el || !picture) return;
		closing = true;

		// Where the picture is right now, which may be mid-entrance; then drop the entrance.
		const current = picture.getBoundingClientRect();
		for (const animation of entrance) animation.cancel();
		entrance = [];
		const layout = picture.getBoundingClientRect();
		const target = targetRect?.();

		if (matchMedia('(prefers-reduced-motion: reduce)').matches || layout.width === 0) {
			el.close();
			return;
		}

		const duration = 220;
		const easing = 'cubic-bezier(0.4, 0, 1, 1)';
		const animations: Animation[] = [];
		if (isUsable(target)) {
			animations.push(
				picture.animate(
					[{ transform: transformTo(current, layout) }, { transform: transformTo(target, layout) }],
					{ duration, easing, fill: 'forwards' }
				)
			);
		} else {
			animations.push(
				picture.animate(
					[
						{ opacity: 1, transform: 'none' },
						{ opacity: 0, transform: 'scale(0.96)' }
					],
					{ duration: 160, easing, fill: 'forwards' }
				)
			);
		}
		for (const node of [overlay, closeButtonEl]) {
			if (node) {
				animations.push(
					node.animate([{ opacity: 1 }, { opacity: 0 }], {
						duration,
						easing: 'linear',
						fill: 'forwards'
					})
				);
			}
		}
		Promise.all(animations.map((animation) => animation.finished))
			.then(() => {
				// Nothing is left behind: cancel the held end state and close in the same task.
				for (const animation of animations) animation.cancel();
				el.close();
			})
			.catch(() => {
				// Cancelled because the component went away.
			});
	};

	// Clicks that land on the backdrop (anything that is not a button) close the dialog.
	const onBackdropClick = (event: MouseEvent) => {
		if (!(event.target as Element).closest('button')) requestClose();
	};

	// Esc: take over from the platform's instant close.
	const onCancel = (event: Event) => {
		event.preventDefault();
		requestClose();
	};
</script>

<svelte:window bind:innerWidth={viewportW} bind:innerHeight={viewportH} />

<!-- The dialog itself handles Esc natively; the click handler is a pointer-only convenience. -->
<dialog
	bind:this={dialog}
	{onclose}
	onclick={onBackdropClick}
	oncancel={onCancel}
	aria-label="Full screen image"
	class="m-0 h-screen max-h-none w-screen max-w-none items-center justify-center overflow-hidden border-0 bg-transparent p-0 backdrop:bg-transparent open:flex"
>
	<div
		bind:this={overlay}
		data-testid="lightbox-backdrop"
		class="absolute inset-0"
		style="background-color:{LIGHTBOX_BACKGROUND}"
	></div>
	<button
		bind:this={closeButtonEl}
		type="button"
		aria-label="Close full screen view"
		class="absolute top-4 right-4 z-20 flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white"
		onclick={requestClose}
	>
		<svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
		</svg>
	</button>
	<div
		bind:this={pictureEl}
		data-testid="lightbox-picture"
		class="relative"
		style="width:{size.w}px;height:{size.h}px;transform-origin:0 0"
	>
		<ImageMagnifier
			bind:this={magnifier}
			suspended={animating || closing}
			src={shownSrc}
			thumbSrc={initial.src}
			{sourceWidth}
			{loading}
			hintExtra=" · Esc to close"
		>
			<img src={shownSrc} {alt} class="block h-full w-full max-w-none select-none" />
		</ImageMagnifier>
	</div>
</dialog>
