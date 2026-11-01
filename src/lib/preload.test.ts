import { beforeEach, describe, expect, it } from 'vitest';
import { choosePreview, preloadImage, resetPreloads } from './preload.js';

const fakeEnv = (saveData = false) => {
	const images: { src: string; onload?: unknown; onerror?: unknown }[] = [];
	return {
		images,
		env: {
			saveData,
			createImage: () => {
				const image = { src: '' };
				images.push(image);
				return image as unknown as HTMLImageElement;
			}
		}
	};
};

const preview = { large: 'https://x/a~large.jpg', medium: 'https://x/a~medium.jpg' };

beforeEach(resetPreloads);

describe('choosePreview', () => {
	it('uses large on wide viewports and medium otherwise', () => {
		expect(choosePreview(preview, true)).toBe(preview.large);
		expect(choosePreview(preview, false)).toBe(preview.medium);
		expect(choosePreview({}, true)).toBeUndefined();
	});
});

describe('preloadImage', () => {
	it('requests each URL only once', () => {
		const { env, images } = fakeEnv();
		expect(preloadImage(preview.large, env)).toBe(true);
		expect(preloadImage(preview.large, env)).toBe(false);
		expect(preloadImage(preview.medium, env)).toBe(true);
		expect(images.map((i) => i.src)).toEqual([preview.large, preview.medium]);
	});

	it('does nothing when data saver is on or there is no URL', () => {
		const { env, images } = fakeEnv(true);
		expect(preloadImage(preview.large, env)).toBe(false);
		expect(preloadImage(undefined, fakeEnv().env)).toBe(false);
		expect(images).toEqual([]);
	});

	it('allows a retry after a failed load', () => {
		const { env, images } = fakeEnv();
		preloadImage(preview.large, env);
		(images[0].onerror as () => void)();
		expect(preloadImage(preview.large, env)).toBe(true);
	});
});
