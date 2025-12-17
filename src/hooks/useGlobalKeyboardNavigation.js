import { useEffect, useRef, useCallback, useState } from 'react'
import { useWindow } from '../contexts/WindowContext'
import { useKeyboardHandler, KEYBOARD_PRIORITY } from '../contexts/KeyboardPriorityContext'

/**
 * Enhanced global keyboard navigation hook
 * - ArrowUp/ArrowDown: Navigate between trait lists
 * - Enter: Select focused trait
 * - Esc: Close topmost window/modal/sheet
 * 
 * Only active when a trait panel is focused or a modal/sheet is open
 */
export function useGlobalKeyboardNavigation({
  isTraitPanelActive = false,
  isModalOpen = false,
  isBottomSheetOpen = false,
  onTraitNavigation,
  onTraitSelect,
  onCloseModal,
  onCloseBottomSheet,
}) {
  const { getAllWindows, isWindowMinimized, activeWindowId, minimizeWindow } = useWindow()
  const handlersRef = useRef({ 
    onTraitNavigation, 
    onTraitSelect, 
    onCloseModal, 
    onCloseBottomSheet 
  })
  const isActiveRef = useRef(isTraitPanelActive || isModalOpen || isBottomSheetOpen)

  // Update refs when props change
  useEffect(() => {
    handlersRef.current = { 
      onTraitNavigation, 
      onTraitSelect, 
      onCloseModal, 
      onCloseBottomSheet 
    }
    isActiveRef.current = isTraitPanelActive || isModalOpen || isBottomSheetOpen
  }, [isTraitPanelActive, isModalOpen, isBottomSheetOpen, onTraitNavigation, onTraitSelect, onCloseModal, onCloseBottomSheet])

  // Close topmost window
  const closeTopmostWindow = useCallback(() => {
    const allWindows = getAllWindows()
    const openWindows = allWindows.filter(w => !isWindowMinimized(w.id))
    
    if (openWindows.length === 0) return

    // Sort by zIndex to find topmost
    const sortedWindows = [...openWindows].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
    const topmostWindow = sortedWindows[0]

    if (topmostWindow) {
      // Find the window element and trigger close
      const windowElement = document.getElementById(topmostWindow.id)
      if (windowElement) {
        const closeButton = windowElement.querySelector('.title-bar-controls button:last-child')
        if (closeButton) {
          closeButton.click()
        }
      }
    }
  }, [getAllWindows, isWindowMinimized])

  // Global keyboard handler (priority 4: global shortcuts - lowest priority)
  const handleGlobalKeyboard = useCallback((e) => {
    // Only handle if trait panel is active (but no modal/sheet/window should be active)
    // This is lowest priority, so it only handles if nothing else is active
    if (!isActiveRef.current) return

    // Don't interfere with input fields, textareas, or contenteditable
    const target = e.target
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.closest('input, textarea, [contenteditable="true"]')
    ) {
      return // Let input fields handle their own events
    }

    switch (e.key) {
      case 'ArrowUp':
        if (isTraitPanelActive && handlersRef.current.onTraitNavigation) {
          handlersRef.current.onTraitNavigation('up', e)
          e.preventDefault()
          e.stopPropagation()
        }
        break
      case 'ArrowDown':
        if (isTraitPanelActive && handlersRef.current.onTraitNavigation) {
          handlersRef.current.onTraitNavigation('down', e)
          e.preventDefault()
          e.stopPropagation()
        }
        break
      case 'Enter':
        if (isTraitPanelActive && handlersRef.current.onTraitSelect) {
          handlersRef.current.onTraitSelect(e)
          e.preventDefault()
          e.stopPropagation()
        }
        break
      // Note: Escape is handled by higher priority handlers (modal/sheet/window)
      // This global handler should not handle Escape
    }
  }, [isTraitPanelActive])

  // Register global keyboard handler (lowest priority)
  // Only active when trait panel is active and no modals/sheets/windows are handling
  useKeyboardHandler(
    KEYBOARD_PRIORITY.GLOBAL,
    'global-keyboard-navigation',
    handleGlobalKeyboard,
    isActiveRef.current && !isModalOpen && !isBottomSheetOpen
  )
}

/**
 * Hook to manage trait list navigation
 * Tracks which trait selector is focused and allows navigation between them
 */
export function useTraitListNavigation(traitSelectors = []) {
  const [focusedTraitIndex, setFocusedTraitIndex] = useState(-1)
  const [focusedOptionIndex, setFocusedOptionIndex] = useState(-1)
  const selectorRefs = useRef({})

  // Register a trait selector
  const registerSelector = useCallback((layerName, selectRef, options, selectedValue) => {
    selectorRefs.current[layerName] = {
      ref: selectRef,
      options,
      selectedValue,
    }
  }, [])

  // Unregister a trait selector
  const unregisterSelector = useCallback((layerName) => {
    delete selectorRefs.current[layerName]
  }, [])

  // Navigate between trait lists
  const navigateTraits = useCallback((direction) => {
    const layerNames = Object.keys(selectorRefs.current)
    if (layerNames.length === 0) return

    let newTraitIndex = focusedTraitIndex

    if (focusedTraitIndex === -1) {
      // Start from first trait
      newTraitIndex = direction === 'down' ? 0 : layerNames.length - 1
    } else {
      // Move to next/previous trait
      if (direction === 'down') {
        newTraitIndex = (focusedTraitIndex + 1) % layerNames.length
      } else {
        newTraitIndex = focusedTraitIndex === 0 ? layerNames.length - 1 : focusedTraitIndex - 1
      }
    }

    setFocusedTraitIndex(newTraitIndex)
    const layerName = layerNames[newTraitIndex]
    const selector = selectorRefs.current[layerName]

    if (selector?.ref?.current) {
      selector.ref.current.focus()
      // Reset option index when switching traits
      const currentValueIndex = selector.options.findIndex(opt => opt.value === selector.selectedValue)
      setFocusedOptionIndex(currentValueIndex >= 0 ? currentValueIndex : 0)
    }
  }, [focusedTraitIndex, focusedOptionIndex])

  // Navigate within current trait's options
  const navigateOptions = useCallback((direction, onSelect) => {
    const layerNames = Object.keys(selectorRefs.current)
    if (layerNames.length === 0 || focusedTraitIndex === -1) return

    const layerName = layerNames[focusedTraitIndex]
    const selector = selectorRefs.current[layerName]
    if (!selector) return

    const { options, selectedValue } = selector
    const currentIndex = options.findIndex(opt => opt.value === selectedValue)
    let startIndex = currentIndex >= 0 ? currentIndex : (direction === 'down' ? -1 : options.length)

    let nextIndex = startIndex + (direction === 'down' ? 1 : -1)

    // Find next enabled option
    while (nextIndex >= 0 && nextIndex < options.length) {
      const candidate = options[nextIndex]
      if (candidate && !candidate.disabled) {
        setFocusedOptionIndex(nextIndex)
        if (onSelect) {
          onSelect(layerName, candidate.value)
        }
        break
      }
      nextIndex += (direction === 'down' ? 1 : -1)
    }
  }, [focusedTraitIndex])

  // Select current focused option
  const selectFocusedOption = useCallback((onSelect) => {
    const layerNames = Object.keys(selectorRefs.current)
    if (layerNames.length === 0 || focusedTraitIndex === -1 || focusedOptionIndex === -1) return

    const layerName = layerNames[focusedTraitIndex]
    const selector = selectorRefs.current[layerName]
    if (!selector) return

    const option = selector.options[focusedOptionIndex]
    if (option && !option.disabled && onSelect) {
      onSelect(layerName, option.value)
    }
  }, [focusedTraitIndex, focusedOptionIndex])

  return {
    focusedTraitIndex,
    focusedOptionIndex,
    registerSelector,
    unregisterSelector,
    navigateTraits,
    navigateOptions,
    selectFocusedOption,
    setFocusedTraitIndex,
    setFocusedOptionIndex,
  }
}

