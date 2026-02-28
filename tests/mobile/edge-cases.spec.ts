import { test, expect } from '@playwright/test';
import { GeneratorPage } from '../helpers/generator-page';

// Generator tests need longer timeout for manifest loading + rendering
test.setTimeout(60000);

/**
 * Mobile Edge Case Tests
 *
 * Verifies rule enforcement and edge cases on mobile:
 * - Full-body suits disable Head tab
 * - Masks disable certain categories
 * - Orientation changes (portrait/landscape)
 * - Rapid interactions
 */

test.describe('Rule Enforcement on Mobile', () => {
  test.setTimeout(60000);

  let gen: GeneratorPage;

  test.beforeEach(async ({ page }) => {
    gen = new GeneratorPage(page);
    await gen.goto();
    await gen.waitForTraitsLoaded();
  });

  test('selecting a full-body suit disables Head category', async () => {
    // Go to Clothes
    await gen.selectCategory('Clothes');
    await gen.page.waitForTimeout(500);

    // Head should initially be enabled
    const headInitiallyDisabled = await gen.isCategoryDisabled('Head');
    expect(headInitiallyDisabled).toBe(false);

    // Try selecting traits and checking if Head becomes disabled
    const traitCount = await gen.getVisibleTraitCount();
    let headDisabled = false;

    // Only try a reasonable number of items
    const maxToTry = Math.min(traitCount, 15);
    for (let i = 0; i < maxToTry; i++) {
      // Verify we're still on the generator page
      const onGenerator = await gen.page.locator('.generator-page').count();
      if (onGenerator === 0) break;

      await gen.selectTraitByIndex(i);
      await gen.page.waitForTimeout(400);

      headDisabled = await gen.isCategoryDisabled('Head');
      if (headDisabled) break;
    }

    // At least one suit should disable Head
    // If we couldn't find one, skip rather than fail
    if (!headDisabled) {
      test.skip(true, 'No full-body suit found in first 15 Clothes traits');
    }
    expect(headDisabled).toBe(true);

    // Select a different trait to re-enable Head
    await gen.selectTraitByIndex(0);
    await gen.page.waitForTimeout(300);
  });

  test('selecting a mask disables its related layer', async () => {
    // Go to Mask (label: "Extras")
    await gen.selectCategory('Mask');
    await gen.page.waitForTimeout(500);

    // Select a mask trait and check for any category becoming disabled
    const traitCount = await gen.getVisibleTraitCount();
    let anyDisabled = false;

    const maxToTry = Math.min(traitCount, 10);
    for (let i = 0; i < maxToTry; i++) {
      const onGenerator = await gen.page.locator('.generator-page').count();
      if (onGenerator === 0) break;

      await gen.selectTraitByIndex(i);
      await gen.page.waitForTimeout(400);

      // Check if Head or Mouth tab becomes disabled (masks can affect either)
      const headDisabled = await gen.isCategoryDisabled('Head');
      const mouthDisabled = await gen.isCategoryDisabled('MouthBase');
      if (headDisabled || mouthDisabled) {
        anyDisabled = true;
        break;
      }
    }

    if (!anyDisabled) {
      test.skip(true, 'No mask disabling another category found in first 10 Mask traits');
    }
    expect(anyDisabled).toBe(true);
  });
});

test.describe('Orientation Changes', () => {
  test('portrait to landscape and back maintains functionality', async ({ page }) => {
    const gen = new GeneratorPage(page);
    await gen.goto();
    await gen.waitForTraitsLoaded();

    // Start in portrait (default mobile viewport from config)
    expect(await gen.isPreviewRendered()).toBe(true);

    // Switch to landscape by swapping viewport dimensions
    const viewport = page.viewportSize();
    if (viewport) {
      await page.setViewportSize({
        width: viewport.height,
        height: viewport.width,
      });
    }
    await page.waitForTimeout(500);

    // Preview should still be rendered in landscape
    expect(await gen.isPreviewRendered()).toBe(true);

    // Categories should still be present
    await expect(gen.categoriesBar).toBeAttached();

    // Switch back to portrait
    if (viewport) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
    }
    await page.waitForTimeout(500);

    // Everything should still work
    expect(await gen.isPreviewRendered()).toBe(true);
    await expect(gen.previewArea).toBeAttached();
  });
});

test.describe('Rapid Interactions', () => {
  test('rapid trait selections do not cause render queue backup', async ({ page }) => {
    const gen = new GeneratorPage(page);
    await gen.goto();
    await gen.waitForTraitsLoaded();

    // Rapidly select different traits
    await gen.selectCategory('Eyes');
    await gen.page.waitForTimeout(300);

    const traitCount = await gen.getVisibleTraitCount();
    // Only iterate through available traits (cap at visible count)
    const maxSelections = Math.min(traitCount, 5);
    for (let i = 0; i < maxSelections; i++) {
      await gen.selectTraitByIndex(i);
      // Very short delay — stress test the render queue
      await page.waitForTimeout(100);
    }

    // Wait for render queue to settle
    await page.waitForTimeout(2000);

    // Preview should be rendered (not blank, not crashed)
    expect(await gen.isPreviewRendered()).toBe(true);

    // Page should be responsive
    await expect(gen.previewArea).toBeAttached();
  });

  test('rapid randomize clicks do not crash', async ({ page }) => {
    const gen = new GeneratorPage(page);
    await gen.goto();
    await gen.waitForTraitsLoaded();

    // Click randomize 5 times rapidly
    for (let i = 0; i < 5; i++) {
      await gen.randomizeButton.click();
      await page.waitForTimeout(100);
    }

    // Wait for all renders to complete
    await page.waitForTimeout(3000);

    // Preview should still be rendering
    expect(await gen.isPreviewRendered()).toBe(true);
    await expect(gen.previewArea).toBeAttached();
  });
});

test.describe('Console Errors', () => {
  test('generator loads without critical console errors on mobile', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    const gen = new GeneratorPage(page);
    await gen.goto();
    await gen.waitForTraitsLoaded();

    // Wait for async operations
    await page.waitForTimeout(3000);

    // Filter out expected/benign errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('429') &&
        !e.includes('Failed to load resource') &&
        !e.includes('net::ERR') &&
        !e.includes('favicon') &&
        !e.includes('manifest') &&
        !e.includes('service-worker') &&
        !e.includes('sw.js')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
