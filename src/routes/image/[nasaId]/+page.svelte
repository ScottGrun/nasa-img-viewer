<script lang="ts">
	import Image from '$lib/components/Image.svelte';
	import ImageTag from '$lib/components/ImageTag.svelte';
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
	const aspectRatio =
		Number(data.metadata['EXIF:ImageWidth'] ?? 16) / Number(data.metadata['EXIF:ImageHeight'] ?? 9);
</script>

<main class="relative">
	<Image
		images={data.asset.items}
		alt={data.metadata['EXIF:ImageDescription']}
		class="mx-auto block w-full rounded-lg "
		loading="eager"
		fetchpriority="high"
		{aspectRatio}
	/>
	<h1 class=" mt-8 text-2xl font-semibold text-neutral-900">
		{data.metadata['AVAIL:Title']}
	</h1>
	<span class="mb-2 block text-base font-semibold text-neutral-500"
		>{data.metadata['AVAIL:Photographer']}</span
	>
	<p class="prose max-w-none text-neutral-900">{@html data.metadata['AVAIL:Description']}</p>
	<div class="mt-6 flex flex-wrap gap-3">
		{#each keywords as keyword}
			<ImageTag {keyword} />
		{/each}
	</div>
</main>

<RelatedImageGallery {keywords} parentImageId={data.metadata['AVAIL:NASAID'] ?? ''} />
