<script lang="ts">
	import ImageTag from '$lib/components/ImageTag.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	const probableHighResImageUrl = data.asset.items.find((el) => el.href.includes('.jpg'))?.href;
	const keywords = data.metadata['AVAIL:Keywords'] ?? [];
	console.log(data.metadata);
</script>

<main class="relative">
	<span class="mb-6 block text-base font-semibold text-neutral-900"
		>{data.metadata['AVAIL:Photographer']}</span
	>
	<img src={probableHighResImageUrl} alt="" class=" mx-auto rounded-lg xl:max-h-[600px]" />
	<h1 class="mb-2 mt-8 text-2xl font-semibold text-neutral-900">{data.metadata['AVAIL:Title']}</h1>
	<p class="text-neutral-900">{data.metadata['AVAIL:Description']}</p>
	<div class="mt-6 flex flex-wrap gap-3">
		{#each keywords as keyword}
			<ImageTag {keyword} />
		{/each}
	</div>
</main>
