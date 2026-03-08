/* eslint-disable react-refresh/only-export-components */
/**
 * Layout Context
 *
 * Provides layout state management including:
 * - Sidebar expanded/collapsed/pinned state
 * - Mobile navigation visibility
 * - Responsive breakpoint detection
 * - Scroll tracking
 */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from 'react';
import { LAYOUT } from '@/config/layout';
import { safeStorage } from '@/utils/safeStorage';

const SIDEBAR_PINNED_KEY = 'wojak-sidebar-pinned-state';
const SCROLL_THRESHOLD = 10;
const RESIZE_DEBOUNCE = 100;

export interface HeaderBreadcrumb {
  label: string;
  onBack?: () => void;
}

// Sidebar pinned state: none = normal hover, minimized = stays collapsed, expanded = stays open
export type SidebarPinnedState = 'none' | 'minimized' | 'expanded';

export interface LayoutContextValue {
  // Sidebar state (desktop)
  sidebarExpanded: boolean;
  setSidebarExpanded: (expanded: boolean) => void;
  sidebarPinnedState: SidebarPinnedState;
  setSidebarPinnedState: (state: SidebarPinnedState) => void;

  // Mobile nav state
  mobileNavVisible: boolean;
  setMobileNavVisible: (visible: boolean) => void;

  // Header state
  headerTransparent: boolean;
  setHeaderTransparent: (transparent: boolean) => void;
  headerBreadcrumb: HeaderBreadcrumb | null;
  setHeaderBreadcrumb: (breadcrumb: HeaderBreadcrumb | null) => void;

  // Layout info (computed)
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  contentPadding: number;
  sidebarWidth: number;
  headerHeight: number;
  mainContentOffset: { top: number; left: number; bottom: number | string };

  // Scroll state
  scrollY: number;
  scrollDirection: 'up' | 'down' | null;
  isScrolled: boolean;
}

export const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

interface LayoutProviderProps {
  children: ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  // Sidebar state
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarPinnedState, setSidebarPinnedStateInternal] = useState<SidebarPinnedState>(() => {
    if (typeof window === 'undefined') return 'none';
    const stored = safeStorage.getItem(SIDEBAR_PINNED_KEY);
    if (stored === 'minimized' || stored === 'expanded') return stored;
    return 'none';
  });

  // Mobile nav state
  const [mobileNavVisible, setMobileNavVisible] = useState(true);

  // Header state
  const [headerTransparent, setHeaderTransparent] = useState(false);
  const [headerBreadcrumb, setHeaderBreadcrumb] = useState<HeaderBreadcrumb | null>(null);

  // Viewport state
  const [windowWidth, setWindowWidth] = useState(() => {
    if (typeof window === 'undefined') return LAYOUT.breakpoints.lg;
    return window.innerWidth;
  });

  // Scroll state
  const [scrollY, setScrollY] = useState(0);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const lastScrollY = useRef(0);

  // Persist sidebar pinned state
  const setSidebarPinnedState = useCallback((state: SidebarPinnedState) => {
    setSidebarPinnedStateInternal(state);
    safeStorage.setItem(SIDEBAR_PINNED_KEY, state);
  }, []);

  // Handle window resize with debounce
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    function handleResize() {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowWidth(window.innerWidth);
      }, RESIZE_DEBOUNCE);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Handle scroll tracking with deadband to prevent direction flicker
  useEffect(() => {
    const DIRECTION_DEADBAND = 5; // px of scroll before direction change registers

    function handleScroll() {
      const currentScrollY = window.scrollY;

      setScrollY(currentScrollY);

      const delta = currentScrollY - lastScrollY.current;
      if (delta > DIRECTION_DEADBAND) {
        setScrollDirection('down');
        lastScrollY.current = currentScrollY;
      } else if (delta < -DIRECTION_DEADBAND) {
        setScrollDirection('up');
        lastScrollY.current = currentScrollY;
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Computed values
  const isMobile = windowWidth < LAYOUT.breakpoints.md;
  const isTablet = windowWidth >= LAYOUT.breakpoints.md && windowWidth < LAYOUT.breakpoints.lg;
  const isDesktop = windowWidth >= LAYOUT.breakpoints.md;

  const contentPadding = isMobile
    ? LAYOUT.content.paddingMobile
    : LAYOUT.content.paddingDesktop;

  const sidebarWidth = useMemo(() => {
    if (isMobile) return 0;
    // Sidebar is expanded if: hovered, or pinned to expanded
    if (sidebarExpanded || sidebarPinnedState === 'expanded') {
      return LAYOUT.sidebar.widthExpanded;
    }
    return LAYOUT.sidebar.widthCollapsed;
  }, [isMobile, sidebarExpanded, sidebarPinnedState]);

  const headerHeight = isMobile
    ? LAYOUT.header.heightMobile
    : LAYOUT.header.height;

  const mainContentOffset = useMemo(() => ({
    top: headerHeight,
    left: isMobile ? 0 : sidebarWidth,
    // Include safe area inset for mobile nav
    bottom: isMobile ? `calc(${LAYOUT.mobileNav.height}px + env(safe-area-inset-bottom, 0px))` : 0,
  }), [headerHeight, isMobile, sidebarWidth]);

  const isScrolled = scrollY > SCROLL_THRESHOLD;

  // Context value
  const value = useMemo<LayoutContextValue>(
    () => ({
      sidebarExpanded,
      setSidebarExpanded,
      sidebarPinnedState,
      setSidebarPinnedState,
      mobileNavVisible,
      setMobileNavVisible,
      headerTransparent,
      setHeaderTransparent,
      headerBreadcrumb,
      setHeaderBreadcrumb,
      isMobile,
      isTablet,
      isDesktop,
      contentPadding,
      sidebarWidth,
      headerHeight,
      mainContentOffset,
      scrollY,
      scrollDirection,
      isScrolled,
    }),
    [
      sidebarExpanded,
      sidebarPinnedState,
      setSidebarPinnedState,
      mobileNavVisible,
      headerTransparent,
      headerBreadcrumb,
      isMobile,
      isTablet,
      isDesktop,
      contentPadding,
      sidebarWidth,
      headerHeight,
      mainContentOffset,
      scrollY,
      scrollDirection,
      isScrolled,
    ]
  );

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
}

export default LayoutProvider;
