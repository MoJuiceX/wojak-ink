import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import './FlyoutMenu.css'
import { playSound } from '../../utils/soundManager'
import AppIcon from './AppIcon'

export default function FlyoutMenu({ 
  parentElement, 
  items, 
  onItemClick, 
  onClose,
  isOpen: controlledIsOpen,
  onOpenChange,
  onMenuRef,
  onItemHover, // Callback when an item is hovered (for nested flyouts)
  hoveredItemIndex // Which item index is currently hovered (for nested flyout positioning)
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [hoverTimeout, setHoverTimeout] = useState(null)
  const [position, setPosition] = useState({ left: 0, top: 0 })
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const menuRef = useRef(null)
  const itemRefs = useRef([])
  const itemHoverTimeouts = useRef({}) // Track timeouts per item index
  const isControlled = controlledIsOpen !== undefined

  const actualIsOpen = isControlled ? controlledIsOpen : isOpen
  const activeHoveredIndex = hoveredItemIndex !== undefined ? hoveredItemIndex : hoveredIndex

  // Calculate position relative to parent element after menu is rendered
  useLayoutEffect(() => {
    if (!actualIsOpen || !parentElement) {
      setPosition({ left: 0, top: 0 })
      return
    }
    
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      if (!menuRef.current) return
      
      let parentRect
      
      // If we have a hovered item index and that item exists, position relative to that item
      // Otherwise, position relative to the parent element
      if (activeHoveredIndex !== null && activeHoveredIndex >= 0 && itemRefs.current[activeHoveredIndex]) {
        parentRect = itemRefs.current[activeHoveredIndex].getBoundingClientRect()
      } else {
        parentRect = parentElement.getBoundingClientRect()
      }
      
      const menuRect = menuRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      // Position to the right of parent (or hovered item)
      let left = parentRect.right + 2
      let top = parentRect.top
      
      // Adjust if menu would go off screen
      if (left + menuRect.width > viewportWidth) {
        // Position to the left instead
        left = parentRect.left - menuRect.width - 2
      }
      
      if (top + menuRect.height > viewportHeight) {
        top = viewportHeight - menuRect.height - 2
      }
      
      if (top < 0) {
        top = 2
      }
      
      setPosition({ left, top })
    })
  }, [actualIsOpen, parentElement, items, activeHoveredIndex])

  // Expose menu ref to parent if callback provided
  useEffect(() => {
    if (onMenuRef && menuRef.current) {
      onMenuRef(menuRef.current)
    }
  }, [onMenuRef, actualIsOpen, menuRef.current])

  // Handle hover delay
  const handleMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      setHoverTimeout(null)
    }
    
    const timeout = setTimeout(() => {
      if (!isControlled) {
        setIsOpen(true)
      }
      if (onOpenChange) {
        onOpenChange(true)
      }
      playSound('menuPopup')
    }, 300) // 300ms hover delay
    
    setHoverTimeout(timeout)
  }

  const handleMouseLeave = (e) => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      setHoverTimeout(null)
    }
    
    // Close after a small delay to allow moving to submenu or nested flyout
    const timeout = setTimeout(() => {
      // Check if mouse is still over parent, menu, or any nested flyout
      if (parentElement && menuRef.current) {
        const parentRect = parentElement.getBoundingClientRect()
        const menuRect = menuRef.current.getBoundingClientRect()
        const mouseX = window.mouseX || 0
        const mouseY = window.mouseY || 0
        
        const overParent = (
          mouseX >= parentRect.left &&
          mouseX <= parentRect.right &&
          mouseY >= parentRect.top &&
          mouseY <= parentRect.bottom
        )
        
        const overMenu = (
          mouseX >= menuRect.left &&
          mouseX <= menuRect.right &&
          mouseY >= menuRect.top &&
          mouseY <= menuRect.bottom
        )
        
        // Check if mouse is over any nested flyout (any other flyout menu)
        const allFlyouts = document.querySelectorAll('.flyout-menu')
        let overNestedFlyout = false
        for (const flyout of allFlyouts) {
          if (flyout !== menuRef.current) {
            const flyoutRect = flyout.getBoundingClientRect()
            if (
              mouseX >= flyoutRect.left &&
              mouseX <= flyoutRect.right &&
              mouseY >= flyoutRect.top &&
              mouseY <= flyoutRect.bottom
            ) {
              overNestedFlyout = true
              break
            }
          }
        }
        
        if (!overParent && !overMenu && !overNestedFlyout) {
          if (!isControlled) {
            setIsOpen(false)
          }
          if (onOpenChange) {
            onOpenChange(false)
          }
          if (onClose) {
            onClose()
          }
        }
      } else {
        if (!isControlled) {
          setIsOpen(false)
        }
        if (onOpenChange) {
          onOpenChange(false)
        }
        if (onClose) {
          onClose()
        }
      }
    }, 150)
    
    setHoverTimeout(timeout)
  }

  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (e) => {
      window.mouseX = e.clientX
      window.mouseY = e.clientY
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout)
      }
      // Clear all item hover timeouts
      Object.values(itemHoverTimeouts.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout)
      })
      itemHoverTimeouts.current = {}
    }
  }, [hoverTimeout])

  // Handle keyboard navigation
  useEffect(() => {
    if (!actualIsOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        // Open submenu
        if (!isControlled) {
          setIsOpen(true)
        }
        if (onOpenChange) {
          onOpenChange(true)
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'Escape') {
        // Close submenu
        if (!isControlled) {
          setIsOpen(false)
        }
        if (onOpenChange) {
          onOpenChange(false)
        }
        if (onClose) {
          onClose()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [actualIsOpen, isControlled, onOpenChange, onClose])

  if (!actualIsOpen || !items || items.length === 0) {
    return null
  }

  return (
    <div
      ref={menuRef}
      className="flyout-menu"
      style={{ left: `${position.left}px`, top: `${position.top}px` }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {items.map((item, index) => {
        const handleItemMouseEnter = () => {
          setHoveredIndex(index)
          
          // Clear any existing timeout for this item
          if (itemHoverTimeouts.current[index]) {
            clearTimeout(itemHoverTimeouts.current[index])
            delete itemHoverTimeouts.current[index]
          }
          
          if (onItemHover) {
            // If item has submenu, trigger hover delay
            if (item.hasSubmenu) {
              const timeoutId = setTimeout(() => {
                onItemHover(index)
                delete itemHoverTimeouts.current[index]
              }, 300)
              itemHoverTimeouts.current[index] = timeoutId
            } else {
              // No submenu, notify immediately
              onItemHover(index)
            }
          }
        }
        
        const handleItemMouseLeave = () => {
          // Clear timeout for this item
          if (itemHoverTimeouts.current[index]) {
            clearTimeout(itemHoverTimeouts.current[index])
            delete itemHoverTimeouts.current[index]
          }
          
          // Clear hover after delay to allow moving to nested flyout
          const clearTimeout = setTimeout(() => {
            // Only clear if we're not hovering over a nested flyout
            // The parent component will handle this
            if (!item.hasSubmenu) {
              setHoveredIndex(null)
            }
          }, 150)
          
          // Store clear timeout
          itemHoverTimeouts.current[`clear_${index}`] = clearTimeout
        }
        
        return (
          <button
            key={index}
            ref={el => { itemRefs.current[index] = el }}
            className={`flyout-menu-item ${activeHoveredIndex === index ? 'hovered' : ''}`}
            onMouseEnter={handleItemMouseEnter}
            onMouseLeave={handleItemMouseLeave}
            onClick={() => {
              if (!item.hasSubmenu) {
                if (onItemClick) {
                  onItemClick(item)
                }
                playSound('menuCommand')
              }
            }}
          >
            {item.icon && (
              <AppIcon
                icon={item.icon}
                className="flyout-menu-icon"
                size={16}
              />
            )}
            <span className="flyout-menu-label">{item.label}</span>
            {item.hasSubmenu && <span className="flyout-menu-arrow">▶</span>}
          </button>
        )
      })}
    </div>
  )
}

