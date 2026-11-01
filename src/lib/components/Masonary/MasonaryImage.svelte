<script lang="ts" module>
	import type { GalleryImage } from '#lib/images.js';

	export interface MasonaryImageProps extends GalleryImage {
		class?: string;
	}
</script>

<script lang="ts">
	import { resolve } from '$app/paths';
	import { twMerge } from 'tailwind-merge';
	import { preloadNow, preloadOnIntent } from '#lib/preload.js';
	import Image from '../Image.svelte';

	const {
		src,
		srcset,
		width,
		height,
		description,
		nasaId,
		title,
		preview,
		class: className
	}: MasonaryImageProps = $props();

	// Mouse hover or keyboard focus only: touch events also fire while scrolling
	let cancelPreload: (() => void) | undefined;
	const startPreload = () => {
		cancelPreload?.();
		cancelPreload = preloadOnIntent(preview);
	};
	const stopPreload = () => {
		cancelPreload?.();
		cancelPreload = undefined;
	};
</script>

<div class={twMerge('relative w-fit overflow-hidden rounded-md', className)}>
	<Image
		{src}
		{srcset}
		{width}
		{height}
		sizes="(min-width: 1440px) 474px, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
		loading="lazy"
		decoding="async"
		aspectRatio={width && height ? width / height : undefined}
		alt={description}
		aria-labelledby={nasaId}
		class="w-full"
	/>
	<div
		class="group absolute bottom-0 z-10 flex h-full w-full flex-col bg-masonary-image-gradient p-5 font-semibold text-white opacity-0 transition-opacity duration-300 hover:opacity-100"
	>
		<a
			href={resolve('/image/[nasaId]', { nasaId })}
			id={nasaId}
			class="mt-auto text-sm font-bold"
			onpointerenter={(e) => e.pointerType === 'mouse' && startPreload()}
			onpointerleave={stopPreload}
			onpointerdown={() => preloadNow(preview)}
			onfocus={(e) => e.currentTarget.matches(':focus-visible') && startPreload()}
			onblur={stopPreload}>{title}</a
		>
		<p class="mt-1 line-clamp-3 text-xs font-normal" aria-hidden="true">
			{description}
		</p>
	</div>
</div>

<style>
	a::after {
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
	}
</style>
