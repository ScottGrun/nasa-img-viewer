import { expect, test, type Page } from '@playwright/test';

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

test('detail page updates when navigating between images via the related gallery', async ({
	page
}) => {
	await page.goto('/');
	await expect(imageLinks(page).first()).toBeAttached();
	const [start, other] = await hrefs(page);

	// The related gallery queries NASA from the browser using every keyword of the
	// image, which frequently returns nothing. Stub that one client-side request so
	// the gallery deterministically links to a real image found on the home page.
	const otherId = other!.replace('/image/', '');
	await page.route('https://images-api.nasa.gov/search*', (route) =>
		route.fulfill({
			json: {
				collection: {
					items: [
						{
							data: [{ nasa_id: otherId, title: 'Related', description: 'Related' }],
							links: [{ href: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' }]
						}
					]
				}
			}
		})
	);

	await page.goto(start!);
	await expect(page.locator('h1')).toBeVisible();
	const startTitle = await page.locator('h1').innerText();
	const related = page.locator(`section a[href="${other}"]`);
	await expect(related).toBeAttached();
	await related.click({ force: true });

	await expect(page).toHaveURL(new RegExp(`${other}$`));
	await expect(page.locator('h1')).toBeVisible();
	await expect(page.locator('h1')).not.toHaveText(startTitle);
});
