import { test, expect } from '@playwright/test';
import { test, expect } from '@playwright/test';

/**
 * Quick Start Wizard Tests
 *
 * Verifies the 6-step wizard flow for first-time visitors:
 * Eyes → Mouth → Clothes → Head → Extras → Background
 *
 * These tests do NOT set 'wojak-wizard-complete' in localStorage,
 * so the wizard is active. All other mobile tests skip the wizard.
 */

const WIZARD_STEPS = [
  { layer: 'Eyes', title: 'Eyes', stepNum: 1 },
  { layer: 'MouthBase', title: 'Mouth', stepNum: 2 },
  { layer: 'Clothes', title: 'Clothes', stepNum: 3 },
  { layer: 'Head', title: 'Head', stepNum: 4 },
  { layer: 'Mask', title: 'Extras', stepNum: 5 },
  { layer: 'Background', title: 'Background', stepNum: 6 },
];

/**
 * Create a GeneratorPage that does NOT skip the wizard.
 * Override addInitScript to omit 'wojak-wizard-complete'.
 */
async function gotoWithWizard(page: import('@playwright/test').Page) {
  // Set up localStorage to skip boot + welcome, but NOT the wizard
  await page.context().addInitScript(() => {
    try {
      const stored = localStorage.getItem('wojak-settings');
      const settings = stored ? JSON.parse(stored) : {};
      settings.app = settings.app || {};
      settings.app.skipBootSequence = true;
      localStorage.setItem('wojak-settings', JSON.stringify(settings));
      sessionStorage.setItem('wojak_boot_complete', 'true');
      localStorage.setItem('wojak_generator_seen', 'true');
      // Explicitly remove wizard-complete to ensure wizard shows
      localStorage.removeItem('wojak-wizard-complete');
      sessionStorage.removeItem('wojak-wizard-step');
    } catch {
      // Ignore storage errors on about:blank
    }
  });

  await page.goto('/generator', { waitUntil: 'load', timeout: 30000 });

  // Handle boot skip if it appears
  const bootSkip = page.locator('.boot-skip-button');
  try {
    await bootSkip.waitFor({ state: 'attached', timeout: 3000 });
    await bootSkip.click({ force: true });
    await page.waitForTimeout(2000);
  } catch {
    // No boot sequence
  }

  // Handle welcome dialog if it appears
  const gotItButton = page.getByRole('button', { name: /got it/i });
  try {
    await gotItButton.waitFor({ state: 'visible', timeout: 3000 });
    await gotItButton.click({ force: true });
    await page.waitForTimeout(500);
  } catch {
    // No welcome dialog
  }

  // Wait for generator page to mount
  await page.locator('.generator-page').waitFor({ state: 'attached', timeout: 20000 });

  // Force-complete framer-motion animations (same as GeneratorPage helper)
  await page.evaluate(() => {
    const el = document.querySelector('.generator-page');
    if (!el) return;
    let current: Element | null = el;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      if (style.opacity !== '1' || style.visibility === 'hidden') {
        (current as HTMLElement).style.setProperty('opacity', '1', 'important');
        (current as HTMLElement).style.setProperty('visibility', 'visible', 'important');
      }
      current = current.parentElement;
    }
  });
}

test.describe('Quick Start Wizard', () => {
  test.setTimeout(60000);

  test('wizard appears for first-time visitors', async ({ page }) => {
    await gotoWithWizard(page);

    // Wizard overlay should be visible
    const wizardOverlay = page.locator('.wizard-overlay');
    await expect(wizardOverlay).toBeAttached();

    // Step indicator should show "Step 1 of 6"
    const stepText = page.locator('text=Step 1 of 6');
    await expect(stepText).toBeAttached();

    // Category tabs (LayerTabs) should NOT be visible during wizard
    const layerTabBar = page.locator('.generator-layer-tab-bar');
    await expect(layerTabBar).toHaveCount(0);
  });

  test('wizard navigates forward through all 6 steps', async ({ page }) => {
    await gotoWithWizard(page);

    for (let i = 0; i < WIZARD_STEPS.length; i++) {
      const step = WIZARD_STEPS[i];
      const stepLabel = page.locator(`text=Step ${step.stepNum} of 6`);
      await expect(stepLabel).toBeAttached();

      // Trait grid should be populated for this step
      await page.locator('.generator-trait-card').first().waitFor({
        state: 'attached',
        timeout: 15000,
      });

      if (i < WIZARD_STEPS.length - 1) {
        // Click Next
        const nextButton = page.getByRole('button', { name: /next step/i });
        await nextButton.click();
        await page.waitForTimeout(400);
      }
    }

    // On last step, button should say "Done" / "Finish wizard"
    const doneButton = page.getByRole('button', { name: /finish wizard/i });
    await expect(doneButton).toBeAttached();
  });

  test('wizard navigates backward', async ({ page }) => {
    await gotoWithWizard(page);

    // Go to step 2
    const nextButton = page.getByRole('button', { name: /next step/i });
    await nextButton.click();
    await page.waitForTimeout(400);

    // Verify on step 2
    await expect(page.locator('text=Step 2 of 6')).toBeAttached();

    // Go back to step 1
    const backButton = page.getByRole('button', { name: /previous step/i });
    await backButton.click();
    await page.waitForTimeout(400);

    // Verify back on step 1
    await expect(page.locator('text=Step 1 of 6')).toBeAttached();
  });

  test('back button disabled on first step', async ({ page }) => {
    await gotoWithWizard(page);

    const backButton = page.getByRole('button', { name: /previous step/i });
    await expect(backButton).toBeDisabled();
  });

  test('skip exits wizard to full generator', async ({ page }) => {
    await gotoWithWizard(page);

    // Click Skip
    const skipButton = page.getByRole('button', { name: /skip wizard/i });
    await skipButton.click();
    await page.waitForTimeout(500);

    // Wizard should be gone
    const wizardOverlay = page.locator('.wizard-overlay');
    await expect(wizardOverlay).toHaveCount(0);

    // Category tabs should now be visible (full generator)
    const layerTabBar = page.locator('.generator-layer-tab-bar');
    await expect(layerTabBar).toBeAttached();
  });

  test('randomize exits wizard with random wojak', async ({ page }) => {
    await gotoWithWizard(page);

    // Wait for preview to have initial content
    await page.waitForFunction(() => {
      const img = document.querySelector('img[alt="Wojak preview"]') as HTMLImageElement;
      return img && (img.src.startsWith('data:') || img.src.startsWith('blob:'));
    }, undefined, { timeout: 15000 });

    // Get initial preview src
    const initialSrc = await page.evaluate(() => {
      const img = document.querySelector('img[alt="Wojak preview"]') as HTMLImageElement;
      return img?.src || '';
    });

    // Click Randomize
    const randomizeButton = page.getByRole('button', { name: /randomize and customize/i });
    await randomizeButton.click();
    await page.waitForTimeout(1000);

    // Wizard should be gone
    const wizardOverlay = page.locator('.wizard-overlay');
    await expect(wizardOverlay).toHaveCount(0);

    // Preview should have changed (randomized)
    const newSrc = await page.evaluate(() => {
      const img = document.querySelector('img[alt="Wojak preview"]') as HTMLImageElement;
      return img?.src || '';
    });
    expect(newSrc).not.toBe(initialSrc);
  });

  test('completing wizard marks it as done (skipped on revisit)', async ({ page }) => {
    await gotoWithWizard(page);

    // Navigate through all 6 steps
    for (let i = 0; i < WIZARD_STEPS.length - 1; i++) {
      const nextButton = page.getByRole('button', { name: /next step/i });
      await nextButton.click();
      await page.waitForTimeout(400);
    }

    // Click Done on last step
    const doneButton = page.getByRole('button', { name: /finish wizard/i });
    await doneButton.click();
    await page.waitForTimeout(500);

    // Wizard should be gone
    const wizardOverlay = page.locator('.wizard-overlay');
    await expect(wizardOverlay).toHaveCount(0);

    // Verify localStorage was set
    const wizardComplete = await page.evaluate(() =>
      localStorage.getItem('wojak-wizard-complete')
    );
    expect(wizardComplete).toBe('true');
  });

  test('wizard step position persists across page refresh', async ({ page }) => {
    await gotoWithWizard(page);

    // Navigate to step 3
    for (let i = 0; i < 2; i++) {
      const nextButton = page.getByRole('button', { name: /next step/i });
      await nextButton.click();
      await page.waitForTimeout(400);
    }

    // Verify on step 3
    await expect(page.locator('text=Step 3 of 6')).toBeAttached();

    // Refresh (keep the same context, so addInitScript still runs but sessionStorage persists)
    await page.reload({ waitUntil: 'load', timeout: 30000 });

    // Handle boot/welcome if needed
    const bootSkip = page.locator('.boot-skip-button');
    try {
      await bootSkip.waitFor({ state: 'attached', timeout: 3000 });
      await bootSkip.click({ force: true });
      await page.waitForTimeout(2000);
    } catch {
      // No boot sequence
    }
    const gotItButton = page.getByRole('button', { name: /got it/i });
    try {
      await gotItButton.waitFor({ state: 'visible', timeout: 3000 });
      await gotItButton.click({ force: true });
      await page.waitForTimeout(500);
    } catch {
      // No welcome dialog
    }

    // Wait for generator
    await page.locator('.generator-page').waitFor({ state: 'attached', timeout: 20000 });

    // Force animations
    await page.evaluate(() => {
      const el = document.querySelector('.generator-page');
      if (!el) return;
      let current: Element | null = el;
      while (current && current !== document.body) {
        const style = window.getComputedStyle(current);
        if (style.opacity !== '1' || style.visibility === 'hidden') {
          (current as HTMLElement).style.setProperty('opacity', '1', 'important');
          (current as HTMLElement).style.setProperty('visibility', 'visible', 'important');
        }
        current = current.parentElement;
      }
    });

    // Should resume at step 3 (sessionStorage persists across reload)
    await expect(page.locator('text=Step 3 of 6')).toBeAttached({ timeout: 10000 });
  });

  test('selections persist from wizard into full generator', async ({ page }) => {
    await gotoWithWizard(page);

    // Wait for traits to load
    await page.locator('.generator-trait-card').first().waitFor({
      state: 'attached',
      timeout: 15000,
    });

    // Select a trait on step 1 (Eyes)
    await page.evaluate(() => {
      const cards = document.querySelectorAll('.generator-trait-card');
      if (cards[1]) (cards[1] as HTMLElement).click();
    });
    await page.waitForTimeout(500);

    // Get the preview after selecting
    const wizardPreviewSrc = await page.evaluate(() => {
      const img = document.querySelector('img[alt="Wojak preview"]') as HTMLImageElement;
      return img?.src || '';
    });

    // Skip wizard
    const skipButton = page.getByRole('button', { name: /skip wizard/i });
    await skipButton.click();
    await page.waitForTimeout(500);

    // Preview should be the same (selection persisted)
    const fullGenPreviewSrc = await page.evaluate(() => {
      const img = document.querySelector('img[alt="Wojak preview"]') as HTMLImageElement;
      return img?.src || '';
    });
    expect(fullGenPreviewSrc).toBe(wizardPreviewSrc);
  });

  test('step indicator dots are accessible', async ({ page }) => {
    await gotoWithWizard(page);

    // Step indicator has navigation role
    const nav = page.locator('[role="navigation"][aria-label="Wizard steps"]');
    await expect(nav).toBeAttached();

    // Step 1 should have aria-current="step"
    const currentStep = nav.locator('[aria-current="step"]');
    await expect(currentStep).toBeAttached();
    const label = await currentStep.getAttribute('aria-label');
    expect(label).toContain('Step 1');
    expect(label).toContain('current');
  });
});
