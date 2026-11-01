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

export const MINIMAP_LONGEST_SIDE = 160;
export const MINIMAP_INSET = 12;
export const MINIMAP_HYSTERESIS = 24;
const MIN_MARKER = 6;

export interface Size {
	w: number;
	h: number;
}

export interface Box {
	left: number;
	top: number;
	w: number;
	h: number;
}

export type MinimapCorner = 'right' | 'left';

/** Minimap size: the image's aspect ratio with its longest side at `longest` pixels. */
export const minimapSize = (display: Size, longest = MINIMAP_LONGEST_SIDE): Size => {
	const scale = longest / Math.max(display.w, display.h);
	return { w: display.w * scale, h: display.h * scale };
};

/**
 * Marker circle in minimap pixels. The centre is the cursor as a fraction of the image;
 * the diameter is the lens's footprint on the image (`lens / zoom` displayed pixels), scaled down.
 */
export const minimapMarker = (
	point: { x: number; y: number },
	display: Size,
	zoom: number,
	lens: number,
	map: Size
) => ({
	cx: (point.x / display.w) * map.w,
	cy: (point.y / display.h) * map.h,
	d: Math.max(MIN_MARKER, (lens / zoom) * (map.w / display.w))
});

/** The part of `box` that is inside a viewport at the origin; undefined if none. */
export const visibleBox = (box: Box, viewport: Size): Box | undefined => {
	const left = Math.max(0, box.left);
	const top = Math.max(0, box.top);
	const right = Math.min(viewport.w, box.left + box.w);
	const bottom = Math.min(viewport.h, box.top + box.h);
	return right > left && bottom > top ? { left, top, w: right - left, h: bottom - top } : undefined;
};

/** Top-left of the minimap inside the visible part of the image, `inset` from the chosen bottom corner. */
export const minimapOrigin = (
	visible: Box,
	map: Size,
	corner: MinimapCorner,
	inset = MINIMAP_INSET
) => ({
	left: corner === 'right' ? visible.left + visible.w - inset - map.w : visible.left + inset,
	top: visible.top + visible.h - inset - map.h
});

/** Whether a circle comes within `margin` pixels of a box. */
export const circleNearBox = (
	circle: { cx: number; cy: number; r: number },
	box: Box,
	margin = 0
) => {
	const nx = Math.min(box.left + box.w, Math.max(box.left, circle.cx));
	const ny = Math.min(box.top + box.h, Math.max(box.top, circle.cy));
	return Math.hypot(circle.cx - nx, circle.cy - ny) < circle.r + margin;
};

/**
 * Moves the minimap left when the glass would cover its default bottom-right spot, and only
 * moves it back once the glass has cleared that spot by `hysteresis`, so it doesn't flicker.
 */
export const nextMinimapCorner = (
	previous: MinimapCorner,
	glass: { cx: number; cy: number; r: number },
	visible: Box,
	map: Size,
	hysteresis = MINIMAP_HYSTERESIS
): MinimapCorner => {
	const origin = minimapOrigin(visible, map, 'right');
	const spot: Box = { ...origin, w: map.w, h: map.h };
	return circleNearBox(glass, spot, previous === 'right' ? 0 : hysteresis) ? 'left' : 'right';
};

export const MIN_LENS = 140;
export const MAX_LENS = 520;
export const DEFAULT_LENS = 260;
const LENS_VIEWPORT_MARGIN = 32;

/** Glass diameter limits: 140 to 520px, and always smaller than the viewport's short side. */
export const clampLens = (diameter: number, viewport: Size) =>
	Math.max(
		MIN_LENS,
		Math.min(
			MAX_LENS,
			viewport.w - LENS_VIEWPORT_MARGIN,
			viewport.h - LENS_VIEWPORT_MARGIN,
			diameter
		)
	);

/** Multiplicative wheel resize: scrolling up (negative deltaY) makes the glass bigger. */
export const wheelLens = (diameter: number, deltaY: number, viewport: Size) =>
	clampLens(diameter * Math.exp(-deltaY * WHEEL_SENSITIVITY), viewport);

const LIGHTBOX_MARGIN = 32;

/**
 * Size of the lightbox picture: as large as fits the viewport (minus a margin) at `aspect`,
 * but never wider than `maxWidth` (the image's own pixel width) when that is known.
 */
export const fitSize = (aspect: number, viewport: Size, maxWidth?: number): Size => {
	const safe = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
	const availW = Math.max(1, viewport.w - LIGHTBOX_MARGIN * 2);
	const availH = Math.max(1, viewport.h - LIGHTBOX_MARGIN * 2);
	let w = Math.min(availW, availH * safe);
	if (maxWidth !== undefined && Number.isFinite(maxWidth) && maxWidth > 0) {
		w = Math.min(w, maxWidth);
	}
	return { w, h: w / safe };
};
