import { test, expect, type Page } from '@playwright/test';

const PROD_URL = /^https:\/\/(?:www\.)?wojak\.ink(?:\/|$)/i;

async function installLocalSafetyRoutes(page: Page) {
  const prodRequests: string[] = [];

  page.on('request', (request) => {
    if (PROD_URL.test(request.url())) {
      prodRequests.push(request.url());
    }
  });

  await page.route(PROD_URL, async (route) => {
    await route.abort();
  });

  await page.route('**/api/mint/pricing', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        supply: { minted: 498, total: 4200 },
        traits: {},
        top3: [],
        mintingPaused: false,
      }),
    });
  });

  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route('**/coingecko-api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ chia: { usd: 0 } }),
    });
  });

  await page.route('**/spacescan-api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  await page.route('**/mintgarden-api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  await page.route('**/dexie-api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ offers: [] }),
    });
  });

  return prodRequests;
}

test.describe('Local-safe app shell', () => {
  test('gallery shell renders without production network access', async ({ page }) => {
    const prodRequests = await installLocalSafetyRoutes(page);

    await page.goto('/gallery');

    await expect(page.getByRole('heading', { name: /gallery/i })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('img[src*="gallery-banner"]').first()).toBeVisible({ timeout: 15000 });
    await expect.poll(() => prodRequests.length).toBe(0);
  });

  test('generator shell renders without production network access', async ({ page }) => {
    const prodRequests = await installLocalSafetyRoutes(page);

    await page.goto('/generator');

    await expect(page.getByRole('heading', { name: /wojak generator/i })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.generator-preview')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.generator-categories')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.generator-options-grid-container')).toBeVisible({ timeout: 15000 });
    await expect.poll(() => prodRequests.length).toBe(0);
  });
});
