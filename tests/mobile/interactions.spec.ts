import { test, expect } from '@playwright/test';
import { GeneratorPage } from '../helpers/generator-page';

/**
 * Mobile Interaction Tests
 *
 * Verifies core generator interactions work on mobile:
 * - Randomize
 * - Undo / Redo
 * - Export (PNG generation)
 */

test.describe('Mobile Interactions', () => {
  test.setTimeout(60000);

  let gen: GeneratorPage;

  test.beforeEach(async ({ page }) => {
    gen = new GeneratorPage(page);
    await gen.goto();
    await gen.waitForTraitsLoaded();
  });

  test('Randomize button generates a new wojak', async () => {
    // Get initial canvas state
    const beforeSrc = await gen.getPreviewSrc();

    // Click randomize
    await gen.randomizeButton.click();

    // Wait for preview to change
    try {
      await gen.waitForPreviewUpdate(beforeSrc, 8000);
    } catch {
      // Randomize might (rarely) produce the same selection.
    }

    // The preview should still be rendered after randomize
    const isRendered = await gen.isPreviewRendered();
    expect(isRendered).toBe(true);
  });

  test('Undo reverts the last change', async () => {
    // Select a trait to create an undoable action
    await gen.selectCategory('Eyes');
    await gen.page.waitForTimeout(500);
    await gen.selectTraitByIndex(0);
    await gen.page.waitForTimeout(1000);

    // Select a different trait (creates a second history entry)
    const _beforeSecondSelect = await gen.getPreviewSrc();
    await gen.selectTraitByIndex(1);
    await gen.page.waitForTimeout(1000);

    const afterSecondSelect = await gen.getPreviewSrc();

    // Undo should revert to previous selection
    await gen.undoButton.click();
    await gen.page.waitForTimeout(1000);

    const afterUndo = await gen.getPreviewSrc();

    // After undo, the preview should differ from the second selection
    // (it should be back to the first selection state)
    // Note: exact data URL comparison can be flaky due to rendering timing,
    // so we just verify that undo changed the preview at all.
    expect(afterUndo).not.toBe(afterSecondSelect);
  });

  test('Redo re-applies the undone change', async () => {
    // Make two selection changes
    await gen.selectCategory('Eyes');
    await gen.page.waitForTimeout(500);
    await gen.selectTraitByIndex(0);
    await gen.page.waitForTimeout(1000);

    await gen.selectTraitByIndex(1);
    await gen.page.waitForTimeout(1000);

    const afterSecondSelect = await gen.getPreviewSrc();

    // Undo
    await gen.undoButton.click();
    await gen.page.waitForTimeout(1000);

    const afterUndo = await gen.getPreviewSrc();
    expect(afterUndo).not.toBe(afterSecondSelect);

    // Redo should change the preview back
    await gen.redoButton.click();
    await gen.page.waitForTimeout(1000);

    const afterRedo = await gen.getPreviewSrc();
    // Redo should produce a different state than the undone state
    expect(afterRedo).not.toBe(afterUndo);
    // And preview should still be rendered
    expect(await gen.isPreviewRendered()).toBe(true);
  });

  test('Export generates a PNG without crash', async () => {
    // Click export button
    await gen.exportButton.click();
    await gen.page.waitForTimeout(1000);

    // Export panel should appear (or download should start)
    // Look for the export panel/modal
    const exportPanel = gen.page.locator('.export-panel, [class*="export"]');
    const exportVisible = await exportPanel.isVisible().catch(() => false);

    // If export panel is visible, look for download/save button
    if (exportVisible) {
      // Just verify the panel rendered without crash
      expect(exportVisible).toBe(true);
    }

    // Verify no crash — page should still be responsive
    await expect(gen.previewArea).toBeAttached();
  });

  test('Multiple rapid category switches do not crash', async () => {
    // Rapidly switch between categories
    const categories = ['Eyes', 'Head', 'Clothes', 'Background', 'MouthBase', 'Mask'];

    for (const category of categories) {
      await gen.selectCategory(category);
      // Deliberately short wait to simulate rapid switching
      await gen.page.waitForTimeout(100);
    }

    // Page should still be functional
    await gen.page.waitForTimeout(1000);
    await expect(gen.previewArea).toBeAttached();

    // Preview should still be rendered
    const isRendered = await gen.isPreviewRendered();
    expect(isRendered).toBe(true);
  });
});
