import type { AssetManifestResponse, MetadataResponse } from '$lib/types';
import type { PageLoad } from './$types';

const BASE_URL = 'https://images-api.nasa.gov';

export const load: PageLoad = async ({ params, fetch }) => {
	const assetReq = fetch(BASE_URL + `/asset/${params.nasaId}`);
	const metadataReq = fetch(`https://images-assets.nasa.gov/image/${params.nasaId}/metadata.json`);

	const [asset, metadata] = await Promise.all([assetReq, metadataReq]);

	const parsedAsset: AssetManifestResponse = await asset.json();
	const parsedMetadata: MetadataResponse = await metadata.json();

	return { asset: parsedAsset.collection, metadata: parsedMetadata };
};
