import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildSearchParams, fetchSearchPage, hasNextPage, parsePage } from './search.js';

const sp = (query: string) => new URLSearchParams(query);

describe('buildSearchParams', () => {
	it('keeps only whitelisted params and always sets media type and page size', () => {
		const params = buildSearchParams(sp('q=moon&evil=1&page_size=1000&media_type=audio'));
		expect(params.get('q')).toBe('moon');
		expect(params.has('evil')).toBe(false);
		expect(params.get('page_size')).toBe('48');
		expect(params.get('media_type')).toBe('image');
	});

	it('drops empty and whitespace-only values', () => {
		const params = buildSearchParams(sp('q=%20%20&title=apollo'));
		expect(params.has('q')).toBe(false);
		expect(params.get('title')).toBe('apollo');
	});

	it('defaults to the current year when nothing is searched', () => {
		const params = buildSearchParams(sp('q='), 1, new Date('2031-05-05'));
		expect(params.get('year_start')).toBe('2031');
		expect(buildSearchParams(sp('q=moon')).has('year_start')).toBe(false);
	});

	it('sets page only after the first', () => {
		expect(buildSearchParams(sp('q=a'), 1).has('page')).toBe(false);
		expect(buildSearchParams(sp('q=a'), 3).get('page')).toBe('3');
	});
});

describe('parsePage', () => {
	it('accepts positive integers', () => {
		expect(parsePage('1')).toBe(1);
		expect(parsePage('42')).toBe(42);
	});

	it.each([null, '', '0', '-1', '1.5', 'abc', '1e3', '01', '9999999'])('rejects %s', (value) => {
		expect(parsePage(value)).toBeUndefined();
	});
});

describe('hasNextPage', () => {
	it('is true only with a next link', () => {
		expect(hasNextPage([{ rel: 'next', href: 'x', prompt: 'Next' }])).toBe(true);
		expect(hasNextPage([{ rel: 'prev', href: 'x' }])).toBe(false);
		expect(hasNextPage([])).toBe(false);
		expect(hasNextPage(undefined)).toBe(false);
	});
});

describe('fetchSearchPage', () => {
	afterEach(() => vi.unstubAllGlobals());

	const respond = (body: unknown, status = 200) =>
		vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
	const items = [{ data: [{ nasa_id: 'a' }], links: [{ href: 'x~small.jpg', rel: 'preview' }] }];

	it('reports hasMore from the next link', async () => {
		const more = await fetchSearchPage(
			sp('q=a'),
			1,
			respond({ collection: { items, links: [{ rel: 'next', href: 'n' }] } })
		);
		expect(more.hasMore).toBe(true);
		expect(more.images).toHaveLength(1);

		const last = await fetchSearchPage(sp('q=a'), 1, respond({ collection: { items, links: [] } }));
		expect(last.hasMore).toBe(false);
	});

	it('treats a 400 on a deep page as no more results', async () => {
		const result = await fetchSearchPage(sp('q=a'), 500, respond({ reason: 'max' }, 400));
		expect(result).toEqual({ images: [], hasMore: false });
	});

	it('still fails on a 400 for the first page', async () => {
		await expect(fetchSearchPage(sp('q=a'), 1, respond({}, 400))).rejects.toThrow();
	});
});
