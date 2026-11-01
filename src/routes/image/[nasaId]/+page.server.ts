import { error } from '@sveltejs/kit';
import { ASSET_TTL, METADATA_TTL, NasaError, RELATED_TTL, nasaJson } from '#lib/server/nasa.js';
import { toGalleryImages, type GalleryImage } from '#lib/images.js';
import type { AssetManifestResponse, MetadataResponse, SearchResponse } from '#lib/types.js';
import type { PageServerLoad } from './$types';

const MAX_KEYWORDS = 20;
const MAX_RELATED = 12;

export const load: PageServerLoad = async ({ params, fetch, platform, setHeaders }) => {
	const id = encodeURIComponent(params.nasaId);
	const options = { platform, fetch };

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
	let related: GalleryImage[] = [];
	if (keywords.length > 0) {
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
			related = toGalleryImages(search.collection?.items)
				.filter((image) => image.nasaId !== params.nasaId)
				.slice(0, MAX_RELATED);
		} catch {
			related = [];
		}
	}

	setHeaders({ 'cache-control': 'public, max-age=3600, stale-while-revalidate=86400' });

	return {
		asset: { items: asset.collection.items.map(({ href }) => ({ href })) },
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
