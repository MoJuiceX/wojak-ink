/**
 * Header Component
 *
 * Top header bar with logo and price displays.
 * Height: 56px mobile, 64px desktop.
 * Features glass morphism background with blur effect.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, Grid3X3, Tag, Hash, Crown, DollarSign, ChevronUp, ChevronDown, Wallet, LogOut } from 'lucide-react';
import { useLayout } from '@/hooks/useLayout';
import { useGallery } from '@/hooks/useGallery';
import { LAYOUT } from '@/config/layout';
import { Logo } from './Logo';
import { PriceBadges } from './PriceBadges';
import { CurrencyDisplay } from '@/components/Currency';
import { useSageWallet } from '@/sage-wallet';
import { useMint } from '@/contexts/MintContext';
import { getNavItemByPath } from '@/config/routes';
import type { SortMode, FilterMode } from '@/types/nft';

interface HeaderProps {
  transparent?: boolean;
  showBreadcrumb?: boolean;
}

// Custom page titles (override default labels)
const PAGE_TITLES: Record<string, string> = {
  generator: 'Wojak Generator',
  bigpulp: 'BigPulp Intelligence',
};


// Sort helper types
type SortBase = 'id' | 'rarity' | 'price';

function getSortDirection(mode: SortMode): 'asc' | 'desc' {
  return mode.endsWith('-desc') ? 'desc' : 'asc';
}

function getSortBase(mode: SortMode): SortBase {
  if (mode.startsWith('id')) return 'id';
  if (mode.startsWith('rarity')) return 'rarity';
  return 'price';
}

function toggleSortMode(currentMode: SortMode, base: SortBase): SortMode {
  const currentBase = getSortBase(currentMode);
  const currentDir = getSortDirection(currentMode);
  if (currentBase === base) {
    return `${base}-${currentDir === 'asc' ? 'desc' : 'asc'}` as SortMode;
  }
  return `${base}-asc` as SortMode;
}

// Mobile Gallery Controls Component
function MobileGalleryControls() {
  const { sortMode, filterMode, setSortMode, setFilterMode } = useGallery();

  const filterOptions: { id: FilterMode; icon: typeof Grid3X3 }[] = [
    { id: 'all', icon: Grid3X3 },
    { id: 'listed', icon: Tag },
  ];

  const sortOptions: { base: SortBase; icon: typeof Hash }[] = [
    { base: 'id', icon: Hash },
    { base: 'rarity', icon: Crown },
    { base: 'price', icon: DollarSign },
  ];

  return (
    <div className="flex items-center gap-1">
      {/* Filter buttons */}
      {filterOptions.map((option) => {
        const Icon = option.icon;
        const isActive = filterMode === option.id;
        return (
          <motion.button
            key={option.id}
            className="w-9 h-9 flex items-center justify-center rounded-lg"
            style={{
              background: 'var(--color-glass-bg)',
              color: isActive ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
              border: isActive ? '1px solid var(--color-brand-primary)' : '1px solid var(--color-border)',
            }}
            onClick={() => setFilterMode(option.id)}
            whileTap={{ scale: 0.95 }}
          >
            <Icon size={16} />
          </motion.button>
        );
      })}

      {/* Divider */}
      <div
        className="w-px h-6 mx-1"
        style={{ background: 'var(--color-border)' }}
      />

      {/* Sort buttons */}
      {sortOptions.map((option) => {
        const Icon = option.icon;
        const currentBase = getSortBase(sortMode);
        const isActive = currentBase === option.base;
        const direction = isActive ? getSortDirection(sortMode) : 'asc';
        const DirectionIcon = direction === 'asc' ? ChevronUp : ChevronDown;

        return (
          <motion.button
            key={option.base}
            className="w-9 h-9 flex items-center justify-center rounded-lg relative"
            style={{
              background: 'var(--color-glass-bg)',
              color: isActive ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
              border: isActive ? '1px solid var(--color-brand-primary)' : '1px solid var(--color-border)',
            }}
            onClick={() => setSortMode(toggleSortMode(sortMode, option.base))}
            whileTap={{ scale: 0.95 }}
          >
            <Icon size={16} />
            {isActive && (
              <DirectionIcon
                size={10}
                className="absolute right-1"
                style={{ color: 'var(--color-brand-primary)', strokeWidth: 3, bottom: '2px' }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export function Header({ transparent = false }: HeaderProps) {
  const { isMobile, sidebarWidth, isScrolled, headerTransparent, headerBreadcrumb } = useLayout();
  const { address, status, connect, disconnect } = useSageWallet();
  const { totalMinted, maxSupply } = useMint();
  const isWalletConnected = status === 'connected' && !!address;
  const location = useLocation();
  const prevSidebarWidth = useRef(sidebarWidth);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const walletMenuRef = useRef<HTMLDivElement>(null);

  // Close wallet menu on outside click
  useEffect(() => {
    if (!showWalletMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (walletMenuRef.current && !walletMenuRef.current.contains(e.target as Node)) {
        setShowWalletMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showWalletMenu]);

  const isTransparent = transparent || headerTransparent;
  const height = isMobile ? LAYOUT.header.heightMobile : LAYOUT.header.height;
  const paddingX = isMobile ? LAYOUT.header.paddingX : LAYOUT.header.paddingXDesktop;

  // Get current page title
  const navItem = getNavItemByPath(location.pathname);
  const isBigPulpPage = navItem?.id === 'bigpulp';
  const pageTitle = navItem
    ? PAGE_TITLES[navItem.id] || navItem.label
    : '';

  // Spring animation for title overshoot effect
  const titleX = useSpring(0, {
    stiffness: 400,
    damping: 25,
  });

  // Detect sidebar width changes and trigger overshoot
  useEffect(() => {
    if (!isMobile && prevSidebarWidth.current !== sidebarWidth) {
      const delta = sidebarWidth - prevSidebarWidth.current;
      // Overshoot in the direction of movement
      titleX.set(delta * 0.15);
      // Then spring back to 0
      setTimeout(() => titleX.set(0), 50);
      prevSidebarWidth.current = sidebarWidth;
    }
  }, [sidebarWidth, isMobile, titleX]);

  return (
    <>
      {/* Desktop: Centered logo - completely separate from header to avoid transform issues */}
      {!isMobile && (
        <div
          className="fixed header-centered-logo"
          style={{
            left: '50vw',
            top: height / 2,
            transform: 'translate(-50%, -50%)',
            zIndex: 60,
          }}
        >
          <Logo size="lg" showText={true} showTagline={true} />
        </div>
      )}

      <header
        className={`fixed top-0 right-0 z-50 flex items-center glass-strong ${isMobile ? (headerBreadcrumb ? 'justify-start' : 'justify-center') : 'justify-between'}`}
        style={{
          height,
          left: isMobile ? 0 : sidebarWidth,
          paddingLeft: paddingX,
          paddingRight: paddingX,
          background: isTransparent
            ? 'transparent'
            : isScrolled
              ? 'var(--color-chrome-bg-scrolled)'
              : 'var(--color-chrome-bg)',
          backdropFilter: isTransparent ? 'none' : 'blur(12px) saturate(180%)',
          WebkitBackdropFilter: isTransparent ? 'none' : 'blur(12px) saturate(180%)',
          borderBottom: isTransparent
            ? 'none'
            : '1px solid var(--color-chrome-border-glow)',
          transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s, border-color 0.2s',
        }}
      >
        {/* Subtle glow line at bottom */}
        {!isTransparent && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(249, 115, 22, 0.3) 50%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />
        )}
        {/* Mobile: Logo with optional breadcrumb override + gallery controls */}
        {isMobile && (
          <>
            {isBigPulpPage ? (
              /* BigPulp page: show BigPulp Intelligence (same size as Wojak.ink) */
              <h1 className="font-bold whitespace-nowrap text-xl">
                <span style={{ color: 'var(--color-brand-primary)' }}>BigPulp</span>
                <span style={{ color: 'var(--color-text-primary)' }}> Intelligence</span>
              </h1>
            ) : (
              /* Default: Logo with breadcrumb support */
              <Logo
                size="md"
                showText={true}
                showTagline={!headerBreadcrumb}
                breadcrumb={headerBreadcrumb}
              />
            )}
            {/* Right side: Gallery controls when character selected (currency hidden on mobile) */}
            {headerBreadcrumb && (
              <div className="ml-auto flex items-center gap-2">
                <MobileGalleryControls />
              </div>
            )}
          </>
        )}

        {/* Desktop layout: Page title on left, Wallet on right */}
        {!isMobile && (
          <>
            {/* Left: Page title OR breadcrumb (not both) */}
            <motion.div
              className="flex-shrink-0 flex items-center gap-3"
              style={{ x: titleX }}
            >
              <AnimatePresence mode="wait">
                {headerBreadcrumb ? (
                  /* Breadcrumb: back button + character name */
                  <motion.div
                    key="breadcrumb"
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <motion.button
                      onClick={headerBreadcrumb.onBack}
                      className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-glass-hover)]"
                      style={{
                        color: 'var(--color-text-secondary)',
                        background: 'var(--color-glass-bg)',
                        border: '1px solid var(--color-border)',
                      }}
                      aria-label="Go back"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ArrowLeft size={20} />
                    </motion.button>
                    <h1
                      className="text-3xl font-bold"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {headerBreadcrumb.label}
                    </h1>
                  </motion.div>
                ) : (
                  /* Default: Page title */
                  isBigPulpPage ? (
                    /* BigPulp Intelligence - two colors */
                    <motion.h1
                      key="bigpulp-desktop-title"
                      className="text-3xl font-bold"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    >
                      <span style={{ color: 'var(--color-brand-primary)' }}>BigPulp</span>
                      <span style={{ color: 'var(--color-text-primary)' }}> Intelligence</span>
                    </motion.h1>
                  ) : (
                    /* Regular page title + optional supply counter */
                    <motion.div
                      key="page-title"
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    >
                      <h1
                        className="text-3xl font-bold"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {pageTitle}
                      </h1>
                      {navItem?.id === 'generator' && isWalletConnected && maxSupply > 0 && (
                        <span
                          className="text-[11px] tabular-nums whitespace-nowrap font-semibold px-2 py-0.5 rounded-md"
                          style={{
                            color: 'var(--color-text-muted)',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                          }}
                        >
                          {totalMinted}/{maxSupply}
                        </span>
                      )}
                    </motion.div>
                  )
                )}
              </AnimatePresence>
            </motion.div>

            {/* Right: Currency + Price badges + Wallet */}
            <div className="flex-shrink-0 flex items-center gap-4">
              <CurrencyDisplay size="small" />
              <PriceBadges size="md" />
              <div className="relative" ref={walletMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    if (isWalletConnected) {
                      setShowWalletMenu((v) => !v);
                    } else {
                      connect();
                    }
                  }}
                  title={isWalletConnected ? `Connected: ${address.slice(0, 8)}…${address.slice(-4)}` : 'Connect Wallet'}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    background: isWalletConnected ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${isWalletConnected ? 'rgba(74, 222, 128, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                    cursor: 'pointer',
                  }}
                >
                  <Wallet size={14} style={{ color: isWalletConnected ? '#4ade80' : 'var(--color-text-muted)' }} />
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: isWalletConnected ? '#4ade80' : 'var(--color-text-muted)',
                  }}>
                    {isWalletConnected ? `${address.slice(0, 6)}…${address.slice(-3)}` : 'Connect'}
                  </span>
                </button>
                <AnimatePresence>
                  {showWalletMenu && isWalletConnected && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-1.5 z-50 rounded-lg overflow-hidden py-1 min-w-[160px]"
                      style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                      }}
                    >
                      <div
                        className="px-3 py-2 text-[11px] tabular-nums truncate"
                        style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}
                      >
                        {address.slice(0, 12)}…{address.slice(-6)}
                      </div>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors"
                        style={{ color: 'var(--color-error)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        onClick={async () => {
                          setShowWalletMenu(false);
                          await disconnect();
                        }}
                      >
                        <LogOut size={14} />
                        <span>Disconnect</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </>
        )}
      </header>
    </>
  );
}

export default Header;
