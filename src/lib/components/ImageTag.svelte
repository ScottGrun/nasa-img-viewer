<script lang="ts">
	import { resolve } from '$app/paths';
	interface Props {
		keyword: string;
	}
	const { keyword }: Props = $props();
</script>

<a
	href={resolve(`/?${new URLSearchParams({ keywords: keyword })}`)}
	class="block rounded-sm bg-gray-50 px-2 py-1 text-sm font-medium text-neutral-600 transition-colors hover:bg-gray-200"
	>{keyword}</a
>
