export const MIN_YEAR = 1920;

/** Params that narrow a NASA search. Shared by the server's param builder and the date slider. */
export const SEARCH_PARAMS = [
	'q',
	'center',
	'description',
	'keywords',
	'location',
	'nasa_id',
	'photographer',
	'secondary_creator',
	'title',
	'year_start',
	'year_end'
];

type Params = { get(name: string): string | null };
type ParamPairs = Iterable<[string, string]>;

export interface YearRange {
	start: number;
	end: number;
}

/** Parses a four-digit year and clamps it to MIN_YEAR..maxYear. Anything else is undefined. */
export const parseYear = (
	value: string | null | undefined,
	maxYear: number
): number | undefined => {
	const text = value?.trim();
	if (!text || !/^\d{4}$/.test(text)) return undefined;
	return Math.min(Math.max(Number(text), MIN_YEAR), maxYear);
};

/** Reads year_start/year_end, clamping each and swapping them when reversed. */
export const parseYearParams = (
	source: Params,
	maxYear: number
): { start?: number; end?: number } => {
	const start = parseYear(source.get('year_start'), maxYear);
	const end = parseYear(source.get('year_end'), maxYear);
	if (start !== undefined && end !== undefined && start > end) return { start: end, end: start };
	return { start, end };
};

/** True when no whitelisted param besides the years is set. NASA is then asked for the current year. */
export const hasNoFilters = (source: Params): boolean =>
	SEARCH_PARAMS.every(
		(name) => name === 'year_start' || name === 'year_end' || !source.get(name)?.trim()
	);

/** The years actually being searched, for the slider to show. */
export const effectiveRange = (source: Params, maxYear: number): YearRange => {
	const { start, end } = parseYearParams(source, maxYear);
	if (start === undefined && end === undefined) {
		return hasNoFilters(source)
			? { start: maxYear, end: maxYear }
			: { start: MIN_YEAR, end: maxYear };
	}
	return { start: start ?? MIN_YEAR, end: end ?? maxYear };
};

/** Builds the search string (without the leading `?`) for a chosen range, dropping `page` and keeping other params. */
export const rangeToSearch = (source: ParamPairs, range: YearRange, maxYear: number): string => {
	const next = new URLSearchParams([...source]);
	next.delete('page');
	next.delete('year_start');
	next.delete('year_end');
	const full = range.start === MIN_YEAR && range.end === maxYear;
	if (full) {
		// On the plain home page, omitting both would fall back to the current year
		if (hasNoFilters(next)) next.set('year_start', String(MIN_YEAR));
	} else {
		if (range.start !== MIN_YEAR) next.set('year_start', String(range.start));
		if (range.end !== maxYear) next.set('year_end', String(range.end));
	}
	return next.toString();
};

/** Search string without year params, used by Reset. */
export const withoutYears = (source: ParamPairs): string => {
	const next = new URLSearchParams([...source]);
	next.delete('page');
	next.delete('year_start');
	next.delete('year_end');
	return next.toString();
};
