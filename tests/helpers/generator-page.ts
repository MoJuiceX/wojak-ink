/**
 * Generator Page Object Model
 *
 * Encapsulates common interactions with the Wojak generator for Playwright tests.
 * Used by both mobile and desktop test suites.
 *
 * CSS class mapping (actual component classes):
 *   Trait cards:   .generator-trait-card  (selected: .generator-trait-card--selected)
 *   Category tabs: .generator-layer-tab   (active: .generator-layer-tab--active, blocked: .generator-layer-tab--blocked)
 *   Tab bar:       .generator-layer-tab-bar
 *   Options grid:  .generator-options-grid
 *   Color panel:   .generator-options-mobile-panel
 */

import { type Page, type Locator } from '@playwright/test';

/**
 * Visible layer tabs in UI order.
 * MouthItem and FacialHair are hidden (merged into MouthBase tab).
 */
export const VISIBLE_TABS = [
  'Base',
  'MouthBase',
  'Mask',
  'Head',
  'Eyes',
  'Clothes',
  'Background',
] as const;

/**
 * Human-readable labels from LAYER_META.
 * These are the text shown on tab buttons.
 */
export const LAYER_LABELS: Record<string, string> = {
  Base: 'Face',
  MouthBase: 'Mouth',
  MouthItem: 'Mouth Item',
  FacialHair: 'Facial Hair',
  Mask: 'Extras',
  Head: 'Head',
  Eyes: 'Eyes',
  Clothes: 'Clothes',
  Background: 'Background',
};

export class GeneratorPage {
  readonly page: Page;

  // Main sections
  readonly previewArea: Locator;
  readonly categoriesBar: Locator;
  readonly optionsGrid: Locator;
  readonly actionsBar: Locator;
  readonly mobileColorPanel: Locator;
  readonly scrollView: Locator;

  // Buttons
  readonly randomizeButton: Locator;
  readonly undoButton: Locator;
  readonly redoButton: Locator;
  readonly exportButton: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main sections (use actual CSS classes from components)
    this.previewArea = page.locator('.generator-preview');
    this.categoriesBar = page.locator('.generator-layer-tab-bar');
    this.optionsGrid = page.locator('.generator-options-grid');
    this.actionsBar = page.locator('.generator-actions');
    this.mobileColorPanel = page.locator('.generator-options-mobile-panel');
    this.scrollView = page.locator('.generator-scroll-view');

    // Action buttons (by role+name — matches actual button text/aria-labels)
    this.randomizeButton = page.getByRole('button', { name: /randomize/i });
    this.undoButton = page.getByRole('button', { name: /undo/i });
    this.redoButton = page.getByRole('button', { name: /redo/i });
    this.exportButton = page.getByRole('button', { name: /export/i });
    this.saveButton = page.getByRole('button', { name: /save/i });
  }

  /**
   * Navigate to the generator page and wait for initialization.
   *
   * Handles:
   * 1. Skipping boot/intro sequence via localStorage
   * 2. Dismissing first-visit welcome dialog via localStorage
   * 3. Force-completing framer-motion animations (stall on headless WebKit)
   * 4. Waiting for generator content to mount
   */
  async goto() {
    // addInitScript runs before page scripts on every navigation in this context.
    // Set localStorage on the correct origin to:
    //   - Skip boot sequence (wojak-settings.app.skipBootSequence)
    //   - Mark boot as seen this session (wojak_boot_complete)
    //   - Dismiss welcome dialog (wojak_generator_seen)
    await this.page.context().addInitScript(() => {
      try {
        // Skip boot/intro animation
        const stored = localStorage.getItem('wojak-settings');
        const settings = stored ? JSON.parse(stored) : {};
        settings.app = settings.app || {};
        settings.app.skipBootSequence = true;
        localStorage.setItem('wojak-settings', JSON.stringify(settings));

        // Mark boot as complete for this session
        sessionStorage.setItem('wojak_boot_complete', 'true');

        // Dismiss first-visit welcome dialog
        localStorage.setItem('wojak_generator_seen', 'true');

        // Skip quick start wizard (tests exercise full generator)
        localStorage.setItem('wojak-wizard-complete', 'true');
      } catch {
        // Ignore storage errors on about:blank
      }
    });

    await this.page.goto('/generator', { waitUntil: 'load', timeout: 30000 });

    // If boot sequence still appears (addInitScript may not run on first load),
    // click skip and wait for it to dismiss
    const bootSkip = this.page.locator('.boot-skip-button');
    try {
      await bootSkip.waitFor({ state: 'attached', timeout: 3000 });
      await bootSkip.click({ force: true });
      await this.page.waitForTimeout(2000);
    } catch {
      // No boot sequence — already skipped
    }

    // If welcome dialog ("The Wojak Generator") still appears, dismiss it
    const gotItButton = this.page.getByRole('button', { name: /got it/i });
    try {
      await gotItButton.waitFor({ state: 'visible', timeout: 3000 });
      await gotItButton.click({ force: true });
      await this.page.waitForTimeout(500);
    } catch {
      // No welcome dialog — already dismissed
    }

    // Wait for the generator-page element to mount
    await this.page.locator('.generator-page').waitFor({ state: 'attached', timeout: 20000 });

    // Framer-motion PageTransition animates opacity 0→1 over 250ms. On headless WebKit
    // (Safari) this animation can stall, leaving the subtree with visibility:hidden.
    // Force-complete by setting visibility on all ancestors.
    await this.page.evaluate(() => {
      const page = document.querySelector('.generator-page');
      if (!page) return;
      let el: Element | null = page;
      while (el && el !== document.body) {
        const style = window.getComputedStyle(el);
        if (style.opacity !== '1' || style.visibility === 'hidden') {
          (el as HTMLElement).style.setProperty('opacity', '1', 'important');
          (el as HTMLElement).style.setProperty('visibility', 'visible', 'important');
        }
        el = el.parentElement;
      }
    });

    // Wait for generator preview image to have content
    await this.previewArea.waitFor({ state: 'attached', timeout: 10000 });
  }

  /** Wait for the trait grid to be populated (at least one trait card in DOM) */
  async waitForTraitsLoaded() {
    await this.page.locator('.generator-trait-card').first().waitFor({
      state: 'attached',
      timeout: 25000,
    });
  }

  /** Select a category tab by its layer name */
  async selectCategory(layerName: string) {
    const label = LAYER_LABELS[layerName] || layerName;
    // Use JavaScript click to avoid viewport coordinate issues with fixed nav bar
    await this.page.evaluate((lbl) => {
      const tabs = document.querySelectorAll('.generator-layer-tab');
      for (const tab of tabs) {
        if (tab.textContent?.includes(lbl)) {
          (tab as HTMLElement).click();
          break;
        }
      }
    }, label);
    // Wait for grid to update
    await this.page.waitForTimeout(300);
  }

  /**
   * Click the Nth trait card in the current category grid (0-indexed).
   *
   * Uses JavaScript .click() to avoid coordinates overlapping with the
   * fixed bottom navigation bar on mobile viewports. Playwright's force:true
   * click dispatches at viewport coordinates, which can land on the bottom nav
   * if the card is positioned near the screen edge.
   */
  async selectTraitByIndex(index: number) {
    await this.page.evaluate((idx) => {
      const cards = document.querySelectorAll('.generator-trait-card');
      if (cards[idx]) {
        (cards[idx] as HTMLElement).click();
      }
    }, index);
  }

  /**
   * Get the current preview image src (data URL) for change detection.
   * The generator renders to an off-screen canvas and sets it as an <img> src.
   */
  async getPreviewSrc(): Promise<string> {
    return this.page.evaluate(() => {
      const img = document.querySelector('img[alt="Wojak preview"]') as HTMLImageElement;
      return img?.src || '';
    });
  }

  /**
   * Check if the preview has a rendered image (non-empty src).
   * The preview img gets a data:image/png src when rendering completes.
   */
  async isPreviewRendered(): Promise<boolean> {
    return this.page.evaluate(() => {
      const img = document.querySelector('img[alt="Wojak preview"]') as HTMLImageElement;
      if (!img || !img.src) return false;
      // A data URL or blob URL means the canvas has rendered
      return img.src.startsWith('data:') || img.src.startsWith('blob:');
    });
  }

  /**
   * Wait for the preview to update by detecting an image src change.
   * Compares against a previously captured src value.
   */
  async waitForPreviewUpdate(previousSrc: string, timeout = 10000) {
    await this.page.waitForFunction(
      (prevSrc) => {
        const img = document.querySelector('img[alt="Wojak preview"]') as HTMLImageElement;
        if (!img || !img.src) return false;
        return img.src !== prevSrc;
      },
      previousSrc,
      { timeout }
    );
  }

  // Keep old names as aliases for backward compat within tests
  async getCanvasDataUrl(): Promise<string> {
    return this.getPreviewSrc();
  }

  async isCanvasNotBlank(): Promise<boolean> {
    return this.isPreviewRendered();
  }

  /** Scroll the mobile scroll view to trigger the sticky mini preview (scroll > 300px) */
  async scrollToTriggerSticky() {
    await this.page.evaluate(() => {
      const scrollView = document.querySelector('.generator-scroll-view');
      if (scrollView) {
        scrollView.scrollTo({ top: 350 });
      } else {
        window.scrollTo({ top: 350 });
      }
    });
    // Wait for scroll event to be processed
    await this.page.waitForTimeout(500);
  }

  /** Scroll back to top */
  async scrollToTop() {
    await this.page.evaluate(() => {
      const scrollView = document.querySelector('.generator-scroll-view');
      if (scrollView) {
        scrollView.scrollTo({ top: 0 });
      } else {
        window.scrollTo({ top: 0 });
      }
    });
    await this.page.waitForTimeout(300);
  }

  /** Get the number of columns in the trait grid */
  async getGridColumnCount(): Promise<number> {
    return this.page.evaluate(() => {
      const grid = document.querySelector('.generator-options-grid');
      if (!grid) return 0;
      const style = window.getComputedStyle(grid);
      const columns = style.gridTemplateColumns;
      // Count the number of column tracks
      return columns.split(/\s+/).filter((s) => s && s !== 'none').length;
    });
  }

  /** Check if the sticky mini preview is currently visible */
  async isStickyPreviewVisible(): Promise<boolean> {
    // StickyMiniPreview renders with role="button" aria-label="Scroll to preview"
    const sticky = this.page.getByRole('button', { name: /scroll to preview/i });
    return sticky.isVisible().catch(() => false);
  }

  /** Get count of visible trait cards */
  async getVisibleTraitCount(): Promise<number> {
    return this.page.locator('.generator-trait-card').count();
  }

  /** Check if a category tab is disabled/blocked (aria-disabled) */
  async isCategoryDisabled(layerName: string): Promise<boolean> {
    const label = LAYER_LABELS[layerName] || layerName;
    const tab = this.page.locator('.generator-layer-tab').filter({ hasText: label });
    const ariaDisabled = await tab.getAttribute('aria-disabled');
    return ariaDisabled === 'true';
  }

  /** Check if a trait card has the selected state */
  async hasSelectedTrait(): Promise<boolean> {
    const selected = this.page.locator('.generator-trait-card--selected');
    return (await selected.count()) > 0;
  }
}
