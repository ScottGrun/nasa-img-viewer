export const MIN_ZOOM = 1.5;
export const ABSOLUTE_MAX_ZOOM = 16;
const FALLBACK_ZOOM = 3;
const MIN_DEFAULT_ZOOM = 2;
const WHEEL_SENSITIVITY = 0.002;

const positive = (value: number | undefined) =>
	typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;

/** Pixels of the source image per displayed pixel, or undefined if either size is unknown. */
export const nativeZoom = (
	sourceWidth: number | undefined,
	displayWidth: number | undefined
): number | undefined => {
	const source = positive(sourceWidth);
	const display = positive(displayWidth);
	return source && display ? source / display : undefined;
};

/** Highest allowed zoom: twice native, at least 4, never above 16. */
export const maxZoom = (native: number | undefined) =>
	Math.min(ABSOLUTE_MAX_ZOOM, Math.max(4, (native ?? 0) * 2));

export const clampZoom = (zoom: number, native: number | undefined) =>
	Math.min(maxZoom(native), Math.max(MIN_ZOOM, zoom));

/** Starting zoom: native 1:1 (at least 2), or 3 when the size is unknown. */
export const defaultZoom = (native: number | undefined) =>
	clampZoom(native === undefined ? FALLBACK_ZOOM : Math.max(MIN_DEFAULT_ZOOM, native), native);

/** Multiplicative wheel zoom: scrolling up (negative deltaY) zooms in. */
export const wheelZoom = (zoom: number, deltaY: number, native: number | undefined) =>
	clampZoom(zoom * Math.exp(-deltaY * WHEEL_SENSITIVITY), native);
