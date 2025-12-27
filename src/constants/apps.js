/**
 * Centralized app definitions registry
 * Single source of truth for all app icons, labels, and actions
 * Used by both Start Menu and Desktop to ensure they stay in sync
 */

export const APPS = {
  README: {
    id: 'README',
    label: 'README.TXT',
    icon: { type: 'img', src: '/icon/notepad-0.png' },
    group: 'MAIN',
    open: { type: 'scroll', target: 'scroll-to-readme' },
  },
  MINT_INFO: {
    id: 'MINT_INFO',
    label: 'MINT_INFO.TXT',
    icon: { type: 'img', src: '/icon/msg_information-0.png' },
    group: 'MAIN',
    open: { type: 'scroll', target: 'scroll-to-mint' },
    windowId: 'window-mint-info-exe', // Keep internal ID stable for icon lookup
  },
  GALLERY: {
    id: 'GALLERY',
    label: 'GALLERY',
    icon: { type: 'img', src: '/icon/directory_closed-0.png' },
    group: 'MAIN',
    open: { type: 'scroll', target: 'scroll-to-gallery' },
  },
  MARKETPLACE: {
    id: 'MARKETPLACE',
    label: 'MARKETPLACE',
    icon: { type: 'img', src: '/icon/briefcase-0.png' },
    group: 'MAIN',
    open: { type: 'scroll', target: 'scroll-to-marketplace' },
  },
  WOJAK_GENERATOR: {
    id: 'WOJAK_GENERATOR',
    label: 'WOJAK GENERATOR.EXE',
    icon: { type: 'img', src: '/assets/logo.png' },
    group: 'MAIN',
    open: { type: 'window', windowId: 'wojak-generator' },
  },
  RARITY_EXPLORER: {
    id: 'RARITY_EXPLORER',
    label: 'RARITY EXPLORER.EXE',
    icon: { type: 'img', src: '/icon/chart1-0.png' },
    group: 'MAIN',
    open: { type: 'window', windowId: 'rarity-explorer' },
  },
  FAQ: {
    id: 'FAQ',
    label: 'FAQ.TXT',
    icon: { type: 'img', src: '/icon/help_question_mark-0.png' },
    group: 'MAIN',
    open: { type: 'scroll', target: 'scroll-to-faq' },
  },
  PAINT: {
    id: 'PAINT',
    label: 'PAINT',
    icon: { type: 'img', src: '/icon/paint_file-0.png' },
    group: 'MAIN',
    open: { type: 'window', windowId: 'paint' },
  },
  TANGGANG: {
    id: 'TANGGANG',
    label: 'TANGGANG',
    icon: { type: 'emoji', value: '🍊' },
    group: 'GAMES',
    open: { type: 'window', windowId: 'tanggang' },
  },
  MINESWEEPER: {
    id: 'MINESWEEPER',
    label: 'MINESWEEPER',
    icon: { type: 'img', src: '/icon/game_mine_1-0.png' },
    group: 'GAMES',
    open: { type: 'window', windowId: 'window-minesweeper' },
  },
  SKIFREE: {
    id: 'SKIFREE',
    label: 'SKIFREE',
    icon: { type: 'img', src: '/assets/images/ski.png' },
    group: 'GAMES',
    open: { type: 'window', windowId: 'window-skifree' },
  },
  SOLITAIRE: {
    id: 'SOLITAIRE',
    label: 'SOLITAIRE',
    icon: { type: 'img', src: '/icon/game_solitaire-0.png' },
    group: 'GAMES',
    open: { type: 'window', windowId: 'window-solitaire' },
  },
  CRATE: {
    id: 'CRATE',
    label: 'CRATE.INK',
    icon: { type: 'img', src: '/assets/images/cratelogo.png' },
    group: 'LINKS',
    open: { type: 'external', href: 'https://crate.ink/#/collection-detail/WOJAKFARMERSPLOT' },
  },
  FOLLOW_UPDATES: {
    id: 'FOLLOW_UPDATES',
    label: 'FOLLOW UPDATES',
    icon: { type: 'img', src: '/icon/directory_net_web-0.png' },
    group: 'LINKS',
    open: { type: 'external', href: 'https://x.com/MoJuiceX' },
  },
  MY_FAVORITE_WOJAKS: {
    id: 'MY_FAVORITE_WOJAKS',
    label: 'MY FAVORITE WOJAKS',
    icon: { type: 'img', src: '/icon/directory_closed-0.png' },
    group: 'FOLDERS',
    open: { type: 'window', windowId: 'my-favorite-wojaks' },
  },
  MEMETIC_ENERGY: {
    id: 'MEMETIC_ENERGY',
    label: 'MEMETIC ENERGY',
    icon: { type: 'img', src: '/icon/directory_closed-0.png' },
    group: 'FOLDERS',
    open: { type: 'window', windowId: 'memetic-energy' },
  },
  COMMUNITY_RESOURCES: {
    id: 'COMMUNITY_RESOURCES',
    label: 'COMMUNITY_RESOURCES.TXT',
    icon: { type: 'img', src: '/icon/notepad-0.png' },
    group: 'MAIN',
    open: { type: 'window', windowId: 'community-resources' },
  },
}

// Desktop icon order (single source of truth)
export const DESKTOP_MAIN_ORDER = [
  'README',
  'MINT_INFO',
  'GALLERY',
  'MARKETPLACE',
  'WOJAK_GENERATOR',
  'RARITY_EXPLORER',
  'FAQ',
  'TANGGANG',
  'CRATE',
]

export const DESKTOP_GAMES_ORDER = [
]

export const DESKTOP_LINKS_ORDER = [
]

// Legacy export for backward compatibility (all items in order)
export const DESKTOP_ORDER = [
  ...DESKTOP_MAIN_ORDER,
  ...DESKTOP_GAMES_ORDER,
  ...DESKTOP_LINKS_ORDER,
]

