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

test.describe('Battle Detail Page', () => {
  test('battle detail page renders for valid ID', async ({ page }) => {
    // Navigate to the battle detail page with a test ID
    // This should show the BattleView component even if no real battle exists
    await page.goto('/games/combat/battle/1');

    // Should show either the battle view or an error message (not a 404 blank page)
    const content = await page.textContent('body');
    const hasBattleContent = content?.includes('Battle #1') ||
      content?.includes('Battle not found') ||
      content?.includes('Failed to load battle');
    expect(hasBattleContent).toBeTruthy();
  });

  test('battle detail page handles invalid ID gracefully', async ({ page }) => {
    await page.goto('/games/combat/battle/abc');
    const content = await page.textContent('body');
    // Should show an error, not a crash
    expect(
      content?.includes('Invalid battle ID') ||
      content?.includes('not found') ||
      content?.includes('Error')
    ).toBeTruthy();
  });

  test('battle detail page is navigable from combat arena', async ({ page }) => {
    // Verify the route exists in the app's router
    await page.goto('/games/combat/battle/999');
    // Should not show a generic 404 page
    const title = await page.title();
    expect(title).not.toContain('404');
  });
});

test.describe('Combat Leaderboard', () => {
  test('leaderboard component loads on combat page', async ({ page }) => {
    await page.goto('/games/combat');
    // Leaderboard may or may not have entries yet
    const content = await page.textContent('body');
    const hasLeaderboard = content?.includes('Leaderboard') ||
      content?.includes('No ranked fighters') ||
      content?.includes('Top Fighters') ||
      content?.includes('No combat fighters');
    expect(hasLeaderboard).toBeTruthy();
  });
});

test.describe('Battle History', () => {
  test('history section loads on combat page', async ({ page }) => {
    await page.goto('/games/combat');
    // Should show "Recent Battles" heading or empty state
    const content = await page.textContent('body');
    const hasHistory = content?.includes('Recent Battles') ||
      content?.includes('No battles yet') ||
      content?.includes('No battle history');
    expect(hasHistory).toBeTruthy();
  });
});

test.describe('Generator Combat Preview', () => {
  test('generator page loads with combat preview support', async ({ page }) => {
    await page.goto('/generator');
    // Generator should load without errors
    await expect(page.locator('.generator-page')).toBeVisible();
  });
});
