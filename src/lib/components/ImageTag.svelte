<script lang="ts">
	interface Props {
		keyword: string;
	}
	const { keyword }: Props = $props();
</script>

<a
	href={`/?q=${keyword}`}
	class="block rounded-[0.25rem] bg-gray-50 px-2 py-1 text-sm font-medium text-neutral-600 hover:bg-gray-100"
	>{keyword}</a
>
