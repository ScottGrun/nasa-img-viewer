<script lang="ts" context="module">
	export interface MasonaryImageProps {
		description: string;
		url: string;
		nasaId: string;
		title: string;
		class?: string;
	}
</script>

<script lang="ts">
	import { twMerge } from 'tailwind-merge';
	import Image from '../Image.svelte';

	const { url, description, nasaId, title, class: className }: MasonaryImageProps = $props();
</script>

<div class={twMerge('relative w-fit overflow-hidden rounded-xl', className)}>
	<Image src={url} alt={description} aria-labelledby={nasaId} class="w-full" />
	<div
		class="group absolute bottom-0 z-10 flex h-full w-full flex-col bg-masonary-image-gradient p-5 font-semibold text-white opacity-0 transition-opacity duration-300 hover:opacity-100"
	>
		<a href={`/image/${nasaId}`} id={nasaId} class="mt-auto text-sm">{title}</a>
		<p class="line-clamp-3 text-xs font-medium" aria-hidden="true">
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
