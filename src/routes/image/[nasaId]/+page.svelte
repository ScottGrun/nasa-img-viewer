<script lang="ts">
	import Image from '$lib/components/Image.svelte';
	import ImageTag from '$lib/components/ImageTag.svelte';
	import { twMerge } from 'tailwind-merge';
	import type { PageData } from './$types';
	import RelatedImageGallery from './RelatedImageGallery.svelte';

	interface Props {
		data: PageData;
	}

	const stripUnsafeUrlChars = (text: string): string => {
		// Replace all non-alphanumeric characters (except hyphen and underscore) with hyphens
		// Then replace multiple consecutive hyphens with a single hyphen
		// Finally trim any leading or trailing hyphens
		return text
			.replace(/[^a-zA-Z0-9-_]/g, ' ')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '');
	};

	let { data }: Props = $props();
	const keywords = (data.metadata['AVAIL:Keywords'] ?? []).map((keyword) =>
		stripUnsafeUrlChars(keyword)
	);
	const width = Number(data.metadata['EXIF:ImageWidth'] ?? data.metadata['File:ImageWidth'] ?? 16);
	const height = Number(
		data.metadata['EXIF:ImageHeight'] ?? data.metadata['File:ImageHeight'] ?? 9
	);
	const aspectRatio = width / height;
	const isPortrait = width < height;

	const photographer = data.metadata['AVAIL:Photographer'];
	const location = data.metadata['AVAIL:Location'];
	console.log(data.metadata);
</script>

{#snippet imageInfo(name: string, value?: string, link?: string)}
	{#if Boolean(value)}
		<div>
			<span class="block text-xs text-neutral-600">{name}</span>
			{#if link}
				<a href={link} class="mt-2 block text-sm font-semibold text-neutral-900">{value}</a>
			{:else}
				<span class="mt-2 block text-sm font-semibold text-neutral-900">{value}</span>
			{/if}
		</div>
	{/if}
{/snippet}

<main class={twMerge('grid gap-4', isPortrait ? 'md:grid-cols-2' : 'grid-cols-1')}>
	<Image
		images={data.asset.items}
		alt={data.metadata['EXIF:ImageDescription']}
		class="mx-auto block w-full rounded-lg "
		loading="eager"
		fetchpriority="high"
		{aspectRatio}
	/>

	<div>
		<h1 class={twMerge('text-2xl font-bold text-neutral-900', isPortrait && 'mt-0')}>
			{data.metadata['AVAIL:Title']}
		</h1>

		<p class="mb-6 max-w-none text-base text-neutral-900">
			{@html data.metadata['AVAIL:Description']}
		</p>
		<div class="mt-2 flex gap-8">
			{@render imageInfo('Photographer', photographer, `/?photographer=${photographer}`)}
			{@render imageInfo('Album', data.metadata['AVAIL:Album'])}
			{@render imageInfo('Location', location, location)}
		</div>
		<div class="mt-6 flex flex-wrap gap-3">
			{#each keywords as keyword}
				<ImageTag {keyword} />
			{/each}
		</div>
	</div>
</main>

<RelatedImageGallery {keywords} parentImageId={data.metadata['AVAIL:NASAID'] ?? ''} class="mt-6" />
