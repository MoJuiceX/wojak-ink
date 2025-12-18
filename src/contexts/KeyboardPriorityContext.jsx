import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

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
  const [activePriorities, setActivePriorities] = useState(new Map())
  const handlersRef = useRef(new Map())

  /**
   * Register a keyboard handler with a priority level
   * @param {number} priority - Priority level (lower number = higher priority)
   * @param {string} id - Unique identifier for this handler
   * @param {Function} handler - Keyboard event handler function
   * @param {boolean} isActive - Whether this handler is currently active
   */
  const registerHandler = useCallback((priority, id, handler, isActive) => {
    handlersRef.current.set(id, { priority, handler, isActive })
    
    setActivePriorities(prev => {
      const next = new Map(prev)
      if (isActive) {
        next.set(id, priority)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  /**
   * Unregister a keyboard handler
   * @param {string} id - Unique identifier for the handler
   */
  const unregisterHandler = useCallback((id) => {
    handlersRef.current.delete(id)
    setActivePriorities(prev => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  /**
   * Get the current highest priority level
   * @returns {number|null} The highest priority level, or null if none active
   */
  const getHighestPriority = useCallback(() => {
    if (activePriorities.size === 0) return null
    return Math.min(...Array.from(activePriorities.values()))
  }, [activePriorities])

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
      const topPriorityHandlers = Array.from(handlersRef.current.entries())
        .filter(([id, handler]) => 
          handler.isActive && 
          handler.priority === highestPriority &&
          activePriorities.has(id)
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
  }, [activePriorities, getHighestPriority])

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

  // Keep the latest handler without re-registering every render
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    if (!id) return

    if (isActive) {
      // Register a stable wrapper once; it always calls the latest handlerRef
      registerHandler(priority, id, (e) => handlerRef.current?.(e), true)
    } else {
      unregisterHandler(id)
    }

    return () => {
      unregisterHandler(id)
    }
    // IMPORTANT: handler is intentionally NOT a dependency to avoid infinite loops
  }, [priority, id, isActive, registerHandler, unregisterHandler])

  return { shouldHandle: shouldHandle(id) }
}
