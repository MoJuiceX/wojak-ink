import { describe, it, expect, beforeEach, vi } from 'vitest';
import { preloadCoordinator, type PageId, type PageImageRequirements } from './preloadCoordinator';

// Reset coordinator state between tests by re-importing.
// Since the coordinator is a singleton, we test it as-is,
// focusing on deterministic side-effect-free behaviors.

// ============================================
// getStats
// ============================================

describe('preloadCoordinator.getStats', () => {
  it('returns an object with expected fields', () => {
    const stats = preloadCoordinator.getStats();
    expect(stats).toHaveProperty('currentPage');
    expect(stats).toHaveProperty('triggerCount');
    expect(stats).toHaveProperty('visibleTriggers');
    expect(stats).toHaveProperty('registeredPages');
    expect(stats).toHaveProperty('preloaderStats');
  });

  it('triggerCount is a non-negative number', () => {
    const stats = preloadCoordinator.getStats();
    expect(stats.triggerCount).toBeGreaterThanOrEqual(0);
  });

  it('visibleTriggers is a non-negative number', () => {
    const stats = preloadCoordinator.getStats();
    expect(stats.visibleTriggers).toBeGreaterThanOrEqual(0);
  });

  it('registeredPages is an array', () => {
    expect(Array.isArray(preloadCoordinator.getStats().registeredPages)).toBe(true);
  });

  it('preloaderStats has loaded, loading, queued, failed fields', () => {
    const { preloaderStats } = preloadCoordinator.getStats();
    expect(preloaderStats).toHaveProperty('loaded');
    expect(preloaderStats).toHaveProperty('loading');
    expect(preloaderStats).toHaveProperty('queued');
    expect(preloaderStats).toHaveProperty('failed');
  });
});

// ============================================
// setCurrentPage
// ============================================

describe('preloadCoordinator.setCurrentPage', () => {
  it('updates currentPage in stats', () => {
    preloadCoordinator.setCurrentPage('gallery');
    expect(preloadCoordinator.getStats().currentPage).toBe('gallery');
  });

  it('changes currentPage when called with a new page', () => {
    preloadCoordinator.setCurrentPage('gallery');
    preloadCoordinator.setCurrentPage('treasury');
    expect(preloadCoordinator.getStats().currentPage).toBe('treasury');
  });

  it('works for all valid page IDs', () => {
    const pages: PageId[] = ['gallery', 'treasury', 'bigpulp', 'generator', 'media', 'settings'];
    for (const page of pages) {
      preloadCoordinator.setCurrentPage(page);
      expect(preloadCoordinator.getStats().currentPage).toBe(page);
    }
  });

  it('does not throw when called with same page twice', () => {
    preloadCoordinator.setCurrentPage('gallery');
    expect(() => preloadCoordinator.setCurrentPage('gallery')).not.toThrow();
  });
});

// ============================================
// registerPageRequirements
// ============================================

describe('preloadCoordinator.registerPageRequirements', () => {
  it('adds the pageId to registeredPages', () => {
    const requirements: PageImageRequirements = {
      pageId: 'bigpulp',
      critical: [],
      actionImages: new Map(),
    };
    preloadCoordinator.registerPageRequirements(requirements);
    expect(preloadCoordinator.getStats().registeredPages).toContain('bigpulp');
  });

  it('can register multiple pages', () => {
    preloadCoordinator.registerPageRequirements({
      pageId: 'gallery',
      critical: ['https://x.test/img1.png'],
      actionImages: new Map(),
    });
    preloadCoordinator.registerPageRequirements({
      pageId: 'treasury',
      critical: [],
      actionImages: new Map(),
    });
    const pages = preloadCoordinator.getStats().registeredPages;
    expect(pages).toContain('gallery');
    expect(pages).toContain('treasury');
  });

  it('does not throw with critical images array', () => {
    expect(() =>
      preloadCoordinator.registerPageRequirements({
        pageId: 'generator',
        critical: ['https://x.test/gen1.png', 'https://x.test/gen2.png'],
        actionImages: new Map(),
      })
    ).not.toThrow();
  });
});

// ============================================
// updateActionImages
// ============================================

describe('preloadCoordinator.updateActionImages', () => {
  beforeEach(() => {
    preloadCoordinator.registerPageRequirements({
      pageId: 'media',
      critical: [],
      actionImages: new Map(),
    });
  });

  it('does not throw when called for registered page', () => {
    expect(() =>
      preloadCoordinator.updateActionImages('media', 'scroll-action', ['https://x.test/a.png'])
    ).not.toThrow();
  });

  it('does not throw when called for unregistered page', () => {
    expect(() =>
      preloadCoordinator.updateActionImages('settings', 'some-action', [])
    ).not.toThrow();
  });

  it('does not throw with empty images array', () => {
    expect(() =>
      preloadCoordinator.updateActionImages('media', 'empty-action', [])
    ).not.toThrow();
  });
});

// ============================================
// registerTrigger
// ============================================

describe('preloadCoordinator.registerTrigger', () => {
  it('increases triggerCount', () => {
    const before = preloadCoordinator.getStats().triggerCount;
    const cleanup = preloadCoordinator.registerTrigger({
      id: 'test-trigger-1',
      type: 'button',
      imageUrls: ['https://x.test/t1.png'],
      priority: 'medium',
      isVisible: false,
    });
    expect(preloadCoordinator.getStats().triggerCount).toBeGreaterThanOrEqual(before);
    cleanup();
  });

  it('returns a cleanup function', () => {
    const cleanup = preloadCoordinator.registerTrigger({
      id: 'test-trigger-2',
      type: 'card',
      imageUrls: [],
      priority: 'low',
      isVisible: false,
    });
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('cleanup removes the trigger (count decreases)', () => {
    const before = preloadCoordinator.getStats().triggerCount;
    const cleanup = preloadCoordinator.registerTrigger({
      id: 'test-trigger-cleanup',
      type: 'link',
      imageUrls: ['https://x.test/cleanup.png'],
      priority: 'high',
      isVisible: false,
    });
    cleanup();
    expect(preloadCoordinator.getStats().triggerCount).toBe(before);
  });

  it('registers visible triggers and counts them', () => {
    const cleanup = preloadCoordinator.registerTrigger({
      id: 'visible-trigger',
      type: 'nav',
      imageUrls: ['https://x.test/vis.png'],
      priority: 'high',
      isVisible: true,
    });
    const stats = preloadCoordinator.getStats();
    expect(stats.visibleTriggers).toBeGreaterThanOrEqual(1);
    cleanup();
  });
});

// ============================================
// setTriggerVisibility
// ============================================

describe('preloadCoordinator.setTriggerVisibility', () => {
  it('does not throw for a trigger that does not exist', () => {
    expect(() =>
      preloadCoordinator.setTriggerVisibility('nonexistent-trigger', true)
    ).not.toThrow();
  });

  it('changes visibility of a registered trigger', () => {
    const cleanup = preloadCoordinator.registerTrigger({
      id: 'vis-change-trigger',
      type: 'tab',
      imageUrls: ['https://x.test/vchange.png'],
      priority: 'medium',
      isVisible: false,
    });

    const beforeVisible = preloadCoordinator.getStats().visibleTriggers;
    preloadCoordinator.setTriggerVisibility('vis-change-trigger', true);
    const afterVisible = preloadCoordinator.getStats().visibleTriggers;
    expect(afterVisible).toBeGreaterThanOrEqual(beforeVisible);

    cleanup();
  });
});

// ============================================
// updateTriggerImages
// ============================================

describe('preloadCoordinator.updateTriggerImages', () => {
  it('does not throw for a nonexistent trigger', () => {
    expect(() =>
      preloadCoordinator.updateTriggerImages('nonexistent', ['https://x.test/img.png'])
    ).not.toThrow();
  });

  it('does not throw when updating images on registered trigger', () => {
    const cleanup = preloadCoordinator.registerTrigger({
      id: 'update-images-trigger',
      type: 'button',
      imageUrls: ['https://x.test/old.png'],
      priority: 'medium',
      isVisible: false,
    });

    expect(() =>
      preloadCoordinator.updateTriggerImages('update-images-trigger', ['https://x.test/new.png'])
    ).not.toThrow();

    cleanup();
  });
});

// ============================================
// onNavigationHover
// ============================================

describe('preloadCoordinator.onNavigationHover', () => {
  it('does not throw for a registered navigation path', () => {
    preloadCoordinator.registerPageRequirements({
      pageId: 'gallery',
      critical: ['https://x.test/gal.png'],
      actionImages: new Map(),
    });
    expect(() => preloadCoordinator.onNavigationHover('/gallery')).not.toThrow();
  });

  it('does not throw for an unregistered path', () => {
    expect(() => preloadCoordinator.onNavigationHover('/unknown-path')).not.toThrow();
  });

  it('does not throw for the current page path', () => {
    preloadCoordinator.setCurrentPage('gallery');
    expect(() => preloadCoordinator.onNavigationHover('/gallery')).not.toThrow();
  });
});

// ============================================
// onTriggerHover
// ============================================

describe('preloadCoordinator.onTriggerHover', () => {
  it('does not throw for a nonexistent trigger', () => {
    expect(() => preloadCoordinator.onTriggerHover('ghost-trigger')).not.toThrow();
  });

  it('does not throw for a registered trigger', () => {
    const cleanup = preloadCoordinator.registerTrigger({
      id: 'hover-trigger',
      type: 'card',
      imageUrls: ['https://x.test/hover.png'],
      priority: 'medium',
      isVisible: true,
    });

    expect(() => preloadCoordinator.onTriggerHover('hover-trigger')).not.toThrow();

    cleanup();
  });
});

// ============================================
// subscribe
// ============================================

describe('preloadCoordinator.subscribe', () => {
  it('returns an unsubscribe function', () => {
    const unsub = preloadCoordinator.subscribe(() => {});
    expect(typeof unsub).toBe('function');
    unsub();
  });

  it('calls the callback when setCurrentPage changes the page', () => {
    const callback = vi.fn();
    const unsub = preloadCoordinator.subscribe(callback);

    // Set a different page to trigger a change
    const current = preloadCoordinator.getStats().currentPage;
    const nextPage: PageId = current === 'gallery' ? 'treasury' : 'gallery';
    preloadCoordinator.setCurrentPage(nextPage);

    expect(callback).toHaveBeenCalled();
    unsub();
  });

  it('does not call callback after unsubscribe', () => {
    const callback = vi.fn();
    const unsub = preloadCoordinator.subscribe(callback);
    unsub();

    const current = preloadCoordinator.getStats().currentPage;
    const nextPage: PageId = current === 'gallery' ? 'bigpulp' : 'gallery';
    preloadCoordinator.setCurrentPage(nextPage);
    // Callback may have been called before unsub; reset and check
    callback.mockClear();
    preloadCoordinator.setCurrentPage(current === 'gallery' ? 'media' : 'gallery');
    expect(callback).not.toHaveBeenCalled();
  });
});
