import { error } from '@sveltejs/kit';
import { toGalleryImages } from '#lib/images.js';
import { nasaJson, NasaError, SEARCH_TTL } from '#lib/server/nasa.js';
import type { SearchResponse } from '#lib/types.js';
import type { PageServerLoad } from './$types';

const SEARCH_PARAMS = [
	'q',
	'center',
	'description',
	'keywords',
	'location',
	'nasa_id',
	'photographer',
	'secondary_creator',
	'title',
	'year_start',
	'year_end'
];

export const load: PageServerLoad = async ({ url, fetch, setHeaders }) => {
	const params = new URLSearchParams();
	for (const name of SEARCH_PARAMS) {
		const value = url.searchParams.get(name)?.trim();
		if (value) params.set(name, value);
	}
	if (params.size === 0) params.set('year_start', String(new Date().getFullYear()));
	params.set('media_type', 'image');

	let data: SearchResponse;
	try {
		data = await nasaJson<SearchResponse>(`https://images-api.nasa.gov/search?${params}`, {
			ttlSeconds: SEARCH_TTL,
			fetch
		});
	} catch (e) {
		if (e instanceof NasaError) error(502, 'NASA image service is unavailable');
		throw e;
	}

	setHeaders({ 'cache-control': 'public, max-age=3600, stale-while-revalidate=86400' });
	return { images: toGalleryImages(data.collection?.items) };
};
