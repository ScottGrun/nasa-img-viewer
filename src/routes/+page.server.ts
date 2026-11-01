import { error } from '@sveltejs/kit';
import { NasaError } from '#lib/server/nasa.js';
import { fetchSearchPage } from '#lib/server/search.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, fetch, setHeaders }) => {
	let result;
	try {
		result = await fetchSearchPage(url.searchParams, 1, fetch);
	} catch (e) {
		if (e instanceof NasaError) error(502, 'NASA image service is unavailable');
		throw e;
	}

	setHeaders({ 'cache-control': 'public, max-age=3600, stale-while-revalidate=86400' });
	return result;
};
