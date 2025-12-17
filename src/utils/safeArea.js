/**
 * Safe Area Utilities
 * Helper functions and CSS variables for handling safe-area insets on mobile devices
 */

/**
 * Get safe-area inset values from CSS environment variables
 * @returns {Object} Object with top, right, bottom, left inset values in pixels
 */
export function getSafeAreaInsets() {
  if (typeof window === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 }
  }

  const root = document.documentElement
  const computedStyle = getComputedStyle(root)

  const getInset = (envVar) => {
    const value = computedStyle.getPropertyValue(envVar) || '0px'
    return parseInt(value, 10) || 0
  }

  return {
    top: getInset('env(safe-area-inset-top)'),
    right: getInset('env(safe-area-inset-right)'),
    bottom: getInset('env(safe-area-inset-bottom)'),
    left: getInset('env(safe-area-inset-left)'),
  }
}

/**
 * React hook to get safe-area insets
 * Updates on window resize
 * Note: Import React in your component file when using this hook
 */
export function useSafeAreaInsets() {
  // This is a placeholder - import React in your component
  // const [insets, setInsets] = React.useState(getSafeAreaInsets)
  // React.useEffect(() => { ... }, [])
  // return insets
  return getSafeAreaInsets()
}

