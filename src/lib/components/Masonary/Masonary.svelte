<script lang="ts">
	import { twMerge } from 'tailwind-merge';
	import MasonaryImage, { type MasonaryImageProps } from './MasonaryImage.svelte';

	interface Props {
		images: MasonaryImageProps[];
		class?: string;
	}

	const { images, class: className }: Props = $props();
</script>

<div class={twMerge('columns-2 gap-2 lg:columns-3', className)}>
	{#each images as image}
		<MasonaryImage {...image} class="mb-2 w-full rounded-xl" />
	{/each}
</div>
