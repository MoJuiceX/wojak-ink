/**
 * Slot rendering utility for future ad placement
 * Provides Windows 98-authentic ways to display sponsored content
 * 
 * @param {string} slotName - Name of the slot to render
 * @returns {Object|null} Slot configuration object or null if slot doesn't exist
 */
export function getSlotConfig(slotName) {
  const slots = {
    'desktop-bottom': {
      className: 'slot-desktop-bottom',
      style: {
        position: 'fixed',
        bottom: 'calc(var(--taskbar-height) + 20px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1
      }
    },
    'startmenu-footer': {
      className: 'slot-startmenu-footer',
      style: {
        padding: '8px',
        borderTop: '1px solid var(--border-dark)',
        background: 'var(--surface-1)'
      }
    },
    'taskbar-tray': {
      className: 'slot-taskbar-tray',
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }
    }
  }

  const slot = slots[slotName]
  if (!slot) {
    console.warn(`Unknown slot: ${slotName}`)
    return null
  }

  return slot
}

/**
 * Check if a slot is available
 * @param {string} slotName - Name of the slot to check
 * @returns {boolean} True if slot exists
 */
export function hasSlot(slotName) {
  const availableSlots = ['desktop-bottom', 'startmenu-footer', 'taskbar-tray']
  return availableSlots.includes(slotName)
}

