/**
 * Debounce utility function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately on first call
 * @returns {Function} Debounced function with cancel method
 */
export function debounce(func, wait = 300, immediate = false) {
  let timeout
  
  function executedFunction(...args) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    
    const callNow = immediate && !timeout
    
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    
    if (callNow) func(...args)
  }
  
  executedFunction.cancel = () => {
    clearTimeout(timeout)
    timeout = null
  }
  
  return executedFunction
}

/**
 * React hook for debounced values
 * Note: Import React in your component file when using this hook
 * @param {any} value - Value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {any} Debounced value
 */
export function useDebounce(value, delay = 300) {
  // This is a placeholder - import React in your component
  // const [debouncedValue, setDebouncedValue] = React.useState(value)
  // React.useEffect(() => { ... }, [value, delay])
  // return debouncedValue
  return value
}

