/**
 * Route Configuration
 *
 * Centralized route definitions with navigation metadata.
 *
 * Navigation hierarchy:
 * - PRIMARY (Bottom Nav + Sidebar top): Gallery, Generator, Games, Media
 * - SECONDARY (More Menu + Sidebar bottom): Leaderboard, Shop, Guild, Treasury, Settings
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
    featured: true,
    badge: 'dot', // Draw attention to the AI feature
  },
  {
    id: 'generator',
    path: '/generator',
    label: 'Generator',
    shortLabel: 'Gen',
    icon: Palette,
  },
  {
    id: 'games',
    path: '/games',
    label: 'Games',
    shortLabel: 'Games',
    icon: Gamepad2,
  },
  {
    id: 'swipe',
    path: '/swipe',
    label: 'Wojak Swipe',
    shortLabel: 'Swipe',
    icon: Heart,
    badge: 'dot',
    children: [
      { id: 'swipe-dashboard', path: '/swipe/dashboard', label: 'Dashboard', icon: Heart },
      { id: 'swipe-battles', path: '/swipe/battles', label: 'Battles', icon: Heart },
      { id: 'swipe-leaderboard', path: '/swipe/leaderboard', label: 'Leaderboard', icon: Heart },
      { id: 'swipe-activity', path: '/swipe/activity', label: 'Activity', icon: Heart },
    ]
  },
  {
    id: 'leaderboard',
    path: '/leaderboard',
    label: 'Leaderboard',
    shortLabel: 'Ranks',
    icon: Trophy,
  },
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
 * Order: Gallery, Generator, BigPulp (center FAB), Games, More
 */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  PRIMARY_NAV_ITEMS[0], // Gallery
  PRIMARY_NAV_ITEMS[2], // Generator (swapped)
  PRIMARY_NAV_ITEMS[1], // BigPulp (center - FAB style)
  PRIMARY_NAV_ITEMS[3], // Games
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
