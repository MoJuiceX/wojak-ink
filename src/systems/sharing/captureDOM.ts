/**
 * DOM Capture Utility
 *
 * Uses html2canvas to capture DOM elements as images.
 * Primarily used for DOM-based games that don't use canvas.
 */

export interface CaptureOptions {
  /** Background color (default: game dark background) */
  backgroundColor?: string;
  /** Scale factor for higher quality (default: 2) */
  scale?: number;
  /** Whether to log debug info (default: false) */
  logging?: boolean;
  /** Allow cross-origin images (default: true) */
  useCORS?: boolean;
}

const DEFAULT_OPTIONS: CaptureOptions = {
  backgroundColor: '#0f0f1a',
  scale: 2,
  logging: false,
  useCORS: true,
};

/**
 * Capture a DOM element as an image
 *
 * @param element - The DOM element to capture
 * @param options - Optional capture settings
 * @returns Base64 data URL of the captured image, or null on failure
 *
 * Usage:
 * ```tsx
 * const screenshot = await captureGameArea(gameAreaRef.current);
 * ```
 */
export async function captureGameArea(
  element: HTMLElement,
  options: CaptureOptions = {}
): Promise<string | null> {
  if (!element) {
    console.error('[CaptureDOM] No element provided');
    return null;
  }

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  try {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(element, {
      backgroundColor: mergedOptions.backgroundColor,
      scale: mergedOptions.scale,
      logging: mergedOptions.logging,
      useCORS: mergedOptions.useCORS,
      // Ignore elements that might cause issues
      ignoreElements: (el) => {
        // Ignore elements with data-html2canvas-ignore attribute
        if (el.hasAttribute?.('data-html2canvas-ignore')) return true;
        // Ignore video elements (can't be captured)
        if (el.tagName === 'VIDEO') return true;
        return false;
      },
    });

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('[CaptureDOM] Failed to capture element:', error);
    return null;
  }
}

/**
 * Check if html2canvas is available and working
 * Useful for feature detection
 */
export async function isCaptureSupported(): Promise<boolean> {
  try {
    // Create a simple test element
    const testEl = document.createElement('div');
    testEl.style.width = '10px';
    testEl.style.height = '10px';
    testEl.style.position = 'absolute';
    testEl.style.left = '-9999px';
    document.body.appendChild(testEl);

    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(testEl, {
      scale: 1,
      logging: false,
    });

    document.body.removeChild(testEl);
    return canvas.width > 0 && canvas.height > 0;
  } catch {
    return false;
  }
}
