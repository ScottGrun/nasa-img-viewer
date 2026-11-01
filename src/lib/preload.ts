import type { PreviewSources } from './images.js';

/** Matches the detail page's `<source media="(min-width: 768px)">`. */
export const WIDE_QUERY = '(min-width: 768px)';
export const HOVER_INTENT_MS = 100;

interface PreloadEnv {
	createImage: () => Pick<HTMLImageElement, 'src' | 'onload' | 'onerror'>;
	saveData: boolean;
}

const defaultEnv = (): PreloadEnv => ({
	createImage: () => new Image(),
	saveData: Boolean((navigator as { connection?: { saveData?: boolean } }).connection?.saveData)
});

const started = new Set<string>();
// Holds each Image until it settles so it can't be garbage collected mid-download
const inFlight = new Set<unknown>();

/** The URL the detail page's `<picture>` would use at this viewport width. */
export const choosePreview = (preview: PreviewSources, wide: boolean) =>
	wide ? preview.large : preview.medium;

/** Starts downloading `url` into the browser cache, at most once. Returns whether a request began. */
export function preloadImage(url: string | undefined, env: PreloadEnv = defaultEnv()): boolean {
	if (!url || env.saveData || started.has(url)) return false;
	started.add(url);
	const image = env.createImage();
	inFlight.add(image);
	image.onload = () => inFlight.delete(image);
	image.onerror = () => {
		inFlight.delete(image);
		started.delete(url); // allow a retry
	};
	image.src = url;
	return true;
}

/** Preloads the detail image right away, e.g. on press, so it downloads while the page data loads. */
export const preloadNow = (preview: PreviewSources): boolean =>
	preloadImage(choosePreview(preview, matchMedia(WIDE_QUERY).matches));

/** Preloads the detail image after a short hover. Returns a function that cancels a pending preload. */
export function preloadOnIntent(preview: PreviewSources): () => void {
	const timer = setTimeout(() => preloadNow(preview), HOVER_INTENT_MS);
	return () => clearTimeout(timer);
}

/** Test helper: forget what has been preloaded. */
export const resetPreloads = () => {
	started.clear();
	inFlight.clear();
};
