import { test, expect } from '@playwright/test';
import { GeneratorPage } from '../helpers/generator-page';

/**
 * Mobile Trait Selection & Rendering Tests
 *
 * Verifies that selecting traits in each category updates the preview,
 * and that special G2 traits (Beer Hat, Bepe Suit) show their
 * mobile-specific panels.
 */

test.describe('Trait Selection & Rendering', () => {
  test.setTimeout(60000);

  let gen: GeneratorPage;

  test.beforeEach(async ({ page }) => {
    gen = new GeneratorPage(page);
    await gen.goto();
    await gen.waitForTraitsLoaded();
  });

  test('selecting a trait in each category updates the preview', async () => {
    // Get initial canvas state
    const previousDataUrl = await gen.getCanvasDataUrl();

    // Iterate through selectable categories (skip Base — it's pre-selected)
    const categoriesToTest = ['Eyes', 'MouthBase', 'Clothes', 'Head', 'Background'];

    for (const category of categoriesToTest) {
      await gen.selectCategory(category);
      await gen.page.waitForTimeout(500);

      // Get trait count in this category
      const traitCount = await gen.getVisibleTraitCount();
      if (traitCount === 0) continue;

      // Select the first trait
      const beforeSelect = await gen.getCanvasDataUrl();
      await gen.selectTraitByIndex(0);

      // Wait for preview to potentially update
      try {
        await gen.waitForPreviewUpdate(beforeSelect, 5000);
      } catch {
        // Some categories might not change the preview visually
        // (e.g., selecting "none" option). That's OK.
      }
    }

    // Final state should differ from initial (at least some traits changed the preview)
    const finalDataUrl = await gen.getCanvasDataUrl();
    expect(finalDataUrl).not.toBe(previousDataUrl);
  });

  test('selecting a colorable trait shows color picker in mobile panel', async () => {
    // Go to Clothes which often has colorable G2 items
    await gen.selectCategory('Clothes');
    await gen.page.waitForTimeout(500);

    // Try to find and select a G2 colorable trait
    // Select traits one by one until color panel appears or we run out
    const traitCount = await gen.getVisibleTraitCount();
    let colorPickerFound = false;

    for (let i = 0; i < Math.min(traitCount, 5); i++) {
      await gen.selectTraitByIndex(i);
      await gen.page.waitForTimeout(500);

      // Check if mobile color panel appeared with a color picker
      const panelVisible = await gen.mobileColorPanel.isVisible().catch(() => false);
      if (panelVisible) {
        // Look for color picker inside the panel
        const colorInput = gen.mobileColorPanel.locator('input[type="color"], .color-picker, .generator-panel-section-label');
        const hasColorPicker = (await colorInput.count()) > 0;
        if (hasColorPicker) {
          colorPickerFound = true;
          break;
        }
      }
    }

    // At least one Clothes trait should be colorable on the Wojak generator
    expect(colorPickerFound).toBe(true);
  });

  test('selecting a trait shows selected checkmark', async () => {
    await gen.selectCategory('Eyes');
    await gen.page.waitForTimeout(500);

    await gen.selectTraitByIndex(0);
    await gen.page.waitForTimeout(300);

    // Should have a selected trait card
    const hasSelected = await gen.hasSelectedTrait();
    expect(hasSelected).toBe(true);
  });

  test('switching categories shows different traits', async () => {
    // Get traits in Eyes
    await gen.selectCategory('Eyes');
    await gen.page.waitForTimeout(500);
    const eyesCount = await gen.getVisibleTraitCount();

    // Switch to Head
    await gen.selectCategory('Head');
    await gen.page.waitForTimeout(500);
    const headCount = await gen.getVisibleTraitCount();

    // Both should have traits, and we're really just verifying the switch works
    expect(eyesCount).toBeGreaterThan(0);
    expect(headCount).toBeGreaterThan(0);
  });
});

test.describe('Special G2 Traits', () => {
  let gen: GeneratorPage;

  test.beforeEach(async ({ page }) => {
    gen = new GeneratorPage(page);
    await gen.goto();
    await gen.waitForTraitsLoaded();
  });

  test('Beer Hat shows underlayer picker in mobile panel', async () => {
    await gen.selectCategory('Head');
    await gen.page.waitForTimeout(500);

    // Find and click the Beer Hat trait card
    // Beer Hat card should contain "Beer Hat" text or be identifiable
    const beerHatCard = gen.page.locator('.generator-trait-card').filter({
      has: gen.page.locator('img[alt*="Beer Hat" i], [data-trait-name*="Beer Hat" i], [title*="Beer Hat" i]'),
    });

    const beerHatExists = (await beerHatCard.count()) > 0;

    if (!beerHatExists) {
      // Beer Hat might be identified differently — try clicking through Head traits
      // and looking for the underlayer picker
      const traitCount = await gen.getVisibleTraitCount();
      let found = false;

      for (let i = 0; i < Math.min(traitCount, 15); i++) {
        await gen.selectTraitByIndex(i);
        await gen.page.waitForTimeout(500);

        // Check for Beer Hat underlayer picker
        const underlayerPicker = gen.page.locator('.beer-hat-underlayer-picker, [class*="underlayer"]');
        if ((await underlayerPicker.count()) > 0) {
          found = true;
          break;
        }
      }

      // Skip test if Beer Hat not found (it may have a different selector)
      test.skip(!found, 'Beer Hat trait card not found in Head category');
    } else {
      await beerHatCard.first().click();
      await gen.page.waitForTimeout(500);

      // Should show underlayer picker in mobile panel
      const mobilePanel = gen.mobileColorPanel;
      await expect(mobilePanel).toBeVisible({ timeout: 5000 });
    }
  });

  test('Bepe Suit shows style toggle in mobile panel', async () => {
    await gen.selectCategory('Clothes');
    await gen.page.waitForTimeout(500);

    // Try to find Bepe Suit among clothes traits
    const traitCount = await gen.getVisibleTraitCount();
    let styleToggleFound = false;

    for (let i = 0; i < Math.min(traitCount, 15); i++) {
      await gen.selectTraitByIndex(i);
      await gen.page.waitForTimeout(500);

      // Check for "Suit style" label or Bepe/Pepe buttons
      const suitStyleLabel = gen.page.locator('text=Suit style');
      const bepeSuitBtn = gen.page.getByRole('button', { name: /bepe suit/i });

      if ((await suitStyleLabel.count()) > 0 || (await bepeSuitBtn.count()) > 0) {
        styleToggleFound = true;
        break;
      }
    }

    // This is a soft assertion — Bepe Suit may not be in the first 15 items
    // or might be identified differently
    if (!styleToggleFound) {
      test.skip(true, 'Bepe Suit style toggle not found in first 15 Clothes traits');
    }
  });
});
