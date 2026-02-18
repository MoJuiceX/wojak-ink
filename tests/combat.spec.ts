import { test, expect } from '@playwright/test';

/**
 * Smoke tests for combat system
 * Verify basic page loading and component rendering.
 */

test.describe('Combat Arena', () => {
  test('combat page loads at /games/combat', async ({ page }) => {
    await page.goto('/games/combat');
    await expect(page.locator('h1')).toContainText('Combat Arena');
  });

  test('combat page shows queue panel', async ({ page }) => {
    await page.goto('/games/combat');
    // Queue panel should show either the "Enter the Arena" heading or the empty state
    const content = await page.textContent('body');
    expect(
      content?.includes('Enter the Arena') || content?.includes('No combat-ready fighters')
    ).toBeTruthy();
  });

  test('games hub links to combat arena', async ({ page }) => {
    await page.goto('/games');
    const combatLink = page.locator('a[href="/games/combat"]');
    await expect(combatLink).toBeVisible();
    await expect(combatLink).toContainText('Combat Arena');
  });
});

test.describe('Generator Combat Preview', () => {
  test('generator page loads with combat preview support', async ({ page }) => {
    await page.goto('/generator');
    // Generator should load without errors
    await expect(page.locator('.generator-page')).toBeVisible();
  });
});
