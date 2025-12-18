/**
 * Apps Registry - Single source of truth for all applications
 * Used by StartMenu and Taskbar to ensure consistent behavior
 */

export const APPS = [
  {
    id: 'window-readme-txt',
    windowId: 'window-readme-txt',
    title: 'README.TXT',
    icon: 'scroll-to-readme',
    action: 'scroll-to-readme',
    alwaysVisible: true, // Always rendered in App.jsx
  },
  {
    id: 'window-mint-info-exe',
    windowId: 'window-mint-info-exe',
    title: 'MINT_INFO.EXE',
    icon: 'scroll-to-mint',
    action: 'scroll-to-mint',
    alwaysVisible: true,
  },
  {
    id: 'window-gallery',
    windowId: 'window-gallery',
    title: 'GALLERY',
    icon: 'scroll-to-gallery',
    action: 'scroll-to-gallery',
    alwaysVisible: true,
  },
  {
    id: 'window-faq',
    windowId: 'window-faq',
    title: 'FAQ',
    icon: 'scroll-to-faq',
    action: 'scroll-to-faq',
    alwaysVisible: true,
  },
  {
    id: 'window-marketplace',
    windowId: 'window-marketplace',
    title: 'MARKETPLACE',
    icon: 'scroll-to-marketplace',
    action: 'scroll-to-marketplace',
    alwaysVisible: true,
  },
  {
    id: 'wojak-creator',
    windowId: 'wojak-creator',
    title: 'WOJAK GENERATOR',
    icon: 'wojak-creator',
    action: 'open-wojak-creator',
    requiresState: true, // Requires wojakCreatorOpen state
  },
  {
    id: 'window-tanggang',
    windowId: 'window-tanggang',
    title: 'TangGang',
    icon: 'open-tanggang',
    action: 'open-tanggang',
    alwaysVisible: true,
  },
  {
    id: 'paint',
    windowId: 'paint',
    title: 'MS Paint',
    icon: 'open-paint',
    action: 'open-paint',
    requiresState: true, // Requires paintOpen state
  },
]

/**
 * Get app by ID
 */
export function getAppById(id) {
  return APPS.find(app => app.id === id || app.windowId === id)
}

/**
 * Get app by action
 */
export function getAppByAction(action) {
  return APPS.find(app => app.action === action)
}

/**
 * Get all apps that should appear in Start menu
 */
export function getStartMenuApps() {
  return APPS.filter(app => {
    // Filter out apps that are always visible (they're always rendered)
    // But we still want them in the menu for opening/focusing
    return true
  })
}

/**
 * Get all apps that should appear in Taskbar
 */
export function getTaskbarApps() {
  return APPS.filter(app => {
    // All apps can appear in taskbar when their windows are open
    return true
  })
}


