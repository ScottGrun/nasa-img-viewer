import { describe, expect, it } from 'vitest';
import { normalizeHref, pickBySize, pickPreviewSources, toGalleryImage } from './images.js';
import type { Link, SearchResultItem } from './types.js';

const base = 'https://images-assets.nasa.gov/image/ID';
const link = (size: string, extra: Partial<Link> = {}, ext = 'jpg'): Link => ({
	href: `${base}/ID~${size}.${ext}`,
	rel: 'preview',
	...extra
});
const item = (links: Link[], id = 'ID'): SearchResultItem => ({
	data: [
		{
			nasa_id: id,
			title: 'T',
			description: 'D',
			center: '',
			date_created: '',
			keywords: [],
			media_type: 'image'
		}
	],
	href: '',
	links
});

describe('toGalleryImage', () => {
	it('picks by suffix regardless of order and builds srcset', () => {
		const img = toGalleryImage(
			item([
				link('orig', { width: 5000, height: 4000 }),
				link('medium', { width: 975, height: 780 }),
				link('thumb', { width: 100, height: 80 }),
				link('small', { width: 640, height: 512 }),
				link('large', { width: 2000, height: 1600 })
			])
		)!;
		expect(img.src).toBe(`${base}/ID~small.jpg`);
		expect(img.srcset).toBe(`${base}/ID~small.jpg 640w, ${base}/ID~medium.jpg 975w`);
		expect(img.width).toBe(640);
		expect(img.height).toBe(512);
	});

	it('works for ids containing "tif" and rejects real tif files', () => {
		const tifId = 'KSC-tiffany';
		const links = [
			{ href: `https://x/image/${tifId}/${tifId}~small.jpg`, rel: 'preview' },
			{ href: `https://x/image/${tifId}/${tifId}~medium.tif`, rel: 'preview' }
		];
		const img = toGalleryImage(item(links, tifId))!;
		expect(img.src).toBe(links[0].href);
		expect(toGalleryImage(item([links[1]], tifId))).toBeUndefined();
	});

	it('omits srcset and dimensions when widths are missing', () => {
		const img = toGalleryImage(item([link('medium'), link('small')]))!;
		expect(img.src).toContain('~small');
		expect(img.srcset).toBeUndefined();
		expect(img.width).toBeUndefined();
	});

	it('falls back to medium, then orig only as last resort', () => {
		expect(toGalleryImage(item([link('orig'), link('medium')]))!.src).toContain('~medium');
		expect(toGalleryImage(item([link('orig')]))!.src).toContain('~orig');
	});

	it('drops items without a usable image', () => {
		expect(toGalleryImage(item([]))).toBeUndefined();
		expect(toGalleryImage(item([link('orig', {}, 'tif')]))).toBeUndefined();
		expect(toGalleryImage({ data: [], href: '', links: [] })).toBeUndefined();
	});

	it('truncates long descriptions', () => {
		const long = item([link('small')]);
		long.data[0].description = 'x'.repeat(1000);
		expect(toGalleryImage(long)!.description.length).toBeLessThanOrEqual(241);
	});
});

describe('pickBySize', () => {
	it('prefers large, never tif, orig last', () => {
		const hrefs = [`${base}/ID~orig.jpg`, `${base}/ID~large.tif`, `${base}/ID~medium.jpg`];
		expect(pickBySize(hrefs, ['large', 'medium'])).toBe(`${base}/ID~medium.jpg`);
		expect(pickBySize([hrefs[0]], ['large', 'medium'])).toBe(hrefs[0]);
	});
});

describe('normalizeHref', () => {
	it('upgrades http to https and encodes spaces', () => {
		expect(normalizeHref('http://images-assets.nasa.gov/image/A B/A B~large.jpg')).toBe(
			'https://images-assets.nasa.gov/image/A%20B/A%20B~large.jpg'
		);
	});
});

describe('pickPreviewSources', () => {
	it('prefers large/medium by device and never picks orig when something else exists', () => {
		const hrefs = [link('orig', {}, 'png'), link('medium'), link('thumb')].map((l) => l.href);
		expect(pickPreviewSources(hrefs)).toEqual({ large: hrefs[1], medium: hrefs[1] });
		expect(pickPreviewSources([hrefs[0]])).toEqual({ large: hrefs[0], medium: hrefs[0] });
	});
});
