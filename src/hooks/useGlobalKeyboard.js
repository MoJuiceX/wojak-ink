import { useEffect, useRef, useCallback, useState } from 'react'

/**
 * Global keyboard handler hook
 * - ArrowUp/ArrowDown: Navigate trait lists
 * - Enter: Select current option
 * - Esc: Close modals/sheets
 * Only active when trait panel is focused
 */
export function useGlobalKeyboard({
  isActive = false,
  onArrowUp,
  onArrowDown,
  onEnter,
  onEscape,
}) {
  const handlersRef = useRef({ onArrowUp, onArrowDown, onEnter, onEscape })
  const isActiveRef = useRef(isActive)

  // Update refs when props change
  useEffect(() => {
    handlersRef.current = { onArrowUp, onArrowDown, onEnter, onEscape }
    isActiveRef.current = isActive
  }, [onArrowUp, onArrowDown, onEnter, onEscape, isActive])

  // Global keyboard handler
  const handleKeyDown = useCallback((e) => {
    // Only handle if trait panel is active
    if (!isActiveRef.current) return

    // Don't interfere with input fields, textareas, or contenteditable
    const target = e.target
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.closest('input, textarea, [contenteditable="true"]')
    ) {
      // Allow normal input behavior, but still handle Esc
      if (e.key === 'Escape' && handlersRef.current.onEscape) {
        handlersRef.current.onEscape(e)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case 'ArrowUp':
        if (handlersRef.current.onArrowUp) {
          handlersRef.current.onArrowUp(e)
          e.preventDefault()
        }
        break
      case 'ArrowDown':
        if (handlersRef.current.onArrowDown) {
          handlersRef.current.onArrowDown(e)
          e.preventDefault()
        }
        break
      case 'Enter':
        if (handlersRef.current.onEnter) {
          handlersRef.current.onEnter(e)
          e.preventDefault()
        }
        break
      case 'Escape':
        if (handlersRef.current.onEscape) {
          handlersRef.current.onEscape(e)
          e.preventDefault()
        }
        break
    }
  }, [])

  useEffect(() => {
    if (isActive) {
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isActive, handleKeyDown])
}

/**
 * Hook to manage focus state for trait panels
 * Returns focus state and handlers
 */
export function useTraitPanelFocus() {
  const [isFocused, setIsFocused] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    const handleFocusIn = (e) => {
      // Check if focus is within trait panel
      if (panelRef.current && panelRef.current.contains(e.target)) {
        setIsFocused(true)
      }
    }

    const handleFocusOut = (e) => {
      // Check if focus moved outside trait panel
      if (panelRef.current && !panelRef.current.contains(e.relatedTarget)) {
        setIsFocused(false)
      }
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)

    return () => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
    }
  }, [])

  return { isFocused, panelRef, setIsFocused }
}

