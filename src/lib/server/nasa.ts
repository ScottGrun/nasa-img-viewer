const DAY = 60 * 60 * 24;

export const ASSET_TTL = 30 * DAY;
export const METADATA_TTL = 30 * DAY;
export const SEARCH_TTL = DAY;

const REQUEST_TIMEOUT_MS = 10_000;

export class NasaError extends Error {
	status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = 'NasaError';
		this.status = status;
	}
}

interface NasaJsonOptions {
	ttlSeconds: number;
	fetch?: typeof fetch;
}

interface EdgeCache {
	match(request: Request): Promise<Response | undefined>;
	put(request: Request, response: Response): Promise<void>;
}

// `caches.default` is a Cloudflare Workers global; it doesn't exist under Node (vite dev, vitest).
// SvelteKit 3 no longer exposes it on `platform`.
const getEdgeCache = () =>
	(globalThis as unknown as { caches?: { default?: EdgeCache } }).caches?.default;

/**
 * Fetches JSON from NASA, backed by the Cloudflare Cache API when available.
 * Failures are never cached and cache errors never fail the request.
 */
export async function nasaJson<T>(
	url: string,
	{ ttlSeconds, fetch: fetcher = fetch }: NasaJsonOptions
): Promise<T> {
	const cache = getEdgeCache();
	const key = new Request(url);

	if (cache) {
		try {
			const hit = await cache.match(key);
			if (hit) return (await hit.json()) as T;
		} catch {
			// Fall through to a normal fetch
		}
	}

	let res: Response;
	try {
		res = await fetcher(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
	} catch {
		throw new NasaError('NASA request failed', 502);
	}
	if (!res.ok) throw new NasaError(`NASA responded with ${res.status}`, res.status);

	let body: string;
	let parsed: T;
	try {
		body = await res.text();
		parsed = JSON.parse(body) as T;
	} catch {
		throw new NasaError('NASA returned an invalid response', 502);
	}

	if (cache) {
		try {
			const stored = new Response(body, {
				headers: {
					'content-type': 'application/json',
					'cache-control': `public, max-age=${ttlSeconds}`
				}
			});
			await cache.put(key, stored);
		} catch {
			// Caching is best effort
		}
	}

	return parsed;
}
