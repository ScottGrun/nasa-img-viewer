import type { SearchResponse } from '$lib/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url, fetch }) => {
	const shouldUseFallbackQuery = !url.search || !url.search.includes('q=');
	const formattedPath = `/search${shouldUseFallbackQuery ? '?q=""' : url.search}&media_type=image`;
	const data = await fetch(`https://images-api.nasa.gov${formattedPath}`);

	const parsedData: SearchResponse = await data.json();
	return parsedData.collection;
};
