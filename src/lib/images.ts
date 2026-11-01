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
		src: chosen.href,
		srcset,
		...(width && height ? { width, height } : {})
	};
};

export const toGalleryImages = (items: SearchResultItem[] = []): GalleryImage[] =>
	items.map(toGalleryImage).filter((image): image is GalleryImage => image !== undefined);
