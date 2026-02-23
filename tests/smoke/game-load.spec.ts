import { test, expect } from '@playwright/test';

test.describe('Game Load Smoke Test', () => {
  test('should load free-mints page and render game canvas', async ({ page }) => {
    // Navigate to the free-mints page
    await page.goto('/free-mints');

    // Wait for page to stabilize
    await page.waitForLoadState('networkidle');

    // Check that the page title is correct
    const title = await page.title();
    expect(title).toBeTruthy();

    // Verify game container exists
    const gameContainer = page.locator('#game-container');
    await expect(gameContainer).toBeVisible({ timeout: 10000 });

    // Verify the canvas element is present
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Check that there are no console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait a bit for any startup errors
    await page.waitForTimeout(2000);

    // Assert no console errors were logged
    expect(consoleErrors).toEqual([]);
  });

  test('should render main UI elements on game page', async ({ page }) => {
    // Navigate to the free-mints page
    await page.goto('/free-mints');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check for main game header or heading
    const pageContent = await page.content();
    expect(pageContent).toBeTruthy();
    expect(pageContent.length).toBeGreaterThan(100);

    // Verify no unhandled promise rejections (errors in console)
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    await page.waitForTimeout(1000);
    expect(pageErrors).toEqual([]);
  });

  test('should handle mobile viewport correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to game
    await page.goto('/free-mints');

    // Wait for load
    await page.waitForLoadState('networkidle');

    // Game container should still be visible
    const gameContainer = page.locator('#game-container');
    await expect(gameContainer).toBeVisible({ timeout: 10000 });

    // Canvas should be responsive
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });
});
