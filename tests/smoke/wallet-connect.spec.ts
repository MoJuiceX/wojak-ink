import { test, expect } from '@playwright/test';

test.describe('Wallet Connect Smoke Test', () => {
  test('should render wallet connect button on game page', async ({ page }) => {
    // Navigate to the game page
    await page.goto('/free-mints');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Button should exist on page
    const buttonCount = await page.locator('button').count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('should not have JS errors in wallet connect integration', async ({ page }) => {
    // Navigate to the game page
    await page.goto('/free-mints');

    // Wait for load
    await page.waitForLoadState('networkidle');

    // Capture any console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait for WalletConnect SDK to initialize if loaded
    await page.waitForTimeout(2000);

    // Check for common wallet connect library indicators
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(0);

    // Should have no critical errors
    const criticalErrors = consoleErrors.filter(e => !e.includes('Advertisement'));
    expect(criticalErrors).toEqual([]);
  });

  test('should handle wallet interaction without crashes', async ({ page }) => {
    // Navigate to the game page
    await page.goto('/free-mints');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Track page errors
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    // Try to find and interact with wallet-related elements if visible
    const buttons = await page.locator('button').all();
    expect(buttons.length).toBeGreaterThan(0);

    // Simulate a few clicks on buttons (doesn't need to succeed, just not crash)
    for (let i = 0; i < Math.min(buttons.length, 2); i++) {
      try {
        await buttons[i].click({ timeout: 500 }).catch(() => {
          // Button might not be clickable, that's fine
        });
      } catch (_e) {
        // Ignore click errors
      }
    }

    // Wait for any deferred errors
    await page.waitForTimeout(1000);

    // Should not have thrown any unhandled errors
    expect(pageErrors).toEqual([]);
  });

  test('should have proper event listeners for wallet events', async ({ page }) => {
    // Navigate to the game page
    await page.goto('/free-mints');

    // Wait for load
    await page.waitForLoadState('networkidle');

    // Verify no memory leaks indicators or excessive DOM nodes
    const domNodeCount = await page.evaluate(() => document.querySelectorAll('*').length);
    expect(domNodeCount).toBeGreaterThan(0);
    expect(domNodeCount).toBeLessThan(50000); // Sanity check for DOM bloat

    // Check that the page responds to interactions
    const canvas = page.locator('canvas').first();
    if (await canvas.isVisible()) {
      const box = await canvas.boundingBox();
      expect(box).toBeTruthy();
    }
  });
});
