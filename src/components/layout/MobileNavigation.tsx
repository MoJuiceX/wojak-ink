/**
 * MobileNavigation Component
 *
 * Bottom tab bar navigation for mobile devices.
 * Height: 60px + safe area inset.
 * Features animated underline indicator.
 *
 * Shows 5 items: Gallery, Generator, Games, Media, More
 * "More" opens a slide-up sheet with secondary navigation.
 */

import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LAYOUT } from '@/config/layout';
import { MOBILE_NAV_ITEMS, isPathActive } from '@/config/routes';
import { mobileNavTransition } from '@/config/animations';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { useHaptic } from '@/hooks/useHaptic';
import { useLayout } from '@/hooks/useLayout';
import { NavItem } from './NavItem';
import { MoreMenu } from '@/components/navigation/MoreMenu';

interface MobileNavigationProps {
  visible?: boolean;
}

// Minimum scroll distance before hiding nav (prevents flicker)
const SCROLL_HIDE_THRESHOLD = 60;

export function MobileNavigation({ visible = true }: MobileNavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const prefersReducedMotion = usePrefersReducedMotion();
  const haptic = useHaptic();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const { scrollDirection, scrollY } = useLayout();

  // Hide nav when scrolling down (past threshold), show when scrolling up
  // Don't hide while MoreMenu is open (user may scroll while interacting)
  const isHiddenByScroll = !isMoreMenuOpen && scrollDirection === 'down' && scrollY > SCROLL_HIDE_THRESHOLD;

  const activeIndex = useMemo(() => {
    return MOBILE_NAV_ITEMS.findIndex((item) =>
      item.path && isPathActive(item.path, location.pathname)
    );
  }, [location.pathname]);

  const handleNavClick = useCallback(
    (path: string | null) => {
      haptic.tap();
      if (path === null) {
        // "More" button - open menu
        setIsMoreMenuOpen(true);
      } else {
        navigate(path);
      }
    },
    [navigate, haptic]
  );

  if (!visible) {
    return null;
  }

  const navHeight = 60;

  return (
    <>
      {/* CRITICAL: 'mobile-navigation' class is required for game-fullscreen-mode to hide this nav.
          See index.css for the hiding rules. Do not remove this class! */}
      <motion.nav
        className="mobile-navigation fixed bottom-0 left-0 right-0 z-50 flex flex-col glass-strong"
        style={{
          paddingBottom: LAYOUT.mobileNav.safeAreaBottom,
          background: 'rgba(10, 10, 10, 0.95)',
          backdropFilter: 'blur(12px) saturate(180%)',
          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          borderTop: '1px solid rgba(249, 115, 22, 0.15)',
        }}
        initial={{ y: 100 }}
        animate={{ y: isHiddenByScroll ? '100%' : 0 }}
        exit={{ y: 100 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Glow line at top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '20%',
            right: '20%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(249, 115, 22, 0.25), transparent)',
            pointerEvents: 'none',
          }}
        />

        {/* Active underline indicator with glow */}
        {activeIndex >= 0 && (
          <motion.div
            className="absolute top-0"
            style={{
              width: `${100 / MOBILE_NAV_ITEMS.length}%`,
              height: 2,
              background: 'transparent',
            }}
            animate={{
              left: `${(activeIndex / MOBILE_NAV_ITEMS.length) * 100}%`,
            }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : mobileNavTransition.underline
            }
          >
            {/* Centered glowing line within the tab */}
            <div
              className="absolute left-1/2 top-0 h-full"
              style={{
                width: 32,
                transform: 'translateX(-50%)',
                background: '#F97316',
                boxShadow: '0 0 15px #F97316, 0 0 30px rgba(249, 115, 22, 0.3)',
                borderRadius: '0 0 2px 2px',
              }}
            />
          </motion.div>
        )}

        {/* Tab items - fixed height container for proper centering */}
        <div
          className="flex items-center justify-around"
          style={{ height: navHeight }}
          role="tablist"
          aria-label="Navigation tabs"
        >
          {MOBILE_NAV_ITEMS.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              shortLabel={item.shortLabel}
              isActive={item.path ? isPathActive(item.path, location.pathname) : false}
              onClick={() => handleNavClick(item.path)}
              badge={item.badge}
              disabled={item.disabled}
              variant="mobile"
              path={item.path || undefined}
              featured={item.featured}
            />
          ))}
        </div>
      </motion.nav>

      {/* More Menu slide-up sheet */}
      <MoreMenu
        isOpen={isMoreMenuOpen}
        onClose={() => setIsMoreMenuOpen(false)}
      />
    </>
  );
}

export default MobileNavigation;
