import { error } from '@sveltejs/kit';
import { ASSET_TTL, METADATA_TTL, NasaError, RELATED_TTL, nasaJson } from '#lib/server/nasa.js';
import { toGalleryImages, normalizeHref, type GalleryImage } from '#lib/images.js';
import type { AssetManifestResponse, MetadataResponse, SearchResponse } from '#lib/types.js';
import type { PageServerLoad } from './$types';

const MAX_KEYWORDS = 20;
const MAX_RELATED = 12;

async function loadRelated(
	keywords: string[],
	nasaId: string,
	options: { fetch: typeof fetch }
): Promise<GalleryImage[]> {
	if (keywords.length === 0) return [];
	try {
		const query = new URLSearchParams({
			keywords: keywords.join(','),
			media_type: 'image',
			page_size: String(MAX_RELATED + 1)
		});
		const search = await nasaJson<SearchResponse>(`https://images-api.nasa.gov/search?${query}`, {
			...options,
			ttlSeconds: RELATED_TTL
		});
		return toGalleryImages(search.collection?.items)
			.filter((image) => image.nasaId !== nasaId)
			.slice(0, MAX_RELATED);
	} catch {
		return [];
	}
}

export const load: PageServerLoad = async ({ params, fetch, setHeaders }) => {
	const id = encodeURIComponent(params.nasaId);
	const options = { fetch };

	let asset: AssetManifestResponse;
	let metadata: MetadataResponse;
	try {
		[asset, metadata] = await Promise.all([
			nasaJson<AssetManifestResponse>(`https://images-api.nasa.gov/asset/${id}`, {
				...options,
				ttlSeconds: ASSET_TTL
			}),
			nasaJson<MetadataResponse>(`https://images-assets.nasa.gov/image/${id}/metadata.json`, {
				...options,
				ttlSeconds: METADATA_TTL
			})
		]);
	} catch (e) {
		if (e instanceof NasaError) {
			if (e.status === 404 || e.status === 403) error(404, 'Image not found');
			error(502, 'NASA image service is unavailable');
		}
		throw e;
	}

	const keywords = (metadata['AVAIL:Keywords'] ?? []).slice(0, MAX_KEYWORDS);

	// Not awaited, so the page renders without waiting for it and SvelteKit streams the result.
	// Never rejects: an unhandled rejection could take down a Worker.
	const related = loadRelated(keywords, params.nasaId, options);

	setHeaders({ 'cache-control': 'public, max-age=3600, stale-while-revalidate=86400' });

	return {
		asset: { items: asset.collection.items.map(({ href }) => ({ href: normalizeHref(href) })) },
		metadata: {
			'AVAIL:Title': metadata['AVAIL:Title'],
			'AVAIL:Description': metadata['AVAIL:Description'],
			'AVAIL:Keywords': metadata['AVAIL:Keywords'],
			'AVAIL:Photographer': metadata['AVAIL:Photographer'],
			'AVAIL:Location': metadata['AVAIL:Location'],
			'AVAIL:Album': metadata['AVAIL:Album'],
			'EXIF:ImageDescription': metadata['EXIF:ImageDescription'],
			'EXIF:ImageWidth': metadata['EXIF:ImageWidth'],
			'EXIF:ImageHeight': metadata['EXIF:ImageHeight'],
			'File:ImageWidth': metadata['File:ImageWidth'],
			'File:ImageHeight': metadata['File:ImageHeight'],
			'EXIF:DateTimeOriginal': metadata['EXIF:DateTimeOriginal'],
			'Composite:DateTimeOriginal': metadata['Composite:DateTimeOriginal']
		} satisfies MetadataResponse,
		related
	};
};
