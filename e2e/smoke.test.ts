import { expect, test, type Locator, type Page } from '@playwright/test';

const imageLinks = (page: Page) => page.locator('main a[href^="/image/"]');

const hrefs = async (page: Page) =>
	imageLinks(page).evaluateAll((els) => els.map((e) => e.getAttribute('href')));

test('home page loads and shows images', async ({ page }) => {
	await page.goto('/');
	await expect(imageLinks(page).first()).toBeAttached();
	expect(await imageLinks(page).count()).toBeGreaterThan(0);
	await expect(page.locator('main img').first()).toBeAttached();
});

test('first image link opens its detail page', async ({ page }) => {
	await page.goto('/');
	const first = imageLinks(page).first();
	await expect(first).toBeAttached();
	const href = await first.getAttribute('href');
	expect(href).toMatch(/^\/image\/.+/);
	await first.click({ force: true });
	await expect(page).toHaveURL(new RegExp(`${href}$`));
	await expect(page.locator('h1')).toBeVisible();
	await expect(page.locator('h1')).not.toBeEmpty();
	await expect(page.locator('main img').first()).toBeAttached();
});

test('home page shows different results after following a category link', async ({ page }) => {
	await page.goto('/');
	await expect(imageLinks(page).first()).toBeAttached();
	const before = await hrefs(page);

	// Category pills link to /?q=...
	await page.locator('nav a[href^="/?q="]').first().click();
	await expect(page).toHaveURL(/\?q=/);
	await expect.poll(async () => JSON.stringify(await hrefs(page))).not.toBe(JSON.stringify(before));
});

const DETAIL = '/image/AFRC2026-0062-27';

test('detail page shows related images and navigates to one', async ({ page }) => {
	await page.goto(DETAIL);
	await expect(page.locator('h1')).toBeVisible();
	const related = page.locator('section:has(h2:text("Related images")) a[href^="/image/"]');
	expect(await related.count()).toBeGreaterThan(0);
	const href = await related.first().getAttribute('href');
	await related.first().click({ force: true });
	await expect(page).toHaveURL(new RegExp(`${href}$`));
	await expect(page.locator('h1')).toBeVisible();
	await expect(page.locator('h1')).not.toBeEmpty();
});

test('detail page does not request ~orig images at desktop size', async ({ page }) => {
	const requested: string[] = [];
	page.on('request', (req) => requested.push(req.url()));
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto(DETAIL);
	await expect(page.locator('main img').first()).toBeAttached();
	await page.waitForLoadState('networkidle');
	expect(requested.filter((u) => u.includes('~orig'))).toEqual([]);
});

test('detail page main image renders on a phone', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(DETAIL);
	const img = page.locator('main picture img').first();
	await expect(img).toBeAttached();
	await expect
		.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
		.toBeGreaterThan(0);
});

test('home gallery lazy-loads appropriately sized images', async ({ page }) => {
	const requested: string[] = [];
	page.on('request', (req) => requested.push(req.url()));
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/');
	const images = page.locator('main img');
	await expect(images.first()).toBeAttached();
	await page.waitForLoadState('networkidle');

	const loading = await images.evaluateAll((els) => els.map((el) => el.getAttribute('loading')));
	expect(loading.length).toBeGreaterThan(0);
	expect(loading.every((l) => l === 'lazy')).toBe(true);
	expect(requested.filter((u) => u.includes('~orig') || u.includes('~large'))).toEqual([]);

	const current = await images.evaluateAll((els) =>
		(els as HTMLImageElement[]).filter((el) => el.currentSrc).map((el) => el.currentSrc)
	);
	expect(current.length).toBeGreaterThan(0);
	expect(current.every((u) => /~(small|medium)\./.test(u))).toBe(true);
});

test('unknown image id returns 404 and shows the error page', async ({ page }) => {
	const response = await page.goto('/image/doesnotexist123');
	expect(response?.status()).toBe(404);
	await expect(page.getByText('Image not found')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Back to home' })).toBeVisible();
});

test('Inter and DM Mono web fonts load', async ({ page }) => {
	const fontStatuses: Record<string, number> = {};
	page.on('response', (res) => {
		if (/\.woff2?$/.test(res.url())) fontStatuses[res.url().split('/').pop()!] = res.status();
	});

	await page.goto('/');
	await imageLinks(page).first().click({ force: true });
	await expect(page.locator('h1')).toBeVisible();
	await page.evaluate(() => document.fonts.ready);

	expect(Object.keys(fontStatuses).some((f) => f.startsWith('inter-'))).toBe(true);
	expect(Object.keys(fontStatuses).some((f) => f.startsWith('dm-mono-'))).toBe(true);
	expect(Object.values(fontStatuses).every((s) => s === 200)).toBe(true);
	expect(await page.evaluate(() => document.fonts.check("16px 'Inter Variable'"))).toBe(true);
	expect(await page.evaluate(() => document.fonts.check("16px 'DM Mono'"))).toBe(true);
});

const SUFFIX = ' | NASA Image Viewer';
const noMore = (page: Page) => page.getByText('No more images');
const markNavigation = (page: Page) =>
	page.evaluate(() => {
		(window as unknown as { __marker: number }).__marker = 1;
	});
const marker = (page: Page) =>
	page.evaluate(() => (window as unknown as { __marker?: number }).__marker);

const position = (link: Locator) =>
	link.evaluate((el) => {
		const r = el.getBoundingClientRect();
		return { x: r.x, y: r.y + window.scrollY };
	});

const scrollUntilMoreThan = async (page: Page, count: number) => {
	await expect
		.poll(
			async () => {
				await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
				return imageLinks(page).count();
			},
			{ timeout: 30_000 }
		)
		.toBeGreaterThan(count);
};

test('keyword tag shows the real apostrophe and links to results', async ({ page }) => {
	await page.goto(DETAIL);
	const tag = page.locator('a[href^="/?keywords="]', { hasText: 'NASA’s Armstrong' }).first();
	await expect(tag).toBeVisible();
	await tag.click();
	await expect(page).toHaveURL(/\?keywords=/);
	await expect(imageLinks(page).first()).toBeAttached();
});

test('infinite scroll appends images without duplicates or moving earlier ones', async ({
	page
}) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/?q=Apollo');
	await expect(imageLinks(page)).toHaveCount(48);
	const first = imageLinks(page).first();
	const firstHref = await first.getAttribute('href');
	const before = await position(first);

	await scrollUntilMoreThan(page, 48);
	const ids = (await hrefs(page)) as string[];
	expect(new Set(ids).size).toBe(ids.length);
	expect(ids[0]).toBe(firstHref);
	// Sub-pixel layout differences are fine; an image changing column would move it far more.
	const after = await position(first);
	expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
	expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
});

test('shows "No more images" at the end of a short result set', async ({ page }) => {
	await page.goto('/?nasa_id=PIA04928');
	await expect(imageLinks(page)).toHaveCount(1);
	await expect(noMore(page)).toBeVisible();
});

test('shows an empty state for a search with no results', async ({ page }) => {
	await page.goto('/?q=zzzqqqxxnotreal');
	await expect(page.getByText('No images found for "zzzqqqxxnotreal"')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Back to home' })).toBeVisible();
	await expect(noMore(page)).toHaveCount(0);
});

test('opening an image is a client-side navigation', async ({ page }) => {
	await page.goto('/?q=Apollo');
	await expect(imageLinks(page).first()).toBeAttached();
	await markNavigation(page);
	await imageLinks(page).first().click({ force: true });
	await expect(page).toHaveURL(/\/image\//);
	await expect(page.locator('h1')).not.toBeEmpty();
	expect(await marker(page)).toBe(1);
});

test('search form submits via client navigation and updates results', async ({ page }) => {
	await page.goto('/');
	await expect(imageLinks(page).first()).toBeAttached();
	const before = JSON.stringify(await hrefs(page));
	await markNavigation(page);
	await page.getByLabel('Search for images').fill('Gemini');
	await page.getByLabel('Search for images').press('Enter');
	await expect(page).toHaveURL(/\?q=Gemini/);
	await expect.poll(async () => JSON.stringify(await hrefs(page))).not.toBe(before);
	expect(await marker(page)).toBe(1);
	await expect(page.getByLabel('Search for images')).toHaveValue('Gemini');
});

test('going back keeps images loaded by scrolling', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/?q=Apollo');
	await expect(imageLinks(page)).toHaveCount(48);
	await scrollUntilMoreThan(page, 48);
	const loaded = (await hrefs(page)) as string[];

	await imageLinks(page).first().click({ force: true });
	await expect(page.locator('h1')).not.toBeEmpty();
	await page.goBack();
	await expect(page).toHaveURL(/\?q=Apollo/);
	await expect.poll(() => imageLinks(page).count()).toBeGreaterThanOrEqual(loaded.length);
	expect((await hrefs(page)) as string[]).toEqual(expect.arrayContaining(loaded));
});

test('page titles', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveTitle('NASA Image Viewer');
	await page.goto('/?q=Apollo');
	await expect(page).toHaveTitle(`Apollo${SUFFIX}`);
	await page.goto(DETAIL);
	const h1 = (await page.locator('h1').innerText()).trim();
	await expect(page).toHaveTitle(`${h1}${SUFFIX}`);
	await page.goto('/image/doesnotexist123');
	await expect(page).toHaveTitle(`404${SUFFIX}`);
});

test('gallery columns stay balanced across loaded batches', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/?q=Apollo');
	const links = page.locator('main a[href*="image/"]');
	await expect(links).toHaveCount(48);
	await expect
		.poll(
			async () => {
				await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
				return links.count();
			},
			{ timeout: 20_000 }
		)
		.toBeGreaterThan(48);

	const layout = await page.evaluate(() => {
		const columns = [...document.querySelectorAll('[data-masonary-column]')];
		const bottoms = columns.map((c) => c.getBoundingClientRect().bottom);
		const tallest = Math.max(
			...[...document.querySelectorAll('[data-masonary-column] > *')].map(
				(el) => el.getBoundingClientRect().height
			)
		);
		return { count: columns.length, spread: Math.max(...bottoms) - Math.min(...bottoms), tallest };
	});
	expect(layout.count).toBe(3);
	expect(layout.spread).toBeLessThanOrEqual(layout.tallest + 8);
});

test('detail data streams: title first, related images in a later chunk', async ({ page }) => {
	await page.goto('/');
	const body = await page.evaluate(async (url) => {
		const res = await fetch(url);
		const reader = res.body!.getReader();
		const decoder = new TextDecoder();
		const parts: string[] = [];
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			parts.push(decoder.decode(value, { stream: true }));
		}
		return parts.join('');
	}, `${DETAIL}/__data.json`);

	const lines = body.split('\n').filter(Boolean);
	// The first line is the page data with `related` still a pending promise reference
	expect(lines[0]).toContain('"type":"data"');
	expect(lines[0]).toContain('"AVAIL:Title"');
	expect(lines[0]).toContain('["Promise"');
	expect(lines[0]).not.toContain('"preview"');
	// Related images arrive in a separate, later chunk
	const later = lines.slice(1).find((line) => line.includes('"type":"chunk"'));
	expect(later).toContain('"preview"');
});

const SEARCH = '/?q=Apollo';
const isLarge = (url: string) => /~large\./.test(url);

test.describe('hover preload (desktop)', () => {
	test.use({ viewport: { width: 1280, height: 800 } });

	test('hovering a card preloads the exact image the detail page then uses', async ({ page }) => {
		const requests: string[] = [];
		page.on('request', (req) => requests.push(req.url()));
		await page.goto(SEARCH);
		const card = imageLinks(page).first();
		await expect(card).toBeAttached();
		await card.hover({ force: true });
		const preloaded = (await page.waitForRequest((req) => isLarge(req.url()))).url();

		await card.click({ force: true });
		await expect(page.locator('h1')).not.toBeEmpty();
		const img = page.locator('main picture img').first();
		await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.currentSrc)).toBe(preloaded);
		// NASA sends max-age=300, so the detail page reuses the preloaded response
		expect(requests.filter((u) => u === preloaded)).toHaveLength(1);
	});

	test('sweeping the mouse across a card does not preload', async ({ page }) => {
		const requests: string[] = [];
		page.on('request', (req) => requests.push(req.url()));
		await page.goto(SEARCH);
		const card = imageLinks(page).first();
		await expect(card).toBeAttached();
		await page.waitForLoadState('networkidle');
		const box = (await card.boundingBox())!;
		await page.mouse.move(box.x - 20, box.y + box.height / 2);
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.move(box.x + box.width + 20, box.y + box.height / 2);
		await page.waitForTimeout(500);
		expect(requests.filter(isLarge)).toEqual([]);
	});
});

test.describe('hover preload (phone)', () => {
	test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

	test('scrolling and tapping does not preload', async ({ page }) => {
		const requests: string[] = [];
		page.on('request', (req) => requests.push(req.url()));
		await page.addInitScript(() => {
			const w = window as unknown as { __imageCtors: number };
			w.__imageCtors = 0;
			const Native = window.Image;
			window.Image = class extends Native {
				constructor(...args: ConstructorParameters<typeof Native>) {
					super(...args);
					w.__imageCtors++;
				}
			} as typeof Image;
		});
		await page.goto(SEARCH);
		await expect(imageLinks(page).first()).toBeAttached();
		await page.waitForLoadState('networkidle');

		const cdp = await page.context().newCDPSession(page);
		const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', y: number) =>
			cdp.send('Input.dispatchTouchEvent', {
				type,
				touchPoints: type === 'touchEnd' ? [] : [{ x: 200, y }]
			});
		await touch('touchStart', 600);
		await touch('touchMove', 400);
		await touch('touchMove', 200);
		await touch('touchEnd', 200);
		await page.touchscreen.tap(200, 300);
		await page.waitForTimeout(500);

		expect(
			await page.evaluate(() => (window as unknown as { __imageCtors: number }).__imageCtors)
		).toBe(0);
		expect(requests.filter(isLarge)).toEqual([]);
	});
});

test.describe('image lightbox', () => {
	const trigger = (page: Page) => page.getByRole('button', { name: 'View full screen' });
	const dialog = (page: Page) => page.getByRole('dialog');
	const picture = (page: Page) =>
		dialog(page).getByRole('button', { name: 'Toggle image magnifier' });
	const closeButton = (page: Page) => page.getByRole('button', { name: 'Close full screen view' });
	const glass = (page: Page) => page.getByTestId('magnifier-glass');
	const glassImg = (page: Page) => glass(page).locator('img');
	const minimap = (page: Page) => page.getByTestId('magnifier-minimap');
	const marker = (page: Page) => page.getByTestId('magnifier-marker');
	const hint = (page: Page) => page.getByTestId('magnifier-hint');

	const load = async (page: Page, requested: string[]) => {
		page.on('request', (req) => requested.push(req.url()));
		await page.goto(DETAIL);
		await expect(page.locator('main picture img').first()).toBeAttached();
		await expect
			.poll(() =>
				page
					.locator('main picture img')
					.first()
					.evaluate((el: HTMLImageElement) => el.naturalWidth)
			)
			.toBeGreaterThan(0);
		await page.waitForLoadState('networkidle');
	};
	const settled = (page: Page) =>
		expect
			.poll(() => page.getByTestId('lightbox-picture').evaluate((el) => el.getAnimations().length))
			.toBe(0);

	const orig = (urls: string[]) => urls.filter((u) => u.includes('~orig'));
	const isInDialog = (page: Page, testId: string) =>
		page.getByTestId(testId).evaluate((el) => !!el.closest('dialog'));

	test('the detail page has no magnifier and requests no original', async ({ page }) => {
		const requested: string[] = [];
		await page.setViewportSize({ width: 1280, height: 800 });
		await load(page, requested);
		await expect(trigger(page)).toHaveAttribute('aria-label', 'View full screen');
		expect(await trigger(page).evaluate((el) => getComputedStyle(el).cursor)).toBe('zoom-in');
		const box = (await trigger(page).boundingBox())!;
		await page.mouse.move(box.x + 100, box.y + 100);
		await page.mouse.move(box.x + 110, box.y + 100);
		await page.waitForTimeout(500);
		await expect(glass(page)).toHaveCount(0);
		await expect(hint(page)).toHaveCount(0);
		expect(orig(requested)).toEqual([]);
	});

	test('opens, loads the original, fits the viewport and locks the page', async ({ page }) => {
		test.setTimeout(120_000);
		const requested: string[] = [];
		await page.setViewportSize({ width: 1280, height: 800 });
		await load(page, requested);
		await page.evaluate(() => window.scrollTo(0, 120));
		const scrollBefore = await page.evaluate(() => window.scrollY);
		await trigger(page).click();
		await expect(dialog(page)).toBeVisible();
		await expect.poll(() => orig(requested).length).toBeGreaterThan(0);
		await expect
			.poll(
				() =>
					picture(page)
						.locator('img')
						.evaluate((el: HTMLImageElement) => el.currentSrc),
				{
					timeout: 90_000
				}
			)
			.toContain('~orig');
		const rect = (await picture(page).locator('img').boundingBox())!;
		expect(rect.x).toBeGreaterThanOrEqual(0);
		expect(rect.y).toBeGreaterThanOrEqual(0);
		expect(rect.x + rect.width).toBeLessThanOrEqual(1280);
		expect(rect.y + rect.height).toBeLessThanOrEqual(800);

		await page.mouse.move(640, 400);
		await page.mouse.wheel(0, 400);
		await page.waitForTimeout(200);
		expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);

		await page.keyboard.press('Escape');
		await expect(dialog(page)).toBeHidden();
		expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
		await page.mouse.wheel(0, 200);
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore);
	});

	test('closes with Esc, the X button and the backdrop; clicking the picture does not', async ({
		page
	}) => {
		const requested: string[] = [];
		await page.setViewportSize({ width: 1280, height: 800 });
		await load(page, requested);

		for (const how of ['escape', 'button', 'backdrop'] as const) {
			await trigger(page).click();
			await expect(dialog(page)).toBeVisible();
			if (how === 'escape') await page.keyboard.press('Escape');
			if (how === 'button') await closeButton(page).click();
			if (how === 'backdrop') {
				await picture(page).click();
				await expect(dialog(page)).toBeVisible();
				await page.mouse.click(8, 400);
			}
			await expect(dialog(page)).toBeHidden();
			await expect(trigger(page)).toBeFocused();
		}
	});

	test('glass, zoom, resize, toggle, minimap and hint work inside the lightbox', async ({
		page
	}) => {
		test.setTimeout(120_000);
		const requested: string[] = [];
		await page.setViewportSize({ width: 1280, height: 800 });
		await load(page, requested);
		await trigger(page).click();
		await expect(dialog(page)).toBeVisible();
		await settled(page);

		const box = (await picture(page).boundingBox())!;
		const move = async (fx: number, fy: number) => {
			await page.mouse.move(box.x + box.width * fx - 3, box.y + box.height * fy);
			await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
		};
		await move(0.5, 0.5);
		await expect(glass(page)).toBeVisible();
		await expect(minimap(page)).toBeVisible();
		await expect(hint(page)).toHaveText(
			'Scroll to zoom · Ctrl + scroll to resize · Click to turn off · Esc to close'
		);
		expect(await isInDialog(page, 'magnifier-glass')).toBe(true);
		expect(await isInDialog(page, 'magnifier-minimap')).toBe(true);
		expect(await isInDialog(page, 'magnifier-hint')).toBe(true);
		await expect
			.poll(() => glassImg(page).evaluate((el: HTMLImageElement) => el.currentSrc), {
				timeout: 90_000
			})
			.toContain('~orig');
		// The minimap uses the already loaded picture, never the original.
		expect(await minimap(page).locator('img').getAttribute('src')).not.toContain('~orig');

		// Glass follows the mouse.
		const g0 = (await glass(page).boundingBox())!;
		await move(0.3, 0.4);
		expect((await glass(page).boundingBox())!.x).not.toBe(g0.x);

		// Marker tracks the cursor.
		const fraction = async () => {
			const m = (await minimap(page).boundingBox())!;
			const k = (await marker(page).boundingBox())!;
			return {
				fx: (k.x + k.width / 2 - m.x) / m.width,
				fy: (k.y + k.height / 2 - m.y) / m.height
			};
		};
		const f = await fraction();
		expect(f.fx).toBeCloseTo(0.3, 1);
		expect(f.fy).toBeCloseTo(0.4, 1);

		// Plain wheel zooms; the glass keeps its size.
		const innerWidth = () => glassImg(page).evaluate((el) => el.getBoundingClientRect().width);
		const glassWidth = async () => (await glass(page).boundingBox())!.width;
		const markerWidth = async () => (await marker(page).boundingBox())!.width;
		const w0 = await innerWidth();
		const size0 = await glassWidth();
		const m0 = await markerWidth();
		await page.mouse.wheel(0, -200);
		await expect.poll(innerWidth).toBeGreaterThan(w0);
		expect(await glassWidth()).toBeCloseTo(size0, 0);
		await expect.poll(markerWidth).toBeLessThanOrEqual(m0);

		// Ctrl+wheel resizes the glass; zoom is unchanged.
		const w1 = await innerWidth();
		await page.keyboard.down('Control');
		await page.mouse.wheel(0, -200);
		await page.keyboard.up('Control');
		await expect.poll(glassWidth).toBeGreaterThan(size0);
		expect(await innerWidth()).toBeCloseTo(w1, 0);

		// Click toggles the glass off and on without closing the lightbox.
		await picture(page).click();
		await expect(dialog(page)).toBeVisible();
		await expect(glass(page)).toBeHidden();
		await expect(minimap(page)).toBeHidden();
		await expect(hint(page)).toHaveText('Click to turn on magnifier');
		await picture(page).click();
		await move(0.6, 0.5);
		await expect(glass(page)).toBeVisible();

		await picture(page).dispatchEvent('pointerleave', { pointerType: 'mouse' });
		await expect(glass(page)).toBeHidden();
		await expect(hint(page)).toBeHidden();
	});

	// Records the lightbox picture's entrance animations; `pause` holds them so tests can inspect them.
	const watchAnimations = (page: Page, pause: boolean) =>
		page.addInitScript((shouldPause) => {
			const w = window as unknown as { __anims: Animation[] };
			w.__anims = [];
			(w as unknown as { __hold: boolean }).__hold = shouldPause;
			const original = Element.prototype.animate;
			Element.prototype.animate = function (
				this: Element,
				...args: Parameters<Element['animate']>
			) {
				const animation = original.apply(this, args);
				if (this.getAttribute('data-testid') === 'lightbox-picture') {
					w.__anims.push(animation);
					if ((w as unknown as { __hold: boolean }).__hold) animation.pause();
				}
				return animation;
			};
		}, pause);

	test('the picture animates in from the page image; the glass waits until it ends', async ({
		page
	}) => {
		test.setTimeout(60_000);
		const requested: string[] = [];
		await watchAnimations(page, true);
		await page.setViewportSize({ width: 1280, height: 800 });
		await load(page, requested);
		const pageRect = (await trigger(page).locator('img').boundingBox())!;
		// Click near the page image's centre and leave the mouse there.
		await page.mouse.click(pageRect.x + pageRect.width / 2, pageRect.y + pageRect.height / 2);
		await expect(dialog(page)).toBeVisible();

		const info = await page.evaluate(() => {
			const a = (window as unknown as { __anims: Animation[] }).__anims[0];
			const frames = (a.effect as KeyframeEffect).getKeyframes();
			const el = document.querySelector('[data-testid="lightbox-picture"]')!;
			const r = el.getBoundingClientRect();
			return {
				count: (window as unknown as { __anims: Animation[] }).__anims.length,
				state: a.playState,
				transforms: frames.map((f) => String(f.transform)),
				duration: (a.effect as KeyframeEffect).getTiming().duration,
				start: { x: r.x, y: r.y, w: r.width, h: r.height }
			};
		});
		expect(info.count).toBe(1);
		expect(info.state).toBe('paused');
		expect(info.duration).toBe(280);
		expect(info.transforms[0]).toContain('scale');
		expect(info.transforms[1]).toBe('none');
		// The first frame sits on the page image.
		expect(Math.abs(info.start.x - pageRect.x)).toBeLessThanOrEqual(1);
		expect(Math.abs(info.start.y - pageRect.y)).toBeLessThanOrEqual(1);
		expect(Math.abs(info.start.w - pageRect.width)).toBeLessThanOrEqual(1);

		// No glass while it is moving, even with the mouse over the picture.
		await page.mouse.move(640, 400);
		await page.mouse.move(645, 400);
		await page.waitForTimeout(200);
		await expect(glass(page)).toHaveCount(0);

		// When it ends the glass shows without another mouse move.
		const end = await page.evaluate(async () => {
			const a = (window as unknown as { __anims: Animation[] }).__anims[0];
			a.play();
			await a.finished;
			const r = document.querySelector('[data-testid="lightbox-picture"]')!.getBoundingClientRect();
			return { x: r.x, y: r.y, w: r.width, h: r.height, state: a.playState };
		});
		expect(end.state).toBe('finished');
		expect(end.x).toBeGreaterThanOrEqual(0);
		expect(end.y).toBeGreaterThanOrEqual(0);
		expect(end.x + end.w).toBeLessThanOrEqual(1280);
		expect(end.y + end.h).toBeLessThanOrEqual(800);
		await expect(glass(page)).toBeVisible();
		await expect(hint(page)).toBeVisible();
	});

	test('Esc during the animation closes it and reopening animates again', async ({ page }) => {
		const requested: string[] = [];
		await watchAnimations(page, true);
		await page.setViewportSize({ width: 1280, height: 800 });
		await load(page, requested);
		await trigger(page).click();
		await expect(dialog(page)).toBeVisible();
		// Esc while the entrance is still running: let the exit play normally.
		const setHold = (hold: boolean) =>
			page.evaluate((value) => {
				(window as unknown as { __hold: boolean }).__hold = value;
			}, hold);
		await setHold(false);
		await page.keyboard.press('Escape');
		await expect(dialog(page)).toBeHidden();
		await expect(trigger(page)).toBeFocused();
		await setHold(true);
		await trigger(page).click();
		await expect(dialog(page)).toBeVisible();
		const state = await page.evaluate(async () => {
			const anims = (window as unknown as { __anims: Animation[] }).__anims;
			const a = anims[anims.length - 1];
			const before = a.playState;
			a.play();
			await a.finished;
			return { count: anims.length, before, after: a.playState };
		});
		expect(state).toEqual({ count: 3, before: 'paused', after: 'finished' });
	});

	test('the glass opens at the lowest zoom, which cannot go lower but can go higher', async ({
		page
	}) => {
		test.setTimeout(90_000);
		const requested: string[] = [];
		await page.setViewportSize({ width: 1280, height: 800 });
		await load(page, requested);
		await trigger(page).click();
		await expect(dialog(page)).toBeVisible();
		await settled(page);
		const box = (await picture(page).boundingBox())!;
		await page.mouse.move(box.x + box.width / 2 - 4, box.y + box.height / 2);
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await expect(glass(page)).toBeVisible();
		const innerWidth = () => glassImg(page).evaluate((el) => el.getBoundingClientRect().width);
		// The original arriving does not change the zoom.
		const w0 = await innerWidth();
		expect(w0 / box.width).toBeCloseTo(1.5, 2);
		await expect
			.poll(() => glassImg(page).evaluate((el: HTMLImageElement) => el.currentSrc), {
				timeout: 90_000
			})
			.toContain('~orig');
		expect(await innerWidth()).toBeCloseTo(w0, 0);
		// Wheeling out from the default stays at the minimum.
		await page.mouse.wheel(0, 1000);
		await page.waitForTimeout(150);
		expect(await innerWidth()).toBeCloseTo(w0, 0);
		// Wheeling in works.
		await page.mouse.wheel(0, -400);
		await expect.poll(innerWidth).toBeGreaterThan(w0);
	});

	test('the glass background matches the lightbox backdrop', async ({ page }) => {
		const requested: string[] = [];
		await page.setViewportSize({ width: 1280, height: 800 });
		await load(page, requested);
		await trigger(page).click();
		await expect(dialog(page)).toBeVisible();
		await settled(page);
		const box = (await picture(page).boundingBox())!;
		// Near the corner, so part of the glass lies beyond the image.
		await page.mouse.move(box.x + 2, box.y + 2);
		await page.mouse.move(box.x + 4, box.y + 4);
		await expect(glass(page)).toBeVisible();
		const colours = await page.evaluate(() => ({
			backdrop: getComputedStyle(document.querySelector('[data-testid="lightbox-backdrop"]')!)
				.backgroundColor,
			glass: getComputedStyle(document.querySelector('[data-testid="magnifier-glass"]')!)
				.backgroundColor
		}));
		expect(colours.glass).toBe(colours.backdrop);
		expect(colours.glass).not.toBe('rgb(255, 255, 255)');
	});

	test('closing animates back to the page image, then closes (Esc, X, backdrop)', async ({
		page
	}) => {
		test.setTimeout(60_000);
		const requested: string[] = [];
		await watchAnimations(page, false);
		await page.setViewportSize({ width: 1280, height: 800 });
		await load(page, requested);
		await page.evaluate(() => window.scrollTo(0, 120));
		const scrollBefore = await page.evaluate(() => window.scrollY);
		const pageRect = (await trigger(page).locator('img').boundingBox())!;

		for (const how of ['escape', 'button', 'backdrop'] as const) {
			await trigger(page).click();
			await expect(dialog(page)).toBeVisible();
			await settled(page);
			await page.mouse.move(640, 400);
			await page.mouse.move(645, 400);
			await expect(glass(page)).toBeVisible();
			const startRect = (await picture(page).boundingBox())!;

			// Hold the exit so it can be inspected.
			await page.evaluate(() => {
				(window as unknown as { __hold: boolean }).__hold = true;
			});
			if (how === 'escape') await page.keyboard.press('Escape');
			if (how === 'button') await closeButton(page).click();
			if (how === 'backdrop') await page.mouse.click(8, 400);

			const info = await page.evaluate(() => {
				const anims = (window as unknown as { __anims: Animation[] }).__anims;
				const a = anims[anims.length - 1];
				const effect = a.effect as KeyframeEffect;
				const picture = document.querySelector('[data-testid="lightbox-picture"]')!;
				const start = picture.getBoundingClientRect();
				a.currentTime = 220;
				const end = picture.getBoundingClientRect();
				return {
					open: document.querySelector('dialog')!.open,
					state: a.playState,
					duration: effect.getTiming().duration,
					keys: effect.getKeyframes().flatMap((f) => Object.keys(f)),
					glass: document.querySelectorAll('[data-testid="magnifier-glass"]').length,
					minimap: document.querySelectorAll('[data-testid="magnifier-minimap"]').length,
					hint: document.querySelectorAll('[data-testid="magnifier-hint"]').length,
					start: { x: start.x, y: start.y, w: start.width },
					end: { x: end.x, y: end.y, w: end.width, h: end.height }
				};
			});
			expect(info.open, `${how}: still open during exit`).toBe(true);
			expect(info.duration).toBe(220);
			expect(info.keys).toContain('transform');
			expect(info.keys).not.toContain('opacity');
			expect(info.glass + info.minimap + info.hint).toBe(0);
			// It starts where the picture was and lands on the page image.
			expect(Math.abs(info.start.x - startRect.x)).toBeLessThanOrEqual(1);
			expect(Math.abs(info.start.w - startRect.width)).toBeLessThanOrEqual(1);
			expect(Math.abs(info.end.x - pageRect.x)).toBeLessThanOrEqual(1);
			expect(Math.abs(info.end.y - pageRect.y)).toBeLessThanOrEqual(1);
			expect(Math.abs(info.end.w - pageRect.width)).toBeLessThanOrEqual(1);
			expect(Math.abs(info.end.h - pageRect.height)).toBeLessThanOrEqual(1);

			// A second close request while exiting is ignored.
			await page.evaluate(() => {
				(window as unknown as { __hold: boolean }).__hold = false;
			});
			expect(
				await page.evaluate(() => {
					const anims = (window as unknown as { __anims: Animation[] }).__anims;
					const before = anims.length;
					document.querySelector<HTMLElement>('[aria-label="Close full screen view"]')!.click();
					return before === anims.length;
				})
			).toBe(true);
			// Let it finish: only now does the dialog close.
			await page.evaluate(async () => {
				const anims = (window as unknown as { __anims: Animation[] }).__anims;
				anims[anims.length - 1].finish();
			});
			await expect(dialog(page)).toBeHidden();
			await expect(trigger(page)).toBeFocused();
			expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
			expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
		}
	});

	test('reduced motion closes immediately without a movement animation', async ({ page }) => {
		const requested: string[] = [];
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await watchAnimations(page, false);
		await page.setViewportSize({ width: 1280, height: 800 });
		await load(page, requested);
		await trigger(page).click();
		await expect(dialog(page)).toBeVisible();
		await settled(page);
		const before = await page.evaluate(
			() => (window as unknown as { __anims: Animation[] }).__anims.length
		);
		await page.keyboard.press('Escape');
		await expect(dialog(page)).toBeHidden();
		expect(
			await page.evaluate(() => (window as unknown as { __anims: Animation[] }).__anims.length)
		).toBe(before);
		await expect(trigger(page)).toBeFocused();
	});

	test('reduced motion opens without a movement animation', async ({ page }) => {
		const requested: string[] = [];
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await watchAnimations(page, false);
		await page.setViewportSize({ width: 1280, height: 800 });
		await load(page, requested);
		await trigger(page).click();
		await expect(dialog(page)).toBeVisible();
		const keyframes = await page.evaluate(() =>
			(window as unknown as { __anims: Animation[] }).__anims.flatMap((a) =>
				(a.effect as KeyframeEffect).getKeyframes().map((f) => Object.keys(f))
			)
		);
		expect(keyframes.length).toBeGreaterThan(0);
		expect(keyframes.flat()).not.toContain('transform');
	});

	test.describe('glass alignment', () => {
		// The glass must sit exactly on the cursor and show the image point under it.
		const checkAlignment = async (page: Page, label: string) => {
			const pic = (await picture(page).boundingBox())!;
			const points: [number, number][] = [
				[0.5, 0.5],
				[0.06, 0.08],
				[0.94, 0.08],
				[0.06, 0.92],
				[0.94, 0.92]
			];
			for (const [fx, fy] of points) {
				const mx = pic.x + pic.width * fx;
				const my = pic.y + pic.height * fy;
				await page.mouse.move(mx - 5, my - 3);
				await page.mouse.move(mx, my);
				await expect(glass(page)).toBeVisible();
				const m = await page.evaluate(() => {
					const g = document.querySelector('[data-testid="magnifier-glass"]')!;
					const i = g.querySelector('img')!;
					const gr = g.getBoundingClientRect();
					const ir = i.getBoundingClientRect();
					return {
						gx: gr.x + gr.width / 2,
						gy: gr.y + gr.height / 2,
						ix: ir.x,
						iy: ir.y,
						iw: ir.width,
						ih: ir.height
					};
				});
				// Centre of the glass is on the mouse.
				expect(Math.abs(m.gx - mx), `${label} glass x at ${fx},${fy}`).toBeLessThanOrEqual(2);
				expect(Math.abs(m.gy - my), `${label} glass y at ${fx},${fy}`).toBeLessThanOrEqual(2);
				// The image point under the glass's centre is the one under the cursor.
				const imgX = ((m.gx - m.ix) / m.iw) * pic.width + pic.x;
				const imgY = ((m.gy - m.iy) / m.ih) * pic.height + pic.y;
				expect(Math.abs(imgX - mx), `${label} image x at ${fx},${fy}`).toBeLessThanOrEqual(2);
				expect(Math.abs(imgY - my), `${label} image y at ${fx},${fy}`).toBeLessThanOrEqual(2);
			}
		};

		test('the glass is centred on the cursor and shows the point under it', async ({ page }) => {
			test.setTimeout(90_000);
			const requested: string[] = [];
			await page.setViewportSize({ width: 1280, height: 800 });
			await load(page, requested);
			// Open with the page scrolled.
			await page.evaluate(() => window.scrollTo(0, 150));
			await trigger(page).click();
			await expect(dialog(page)).toBeVisible();
			await settled(page);

			await checkAlignment(page, 'default');
			await page.mouse.wheel(0, -300);
			await checkAlignment(page, 'zoomed');
			await page.keyboard.down('Control');
			await page.mouse.wheel(0, -300);
			await page.keyboard.up('Control');
			await checkAlignment(page, 'resized');
			await page.keyboard.down('Control');
			await page.mouse.wheel(0, 3000);
			await page.keyboard.up('Control');
			await checkAlignment(page, 'shrunk');

			// Close and reopen: still aligned.
			await page.keyboard.press('Escape');
			await expect(dialog(page)).toBeHidden();
			await trigger(page).click();
			await expect(dialog(page)).toBeVisible();
			await settled(page);
			await checkAlignment(page, 'reopened');

			// The minimap marker still tracks, and the minimap and hint stay inside the viewport.
			const mm = (await minimap(page).boundingBox())!;
			const hb = (await hint(page).boundingBox())!;
			for (const b of [mm, hb]) {
				expect(b.x).toBeGreaterThanOrEqual(0);
				expect(b.y).toBeGreaterThanOrEqual(0);
				expect(b.x + b.width).toBeLessThanOrEqual(1280);
				expect(b.y + b.height).toBeLessThanOrEqual(800);
			}
		});
	});

	test.describe('touch', () => {
		test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

		test('tap opens the lightbox with no glass, minimap or hint', async ({ page }) => {
			const requested: string[] = [];
			await load(page, requested);
			await trigger(page).tap();
			await expect(dialog(page)).toBeVisible();
			await expect.poll(() => orig(requested).length).toBeGreaterThan(0);
			await picture(page).tap();
			await page.waitForTimeout(400);
			await expect(dialog(page)).toBeVisible();
			await expect(glass(page)).toHaveCount(0);
			await expect(minimap(page)).toHaveCount(0);
			await expect(hint(page)).toHaveCount(0);
			await closeButton(page).tap();
			await expect(dialog(page)).toBeHidden();
		});
	});
});

test.describe('date range slider', () => {
	const YEAR = new Date().getFullYear();
	const earliest = (page: Page) => page.getByLabel('Earliest year');
	const latest = (page: Page) => page.getByLabel('Latest year');
	const slider = (page: Page) => page.getByRole('group', { name: 'Year range' });
	const RANGE = '/?q=Apollo&year_start=1969&year_end=1972';

	const values = async (page: Page) => [
		await earliest(page).inputValue(),
		await latest(page).inputValue()
	];

	test('shows on home and search pages, not on the detail page', async ({ page }) => {
		await page.goto('/');
		await expect(slider(page)).toBeVisible();
		await page.goto('/?q=Apollo');
		await expect(slider(page)).toBeVisible();
		await page.goto(DETAIL);
		await expect(page.locator('h1')).toBeVisible();
		await expect(slider(page)).toHaveCount(0);
		await expect(page.locator('input[type="hidden"][name^="year_"]')).toHaveCount(0);
	});

	test('shows the real filter as its initial values', async ({ page }) => {
		await page.goto('/');
		expect(await values(page)).toEqual([String(YEAR), String(YEAR)]);
		await page.goto('/?q=Apollo');
		expect(await values(page)).toEqual(['1920', String(YEAR)]);
		await page.goto(RANGE);
		expect(await values(page)).toEqual(['1969', '1972']);
	});

	test('clamps and ignores bad year params without erroring', async ({ page }) => {
		const bad = await page.goto('/?year_start=abc');
		expect(bad?.status()).toBe(200);
		expect(await values(page)).toEqual([String(YEAR), String(YEAR)]);
		const wide = await page.goto('/?year_start=1800&year_end=2999');
		expect(wide?.status()).toBe(200);
		expect(await values(page)).toEqual(['1920', String(YEAR)]);
	});

	test('a keyboard change updates the URL and the results, keeping q', async ({
		page,
		request
	}) => {
		await page.goto(RANGE);
		await expect(imageLinks(page).first()).toBeAttached();
		const before = await hrefs(page);
		await latest(page).focus();
		await page.keyboard.press('ArrowLeft');
		await expect(page).toHaveURL(/year_end=1971/);
		const url = new URL(page.url());
		expect(url.searchParams.get('q')).toBe('Apollo');
		expect(url.searchParams.get('year_start')).toBe('1969');
		await expect(latest(page)).toBeFocused();
		await expect
			.poll(async () => JSON.stringify(await hrefs(page)))
			.not.toBe(JSON.stringify(before));

		// Compare with what NASA itself returns for that range
		const nasa = await request.get(
			'https://images-api.nasa.gov/search?q=Apollo&year_start=1969&year_end=1971&media_type=image&page_size=48'
		);
		const items = (await nasa.json()).collection.items as { data: { nasa_id: string }[] }[];
		const expected = items.map((item) => `/image/${encodeURIComponent(item.data[0].nasa_id)}`);
		const shown = (await hrefs(page)).map((href) => href ?? '');
		expect(shown.length).toBeGreaterThan(0);
		for (const href of shown) expect(expected).toContain(href);
	});

	test('a drag makes one navigation, on release', async ({ page }) => {
		await page.goto('/?q=Apollo');
		await expect(imageLinks(page).first()).toBeAttached();
		const box = await slider(page).locator('div.range').boundingBox();
		if (!box) throw new Error('no slider box');
		let navigations = 0;
		page.on('request', (req) => {
			if (new URL(req.url()).pathname === '/__data.json') navigations++;
		});
		const y = box.y + box.height / 2;
		await page.mouse.move(box.x + box.width - 12, y);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width * 0.6, y, { steps: 25 });
		expect(navigations).toBe(0);
		await page.mouse.up();
		await expect(page).toHaveURL(/year_end=/);
		await page.waitForLoadState('networkidle');
		expect(navigations).toBe(1);
	});

	test('thumbs cannot cross', async ({ page }) => {
		await page.goto('/?q=Apollo&year_start=2000&year_end=2010');
		await latest(page).fill('1990');
		expect(await values(page)).toEqual(['2000', '2000']);
		await expect(page).toHaveURL(/year_end=2000/);
		await earliest(page).fill('2020');
		expect(await values(page)).toEqual(['2000', '2000']);
	});

	test('Reset removes both params and is hidden by default', async ({ page }) => {
		await page.goto('/?q=Apollo');
		await expect(page.getByRole('link', { name: 'Reset' })).toBeHidden();
		await page.goto(RANGE);
		await page.getByRole('link', { name: 'Reset' }).click();
		await expect(page).toHaveURL(/\/\?q=Apollo$/);
		expect(await values(page)).toEqual(['1920', String(YEAR)]);
	});

	test('the full range keeps the plain home page from falling back to this year', async ({
		page
	}) => {
		await page.goto('/');
		await earliest(page).fill('1920');
		await expect(page).toHaveURL(/year_start=1920$/);
		expect(await values(page)).toEqual(['1920', String(YEAR)]);
	});

	test('header search and a pill keep the range', async ({ page }) => {
		await page.goto(RANGE);
		await page.locator('#img-search').fill('Gemini');
		await page.locator('#img-search').press('Enter');
		await expect(page).toHaveURL(/q=Gemini/);
		let params = new URL(page.url()).searchParams;
		expect([params.get('year_start'), params.get('year_end')]).toEqual(['1969', '1972']);

		await page.locator('nav a[href^="/?q="]').first().click();
		await expect(page).toHaveURL(/q=Apollo/);
		params = new URL(page.url()).searchParams;
		expect([params.get('year_start'), params.get('year_end')]).toEqual(['1969', '1972']);
	});

	test('an empty range says so and offers a reset', async ({ page }) => {
		await page.goto('/?q=Apollo&year_start=1921&year_end=1922');
		await expect(
			page.getByText('No images found for "Apollo" between 1921 and 1922')
		).toBeVisible();
		await page.getByRole('link', { name: 'Reset years' }).click();
		await expect(page).toHaveURL(/\/\?q=Apollo$/);
		await expect(imageLinks(page).first()).toBeAttached();
	});

	test('a range survives Back from a detail page', async ({ page }) => {
		await page.goto(RANGE);
		await expect(imageLinks(page).first()).toBeAttached();
		await imageLinks(page).first().click({ force: true });
		await expect(page).toHaveURL(/\/image\//);
		await page.goBack();
		await expect(page).toHaveURL(/year_start=1969&year_end=1972/);
		expect(await values(page)).toEqual(['1969', '1972']);
	});

	test.describe('on a phone', () => {
		test.use({ viewport: { width: 390, height: 844 } });

		test('fits without horizontal overflow', async ({ page }) => {
			await page.goto(RANGE);
			await expect(slider(page)).toBeVisible();
			const box = await slider(page).boundingBox();
			expect(box && box.x + box.width).toBeLessThanOrEqual(390);
			const overflow = await page.evaluate(
				() => document.documentElement.scrollWidth - document.documentElement.clientWidth
			);
			expect(overflow).toBeLessThanOrEqual(0);
		});
	});
});

test.describe('navigation progress bar', () => {
	test.use({ viewport: { width: 1280, height: 800 } });

	test('appears for a slow navigation, but not until it has waited a moment', async ({ page }) => {
		await page.goto('/?q=Apollo');
		await expect(imageLinks(page).first()).toBeAttached();
		await page.route(/\/image\/.*__data\.json/, async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 900));
			await route.continue();
		});
		const bar = page.locator('[data-progress]');
		await imageLinks(page)
			.first()
			.evaluate((el) => (el as HTMLElement).click());
		await page.waitForTimeout(30);
		await expect(bar).toHaveCount(0);
		await expect(bar).toBeVisible();
		await expect(page).toHaveURL(/\/image\//);
		await expect(bar).toHaveCount(0);
	});

	test('does not flash for a navigation that is already preloaded', async ({ page }) => {
		await page.goto('/?q=Apollo');
		const card = imageLinks(page).first();
		await expect(card).toBeAttached();
		await page.evaluate(() => {
			const w = window as unknown as { __bar: boolean };
			w.__bar = false;
			new MutationObserver(() => {
				if (document.querySelector('[data-progress]')) w.__bar = true;
			}).observe(document.body, { childList: true, subtree: true });
		});
		await card.hover({ force: true });
		await page.waitForTimeout(2500);
		await card.click({ force: true });
		await expect(page).toHaveURL(/\/image\//);
		await expect(page.locator('h1')).not.toBeEmpty();
		expect(await page.evaluate(() => (window as unknown as { __bar: boolean }).__bar)).toBe(false);
	});
});

test('clicking a related image shows the new page at the top with its main image', async ({
	page
}) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto(DETAIL);
	const related = page.locator('section:has(h2:text("Related images")) a[href^="/image/"]');
	await expect(related.first()).toBeAttached();
	const card = related.nth(2);
	const href = await card.getAttribute('href');
	await card.scrollIntoViewIfNeeded();
	expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
	await card.click({ force: true });
	await expect(page).toHaveURL(new RegExp(`${href}$`));
	const main = page.locator('main picture img').first();
	await expect(main).toBeVisible();
	await expect
		.poll(() => main.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
		.toBe(true);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});
