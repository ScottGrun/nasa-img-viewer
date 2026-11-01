<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import {
		MIN_YEAR,
		effectiveRange,
		parseYearParams,
		rangeToSearch,
		withoutYears
	} from '#lib/years.js';

	const maxYear = new Date().getFullYear();

	// What the URL says is being searched. The local values follow it, and move freely while dragging.
	const committed = $derived(effectiveRange(page.url.searchParams, maxYear));
	let low = $derived(committed.start);
	let high = $derived(committed.end);

	const isSet = $derived.by(() => {
		const { start, end } = parseYearParams(page.url.searchParams, maxYear);
		return start !== undefined || end !== undefined;
	});
	const resetSearch = $derived(withoutYears(page.url.searchParams));

	const span = maxYear - MIN_YEAR;
	const lowFrac = $derived((low - MIN_YEAR) / span);
	const highFrac = $derived((high - MIN_YEAR) / span);
	// When both thumbs overlap, the one that can still move away must be on top
	const lowOnTop = $derived(low === high && low > MIN_YEAR + span / 2);

	let root: HTMLElement | undefined = $state(undefined);

	// Labels follow the thumbs live; the page only navigates on release (`change`)
	// When both thumbs share a year, only the top one can be grabbed. Which one the user means
	// is decided by the direction of the first move, so either can be dragged apart.
	let tied = false;
	let moving: 'low' | 'high' | undefined;
	const press = () => {
		tied = low === high;
		moving = undefined;
	};
	const onLow = (event: Event & { currentTarget: HTMLInputElement }) => {
		const value = Number(event.currentTarget.value);
		if (tied && !moving && value !== low) moving = value > high ? 'high' : 'low';
		if (moving === 'high') high = Math.max(value, low);
		else low = Math.min(value, high);
		event.currentTarget.value = String(low);
	};
	const onHigh = (event: Event & { currentTarget: HTMLInputElement }) => {
		const value = Number(event.currentTarget.value);
		if (tied && !moving && value !== high) moving = value < low ? 'low' : 'high';
		if (moving === 'low') low = Math.min(value, high);
		else high = Math.max(value, low);
		event.currentTarget.value = String(high);
	};

	// Releasing a thumb can fire both `pointerup` and `change`; only the first may navigate
	let requested = '';
	const commit = async () => {
		tied = false;
		const wanted = `${low}-${high}`;
		if ((low === committed.start && high === committed.end) || wanted === requested) return;
		requested = wanted;
		const pastSlider = (root?.getBoundingClientRect().bottom ?? 0) < 0;
		const search = rangeToSearch(page.url.searchParams, { start: low, end: high }, maxYear);
		await goto(search ? resolve(`/?${search}`) : resolve('/'), {
			replaceState: true,
			reset: false
		});
		requested = '';
		if (pastSlider) root?.scrollIntoView({ block: 'start' });
	};
</script>

<div
	bind:this={root}
	role="group"
	aria-label="Year range"
	class="mb-4 flex items-center gap-3 font-mono text-xs text-neutral-600"
>
	<span class="w-9 text-right tabular-nums" aria-hidden="true">{low}</span>
	<div
		class="range relative h-6 max-w-md flex-1"
		style:--low-frac={lowFrac}
		style:--high-frac={highFrac}
	>
		<div class="track" aria-hidden="true"></div>
		<div class="fill" aria-hidden="true"></div>
		<input
			type="range"
			aria-label="Earliest year"
			min={MIN_YEAR}
			max={maxYear}
			step="1"
			value={low}
			class:on-top={lowOnTop}
			onpointerdown={press}
			onpointerup={commit}
			oninput={onLow}
			onchange={commit}
		/>
		<input
			type="range"
			aria-label="Latest year"
			min={MIN_YEAR}
			max={maxYear}
			step="1"
			value={high}
			onpointerdown={press}
			onpointerup={commit}
			oninput={onHigh}
			onchange={commit}
		/>
	</div>
	<span class="w-9 tabular-nums" aria-hidden="true">{high}</span>
	<a
		href={resetSearch ? resolve(`/?${resetSearch}`) : resolve('/')}
		data-sveltekit-replacestate
		inert={!isSet}
		class="w-10 text-[11px] underline decoration-neutral-300 underline-offset-2 transition-colors hover:text-nasa-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-dark"
		class:invisible={!isSet}>Reset</a
	>
</div>

<style>
	.track,
	.fill {
		position: absolute;
		top: 50%;
		translate: 0 -50%;
		border-radius: 9999px;
		pointer-events: none;
	}
	.track {
		left: 12px;
		right: 12px;
		height: 2px;
		background: var(--color-neutral-300);
	}
	.fill {
		left: calc(12px + (100% - 24px) * var(--low-frac));
		height: 2px;
		background: var(--color-nasa-red);
	}
	.fill {
		width: calc((100% - 24px) * (var(--high-frac) - var(--low-frac)));
	}

	input[type='range'] {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0;
		appearance: none;
		background: transparent;
		pointer-events: none;
	}
	input[type='range'].on-top {
		z-index: 1;
	}
	input[type='range']:focus {
		outline: none;
	}

	/* 24px target; the visible dot and focus ring are drawn inside it */
	input[type='range']::-webkit-slider-thumb {
		appearance: none;
		width: 24px;
		height: 24px;
		border: 0;
		border-radius: 50%;
		cursor: grab;
		pointer-events: auto;
		background: radial-gradient(circle, var(--color-nasa-red) 0 6px, transparent 6.5px);
		transition: background 120ms;
	}
	input[type='range']::-moz-range-thumb {
		width: 24px;
		height: 24px;
		border: 0;
		border-radius: 50%;
		cursor: grab;
		pointer-events: auto;
		background: radial-gradient(circle, var(--color-nasa-red) 0 6px, transparent 6.5px);
		transition: background 120ms;
	}
	input[type='range']:hover::-webkit-slider-thumb,
	input[type='range']:active::-webkit-slider-thumb {
		background: radial-gradient(circle, var(--color-nasa-red) 0 7px, transparent 7.5px);
	}
	input[type='range']:hover::-moz-range-thumb,
	input[type='range']:active::-moz-range-thumb {
		background: radial-gradient(circle, var(--color-nasa-red) 0 7px, transparent 7.5px);
	}
	input[type='range']:focus-visible::-webkit-slider-thumb {
		background: radial-gradient(
			circle,
			var(--color-nasa-red) 0 6px,
			#fff 6px 8px,
			var(--color-primary-dark) 8px 10px,
			transparent 10.5px
		);
	}
	input[type='range']:focus-visible::-moz-range-thumb {
		background: radial-gradient(
			circle,
			var(--color-nasa-red) 0 6px,
			#fff 6px 8px,
			var(--color-primary-dark) 8px 10px,
			transparent 10.5px
		);
	}

	@media (prefers-reduced-motion: reduce) {
		input[type='range']::-webkit-slider-thumb,
		input[type='range']::-moz-range-thumb {
			transition: none;
		}
	}
</style>
