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
	expect(await position(first)).toEqual(before);
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
	expect(((await hrefs(page)) as string[]).slice(0, loaded.length)).toEqual(loaded);
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
