import { createContext, useContext, useCallback, useRef, useEffect } from 'react'

const KeyboardPriorityContext = createContext()

/**
 * Keyboard Priority Levels (highest to lowest):
 * 1. MODAL - Modal dialogs (highest priority)
 * 2. BOTTOM_SHEET - Mobile bottom sheet (expanded)
 * 3. ACTIVE_WINDOW - Active window
 * 4. GLOBAL - Global shortcuts (lowest priority)
 */
export const KEYBOARD_PRIORITY = {
  MODAL: 1,
  BOTTOM_SHEET: 2,
  ACTIVE_WINDOW: 3,
  GLOBAL: 4,
}

/**
 * KeyboardPriorityProvider manages keyboard event priority
 * Ensures only the highest-priority layer receives keyboard events
 */
export function KeyboardPriorityProvider({ children }) {
  // Removed activePriorities state - we use handlersRef directly to avoid infinite loops
  // handlersRef stores all handler info including isActive, so we don't need separate state
  const handlersRef = useRef(new Map())

  /**
   * Register a keyboard handler with a priority level
   * @param {number} priority - Priority level (lower number = higher priority)
   * @param {string} id - Unique identifier for this handler
   * @param {Function} handler - Keyboard event handler function
   * @param {boolean} isActive - Whether this handler is currently active
   */
  const registerHandler = useCallback((priority, id, handler, isActive) => {
    // Store handler in ref - no state update needed, prevents infinite loops
    handlersRef.current.set(id, { priority, handler, isActive })
  }, [])

  /**
   * Unregister a keyboard handler
   * @param {string} id - Unique identifier for the handler
   */
  const unregisterHandler = useCallback((id) => {
    handlersRef.current.delete(id)
  }, [])

  /**
   * Get the current highest priority level
   * @returns {number|null} The highest priority level, or null if none active
   */
  const getHighestPriority = useCallback(() => {
    // Use handlersRef to avoid dependency on activePriorities state
    // This prevents infinite loops when activePriorities changes
    const activeIds = Array.from(handlersRef.current.entries())
      .filter(([id, handler]) => handler.isActive)
      .map(([id, handler]) => handler.priority)
    
    if (activeIds.length === 0) return null
    return Math.min(...activeIds)
  }, [])

  /**
   * Check if a handler with the given ID should process keyboard events
   * @param {string} id - Handler identifier
   * @returns {boolean} True if this handler should process events
   */
  const shouldHandle = useCallback((id) => {
    const handler = handlersRef.current.get(id)
    if (!handler || !handler.isActive) return false
    
    const highestPriority = getHighestPriority()
    if (highestPriority === null) return false
    
    // Only the highest priority handler should process events
    return handler.priority === highestPriority
  }, [getHighestPriority])

  // Global keyboard event dispatcher - only calls highest priority handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      const highestPriority = getHighestPriority()
      if (highestPriority === null) return

      // Find all handlers at the highest priority level
      // Use handlersRef directly to avoid dependency on activePriorities state
      const topPriorityHandlers = Array.from(handlersRef.current.entries())
        .filter(([id, handler]) => 
          handler.isActive && 
          handler.priority === highestPriority
        )

      // Only call handlers at the highest priority
      // If multiple handlers exist at the same priority, call the first one
      // (in practice, there should only be one active handler per priority level)
      if (topPriorityHandlers.length > 0) {
        const [, handler] = topPriorityHandlers[0]
        if (handler.handler) {
          handler.handler(e)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown, true) // Capture phase
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [getHighestPriority]) // Removed activePriorities dependency - use handlersRef instead

  const value = {
    registerHandler,
    unregisterHandler,
    shouldHandle,
    getHighestPriority,
  }

  return (
    <KeyboardPriorityContext.Provider value={value}>
      {children}
    </KeyboardPriorityContext.Provider>
  )
}

/**
 * Hook to access keyboard priority context
 */
export function useKeyboardPriority() {
  const context = useContext(KeyboardPriorityContext)
  if (!context) {
    throw new Error('useKeyboardPriority must be used within KeyboardPriorityProvider')
  }
  return context
}

/**
 * Hook to register a keyboard handler with priority
 * @param {number} priority - Priority level
 * @param {string} id - Unique identifier
 * @param {Function} handler - Keyboard event handler
 * @param {boolean} isActive - Whether handler is active
 */
export function useKeyboardHandler(priority, id, handler, isActive) {
  const { registerHandler, unregisterHandler, shouldHandle } = useKeyboardPriority()
  
  // Store handler in ref to avoid dependency on handler function (which may change every render)
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    if (isActive && handlerRef.current) {
      // Use ref to get latest handler without including it in dependencies
      registerHandler(priority, id, handlerRef.current, isActive)
    } else {
      unregisterHandler(id)
    }

    return () => {
      unregisterHandler(id)
    }
  }, [priority, id, isActive, registerHandler, unregisterHandler]) // Removed handler from deps

  return { shouldHandle: shouldHandle(id) }
}
