import type { SearchResponse } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, fetch }) => {
	const URL = `https://images-api.nasa.gov/search${!url.search ? `?q=''&year_start=${new Date().getFullYear()}` : `${url.search}`}&media_type=image`;
	const data = await fetch(URL);
	const parsedData: SearchResponse = await data.json();
	return parsedData.collection;
};
