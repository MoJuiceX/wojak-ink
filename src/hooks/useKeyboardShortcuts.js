import { useEffect, useCallback } from 'react'

export function useKeyboardShortcuts({
  selectedIcons,
  onDelete,
  onSelectAll,
  onDeselectAll,
  onRefresh,
  onOpen,
  onUndo,
  onRename,
  onCopy,
  isWindowFocused = true,
}) {
  const handleKeyDown = useCallback((e) => {
    // Don't handle shortcuts if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
      return
    }

    // Don't handle if a modal/window is focused (unless it's the desktop)
    if (!isWindowFocused) return

    const key = e.key.toLowerCase()
    const isCtrl = e.ctrlKey || e.metaKey

    // Delete - Move selected to Recycle Bin
    if (key === 'delete' && selectedIcons.length > 0) {
      e.preventDefault()
      onDelete?.(selectedIcons)
    }

    // Ctrl+A / Cmd+A - Select All
    if (isCtrl && key === 'a') {
      e.preventDefault()
      onSelectAll?.()
    }

    // F5 - Refresh
    if (key === 'f5') {
      e.preventDefault()
      onRefresh?.()
    }

    // Enter - Open first selected icon
    if (key === 'enter' && selectedIcons.length > 0) {
      e.preventDefault()
      onOpen?.(selectedIcons[0])
    }

    // Ctrl+Z / Cmd+Z - Undo (restore last deleted)
    if (isCtrl && key === 'z' && !e.shiftKey) {
      e.preventDefault()
      onUndo?.()
    }

    // F2 - Rename (single selection only)
    if (key === 'f2' && selectedIcons.length === 1) {
      e.preventDefault()
      onRename?.(selectedIcons[0])
    }

    // Ctrl+C / Cmd+C - Copy selected icons
    if (isCtrl && key === 'c' && selectedIcons.length > 0) {
      e.preventDefault()
      onCopy?.(selectedIcons)
    }

    // Escape - Deselect all
    if (key === 'escape') {
      e.preventDefault()
      onDeselectAll?.()
    }
  }, [selectedIcons, onDelete, onSelectAll, onDeselectAll, onRefresh, onOpen, onUndo, onRename, onCopy, isWindowFocused])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

