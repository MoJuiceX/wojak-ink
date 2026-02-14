/**
 * Sidebar Component
 *
 * Desktop sidebar navigation with expand/collapse on hover and pin functionality.
 * Width: 72px collapsed, 240px expanded.
 */

import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, PinOff } from 'lucide-react';
import { LAYOUT } from '@/config/layout';
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS, isPathActive } from '@/config/routes';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { NavItem } from './NavItem';
import { Logo } from './Logo';
import { GallerySidebarControls } from './GallerySidebarControls';
import { UserAccountButton } from '@/components/auth/UserAccountButton';
import type { SidebarPinnedState } from '@/contexts/LayoutContext';

interface SidebarProps {
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  pinnedState: SidebarPinnedState;
  onPinnedStateChange: (state: SidebarPinnedState) => void;
}

export function Sidebar({
  isExpanded,
  onExpandedChange,
  pinnedState,
  onPinnedStateChange,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const prefersReducedMotion = usePrefersReducedMotion();

  // Sidebar is visually expanded if: hovering (and not pinned minimized), or pinned expanded
  const showExpanded = pinnedState === 'expanded' || (isExpanded && pinnedState !== 'minimized');
  const width = showExpanded
    ? LAYOUT.sidebar.widthExpanded
    : LAYOUT.sidebar.widthCollapsed;

  // Expand when entering the main content area (not the header safe zone)
  // Only expand if not pinned to any state
  const handleExpandableZoneEnter = useCallback(() => {
    if (pinnedState === 'none') {
      onExpandedChange(true);
    }
  }, [pinnedState, onExpandedChange]);

  // Collapse when mouse leaves the entire sidebar
  // Only collapse if not pinned to expanded
  const handleMouseLeave = useCallback(() => {
    if (pinnedState !== 'expanded') {
      onExpandedChange(false);
    }
  }, [pinnedState, onExpandedChange]);

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate]
  );

  // Toggle pin: pins to current visual state, or unpins if already pinned
  const handleTogglePin = useCallback(() => {
    if (pinnedState !== 'none') {
      // Already pinned - unpin
      onPinnedStateChange('none');
    } else {
      // Not pinned - pin to current visual state
      onPinnedStateChange(showExpanded ? 'expanded' : 'minimized');
    }
  }, [pinnedState, showExpanded, onPinnedStateChange]);

  // Handle keyboard shortcut for toggling sidebar
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Cmd/Ctrl + \ to toggle pin
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        handleTogglePin();
      }
      // Escape to collapse (only if not pinned expanded)
      if (e.key === 'Escape' && showExpanded && pinnedState !== 'expanded') {
        onExpandedChange(false);
      }
    },
    [handleTogglePin, showExpanded, pinnedState, onExpandedChange]
  );

  return (
    <motion.aside
      className="fixed left-0 h-screen flex flex-col z-40 glass-strong"
      style={{
        top: 0,
        width,
        background: 'var(--color-chrome-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRight: '1px solid var(--color-chrome-border)',
      }}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      animate={{ width }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
      }
      role="navigation"
      aria-label="Main navigation"
      aria-expanded={showExpanded}
    >
      {/* Collapsed state: small subtle pin button at top-right of the orange logo */}
      <AnimatePresence>
        {!showExpanded && (
          <motion.button
            key="pin-collapsed"
            className="absolute rounded transition-colors z-10 flex items-center justify-center"
            style={{
              top: -6,
              left: 38,
              width: 23,
              height: 23,
              color: pinnedState === 'minimized'
                ? 'var(--color-brand-primary)'
                : 'var(--color-text-muted)',
              opacity: pinnedState === 'minimized' ? 1 : 0.4,
              background: 'transparent',
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePin();
            }}
            whileHover={{
              opacity: 1,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: pinnedState === 'minimized' ? 1 : 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            title={pinnedState === 'minimized' ? 'Unpin sidebar' : 'Pin sidebar minimized'}
            aria-label={pinnedState === 'minimized' ? 'Unpin sidebar' : 'Pin sidebar minimized'}
          >
            {pinnedState === 'minimized' ? <PinOff size={16} /> : <Pin size={16} />}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Header area - "safe zone" where hovering doesn't expand sidebar */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{
          height: LAYOUT.header.height,
          padding: `0 ${LAYOUT.sidebar.paddingX}px`,
        }}
      >
        <Logo size="md" showText={showExpanded} variant="sidebar" />

        {/* Pin button - only visible when expanded */}
        <AnimatePresence>
          {showExpanded && (
            <motion.button
              key="pin-expanded"
              className="p-2 rounded-lg transition-colors flex items-center justify-center"
              style={{
                color: pinnedState === 'expanded'
                  ? 'var(--color-brand-primary)'
                  : 'var(--color-text-muted)',
              }}
              onClick={handleTogglePin}
              whileHover={{
                background: 'var(--color-glass-hover)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              title={pinnedState === 'expanded' ? 'Unpin sidebar' : 'Pin sidebar open'}
              aria-label={pinnedState === 'expanded' ? 'Unpin sidebar' : 'Pin sidebar'}
            >
              {pinnedState === 'expanded' ? <PinOff size={18} /> : <Pin size={18} />}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Primary navigation items - hovering here expands the sidebar */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden py-2"
        style={{
          paddingLeft: LAYOUT.sidebar.paddingX,
          paddingRight: LAYOUT.sidebar.paddingX,
        }}
        onMouseEnter={handleExpandableZoneEnter}
      >
        {/* Primary items */}
        <ul className="flex flex-col gap-1">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <NavItem
                icon={item.icon}
                label={item.label}
                isActive={item.path ? isPathActive(item.path, location.pathname) : false}
                onClick={() => item.path && handleNavigate(item.path)}
                showLabel={showExpanded}
                badge={item.badge}
                disabled={item.disabled}
                tooltip={item.tooltip}
                variant="sidebar"
                path={item.path || undefined}
                featured={item.featured}
              />
            </li>
          ))}
        </ul>

        {/* Separator between primary and secondary */}
        <div
          className="my-3 mx-1"
          style={{
            height: 1,
            background: 'var(--color-border)',
            opacity: 0.5,
          }}
        />

        {/* Secondary items */}
        <ul className="flex flex-col gap-1">
          {SECONDARY_NAV_ITEMS.filter(item => !item.hidden).map((item) => (
            <li key={item.id}>
              <NavItem
                icon={item.icon}
                label={item.label}
                isActive={item.path ? isPathActive(item.path, location.pathname) : false}
                onClick={() => item.path && handleNavigate(item.path)}
                showLabel={showExpanded}
                badge={item.badge}
                disabled={item.disabled}
                tooltip={item.tooltip}
                variant="sidebar"
                path={item.path || undefined}
              />
            </li>
          ))}
        </ul>
      </nav>

      {/* Gallery filter/sort controls - only show on Gallery page */}
      {location.pathname === '/gallery' && (
        <div
          className="flex-shrink-0"
          style={{
            paddingTop: 8,
            paddingBottom: 8,
            paddingLeft: LAYOUT.sidebar.paddingX,
            paddingRight: LAYOUT.sidebar.paddingX,
          }}
          onMouseEnter={handleExpandableZoneEnter}
        >
          <GallerySidebarControls showLabels={showExpanded} />
        </div>
      )}

      {/* Separator */}
      <div
        className="flex-shrink-0 mx-3"
        style={{
          height: 1,
          background: 'var(--color-border)',
        }}
      />

      {/* User account button - hovering here expands the sidebar */}
      <div
        className="flex-shrink-0"
        style={{
          paddingTop: 8,
          paddingBottom: 8,
          paddingLeft: LAYOUT.sidebar.paddingX,
          paddingRight: LAYOUT.sidebar.paddingX,
        }}
        onMouseEnter={handleExpandableZoneEnter}
      >
        <UserAccountButton showLabel={showExpanded} />
      </div>

    </motion.aside>
  );
}

export default Sidebar;
