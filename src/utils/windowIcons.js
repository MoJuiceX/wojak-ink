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
  'tanggang': 'application_hourglass-0', // TangGang window uses explicit ID
  'window-wojak-creator': 'paint_file-0',
  'window-notify-me': 'msg_information-0',
  'window-admin-panel': 'settings_gear-0',
  'pinball-window': 'pinball_ball-0',
  'window-solitaire': 'game_solitaire-0',
  'window-minesweeper': 'game_mine_1-0',
  'window-skifree': 'game_solitaire-0', // Overridden by special case in getWindowIcon
  'try-again-window': 'msg_question-0',
}

// Map window titles to icon filenames (fallback)
const titleIconMap = {
  'README.TXT': 'notepad-0',
  'MINT_INFO.EXE': 'msg_information-0',
  'GALLERY': 'directory_closed-0',
  'FAQ': 'help_question_mark-0',
  'MARKETPLACE': 'briefcase-0',
  'TangGang': 'application_hourglass-0',
  'WOJAK_CREATOR.EXE': 'paint_file-0',
  'NOTIFY_ME': 'msg_information-0',
  'ADMIN PANEL': 'settings_gear-0',
  'Paint': 'paint_file-0',
  '3D Pinball for Windows - Space Cadet': 'pinball_ball-0',
  'SOLITAIRE.EXE': 'game_solitaire-0',
  'MINESWEEPER.EXE': 'game_mine_1-0',
  'SKIFREE.EXE': 'game_solitaire-0', // Overridden by special case in getWindowIcon
  'Try again!!!': 'msg_question-0',
}

/**
 * Get icon path for a window
 * @param {string} windowId - Window ID
 * @param {string} title - Window title (fallback)
 * @returns {string} Icon path
 */
export function getWindowIcon(windowId, title) {
  // Special case: pinball window uses banner image
  if (windowId === 'pinball-window' || title === '3D Pinball for Windows - Space Cadet') {
    return '/assets/images/banners/pinball.png'
  }
  
  // Special case: SkiFree uses local ski.png image
  if (windowId === 'window-skifree' || title === 'SKIFREE.EXE') {
    return '/assets/images/ski.png'
  }
  
  // Special case: TangGang uses emoji only, no icon
  if (windowId === 'tanggang' || title === '🍊 TangGang' || title === 'TangGang') {
    return null
  }
  
  // Special case: Try Again uses emoji only, no icon
  if (windowId === 'try-again-window' || title === '🎁') {
    return null
  }
  
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
    'wojak-creator': 'paint_file-0',
    'open-pinball': 'pinball_ball-0',
    'open-solitaire': 'game_solitaire-0',
    'open-minesweeper': 'game_mine_1-0',
    'open-skifree': 'game_solitaire-0', // Overridden by special case in getStartMenuIcon
  }
  
  // Special case: pinball uses banner image
  if (action === 'open-pinball') {
    return '/assets/images/banners/pinball.png'
  }
  
  // Special case: SkiFree uses local ski.png image
  if (action === 'open-skifree') {
    return '/assets/images/ski.png'
  }
  
  // Special case: Wojak Creator uses website logo/favicon
  if (action === 'wojak-creator') {
    return '/assets/logo.png'
  }
  
  const iconName = actionIconMap[action] || 'application_hourglass-0'
  return `/icon/${iconName}.png`
}

