/**
 * AppLayout Component
 *
 * Root layout wrapper providing responsive structure:
 * - Header (fixed top)
 * - Sidebar (desktop) or MobileNavigation (mobile)
 * - Main content area with proper offsets
 */

import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useLayout } from '@/hooks/useLayout';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNavigation } from './MobileNavigation';
import { SkipLink } from './SkipLink';

interface AppLayoutProps {
  children?: React.ReactNode;
  hideNavigation?: boolean;
  transparentHeader?: boolean;
}

export function AppLayout({
  children,
  hideNavigation = false,
  transparentHeader = false,
}: AppLayoutProps) {
  const location = useLocation();
  const {
    isMobile,
    sidebarExpanded,
    setSidebarExpanded,
    sidebarPinnedState,
    setSidebarPinnedState,
    mobileNavVisible,
    mainContentOffset,
  } = useLayout();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Handle keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl + \ to toggle sidebar pin
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        if (!isMobile) {
          // Toggle between current state and 'none'
          if (sidebarPinnedState === 'none') {
            // If expanded via hover, pin to expanded; otherwise pin to minimized
            setSidebarPinnedState(sidebarExpanded ? 'expanded' : 'minimized');
          } else {
            setSidebarPinnedState('none');
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, sidebarPinnedState, sidebarExpanded, setSidebarPinnedState]);

  return (
    <div
      className="flex flex-col"
      style={{
        minHeight: '100dvh',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      {/* Accessibility skip link */}
      <SkipLink />

      {/* Header */}
      {!hideNavigation && <Header transparent={transparentHeader} />}

      {/* Desktop Sidebar */}
      {!hideNavigation && !isMobile && (
        <Sidebar
          isExpanded={sidebarExpanded}
          onExpandedChange={setSidebarExpanded}
          pinnedState={sidebarPinnedState}
          onPinnedStateChange={setSidebarPinnedState}
        />
      )}

      {/* Main content area */}
      <main
        id="main-content"
        className="flex-1 flex flex-col"
        style={{
          minHeight: 0,
          paddingTop: hideNavigation ? 0 : mainContentOffset.top,
          paddingLeft: hideNavigation ? 0 : mainContentOffset.left,
          paddingBottom: hideNavigation ? 0 : mainContentOffset.bottom,
          transition: 'padding-left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        role="main"
        aria-label="Page content"
      >
        <AnimatePresence mode="wait">
          {children || <Outlet />}
        </AnimatePresence>
      </main>

      {/* Mobile bottom navigation */}
      {!hideNavigation && isMobile && (
        <MobileNavigation visible={mobileNavVisible} />
      )}

      {/* Live region for screen reader announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="route-announcer"
      />
    </div>
  );
}

export default AppLayout;
