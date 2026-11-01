import { describe, expect, it } from 'vitest';
import {
	effectiveRange,
	parseYear,
	parseYearParams,
	rangeToSearch,
	withoutYears
} from './years.js';

const sp = (s: string) => new URLSearchParams(s);
const NOW = 2026;

describe('parseYear', () => {
	it('accepts four-digit years and clamps them', () => {
		expect(parseYear('1969', NOW)).toBe(1969);
		expect(parseYear('1800', NOW)).toBe(1920);
		expect(parseYear('2999', NOW)).toBe(NOW);
	});
	it('rejects anything else', () => {
		for (const v of ['abc', '', '19', '19690', '-1969', '1e3', null, undefined]) {
			expect(parseYear(v, NOW)).toBeUndefined();
		}
	});
});

describe('parseYearParams', () => {
	it('swaps reversed years', () => {
		expect(parseYearParams(sp('year_start=1990&year_end=1970'), NOW)).toEqual({
			start: 1970,
			end: 1990
		});
	});
	it('keeps a single valid bound', () => {
		expect(parseYearParams(sp('year_start=abc&year_end=1950'), NOW)).toEqual({
			start: undefined,
			end: 1950
		});
	});
});

describe('effectiveRange', () => {
	it('is the current year on the plain home page', () => {
		expect(effectiveRange(sp(''), NOW)).toEqual({ start: NOW, end: NOW });
		expect(effectiveRange(sp('year_start=abc'), NOW)).toEqual({ start: NOW, end: NOW });
	});
	it('is the full range on a search without years', () => {
		expect(effectiveRange(sp('q=Apollo'), NOW)).toEqual({ start: 1920, end: NOW });
	});
	it('reads and clamps the params', () => {
		expect(effectiveRange(sp('q=a&year_start=1969&year_end=1972'), NOW)).toEqual({
			start: 1969,
			end: 1972
		});
		expect(effectiveRange(sp('year_start=1800&year_end=2999'), NOW)).toEqual({
			start: 1920,
			end: NOW
		});
	});
});

describe('rangeToSearch', () => {
	it('omits both params for the full range on a search', () => {
		expect(rangeToSearch(sp('q=a&year_start=1950&page=3'), { start: 1920, end: NOW }, NOW)).toBe(
			'q=a'
		);
	});
	it('keeps year_start=1920 on the plain home page', () => {
		expect(rangeToSearch(sp(''), { start: 1920, end: NOW }, NOW)).toBe('year_start=1920');
	});
	it('sets only the bounds that differ and keeps other params', () => {
		expect(rangeToSearch(sp('q=a'), { start: 1969, end: NOW }, NOW)).toBe('q=a&year_start=1969');
		expect(rangeToSearch(sp('q=a'), { start: 1920, end: 1972 }, NOW)).toBe('q=a&year_end=1972');
		expect(rangeToSearch(sp('q=a'), { start: 1969, end: 1972 }, NOW)).toBe(
			'q=a&year_start=1969&year_end=1972'
		);
	});
});

describe('withoutYears', () => {
	it('removes years and page only', () => {
		expect(withoutYears(sp('q=a&year_start=1950&year_end=1960&page=2'))).toBe('q=a');
		expect(withoutYears(sp('year_start=1950'))).toBe('');
	});
});
