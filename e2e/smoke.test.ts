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

test.describe('image magnifier', () => {
	const glass = (page: Page) => page.getByTestId('magnifier-glass');
	const glassImg = (page: Page) => glass(page).locator('img');
	const target = (page: Page) => page.getByRole('button', { name: 'Toggle image magnifier' });

	test('shows a glass on hover, loads the original, zooms and toggles', async ({ page }) => {
		test.setTimeout(120_000);
		const requested: string[] = [];
		page.on('request', (req) => requested.push(req.url()));
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto(DETAIL);
		await expect(page.locator('main picture img').first()).toBeAttached();
		await page.waitForLoadState('networkidle');
		expect(requested.filter((u) => u.includes('~orig'))).toEqual([]);

		const box = (await target(page).boundingBox())!;
		await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
		await page.mouse.move(box.x + box.width * 0.5 + 5, box.y + box.height * 0.5 + 5);
		await expect(glass(page)).toBeVisible();
		await expect.poll(() => requested.some((u) => u.includes('~orig'))).toBe(true);
		await expect
			.poll(() => glassImg(page).evaluate((el: HTMLImageElement) => el.currentSrc), {
				timeout: 90_000
			})
			.toContain('~orig');

		// Moving the mouse moves the glass and the image inside it.
		const before = {
			glass: (await glass(page).boundingBox())!,
			inner: await glassImg(page).evaluate((el) => getComputedStyle(el).transform)
		};
		await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4);
		const after = {
			glass: (await glass(page).boundingBox())!,
			inner: await glassImg(page).evaluate((el) => getComputedStyle(el).transform)
		};
		expect(after.glass.x).not.toBe(before.glass.x);
		expect(after.inner).not.toBe(before.inner);

		// Wheel zooms the glass and does not scroll the page; zoom is bounded.
		const innerWidth = () => glassImg(page).evaluate((el) => el.getBoundingClientRect().width);
		const w0 = await innerWidth();
		await page.mouse.wheel(0, -200);
		await expect.poll(innerWidth).toBeGreaterThan(w0);
		expect(await page.evaluate(() => window.scrollY)).toBe(0);
		for (let i = 0; i < 12; i++) await page.mouse.wheel(0, -1000);
		await expect.poll(innerWidth).toBeGreaterThan(w0);
		const wMax = await innerWidth();
		await page.mouse.wheel(0, -1000);
		await page.waitForTimeout(100);
		expect(await innerWidth()).toBe(wMax);
		expect(wMax / box.width).toBeLessThanOrEqual(16 + 0.01);
		expect(await page.evaluate(() => window.scrollY)).toBe(0);

		// Click turns the glass off, shows a zoom-in cursor and lets the wheel scroll.
		await target(page).click();
		await expect(glass(page)).toBeHidden();
		await expect(target(page)).toHaveAttribute('aria-pressed', 'false');
		expect(await target(page).evaluate((el) => getComputedStyle(el).cursor)).toBe('zoom-in');
		await page.mouse.wheel(0, 300);
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

		// Click again (scrolled back first) brings it back.
		await page.evaluate(() => window.scrollTo(0, 0));
		await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
		await target(page).click();
		await page.mouse.move(box.x + box.width * 0.5 + 3, box.y + box.height * 0.5);
		await expect(glass(page)).toBeVisible();

		// Leaving the image hides it.
		await target(page).dispatchEvent('pointerleave', { pointerType: 'mouse' });
		await expect(glass(page)).toBeHidden();
	});

	test('minimap shows where the glass is and avoids being covered', async ({ page }) => {
		test.setTimeout(60_000);
		const requested: string[] = [];
		page.on('request', (req) => requested.push(req.url()));
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto(DETAIL);
		await expect(page.locator('main picture img').first()).toBeAttached();
		await page.waitForLoadState('networkidle');
		const minimap = page.getByTestId('magnifier-minimap');
		const marker = page.getByTestId('magnifier-marker');
		await expect(minimap).toBeHidden();

		const box = (await target(page).boundingBox())!;
		const move = async (fx: number, fy: number) => {
			await page.mouse.move(box.x + box.width * fx - 3, box.y + box.height * fy);
			await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
		};
		const fraction = async () => {
			const m = (await minimap.boundingBox())!;
			const k = (await marker.boundingBox())!;
			return {
				fx: (k.x + k.width / 2 - m.x) / m.width,
				fy: (k.y + k.height / 2 - m.y) / m.height
			};
		};

		await move(0.2, 0.3);
		await expect(minimap).toBeVisible();
		// No extra download: the thumbnail is the main image's own source.
		const mainSrc = await page
			.locator('main picture img')
			.first()
			.evaluate((el: HTMLImageElement) => el.currentSrc);
		await expect(minimap.locator('img')).toHaveAttribute('src', mainSrc);
		expect(mainSrc).not.toContain('~orig');
		const size = (await minimap.boundingBox())!;
		expect(Math.max(size.width, size.height)).toBeCloseTo(160, 0);

		let f = await fraction();
		expect(f.fx).toBeCloseTo(0.2, 1);
		expect(f.fy).toBeCloseTo(0.3, 1);
		await move(0.8, 0.5);
		f = await fraction();
		expect(f.fx).toBeCloseTo(0.8, 1);
		expect(f.fy).toBeCloseTo(0.5, 1);

		// Zooming in shrinks the marker.
		const before = (await marker.boundingBox())!.width;
		await page.mouse.wheel(0, -300);
		await expect.poll(async () => (await marker.boundingBox())!.width).toBeLessThan(before);

		// Near the bottom-right the minimap moves to the left and does not overlap the glass.
		await move(0.95, 0.95);
		await expect
			.poll(async () => (await minimap.boundingBox())!.x)
			.toBeLessThan(box.x + box.width / 2);
		const m = (await minimap.boundingBox())!;
		const g = (await glass(page).boundingBox())!;
		const overlaps =
			g.x < m.x + m.width && g.x + g.width > m.x && g.y < m.y + m.height && g.y + g.height > m.y;
		expect(overlaps).toBe(false);

		// It stays on screen when the image is partly scrolled off.
		await page.evaluate(() => window.scrollTo(0, 300));
		await move(0.3, 0.3);
		await expect(minimap).toBeVisible();
		const scrolled = (await minimap.boundingBox())!;
		expect(scrolled.y).toBeGreaterThanOrEqual(0);
		expect(scrolled.y + scrolled.height).toBeLessThanOrEqual(800);
		expect(scrolled.x + scrolled.width).toBeLessThanOrEqual(1280);

		// Hidden after pointerleave and after toggling off.
		await target(page).dispatchEvent('pointerleave', { pointerType: 'mouse' });
		await expect(minimap).toBeHidden();
		await move(0.3, 0.3);
		await expect(minimap).toBeVisible();
		await target(page).click();
		await expect(minimap).toBeHidden();
		expect(requested.filter((u) => u.includes('~orig')).length).toBeLessThanOrEqual(1);
	});

	test('ctrl+wheel resizes the glass, plain wheel zooms it, and a hint explains', async ({
		page
	}) => {
		test.setTimeout(60_000);
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto(DETAIL);
		await expect(page.locator('main picture img').first()).toBeAttached();
		await page.waitForLoadState('networkidle');
		const hint = page.getByTestId('magnifier-hint');
		await expect(hint).toBeHidden();
		const box = (await target(page).boundingBox())!;
		const cx = box.x + box.width * 0.5;
		const cy = box.y + box.height * 0.5;
		await page.mouse.move(cx - 3, cy);
		await page.mouse.move(cx, cy);
		await expect(glass(page)).toBeVisible();
		await expect(hint).toHaveText('Scroll to zoom · Ctrl + scroll to resize · Click to turn off');

		const glassWidth = async () => (await glass(page).boundingBox())!.width;
		const innerWidth = () => glassImg(page).evaluate((el) => el.getBoundingClientRect().width);
		const resize = async (deltaY: number) => {
			await page.keyboard.down('Control');
			await page.mouse.wheel(0, deltaY);
			await page.keyboard.up('Control');
		};

		expect(await glassWidth()).toBeCloseTo(260, 0);
		const inner0 = await innerWidth();
		await resize(-200);
		await expect.poll(glassWidth).toBeGreaterThan(260);
		expect(await innerWidth()).toBeCloseTo(inner0, 0);
		expect(await page.evaluate(() => window.scrollY)).toBe(0);
		// Still centred on the cursor.
		const g = (await glass(page).boundingBox())!;
		expect(Math.abs(g.x + g.width / 2 - cx)).toBeLessThanOrEqual(1);
		expect(Math.abs(g.y + g.height / 2 - cy)).toBeLessThanOrEqual(1);

		// Plain wheel zooms and leaves the size alone.
		const size = await glassWidth();
		await page.mouse.wheel(0, -200);
		await expect.poll(innerWidth).toBeGreaterThan(inner0);
		expect(await glassWidth()).toBeCloseTo(size, 0);

		// Limits.
		for (let i = 0; i < 6; i++) await resize(-2000);
		await expect.poll(glassWidth).toBeCloseTo(520, 0);
		// The minimap keeps clear of the (now larger) glass.
		const gl = (await glass(page).boundingBox())!;
		const mm = (await page.getByTestId('magnifier-minimap').boundingBox())!;
		const gcx = gl.x + gl.width / 2;
		const gcy = gl.y + gl.height / 2;
		const nx = Math.min(mm.x + mm.width, Math.max(mm.x, gcx));
		const ny = Math.min(mm.y + mm.height, Math.max(mm.y, gcy));
		expect(Math.hypot(gcx - nx, gcy - ny)).toBeGreaterThanOrEqual(gl.width / 2);
		for (let i = 0; i < 6; i++) await resize(2000);
		await expect.poll(glassWidth).toBeCloseTo(140, 0);
		await resize(-200);
		await page.screenshot({ path: 'test-results/lens-resized.png' });

		// The size survives leaving, re-entering and toggling.
		const kept = await glassWidth();
		await target(page).dispatchEvent('pointerleave', { pointerType: 'mouse' });
		await expect(glass(page)).toBeHidden();
		await expect(hint).toBeHidden();
		await page.mouse.move(cx + 3, cy);
		await expect(glass(page)).toBeVisible();
		expect(await glassWidth()).toBeCloseTo(kept, 0);

		// Click: the hint changes to the off text.
		await target(page).click();
		await expect(glass(page)).toBeHidden();
		await expect(hint).toHaveText('Click to turn on magnifier');
		await target(page).click();
		await page.mouse.move(cx, cy);
		await expect(glass(page)).toBeVisible();
		expect(await glassWidth()).toBeCloseTo(kept, 0);
	});

	test.describe('touch', () => {
		test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

		test('tapping shows no glass and downloads no original', async ({ page }) => {
			const requested: string[] = [];
			page.on('request', (req) => requested.push(req.url()));
			await page.goto(DETAIL);
			await expect(page.locator('main picture img').first()).toBeAttached();
			await target(page).tap();
			await page.waitForTimeout(500);
			await expect(glass(page)).toHaveCount(0);
			await expect(page.getByTestId('magnifier-minimap')).toHaveCount(0);
			await expect(page.getByTestId('magnifier-hint')).toHaveCount(0);
			expect(requested.filter((u) => u.includes('~orig'))).toEqual([]);
		});
	});
});
