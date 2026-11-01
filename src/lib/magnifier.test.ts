import { describe, expect, it } from 'vitest';
import { clampZoom, defaultZoom, maxZoom, nativeZoom, wheelZoom } from './magnifier.js';

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
