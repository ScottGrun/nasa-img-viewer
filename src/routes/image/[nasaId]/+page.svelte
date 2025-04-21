<script lang="ts">
	import Image from '$lib/components/Image.svelte';
	import ImageTag from '$lib/components/ImageTag.svelte';
	import { twMerge } from 'tailwind-merge';
	import type { PageData } from './$types';
	import RelatedImageGallery from './RelatedImageGallery.svelte';
	import { formatExifDate, stripUnsafeUrlChars } from '$lib/helpers';

	interface Props {
		data: PageData;
	}
	let { data }: Props = $props();
	const { asset, metadata } = data;

	const keywords = (metadata['AVAIL:Keywords'] ?? []).map((keyword) =>
		stripUnsafeUrlChars(keyword)
	);
	const width = Number(metadata['EXIF:ImageWidth'] ?? metadata['File:ImageWidth'] ?? 16);
	const height = Number(metadata['EXIF:ImageHeight'] ?? metadata['File:ImageHeight'] ?? 9);

	const photographer = metadata['AVAIL:Photographer'];
	const location = metadata['AVAIL:Location'];
	const date = metadata['EXIF:DateTimeOriginal'] ?? metadata['Composite:DateTimeOriginal'];
	const year = date ? date?.split(':')[0] : undefined;
</script>

{#snippet imageInfo(name: string, value?: string, link?: string)}
	{#if Boolean(value)}
		<div>
			<span class="block font-mono text-xs text-neutral-600">{name}</span>
			{#if link}
				<a
					href={link}
					class="mt-2 block text-sm font-semibold text-primary-dark transition-colors hover:text-nasa-red"
					>{value}</a
				>
			{:else}
				<span class="mt-2 block text-sm font-semibold text-primary-dark">{value}</span>
			{/if}
		</div>
	{/if}
{/snippet}

<div class="pb-6">
	<h1 class={twMerge('mb-2 text-2xl font-extrabold text-primary-dark')}>
		{metadata['AVAIL:Title']}
	</h1>
	<main class={twMerge('grid gap-4', 'lg:grid-cols-[1fr_400px]')}>
		<div>
			<Image
				images={asset.items}
				alt={metadata['EXIF:ImageDescription']}
				class="mx-auto  block rounded-lg"
				loading="eager"
				fetchpriority="high"
				aspectRatio={width / height}
			/>
		</div>

		<div>
			<p class=" prose-sm mb-6 max-w-none text-base text-neutral-800">
				{@html metadata['AVAIL:Description']}
			</p>
			<div class="mt-2 flex flex-wrap gap-8">
				{@render imageInfo(
					'Photographer',
					photographer,
					photographer && `/?photographer=${stripUnsafeUrlChars(photographer)}`
				)}
				{@render imageInfo('Album', metadata['AVAIL:Album'][0])}
				{@render imageInfo(
					'Location',
					location,
					location && `/?location=${stripUnsafeUrlChars(location)}`
				)}
				{@render imageInfo(
					'Date',
					formatExifDate(date),
					year && `/?year_start=${year}&year_end=${year}`
				)}
			</div>
			<div class="mt-6 flex flex-wrap gap-3">
				{#each keywords as keyword}
					<ImageTag {keyword} />
				{/each}
			</div>
		</div>
	</main>
	<RelatedImageGallery {keywords} parentImageId={metadata['AVAIL:NASAID'] ?? ''} class="mt-6" />
</div>
