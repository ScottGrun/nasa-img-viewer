<script lang="ts">
	import { resolve } from '$app/paths';
	import Image from '#lib/components/Image.svelte';
	import ImageTag from '#lib/components/ImageTag.svelte';
	import { twMerge } from 'tailwind-merge';
	import type { PageData } from './$types';
	import RelatedImageGallery from './RelatedImageGallery.svelte';
	import { formatExifDate, stripUnsafeUrlChars } from '#lib/helpers.js';

	interface Props {
		data: PageData;
	}
	let { data }: Props = $props();
	const asset = $derived(data.asset);
	const metadata = $derived(data.metadata);

	const keywords = $derived(
		(metadata['AVAIL:Keywords'] ?? []).map((keyword) => stripUnsafeUrlChars(keyword))
	);
	const width = $derived(Number(metadata['EXIF:ImageWidth'] ?? metadata['File:ImageWidth'] ?? 16));
	const height = $derived(
		Number(metadata['EXIF:ImageHeight'] ?? metadata['File:ImageHeight'] ?? 9)
	);

	const photographer = $derived(metadata['AVAIL:Photographer']);
	const location = $derived(metadata['AVAIL:Location']);
	const date = $derived(
		metadata['EXIF:DateTimeOriginal'] ?? metadata['Composite:DateTimeOriginal']
	);
	const year = $derived(date ? date.split(':')[0] : undefined);
</script>

{#snippet imageInfo(name: string, value?: string, query?: string)}
	{#if Boolean(value)}
		<div>
			<span class="block font-mono text-xs text-neutral-600">{name}</span>
			{#if query}
				<a
					href={resolve(`/?${query}`)}
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
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- NASA API description is trusted HTML markup from the NASA Image API -->
				{@html metadata['AVAIL:Description']}
			</p>
			<div class="mt-2 flex flex-wrap gap-8">
				{@render imageInfo(
					'Photographer',
					photographer,
					photographer && `photographer=${stripUnsafeUrlChars(photographer)}`
				)}
				{@render imageInfo('Album', metadata['AVAIL:Album']?.[0])}
				{@render imageInfo(
					'Location',
					location,
					location && `location=${stripUnsafeUrlChars(location)}`
				)}
				{@render imageInfo(
					'Date',
					formatExifDate(date),
					year && `year_start=${year}&year_end=${year}`
				)}
			</div>
			<div class="mt-6 flex flex-wrap gap-3">
				{#each keywords as keyword, i (`${keyword}:${i}`)}
					<ImageTag {keyword} />
				{/each}
			</div>
		</div>
	</main>
	<!-- The gallery fetches on mount, so remount it when the displayed image changes -->
	{#key metadata['AVAIL:NASAID']}
		<RelatedImageGallery {keywords} parentImageId={metadata['AVAIL:NASAID'] ?? ''} class="mt-6" />
	{/key}
</div>
