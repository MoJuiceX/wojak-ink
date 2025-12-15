/**
 * Icon mapping utility for Windows 98 style icons
 * Maps window IDs and titles to icon paths
 * Icons are located in /icon/ directory
 */

// Map window IDs to icon filenames (using actual icon names from public/icon/)
const windowIconMap = {
  'window-readme-txt': 'notepad-0',
  'window-mint-info-exe': 'msg_information-0',
  'window-gallery': 'directory_closed-0',
  'window-faq': 'help_question_mark-0',
  'window-marketplace': 'briefcase-0',
  'window-tanggang': 'application_hourglass-0',
  'window-memetic-energy-paint-exe': 'paint_file-0',
  'window-wojak-creator-exe': 'paint_file-0',
  'window-notify-me': 'msg_information-0',
  'window-admin-panel': 'settings_gear-0',
}

// Map window titles to icon filenames (fallback)
const titleIconMap = {
  'README.TXT': 'notepad-0',
  'MINT_INFO.EXE': 'msg_information-0',
  'GALLERY': 'directory_closed-0',
  'FAQ': 'help_question_mark-0',
  'MARKETPLACE': 'briefcase-0',
  'TangGang': 'application_hourglass-0',
  'MEMETIC_ENERGY_PAINT.EXE': 'paint_file-0',
  'WOJAK_CREATOR.EXE': 'paint_file-0',
  'NOTIFY_ME': 'msg_information-0',
  'ADMIN PANEL': 'settings_gear-0',
  'Paint': 'paint_file-0',
}

/**
 * Get icon path for a window
 * @param {string} windowId - Window ID
 * @param {string} title - Window title (fallback)
 * @returns {string} Icon path
 */
export function getWindowIcon(windowId, title) {
  // Try window ID first
  let iconName = windowIconMap[windowId]
  
  // Fallback to title mapping
  if (!iconName && title) {
    iconName = titleIconMap[title] || 'application_hourglass-0'
  }
  
  // Default to generic icon
  if (!iconName) {
    iconName = 'application_hourglass-0'
  }
  
  // Return path to icon (icons are in public/icon/)
  return `/icon/${iconName}.png`
}

/**
 * Get icon path for start menu item
 * @param {string} action - Menu action identifier
 * @returns {string} Icon path
 */
export function getStartMenuIcon(action) {
  const actionIconMap = {
    'scroll-to-readme': 'notepad-0',
    'scroll-to-mint': 'msg_information-0',
    'scroll-to-gallery': 'directory_closed-0',
    'scroll-to-faq': 'help_question_mark-0',
    'scroll-to-marketplace': 'briefcase-0',
    'open-paint': 'paint_file-0',
    'open-tanggang': 'application_hourglass-0',
  }
  
  const iconName = actionIconMap[action] || 'application_hourglass-0'
  return `/icon/${iconName}.png`
}

