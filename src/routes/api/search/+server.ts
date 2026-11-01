import { json } from '@sveltejs/kit';
import { NasaError } from '#lib/server/nasa.js';
import { fetchSearchPage, parsePage } from '#lib/server/search.js';
import type { RequestHandler } from './$types';

const CACHE_CONTROL = 'public, max-age=3600, stale-while-revalidate=86400';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const page = parsePage(url.searchParams.get('page'));
	if (page === undefined) {
		return json({ error: 'page must be a positive integer' }, { status: 400 });
	}

	try {
		const result = await fetchSearchPage(url.searchParams, page, fetch);
		return json(result, { headers: { 'cache-control': CACHE_CONTROL } });
	} catch (e) {
		if (e instanceof NasaError) {
			return json({ error: 'NASA image service is unavailable' }, { status: 502 });
		}
		throw e;
	}
};
