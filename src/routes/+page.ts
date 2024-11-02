import { fetchFromNasaApi } from '$lib';
import type { SearchResponse } from '$lib/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
	const shouldUseFallbackQuery = !url.search || !url.search.includes('q=');

	const data = (await fetchFromNasaApi(
		`/search${shouldUseFallbackQuery ? '?q=""' : url.search}&media_type=image`
	)) as SearchResponse;

	return data.collection;
};
