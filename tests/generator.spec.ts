import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for the Wojak generator page.
 * Verifies the generator loads, shows preview and layer UI, and responds to interaction.
 */

test.describe('Generator', () => {
  test('should load generator page and show preview area', async ({ page }) => {
    await page.goto('/generator');

    // Wait for generator to initialize (preview wrapper or layer tabs)
    const previewArea = page.locator('.generator-preview');
    await expect(previewArea).toBeVisible({ timeout: 15000 });
  });

  test('should show layer tabs or trait options after load', async ({ page }) => {
    await page.goto('/generator');

    // Either category tabs (desktop) or options grid should appear
    const categories = page.locator('.generator-categories');
    const options = page.locator('.generator-options');
    await expect(categories.or(options)).toBeVisible({ timeout: 15000 });
  });

  test('should show Randomize or Export action', async ({ page }) => {
    await page.goto('/generator');

    const randomizeButton = page.getByRole('button', { name: /randomize/i });
    const exportButton = page.getByRole('button', { name: /export/i });
    await expect(randomizeButton.or(exportButton)).toBeVisible({ timeout: 15000 });
  });
});
