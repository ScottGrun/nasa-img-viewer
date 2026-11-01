<script lang="ts">
	import type { HTMLImgAttributes } from 'svelte/elements';
	import { twMerge } from 'tailwind-merge';
	import { pickPreviewSources } from '#lib/images.js';
	import type { AssetManifestItem } from '#lib/types.js';

	interface Props extends Omit<HTMLImgAttributes, 'class'> {
		class?: string;
		images?: AssetManifestItem[];
		aspectRatio?: number;
	}

	const { class: className, images, aspectRatio, ...rest }: Props = $props();
	// Derived from the prop, but overwritten with the measured ratio once the image loads
	let naturalAspectRatio = $derived(aspectRatio ?? 16 / 9);
	let imageElement: HTMLImageElement | undefined = $state(undefined);
	let imageLoaded = $state(false);

	const onLoad = () => {
		if (imageElement) {
			naturalAspectRatio = imageElement.naturalWidth / imageElement.naturalHeight;
			imageLoaded = true;
		}
	};

	// Asset manifest: large on wide screens, medium otherwise. ~orig is only a last resort.
	const hrefs = $derived((images ?? []).map((img) => img.href));
	const sources = $derived(pickPreviewSources(hrefs));
	const large = $derived(sources.large);
	const medium = $derived(sources.medium);
</script>

<div
	style={`aspect-ratio:${naturalAspectRatio}`}
	class={twMerge('relative overflow-hidden bg-neutral-50', className)}
>
	{#if images && images.length > 0}
		<picture>
			{#if large}
				<source media="(min-width: 768px)" srcset={large} />
			{/if}
			{#if medium}
				<img
					bind:this={imageElement}
					onload={onLoad}
					src={medium}
					{...rest}
					class={twMerge(
						'absolute top-0 left-0 h-full w-full object-cover opacity-0 transition-all duration-600 ease-in',
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
				'absolute top-0 left-0 h-full w-full object-cover opacity-0 transition-all duration-300 ease-in',
				imageLoaded && 'relative opacity-100',
				className
			)}
		/>
	{/if}
</div>
