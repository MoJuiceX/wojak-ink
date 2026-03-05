import { test, expect, type Page } from '@playwright/test';

function trackDeprecatedGatewayFailures(page: Page) {
  const failures: string[] = [];

  page.on('response', (response) => {
    const url = response.url();
    const isDeprecatedGateway = url.includes('ipfs.io/ipfs/') || url.includes('.w3s.link') || url.includes('.web.link');
    if (isDeprecatedGateway && response.status() >= 400) {
      failures.push(`${response.status()} ${url}`);
    }
  });

  return failures;
}

test.describe('gallery and games media smoke', () => {
  test('gallery character view renders cards without image error placeholders', async ({ page }) => {
    await page.goto('/gallery?type=wojak', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Wojak', exact: true })).toBeVisible();
    await expect(page.locator('.nft-grid-item').first()).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(1500);

    await expect(page.locator('.progressive-image-error')).toHaveCount(0);
  });

  test('games scores view avoids deprecated IPFS gateways and keeps leaderboard frame stable', async ({ page }, testInfo) => {
    const deprecatedGatewayFailures = trackDeprecatedGatewayFailures(page);

    await page.goto('/games', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Games' })).toBeVisible();
    await page.getByRole('button', { name: /^Scores$/ }).click();
    await expect(page.getByRole('button', { name: /Brick by Brick/i })).toBeVisible({ timeout: 15000 });

    const leaderboard = page.locator('.leaderboard-container');
    await expect(leaderboard).toBeVisible();

    const measureWrapper = async () => {
      const box = await leaderboard.boundingBox();
      expect(box).not.toBeNull();
      return box;
    };

    const allTimeButton = page.getByRole('button', { name: /^All Time$/ });
    const thisWeekButton = page.getByRole('button', { name: /^This Week$/ });

    await allTimeButton.click();
    await page.waitForTimeout(1200);
    const allTimeBox = await measureWrapper();

    await thisWeekButton.click();
    await page.waitForTimeout(1200);
    const thisWeekBox = await measureWrapper();

    if (testInfo.project.name === 'chromium') {
      expect(Math.abs((allTimeBox?.width || 0) - (thisWeekBox?.width || 0))).toBeLessThanOrEqual(2);
      expect(Math.abs((allTimeBox?.height || 0) - (thisWeekBox?.height || 0))).toBeLessThanOrEqual(2);
      expect(Math.abs((allTimeBox?.x || 0) - (thisWeekBox?.x || 0))).toBeLessThanOrEqual(2);
      expect(Math.abs((allTimeBox?.y || 0) - (thisWeekBox?.y || 0))).toBeLessThanOrEqual(2);
    }

    await page.waitForTimeout(1500);

    expect(deprecatedGatewayFailures).toEqual([]);
  });
});
