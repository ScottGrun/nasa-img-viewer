<script lang="ts">
	import type { Snippet } from 'svelte';
	import { twMerge } from 'tailwind-merge';
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		icon?: Snippet;
	}

	let { icon, ...rest }: Props = $props();
</script>

<div class={twMerge('relative', rest.class)}>
	<input
		type="text"
		placeholder="Search image Eg. Landscape"
		{...rest}
		class={twMerge(
			'placeholder:neutral-500 w-full rounded-[4px] border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-neutral-900',
			icon && 'pr-8'
		)}
	/>
	{#if icon}
		<div class="py-auto absolute bottom-0 right-3.5 top-0 my-auto h-4 w-4">
			{@render icon()}
		</div>
	{/if}
</div>
