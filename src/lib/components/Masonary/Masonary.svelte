<script lang="ts">
	import { twMerge } from 'tailwind-merge';

	type MasonaryImage = {
		url: string;
		description: string;
	};

	interface Props {
		images: MasonaryImage[];
		class?: string;
	}

	const { images, class: className }: Props = $props();
</script>

<div class={twMerge('columns-2 gap-2 lg:columns-3', className)}>
	{#each images as image}
		<img
			src={image.url}
			alt={image.description ?? 'description unavailable'}
			class="mb-2 w-full rounded-xl"
		/>
	{/each}
</div>
