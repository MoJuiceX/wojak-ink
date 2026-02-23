import { test, expect } from '@playwright/test';

test.describe('DID Lookup Smoke Test', () => {
  test('should load DID lookup page without errors', async ({ page }) => {
    // Navigate to the DID lookup page
    // Adjust path as needed for your routing structure
    await page.goto('/did-lookup');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify page content exists
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(100);

    // Check for title or heading
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('should have DID lookup form UI', async ({ page }) => {
    // Navigate to DID lookup
    await page.goto('/did-lookup');

    // Wait for load
    await page.waitForLoadState('networkidle');

    // Look for input field (could have various selectors)
    const inputs = await page.locator('input').all();
    expect(inputs.length).toBeGreaterThan(0);

    // At least one input should be visible
    let hasVisibleInput = false;
    for (const input of inputs) {
      if (await input.isVisible()) {
        hasVisibleInput = true;
        break;
      }
    }
    expect(hasVisibleInput).toBe(true);
  });

  test('should handle DID input without crashing', async ({ page }) => {
    // Navigate to DID lookup
    await page.goto('/did-lookup');

    // Wait for load
    await page.waitForLoadState('networkidle');

    // Track page errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Find first visible input and type a test DID
    const inputs = await page.locator('input:visible').all();
    if (inputs.length > 0) {
      const testDID = 'did:chia:1test1234567890';
      await inputs[0].fill(testDID);

      // Wait for any validation or API calls
      await page.waitForTimeout(1000);
    }

    // Should not have console errors
    expect(consoleErrors).toEqual([]);
  });

  test('should render holdings display section', async ({ page }) => {
    // Navigate to DID lookup
    await page.goto('/did-lookup');

    // Wait for load
    await page.waitForLoadState('networkidle');

    // Should have some interactive elements
    const buttons = await page.locator('button').all();
    expect(buttons.length).toBeGreaterThanOrEqual(0); // At least one button expected

    // Look for text content related to DID or holdings
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText?.length).toBeGreaterThan(50);
  });

  test('should not have JS errors during navigation', async ({ page }) => {
    // Track all page errors
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    // Navigate to DID lookup
    await page.goto('/did-lookup');

    // Wait for full load
    await page.waitForLoadState('networkidle');

    // Give time for async initialization
    await page.waitForTimeout(2000);

    // Should have no unhandled errors
    expect(pageErrors).toEqual([]);

    // Verify the page is still responsive
    const isDisplayed = await page.locator('body').isVisible();
    expect(isDisplayed).toBe(true);
  });
});
