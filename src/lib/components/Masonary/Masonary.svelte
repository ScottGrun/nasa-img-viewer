<script lang="ts">
	type MasonaryImage = {
		url: string;
		description: string;
	};

	interface Props {
		images: MasonaryImage[];
	}

	const { images }: Props = $props();
</script>

<div class="columns-2 gap-2 lg:columns-3">
	{#each images as image}
		<img
			src={image.url}
			alt={image.description ?? 'description unavailable'}
			class="mb-2 w-full rounded-xl"
		/>
	{/each}
</div>
