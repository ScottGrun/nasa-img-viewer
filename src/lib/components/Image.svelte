<script lang="ts">
	import type { HTMLImgAttributes } from 'svelte/elements';
	import { twMerge } from 'tailwind-merge';

	interface Props extends HTMLImgAttributes {
		images?: AssetManifestItem[];
		aspectRatio?: number;
	}

	const { class: className, images, aspectRatio = 16 / 9, ...rest }: Props = $props();
	let naturalAspectRatio = $state(aspectRatio);
	let imageElement: HTMLImageElement | undefined = $state(undefined);
	let imageLoaded = $state(false);

	const onLoad = () => {
		if (imageElement) {
			naturalAspectRatio = imageElement.naturalWidth / imageElement.naturalHeight;
			imageLoaded = true;
		}
	};

	import type { AssetManifestItem } from '$lib/types';

	// Function to get image by size suffix
	const getImageBySize = (suffix: string) => {
		return (
			images && images.find((img) => img.href.includes(suffix) && !img.href.includes('tif'))?.href
		);
	};

	// Get different image sizes
	const large = getImageBySize('~orig') ?? getImageBySize('~large');
	const medium = getImageBySize('~medium');
	const small = getImageBySize('~small');
	const thumbnail = getImageBySize('~thumb');

	// Default fallback if no other sizes are available
	const fallback = small || medium || large || thumbnail;
</script>

<div
	style={`aspect-ratio:${naturalAspectRatio}`}
	class={twMerge('relative overflow-hidden bg-neutral-50', className)}
>
	{#if images && images.length > 0}
		<picture>
			<!-- Large screens -->
			{#if large}
				<source media="(min-width: 1200px)" srcset={large} />
			{/if}

			<!-- Medium screens -->
			{#if medium}
				<source media="(min-width: 768px)" srcset={medium} />
			{/if}

			<!-- Small screens -->
			{#if small}
				<source media="(min-width: 480px)" srcset={small} />
			{/if}

			<!-- Fallback image -->
			{#if Boolean(fallback)}
				<img
					bind:this={imageElement}
					onload={onLoad}
					{...rest}
					class={twMerge(
						'duration-600 absolute left-0 top-0 h-full w-full object-cover opacity-0 transition-all ease-in',
						imageLoaded && 'relative opacity-100',
						className
					)}
				/>
			{/if}
		</picture>
	{:else}
		<img
			bind:this={imageElement}
			onload={onLoad}
			{...rest}
			class={twMerge(
				'absolute left-0 top-0 h-full w-full object-cover opacity-0 transition-all duration-300 ease-in',
				imageLoaded && 'relative opacity-100',
				className
			)}
		/>
	{/if}
</div>
