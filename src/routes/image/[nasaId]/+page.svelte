<script lang="ts">
	import Image from '$lib/components/Image.svelte';
	import ImageTag from '$lib/components/ImageTag.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	const keywords = data.metadata['AVAIL:Keywords'] ?? [];
	const aspectRatio =
		Number(data.metadata['EXIF:ImageWidth']) / Number(data.metadata['EXIF:ImageHeight']);
</script>

<main class="relative">
	<Image
		images={data.asset.items}
		alt={data.metadata['EXIF:ImageDescription']}
		class="mx-auto block w-full rounded-lg xl:max-h-[900px] xl:w-auto"
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
