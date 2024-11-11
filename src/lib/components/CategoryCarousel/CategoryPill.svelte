<script lang="ts">
	import { twMerge } from 'tailwind-merge';

	interface Props {
		label: string;
		path: string;
		imageUrl: string;
		isActive?: boolean;
	}

	const { label, path, imageUrl, isActive }: Props = $props();
</script>

<a
	href={path}
	class={twMerge(
		'flex w-fit shrink-0 items-center gap-3 rounded-full bg-neutral-50 p-1 font-medium text-neutral-600 transition-colors hover:bg-neutral-100',
		isActive && 'bg-indigo-50 font-semibold text-neutral-900'
	)}
>
	<img
		src={imageUrl}
		aria-hidden="true"
		class="object-fit h-10 w-10 overflow-hidden rounded-full object-cover object-center"
		alt=""
	/>
	<span class="pr-3 text-base">{label}</span>
</a>
