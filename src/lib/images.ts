import type { Link, SearchResultItem } from './types.js';

export type ImageSize = 'thumb' | 'small' | 'medium' | 'large' | 'orig';

export interface GalleryImage {
	nasaId: string;
	title: string;
	description: string;
	src: string;
	srcset?: string;
	width?: number;
	height?: number;
	/** Detail page image URLs, so they can be preloaded before navigating. */
	preview: PreviewSources;
}

export interface PreviewSources {
	large?: string;
	medium?: string;
}

const SIZE_PATTERN = /~(thumb|small|medium|large|orig)\.[a-z0-9]+(?:[?#].*)?$/i;
const TIF_PATTERN = /\.tiff?(?:[?#].*)?$/i;

export const isTif = (href: string) => TIF_PATTERN.test(href);

/** Size variant of an image URL, based on its `~size.ext` suffix. */
export const sizeOf = (href: string): ImageSize | undefined =>
	SIZE_PATTERN.exec(href)?.[1].toLowerCase() as ImageSize | undefined;

/** Picks a URL from `hrefs` by preferred size order, never using tifs. `orig` only as a last resort. */
export const pickBySize = (hrefs: string[], order: ImageSize[]): string | undefined => {
	const usable = hrefs.filter((href) => !isTif(href));
	for (const size of order) {
		const found = usable.find((href) => sizeOf(href) === size);
		if (found) return found;
	}
	return usable.find((href) => sizeOf(href) === 'orig') ?? usable.find((href) => !sizeOf(href));
};

/**
 * Detail page image URLs: `large` on wide screens, `medium` otherwise.
 * Shared by the detail page's `<picture>` and the hover preload, so they always agree.
 */
export const pickPreviewSources = (hrefs: string[]): PreviewSources => ({
	large: pickBySize(hrefs, ['large', 'medium', 'small', 'thumb']),
	medium: pickBySize(hrefs, ['medium', 'large', 'small', 'thumb'])
});

/**
 * NASA's asset API returns http:// URLs while search returns https://; normalize so caches match.
 * Spaces are encoded because they would split a srcset candidate in two.
 */
export const normalizeHref = (href: string) =>
	href.replace(/^http:\/\//i, 'https://').replaceAll(' ', '%20');

const MAX_DESCRIPTION = 240;

const truncate = (text: string) =>
	text.length > MAX_DESCRIPTION ? `${text.slice(0, MAX_DESCRIPTION).trimEnd()}…` : text;

const positive = (value: unknown) =>
	typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;

/** Converts a NASA search item into a lightweight gallery image, or undefined if none is usable. */
export const toGalleryImage = (item: SearchResultItem): GalleryImage | undefined => {
	const data = item.data?.[0];
	if (!data?.nasa_id) return undefined;

	const links = (item.links ?? []).filter(
		(link): link is Link => typeof link?.href === 'string' && !isTif(link.href)
	);
	const bySize = (size: ImageSize) => links.find((link) => sizeOf(link.href) === size);

	const small = bySize('small');
	const medium = bySize('medium');
	const chosen =
		small ??
		bySize('thumb') ??
		medium ??
		bySize('large') ??
		links.find((link) => sizeOf(link.href) !== 'orig') ??
		bySize('orig');
	if (!chosen) return undefined;

	const smallWidth = positive(small?.width);
	const mediumWidth = positive(medium?.width);
	const srcset =
		small && medium && smallWidth && mediumWidth
			? `${small.href} ${smallWidth}w, ${medium.href} ${mediumWidth}w`
			: undefined;

	const width = positive(chosen.width);
	const height = positive(chosen.height);

	return {
		nasaId: data.nasa_id,
		title: data.title ?? '',
		description: truncate(data.description ?? ''),
		preview: pickPreviewSources(links.map((link) => normalizeHref(link.href))),
		src: chosen.href,
		srcset,
		...(width && height ? { width, height } : {})
	};
};

export const toGalleryImages = (items: SearchResultItem[] = []): GalleryImage[] =>
	items.map(toGalleryImage).filter((image): image is GalleryImage => image !== undefined);

/** Drops images already in `seen` (and repeats within `images`), adding the kept ids to `seen`. */
export const dedupeImages = (images: GalleryImage[], seen: Set<string>): GalleryImage[] =>
	images.filter((image) => {
		if (seen.has(image.nasaId)) return false;
		seen.add(image.nasaId);
		return true;
	});
