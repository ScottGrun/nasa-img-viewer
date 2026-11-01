import { describe, expect, it, vi } from 'vitest';
import { NasaError, nasaJson } from './nasa.js';

const makeCache = (stored = new Map<string, Response>()) => ({
	stored,
	match: vi.fn(async (req: Request) => stored.get(req.url)?.clone()),
	put: vi.fn(async (req: Request, res: Response) => void stored.set(req.url, res))
});
const jsonResponse = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status });
const url = 'https://images-api.nasa.gov/search?q=moon';

describe('nasaJson', () => {
	it('fetches on a miss and stores the response', async () => {
		const cache = makeCache();
		const waitUntil = vi.fn();
		const fetcher = vi.fn(async () => jsonResponse({ a: 1 }));
		const data = await nasaJson(url, {
			ttlSeconds: 60,
			platform: { caches: { default: cache }, context: { waitUntil } },
			fetch: fetcher
		});
		expect(data).toEqual({ a: 1 });
		expect(fetcher).toHaveBeenCalledOnce();
		expect(cache.put).toHaveBeenCalledOnce();
		expect(waitUntil).toHaveBeenCalledOnce();
		const stored = cache.stored.get(url)!;
		expect(stored.headers.get('cache-control')).toBe('public, max-age=60');
		expect(stored.headers.get('content-type')).toBe('application/json');
	});

	it('does not fetch on a hit', async () => {
		const cache = makeCache(new Map([[url, jsonResponse({ cached: true })]]));
		const fetcher = vi.fn();
		const data = await nasaJson(url, {
			ttlSeconds: 60,
			platform: { caches: { default: cache } },
			fetch: fetcher
		});
		expect(data).toEqual({ cached: true });
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('throws NasaError with status and does not store non-OK responses', async () => {
		const cache = makeCache();
		const fetcher = vi.fn(async () => jsonResponse({ reason: 'nope' }, 404));
		const err = (await nasaJson(url, {
			ttlSeconds: 60,
			platform: { caches: { default: cache } },
			fetch: fetcher
		}).catch((e: unknown) => e)) as NasaError;
		expect(err).toBeInstanceOf(NasaError);
		expect(err.status).toBe(404);
		expect(cache.put).not.toHaveBeenCalled();
	});

	it('throws on non-JSON bodies and network failures without storing', async () => {
		const cache = makeCache();
		const platform = { caches: { default: cache } };
		await expect(
			nasaJson(url, { ttlSeconds: 1, platform, fetch: async () => new Response('<xml/>') })
		).rejects.toBeInstanceOf(NasaError);
		await expect(
			nasaJson(url, {
				ttlSeconds: 1,
				platform,
				fetch: async () => {
					throw new TypeError('network');
				}
			})
		).rejects.toBeInstanceOf(NasaError);
		expect(cache.put).not.toHaveBeenCalled();
	});

	it('still returns data when the cache throws', async () => {
		const cache = {
			match: vi.fn(async () => {
				throw new Error('boom');
			}),
			put: vi.fn(async () => {
				throw new Error('boom');
			})
		};
		const data = await nasaJson(url, {
			ttlSeconds: 60,
			platform: { caches: { default: cache }, context: { waitUntil: vi.fn() } },
			fetch: async () => jsonResponse({ ok: true })
		});
		expect(data).toEqual({ ok: true });
	});

	it('just fetches without a cache', async () => {
		const data = await nasaJson(url, { ttlSeconds: 60, fetch: async () => jsonResponse([1]) });
		expect(data).toEqual([1]);
	});
});
