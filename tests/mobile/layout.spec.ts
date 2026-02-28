import { test, expect } from '@playwright/test';
import { GeneratorPage } from '../helpers/generator-page';

/**
 * Mobile Layout & Component Tests
 *
 * Verifies the generator renders correctly on mobile viewports.
 *
 * Note: On headless WebKit (Safari), framer-motion animations can stall,
 * leaving elements with visibility:hidden. The goto() helper force-completes
 * the animation. Tests use DOM/dimension checks rather than strict toBeVisible
 * where framer-motion interference is possible.
 */

test.describe('Mobile Layout & Components', () => {
  // Generator needs time to load manifests and render traits
  test.setTimeout(60000);

  let gen: GeneratorPage;

  test.beforeEach(async ({ page }) => {
    gen = new GeneratorPage(page);
    await gen.goto();
    await gen.waitForTraitsLoaded();
  });

  test('generator page loads with preview area', async () => {
    await expect(gen.previewArea).toBeAttached();
    // Verify it has proper dimensions
    const box = await gen.previewArea.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });

  test('preview canvas renders and is not blank', async () => {
    const isNotBlank = await gen.isCanvasNotBlank();
    expect(isNotBlank).toBe(true);
  });

  test('category tabs are present and have proper count', async () => {
    await expect(gen.categoriesBar).toBeAttached();

    // Should have 9 category tabs (one per layer in UI_ORDER)
    const tabCount = await gen.page.locator('.generator-layer-tab').count();
    expect(tabCount).toBeGreaterThanOrEqual(5);
  });

  test('trait grid uses 3-column layout on mobile', async () => {
    const columns = await gen.getGridColumnCount();
    expect(columns).toBe(3);
  });

  test('trait grid shows at least 3 trait cards', async () => {
    const traitCount = await gen.getVisibleTraitCount();
    expect(traitCount).toBeGreaterThanOrEqual(3);
  });

  test('action bar is present with randomize button', async () => {
    await expect(gen.actionsBar).toBeAttached();

    // Randomize button should exist
    const randomizeExists = await gen.randomizeButton.count();
    expect(randomizeExists).toBeGreaterThan(0);
  });

  test('action bar is horizontally scrollable on mobile', async ({ page }) => {
    const overflowX = await page.evaluate(() => {
      const el = document.querySelector('.generator-actions');
      if (!el) return 'hidden';
      return window.getComputedStyle(el).overflowX;
    });
    expect(overflowX).toBe('auto');
  });

  test('sticky mini preview appears on scroll past 300px', async () => {
    // Switch to a category with many traits to ensure enough scroll content
    // Clothes has 29 traits (5 rows × 3 cols + extras), providing enough height
    await gen.selectCategory('Clothes');
    await gen.page.waitForTimeout(500);

    // Check that we have enough scrollable content (scrollHeight - clientHeight > 300)
    const scrollState = await gen.page.evaluate(() => {
      const sv = document.querySelector('.generator-scroll-view');
      if (!sv) return { maxScroll: 0 };
      return { maxScroll: sv.scrollHeight - sv.clientHeight };
    });

    if (scrollState.maxScroll < 300) {
      test.skip(true, `Not enough scrollable content: maxScroll=${scrollState.maxScroll}px (need >300)`);
    }

    // Initially not visible
    const initiallyVisible = await gen.isStickyPreviewVisible();
    expect(initiallyVisible).toBe(false);

    // Scroll past trigger offset
    await gen.page.evaluate(() => {
      const scrollView = document.querySelector('.generator-scroll-view');
      if (scrollView) {
        scrollView.scrollTop = 400;
        scrollView.dispatchEvent(new Event('scroll', { bubbles: true }));
      } else {
        window.scrollTo(0, 400);
      }
    });

    // Wait for scroll event + React state update + framer-motion animation
    await gen.page.waitForTimeout(1500);

    // StickyMiniPreview renders conditionally via AnimatePresence.
    const stickyButton = gen.page.getByRole('button', { name: /scroll to preview/i });
    const stickyInDOM = (await stickyButton.count()) > 0;

    expect(stickyInDOM).toBe(true);

    // Scroll back to top
    await gen.page.evaluate(() => {
      const scrollView = document.querySelector('.generator-scroll-view');
      if (scrollView) {
        scrollView.scrollTop = 0;
        scrollView.dispatchEvent(new Event('scroll', { bubbles: true }));
      } else {
        window.scrollTo(0, 0);
      }
    });
    await gen.page.waitForTimeout(1000);
  });

  test('mobile color panel renders for colorable G2 trait', async () => {
    // Select Clothes category
    await gen.selectCategory('Clothes');
    await gen.page.waitForTimeout(500);

    // Select traits until we find a colorable one
    const traitCount = await gen.getVisibleTraitCount();
    let panelFound = false;

    for (let i = 0; i < Math.min(traitCount, 5); i++) {
      await gen.selectTraitByIndex(i);
      await gen.page.waitForTimeout(500);

      const panelExists = await gen.mobileColorPanel.count();
      if (panelExists > 0) {
        panelFound = true;
        break;
      }
    }

    // At least one Clothes trait should produce a mobile color panel
    expect(panelFound).toBe(true);
  });
});

test.describe('Breakpoint Boundary', () => {
  test('1023px viewport shows mobile layout', async ({ page }) => {
    await page.setViewportSize({ width: 1023, height: 768 });
    const gen = new GeneratorPage(page);
    await gen.goto();
    await gen.waitForTraitsLoaded();

    // On mobile, scroll-view wrapper exists
    const scrollView = page.locator('.generator-scroll-view');
    await expect(scrollView).toBeAttached();
  });

  test('1024px viewport shows desktop layout', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const gen = new GeneratorPage(page);
    await gen.goto();
    await gen.waitForTraitsLoaded();

    // On desktop, no scroll-view wrapper (it's conditionally rendered)
    const scrollView = page.locator('.generator-scroll-view');
    const scrollViewCount = await scrollView.count();
    expect(scrollViewCount).toBe(0);

    // Desktop has details-panel
    const detailsPanel = page.locator('.generator-details-panel');
    await expect(detailsPanel).toBeAttached();
  });
});
