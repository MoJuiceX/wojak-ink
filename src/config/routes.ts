/**
 * Route Configuration
 *
 * Centralized route definitions with navigation metadata.
 *
 * Navigation hierarchy:
 * - PRIMARY (shared source): Gallery, BigPulp, Generator, Fight Club, Games
 * - SIDEBAR PRIMARY (desktop order): Gallery, Generator, Fight Club, Games, BigPulp
 * - SECONDARY (More Menu + Sidebar bottom): Games, Chat, Shop, Guild, Treasury, Settings
 * - Account: Handled separately by UserAccountButton at sidebar bottom
 */

import {
  Camera,
  Briefcase,
  Heart,
  Lightbulb,
  Palette,
  Settings,
  Trophy,
  Users,
  ShoppingBag,
  Gamepad2,
  Menu,
  MessageCircle,
  Swords,
  type LucideIcon
} from 'lucide-react';

export interface NavItem {
  /** Unique identifier */
  id: string;
  /** Route path (null for special items like "More") */
  path: string | null;
  /** Full label for desktop */
  label: string;
  /** Short label for mobile (optional) */
  shortLabel?: string;
  /** Icon component */
  icon: LucideIcon;
  /** Notification badge (number or dot indicator) */
  badge?: number | 'dot';
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Tooltip text (shown on hover, especially for disabled items) */
  tooltip?: string;
  /** Requires wallet connection */
  requiredAuth?: boolean;
  /** Featured item with special styling (e.g., BigPulp) */
  featured?: boolean;
  /** Hidden from navigation (route still works) */
  hidden?: boolean;
  /** Nested child routes (not shown in main nav) */
  children?: Omit<NavItem, 'children'>[];
}

/**
 * Primary navigation items (Bottom Nav + Sidebar top)
 * Industry standard: 5 items max for mobile bottom nav
 */
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    id: 'gallery',
    path: '/gallery',
    label: 'Gallery',
    shortLabel: 'Gallery',
    icon: Camera,
    children: [
      { id: 'gallery-all', path: '/gallery', label: 'All NFTs', icon: Camera },
      { id: 'gallery-favorites', path: '/gallery/favorites', label: 'Favorites', icon: Camera },
      { id: 'gallery-nft', path: '/gallery/:nftId', label: 'NFT Detail', icon: Camera },
    ]
  },
  {
    id: 'bigpulp',
    path: '/bigpulp',
    label: 'BigPulp',
    shortLabel: 'BigPulp',
    icon: Lightbulb,
    badge: 'dot',
    featured: true, // Center FAB in mobile nav
  },
  {
    id: 'generator',
    path: '/generator',
    label: 'Generator',
    shortLabel: 'Gen',
    icon: Palette,
  },
  {
    id: 'fight-club',
    path: '/fight-club',
    label: 'Fight Club',
    shortLabel: 'Fight',
    icon: Swords,
    children: [
      { id: 'fight-club-battle', path: '/fight-club/battle', label: 'Battle', icon: Swords },
      { id: 'fight-club-vote', path: '/fight-club/vote', label: 'Vote', icon: Heart },
      { id: 'fight-club-rankings', path: '/fight-club/rankings', label: 'Rankings', icon: Trophy },
    ]
  },
  {
    id: 'games',
    path: '/games',
    label: 'Games',
    shortLabel: 'Games',
    icon: Gamepad2,
  },
];

/**
 * Desktop sidebar order.
 * BigPulp no longer gets desktop priority treatment, but sits ahead of Games.
 */
export const SIDEBAR_PRIMARY_NAV_ITEMS: NavItem[] = [
  PRIMARY_NAV_ITEMS[0], // Gallery
  PRIMARY_NAV_ITEMS[2], // Generator
  PRIMARY_NAV_ITEMS[3], // Fight Club
  PRIMARY_NAV_ITEMS[1], // BigPulp
  PRIMARY_NAV_ITEMS[4], // Games
];

/**
 * "More" button for mobile nav - opens secondary menu
 */
export const MORE_NAV_ITEM: NavItem = {
  id: 'more',
  path: null, // Opens menu instead of navigating
  label: 'More',
  shortLabel: 'More',
  icon: Menu,
};

/**
 * Secondary navigation items (More Menu + Sidebar bottom)
 * NOTE: Friends and Achievements moved to Account page widgets (SPEC 17)
 */
export const SECONDARY_NAV_ITEMS: NavItem[] = [
  {
    id: 'chat',
    path: '/chat',
    label: 'Chat Rooms',
    shortLabel: 'Chat',
    icon: MessageCircle,
  },
  // REMOVED: Friends (moved to Account page widget - SPEC 17)
  // REMOVED: Achievements (moved to Account page widget - SPEC 17)
  {
    id: 'shop',
    path: '/shop',
    label: 'Shop',
    shortLabel: 'Shop',
    icon: ShoppingBag,
  },
  {
    id: 'guild',
    path: '/guild',
    label: 'Guild',
    shortLabel: 'Guild',
    icon: Users,
    hidden: true,
  },
  {
    id: 'treasury',
    path: '/treasury',
    label: 'Treasury',
    shortLabel: 'Treasury',
    icon: Briefcase,
    requiredAuth: true,
  },
  {
    id: 'settings',
    path: '/settings',
    label: 'Settings',
    shortLabel: 'Settings',
    icon: Settings,
    children: [
      { id: 'settings-profile', path: '/settings/profile', label: 'Profile', icon: Settings },
      { id: 'settings-theme', path: '/settings/theme', label: 'Theme', icon: Settings },
      { id: 'settings-about', path: '/settings/about', label: 'About', icon: Settings },
    ]
  },
  // Account removed - handled by UserAccountButton at bottom of sidebar
];

/**
 * Mobile bottom nav items (reordered for center FAB placement)
 * Order: Gallery, Generator, BigPulp (center FAB), Fight Club, More
 * Games is in the More menu.
 */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  PRIMARY_NAV_ITEMS[0], // Gallery
  PRIMARY_NAV_ITEMS[2], // Generator
  PRIMARY_NAV_ITEMS[1], // BigPulp (center - featured)
  PRIMARY_NAV_ITEMS[3], // Fight Club
  MORE_NAV_ITEM,
];

/**
 * All navigation items for sidebar (Primary + Secondary)
 * @deprecated Use PRIMARY_NAV_ITEMS and SECONDARY_NAV_ITEMS instead
 */
export const NAV_ITEMS: NavItem[] = [...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS];

/**
 * Default route to redirect to
 */
export const DEFAULT_ROUTE = '/gallery';

/**
 * Get nav item by path
 */
export function getNavItemByPath(path: string): NavItem | undefined {
  return NAV_ITEMS.find(item => {
    if (!item.path) return false;
    if (item.path === path) return true;
    // Check if path starts with item path (for nested routes)
    return path.startsWith(item.path + '/');
  });
}

/**
 * Get nav item by ID
 */
export function getNavItemById(id: string): NavItem | undefined {
  return NAV_ITEMS.find(item => item.id === id);
}

/**
 * Check if a path matches a nav item (including children)
 */
export function isPathActive(itemPath: string | null, currentPath: string): boolean {
  if (!itemPath) return false;
  if (itemPath === currentPath) return true;
  // For index routes, exact match only
  if (itemPath === '/') return currentPath === '/';
  // Check if current path is a child of the item path
  return currentPath.startsWith(itemPath + '/') || currentPath === itemPath;
}
