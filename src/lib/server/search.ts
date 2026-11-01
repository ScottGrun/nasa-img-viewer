import { toGalleryImages, type GalleryImage } from '#lib/images.js';
import type { Link, SearchResponse } from '#lib/types.js';
import { SEARCH_PARAMS, parseYearParams } from '#lib/years.js';
import { nasaJson, NasaError, SEARCH_TTL } from './nasa.js';

export const PAGE_SIZE = 48;

export { SEARCH_PARAMS };

/** Builds the NASA search params from whitelisted, non-empty request params. */
export const buildSearchParams = (
	source: URLSearchParams,
	page = 1,
	now = new Date()
): URLSearchParams => {
	const params = new URLSearchParams();
	for (const name of SEARCH_PARAMS) {
		const value = source.get(name)?.trim();
		if (value && name !== 'year_start' && name !== 'year_end') params.set(name, value);
	}
	const { start, end } = parseYearParams(source, now.getFullYear());
	if (start !== undefined) params.set('year_start', String(start));
	if (end !== undefined) params.set('year_end', String(end));
	if (params.size === 0) params.set('year_start', String(now.getFullYear()));
	params.set('media_type', 'image');
	params.set('page_size', String(PAGE_SIZE));
	if (page > 1) params.set('page', String(page));
	return params;
};

/** Parses a positive integer page number, or returns undefined when invalid. */
export const parsePage = (value: string | null): number | undefined => {
	if (value === null || !/^[1-9]\d{0,5}$/.test(value.trim())) return undefined;
	return Number(value.trim());
};

export const hasNextPage = (links?: Link[]): boolean =>
	Array.isArray(links) && links.some((link) => link?.rel === 'next');

export interface SearchPage {
	images: GalleryImage[];
	hasMore: boolean;
}

/** Fetches one page of results. NASA rejects very deep pages with a 400, which means "no more". */
export async function fetchSearchPage(
	source: URLSearchParams,
	page: number,
	fetcher: typeof fetch
): Promise<SearchPage> {
	const params = buildSearchParams(source, page);
	try {
		const data = await nasaJson<SearchResponse>(`https://images-api.nasa.gov/search?${params}`, {
			ttlSeconds: SEARCH_TTL,
			fetch: fetcher
		});
		return {
			images: toGalleryImages(data.collection?.items),
			hasMore: hasNextPage(data.collection?.links)
		};
	} catch (e) {
		if (e instanceof NasaError && e.status === 400 && page > 1) {
			return { images: [], hasMore: false };
		}
		throw e;
	}
}
