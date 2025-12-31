import { useState, useCallback } from 'react'

export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState(null)

  const showContextMenu = useCallback((e, items) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items
    })
  }, [])

  const hideContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  return { contextMenu, showContextMenu, hideContextMenu }
}

















