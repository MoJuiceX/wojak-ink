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
  PAINT: {
    id: 'PAINT',
    label: 'Paint',
    icon: { type: 'img', src: '/icon/paint_file-0.png' },
    group: 'MAIN',
    open: { type: 'callback', name: 'open-paint' },
  },
  WOJAK_GENERATOR: {
    id: 'WOJAK_GENERATOR',
    label: 'Wojak Generator.exe',
    icon: { type: 'img', src: '/assets/logo.png' },
    group: 'MAIN',
    open: { type: 'callback', name: 'open-wojak-creator' },
  },
  FAQ: {
    id: 'FAQ',
    label: 'FAQ.TXT',
    icon: { type: 'img', src: '/icon/help_question_mark-0.png' },
    group: 'MAIN',
    open: { type: 'scroll', target: 'scroll-to-faq' },
  },
  TANGGANG: {
    id: 'TANGGANG',
    label: 'TangGang',
    icon: { type: 'emoji', value: '🍊' },
    group: 'GAMES',
    open: { type: 'window', windowId: 'tanggang' },
  },
  PINBALL: {
    id: 'PINBALL',
    label: '3D Pinball',
    icon: { type: 'img', src: '/assets/images/banners/pinball.png' },
    group: 'GAMES',
    open: { type: 'window', windowId: 'pinball-window' },
  },
  MINESWEEPER: {
    id: 'MINESWEEPER',
    label: 'Minesweeper',
    icon: { type: 'img', src: '/icon/game_mine_1-0.png' },
    group: 'GAMES',
    open: { type: 'window', windowId: 'window-minesweeper' },
  },
  SKIFREE: {
    id: 'SKIFREE',
    label: 'SkiFree',
    icon: { type: 'img', src: '/assets/images/ski.png' },
    group: 'GAMES',
    open: { type: 'window', windowId: 'window-skifree' },
  },
  SOLITAIRE: {
    id: 'SOLITAIRE',
    label: 'Solitaire',
    icon: { type: 'img', src: '/icon/game_solitaire-0.png' },
    group: 'GAMES',
    open: { type: 'window', windowId: 'window-solitaire' },
  },
  CRATE: {
    id: 'CRATE',
    label: 'Crate.ink',
    icon: { type: 'img', src: '/assets/images/cratelogo.png' },
    group: 'LINKS',
    open: { type: 'external', href: 'https://wojakfarmersplot.crate.ink/#/' },
  },
  FOLLOW_UPDATES: {
    id: 'FOLLOW_UPDATES',
    label: 'Follow Updates',
    icon: { type: 'img', src: '/icon/directory_net_web-0.png' },
    group: 'LINKS',
    open: { type: 'external', href: 'https://x.com/MoJuiceX' },
  },
}

// Desktop icon order (single source of truth)
export const DESKTOP_MAIN_ORDER = [
  'README',
  'MINT_INFO',
  'GALLERY',
  'MARKETPLACE',
  'PAINT',
  'WOJAK_GENERATOR',
  'FAQ',
  'TANGGANG',
]

export const DESKTOP_GAMES_ORDER = [
  'SKIFREE',
  'PINBALL',
]

export const DESKTOP_LINKS_ORDER = [
  'CRATE',
]

// Legacy export for backward compatibility (all items in order)
export const DESKTOP_ORDER = [
  ...DESKTOP_MAIN_ORDER,
  ...DESKTOP_GAMES_ORDER,
  ...DESKTOP_LINKS_ORDER,
]

