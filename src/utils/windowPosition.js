/**
 * Calculate centered position for a window with safe margins
 * Accounts for taskbar height on desktop to prevent overlap
 * @param {Object} options - Positioning options
 * @param {number} options.width - Window width in pixels
 * @param {number} options.height - Window height in pixels
 * @param {number} [options.padding=24] - Minimum padding from viewport edges
 * @param {boolean} [options.isMobile=false] - Whether this is a mobile viewport
 * @param {string} [options.windowId] - Window identifier for special positioning (e.g., README offset)
 * @returns {{x: number, y: number}} Centered position with clamping
 */
// README-specific X offset to center content column (not window frame) on screen
const README_CENTER_OFFSET_X = -170

// Cache for getComputedStyle results to prevent repeated layout reads
const styleCache = {
  taskbarHeight: null,
  safeAreaBottom: null,
  desktopPadding: null,
  titleBarHeight: null,
  windowMinWidth: null,
  windowMinHeight: null,
  windowMaxWidthWide: null,
  windowMaxHeight: null,
  cacheTime: 0,
  cacheDuration: 100, // Cache for 100ms
}

function getCachedStyleProperty(property, defaultValue = 0) {
  const now = performance.now()
  // Invalidate cache if too old
  if (now - styleCache.cacheTime > styleCache.cacheDuration) {
    styleCache.cacheTime = now
    // Batch all getComputedStyle reads together (prevent layout thrashing)
    const rootStyle = getComputedStyle(document.documentElement)
    styleCache.taskbarHeight = parseFloat(rootStyle.getPropertyValue('--taskbar-height')) || 30
    styleCache.safeAreaBottom = parseFloat(rootStyle.getPropertyValue('--safe-area-inset-bottom')) || 0
    styleCache.desktopPadding = parseFloat(rootStyle.getPropertyValue('--desktop-padding')) || 24
    styleCache.titleBarHeight = parseFloat(rootStyle.getPropertyValue('--window-title-bar-height')) || 30
    styleCache.windowMinWidth = parseFloat(rootStyle.getPropertyValue('--window-min-width')) || 200
    styleCache.windowMinHeight = parseFloat(rootStyle.getPropertyValue('--window-min-height')) || 100
    styleCache.windowMaxWidthWide = parseFloat(rootStyle.getPropertyValue('--window-max-width-wide')) || 1400
    styleCache.windowMaxHeight = parseFloat(rootStyle.getPropertyValue('--window-max-height')) || Infinity
  }
  
  return styleCache[property] ?? defaultValue
}

export function getCenteredPosition({ width, height, padding = 24, isMobile = false, windowId }) {
  // SSR / non-browser safety
  if (typeof window === 'undefined') {
    return { x: 20, y: 20 }
  }
  
  // Batch all layout reads first (prevent layout thrashing)
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Use cached style values (batched reads)
  const taskbarHeight = getCachedStyleProperty('taskbarHeight', 30)
  const safeAreaBottom = isMobile ? getCachedStyleProperty('safeAreaBottom', 0) : 0
  const availableHeight = viewportHeight - taskbarHeight - safeAreaBottom
  
  // #region agent log
  if (windowId === 'window-readme-txt' || windowId?.includes('readme')) {
    fetch('http://127.0.0.1:7243/ingest/caaf9dd8-e863-4d9c-b151-a370d047a715',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'windowPosition.js:49',message:'getCenteredPosition entry',data:{windowId,width,height,padding,isMobile,viewportWidth,viewportHeight,taskbarHeight,safeAreaBottom,availableHeight},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
  }
  // #endregion
  
  // Calculate center position
  // Center X in viewport
  let x = Math.floor((viewportWidth - width) / 2)
  // Center Y in full viewport (not availableHeight) for better visual centering
  let y = Math.floor((viewportHeight - height) / 2)
  
  // #region agent log
  if (windowId === 'window-readme-txt' || windowId?.includes('readme')) {
    fetch('http://127.0.0.1:7243/ingest/caaf9dd8-e863-4d9c-b151-a370d047a715',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'windowPosition.js:66',message:'After initial Y calculation',data:{windowId,calculatedY:y,availableHeight,height,viewportHeight,taskbarHeight},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H1'})}).catch(()=>{});
  }
  // #endregion
  
  // Apply README-specific offset to X position only (Y remains unchanged)
  const isReadme = windowId === 'window-readme-txt' || windowId === 'readme' || windowId?.includes('readme')
  if (isReadme) {
    x += README_CENTER_OFFSET_X
  }
  
  // Clamp with padding (minimum 24px, or 8px if window is larger than viewport)
  const minPadding = viewportWidth < width || viewportHeight < height ? 8 : padding
  
  const yBeforeClamp = y
  x = Math.max(minPadding, Math.min(x, viewportWidth - width - minPadding))
  // Clamp Y: ensure minimum padding from top, and ensure window doesn't overlap taskbar at bottom
  // Use full viewport for centering, but clamp bottom to stay above taskbar
  const maxY = availableHeight - height - minPadding
  y = Math.max(minPadding, Math.min(y, maxY))
  
  // #region agent log
  if (windowId === 'window-readme-txt' || windowId?.includes('readme')) {
    fetch('http://127.0.0.1:7243/ingest/caaf9dd8-e863-4d9c-b151-a370d047a715',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'windowPosition.js:79',message:'After clamping',data:{windowId,yBeforeClamp,yAfterClamp:y,minPadding,availableHeight,height,calculatedCenterY:Math.floor((viewportHeight - height) / 2),maxY},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H1'})}).catch(()=>{});
  }
  // #endregion
  
  return { x, y }
}

/**
 * Calculate cascade position relative to a base position
 * Applies 30px offset per index (Windows-style cascade)
 * @param {Object} options - Positioning options
 * @param {number} options.width - Window width in pixels
 * @param {number} options.height - Window height in pixels
 * @param {number} options.baseX - Base X position (typically README centered position)
 * @param {number} options.baseY - Base Y position (typically README centered position)
 * @param {number} options.index - Cascade index (0 = base, 1 = +30px, 2 = +60px, etc.)
 * @param {number} [options.padding=24] - Minimum padding from viewport edges
 * @param {boolean} [options.isMobile=false] - Whether this is a mobile viewport
 * @returns {{x: number, y: number}} Cascade position with clamping
 */
const CASCADE_STEP = 30

export function getCascadePosition({ width, height, baseX, baseY, index, padding = 24, isMobile = false }) {
  // SSR safety
  if (typeof window === 'undefined') {
    return { x: 20, y: 20 }
  }
  
  // Apply cascade offset
  const x = baseX + (index * CASCADE_STEP)
  const y = baseY + (index * CASCADE_STEP)
  
  // Clamp to viewport using existing clampWindowPosition
  return clampWindowPosition({ x, y, width, height, isMobile })
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
    'window-faq': { width: 600, height: 400 }, // Updated to match actual width
    'window-marketplace': { width: 900, height: 700 },
    'tanggang': { width: 400, height: 300 },
    'wojak-creator': { width: 1000, height: 800 },
    'paint-window': { width: 800, height: 600 },
    'treasure-window': { width: 500, height: 500 },
    'pinball-window': { width: 1024, height: 768 },
    'window-solitaire': { width: 900, height: 700 },
    'window-minesweeper': { width: 520, height: 640 },
    'window-skifree': { width: 900, height: 700 },
    'try-again-window': { width: 400, height: 500 },
  }
  
  return defaults[windowId] || { width: 600, height: 400 }
}

/**
 * Clamp window position to ensure it stays within viewport bounds
 * Ensures title bar is always reachable (at least title bar height visible)
 * @param {Object} options - Clamping options
 * @param {number} options.x - Desired X position
 * @param {number} options.y - Desired Y position
 * @param {number} options.width - Window width
 * @param {number} options.height - Window height
 * @param {boolean} [options.isMobile=false] - Whether this is a mobile viewport
 * @returns {{x: number, y: number}} Clamped position
 */
export function clampWindowPosition({ x, y, width, height, isMobile = false }) {
  // Batch all layout reads first (prevent layout thrashing)
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Use cached style values (batched reads, no repeated getComputedStyle calls)
  const desktopPadding = getCachedStyleProperty('desktopPadding', 24)
  const taskbarHeight = getCachedStyleProperty('taskbarHeight', 30)
  const titleBarHeight = getCachedStyleProperty('titleBarHeight', 30)
  
  // On desktop, ensure title bar is always reachable (at least title bar height visible)
  // On mobile, windows are positioned relatively, so no clamping needed
  if (isMobile) {
    return { x, y }
  }
  
  // Available viewport (accounting for taskbar)
  const availableHeight = viewportHeight - taskbarHeight
  
  // Minimum X: window can go off-screen but must keep at least title bar visible
  // If window is 800px wide and titleBarHeight is 30px:
  //   minX = -(800 - 30) = -770 means window can be 770px off-screen, leaving 30px visible
  const minX = -(width - titleBarHeight)
  
  // Maximum X: window must keep at least title bar visible on right
  // Window at position x extends from x to x+width
  // We want: x + width - titleBarHeight <= viewportWidth (at least titleBarHeight visible)
  // So: x <= viewportWidth - width + titleBarHeight
  // Example: viewport=1920, width=800, titleBarHeight=30
  //   maxX = 1920 - 800 + 30 = 1150
  //   At x=1150, window extends from 1150 to 1950, with 30px (1890-1920) visible
  const maxX = viewportWidth - width + titleBarHeight
  
  // Minimum Y: window can go off-screen but must keep at least title bar visible
  const minY = -(height - titleBarHeight)
  
  // Maximum Y: window must keep title bar above taskbar
  // Window at position y extends from y to y+height
  // We want: y + height - titleBarHeight <= availableHeight (title bar above taskbar)
  // So: y <= availableHeight - height + titleBarHeight
  // Example: availableHeight=1050, height=600, titleBarHeight=30
  //   maxY = 1050 - 600 + 30 = 480
  //   At y=480, window extends from 480 to 1080, with title bar ending at 1050 (above taskbar at 1050)
  const maxY = availableHeight - height + titleBarHeight
  
  // Clamp position
  const clampedX = Math.max(minX, Math.min(maxX, x))
  const clampedY = Math.max(minY, Math.min(maxY, y))
  
  return { x: clampedX, y: clampedY }
}

/**
 * Get window size constraints from layout tokens
 * @param {Object} [options={}] - Options
 * @param {number} [options.minWidth] - Override min width
 * @param {number} [options.minHeight] - Override min height
 * @param {number} [options.maxWidth] - Override max width
 * @param {number} [options.maxHeight] - Override max height
 * @returns {{minWidth: number, minHeight: number, maxWidth: number, maxHeight: number}} Size constraints
 */
export function getWindowSizeConstraints(options = {}) {
  // Batch all layout reads first (prevent layout thrashing)
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Use cached style values (batched reads, no repeated getComputedStyle calls)
  const minWidth = options.minWidth || getCachedStyleProperty('windowMinWidth', 200)
  const minHeight = options.minHeight || getCachedStyleProperty('windowMinHeight', 100)
  const desktopPadding = getCachedStyleProperty('desktopPadding', 24)
  const taskbarHeight = getCachedStyleProperty('taskbarHeight', 30)
  const titleBarHeight = getCachedStyleProperty('titleBarHeight', 30)
  
  // Max width: viewport minus padding on both sides
  const maxWidth = options.maxWidth || Math.min(
    getCachedStyleProperty('windowMaxWidthWide', 1400),
    viewportWidth - (desktopPadding * 2)
  )
  
  // Max height: viewport minus taskbar, title bar, and padding
  const maxHeight = options.maxHeight || Math.min(
    getCachedStyleProperty('windowMaxHeight', Infinity),
    viewportHeight - taskbarHeight - titleBarHeight - (desktopPadding * 2)
  )
  
  return { minWidth, minHeight, maxWidth, maxHeight }
}

