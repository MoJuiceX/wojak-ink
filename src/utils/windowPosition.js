/**
 * Calculate centered position for a window with safe margins
 * @param {Object} options - Positioning options
 * @param {number} options.width - Window width in pixels
 * @param {number} options.height - Window height in pixels
 * @param {number} [options.padding=24] - Minimum padding from viewport edges
 * @returns {{x: number, y: number}} Centered position with clamping
 */
export function getCenteredPosition({ width, height, padding = 24 }) {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Calculate center position
  let x = Math.floor((viewportWidth - width) / 2)
  let y = Math.floor((viewportHeight - height) / 2)
  
  // Clamp with padding (minimum 24px, or 8px if window is larger than viewport)
  const minPadding = viewportWidth < width || viewportHeight < height ? 8 : padding
  
  x = Math.max(minPadding, Math.min(x, viewportWidth - width - minPadding))
  y = Math.max(minPadding, Math.min(y, viewportHeight - height - minPadding))
  
  return { x, y }
}

/**
 * Get default window size for a window type
 * @param {string} windowId - Window identifier
 * @returns {{width: number, height: number}} Default window dimensions
 */
export function getDefaultWindowSize(windowId) {
  const defaults = {
    'window-readme-txt': { width: 820, height: 600 },
    'window-mint-info-exe': { width: 1200, height: 500 }, // Updated to match actual width
    'window-gallery': { width: 1200, height: 600 }, // Updated to match actual width
    'window-faq': { width: 1200, height: 500 }, // Updated to match actual width
    'window-marketplace': { width: 900, height: 700 },
    'tanggang': { width: 400, height: 300 },
    'wojak-creator': { width: 1000, height: 800 },
    'paint-window': { width: 800, height: 600 },
    'treasure-window': { width: 500, height: 500 },
  }
  
  return defaults[windowId] || { width: 600, height: 400 }
}

