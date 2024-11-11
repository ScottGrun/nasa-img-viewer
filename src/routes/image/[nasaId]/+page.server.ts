import type { AssetManifestResponse, MetadataResponse } from '$lib/types';
import type { PageServerLoad } from './$types';

const BASE_URL = 'https://images-api.nasa.gov';

export const load: PageServerLoad = async ({ params, fetch }) => {
	// depends('url');
	const assetReq = fetch(BASE_URL + `/asset/${params.nasaId}`);
	const metadataReq = fetch(`https://images-assets.nasa.gov/image/${params.nasaId}/metadata.json`);

	const [asset, metadata] = await Promise.all([assetReq, metadataReq]);

	const parsedAsset: AssetManifestResponse = await asset.json();
	const parsedMetadata: MetadataResponse = await metadata.json();

	return { asset: parsedAsset.collection, metadata: parsedMetadata };
};
