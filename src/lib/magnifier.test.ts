import { describe, expect, it } from 'vitest';
import {
	clampLens,
	clampZoom,
	fitSize,
	defaultZoom,
	maxZoom,
	minimapMarker,
	minimapOrigin,
	minimapSize,
	nativeZoom,
	nextMinimapCorner,
	visibleBox,
	wheelLens,
	wheelZoom
} from './magnifier.js';

describe('magnifier zoom', () => {
	it('computes native zoom only from known sizes', () => {
		expect(nativeZoom(4000, 1000)).toBe(4);
		expect(nativeZoom(undefined, 1000)).toBeUndefined();
		expect(nativeZoom(Number.NaN, 1000)).toBeUndefined();
		expect(nativeZoom(4000, 0)).toBeUndefined();
	});

	it('defaults to native, at least 2, else 3 when unknown', () => {
		expect(defaultZoom(5)).toBe(5);
		expect(defaultZoom(1.2)).toBe(2);
		expect(defaultZoom(undefined)).toBe(3);
		expect(defaultZoom(40)).toBe(16);
	});

	it('bounds the range', () => {
		expect(maxZoom(undefined)).toBe(4);
		expect(maxZoom(1)).toBe(4);
		expect(maxZoom(5)).toBe(10);
		expect(maxZoom(50)).toBe(16);
		expect(clampZoom(0.1, 5)).toBe(1.5);
		expect(clampZoom(99, 5)).toBe(10);
	});

	it('zooms multiplicatively with the wheel and clamps', () => {
		expect(wheelZoom(3, -100, undefined)).toBeCloseTo(3 * Math.exp(0.2));
		expect(wheelZoom(3, 100, undefined)).toBeLessThan(3);
		expect(wheelZoom(3, -10000, undefined)).toBe(4);
		expect(wheelZoom(3, 10000, undefined)).toBe(1.5);
	});
});

describe('minimap', () => {
	const map = minimapSize({ w: 800, h: 400 });

	it('sizes by the longest side', () => {
		expect(map).toEqual({ w: 160, h: 80 });
		expect(minimapSize({ w: 400, h: 800 })).toEqual({ w: 80, h: 160 });
	});

	it('places the marker from the cursor fraction and shrinks with zoom', () => {
		const a = minimapMarker({ x: 200, y: 100 }, { w: 800, h: 400 }, 2, 260, map);
		expect(a.cx).toBeCloseTo(40);
		expect(a.cy).toBeCloseTo(20);
		expect(a.d).toBeCloseTo(26);
		const b = minimapMarker({ x: 200, y: 100 }, { w: 800, h: 400 }, 4, 260, map);
		expect(b.d).toBeCloseTo(13);
		expect(minimapMarker({ x: 0, y: 0 }, { w: 800, h: 400 }, 16, 260, map).d).toBe(6);
	});

	it('intersects the image with the viewport', () => {
		const view = { w: 1000, h: 500 };
		expect(visibleBox({ left: 0, top: -200, w: 800, h: 1000 }, view)).toEqual({
			left: 0,
			top: 0,
			w: 800,
			h: 500
		});
		expect(visibleBox({ left: 0, top: 600, w: 10, h: 10 }, view)).toBeUndefined();
	});

	it('anchors to the chosen bottom corner', () => {
		const visible = { left: 0, top: 0, w: 800, h: 500 };
		expect(minimapOrigin(visible, map, 'right')).toEqual({ left: 628, top: 408 });
		expect(minimapOrigin(visible, map, 'left')).toEqual({ left: 12, top: 408 });
	});

	it('flips left near the corner and returns only after the margin', () => {
		const visible = { left: 0, top: 0, w: 800, h: 500 };
		const at = (cx: number) => ({ cx, cy: 450, r: 130 });
		// the bottom-right box spans x 628..788
		expect(nextMinimapCorner('right', at(400), visible, map)).toBe('right');
		expect(nextMinimapCorner('right', at(520), visible, map)).toBe('left');
		// 628 - 130 = 498: touching, so within the margin it stays left
		expect(nextMinimapCorner('left', at(480), visible, map)).toBe('left');
		expect(nextMinimapCorner('left', at(460), visible, map)).toBe('right');
	});
});

describe('glass size', () => {
	const big = { w: 1280, h: 800 };
	it('clamps to 140..520 and the viewport', () => {
		expect(clampLens(50, big)).toBe(140);
		expect(clampLens(900, big)).toBe(520);
		expect(clampLens(300, big)).toBe(300);
		expect(clampLens(520, { w: 1280, h: 400 })).toBe(368);
		expect(clampLens(200, { w: 100, h: 100 })).toBe(140);
	});

	it('resizes multiplicatively', () => {
		expect(wheelLens(260, -100, big)).toBeCloseTo(260 * Math.exp(0.2));
		expect(wheelLens(260, 100, big)).toBeLessThan(260);
		expect(wheelLens(260, -100000, big)).toBe(520);
		expect(wheelLens(260, 100000, big)).toBe(140);
	});
});

describe('fitSize', () => {
	it('fits the viewport keeping the aspect ratio', () => {
		const wide = fitSize(1.5, { w: 1280, h: 800 });
		expect(wide.w).toBeCloseTo(1104);
		expect(wide.h).toBeCloseTo(736);
		const tall = fitSize(0.5, { w: 1280, h: 800 });
		expect(tall.h).toBeCloseTo(736);
		expect(tall.w).toBeCloseTo(368);
	});

	it('does not exceed the image pixel width and tolerates bad input', () => {
		expect(fitSize(2, { w: 1280, h: 800 }, 500)).toEqual({ w: 500, h: 250 });
		expect(fitSize(Number.NaN, { w: 400, h: 400 }).w).toBe(336);
	});
});
