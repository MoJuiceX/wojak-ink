/**
 * Action Bar Component
 *
 * Row 1: Full icon toolbar (no overflow menu — all actions visible).
 * Row 2: Mint bar with price display, free/paid toggle, and CTA button.
 */

import { useState, useCallback, useEffect, useRef, useLayoutEffect, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Undo2,
  Redo2,
  Heart,
  Download,
  Sparkles,
  Wallet,
  Trophy,
  Info,
  Tag,
  Wand2,
  Images,
} from 'lucide-react';
import { useGenerator } from '@/contexts/GeneratorContext';
import { useMint } from '@/contexts/MintContext';
import { useSageWallet } from '@/sage-wallet';
import { isSelectionPathEmpty, isFavoriteV2 } from '@/types/generator';
import type { SelectionsSnapshot } from '@/types/generator';
import { exportImage } from '@/services/canvasRenderer';
import { toastService } from '@/services/toastService';
import { useMetadataAttributes } from './MetadataPreview';
import { MintFlowModal } from './MintFlowModal';
import { GeneratorInfo } from './GeneratorInfo';
import { PricingLightbox } from './PricingLightbox';
import { useAIEnhance } from '@/contexts/AIEnhanceContext';
import { safeStorage } from '@/utils/safeStorage';

// Lazy-load AI components — only needed when user opens the AI wizard
const AIEnhanceLightbox = lazy(() => import('./ai/AIEnhanceLightbox').then(m => ({ default: m.AIEnhanceLightbox })));
const AICreationsGallery = lazy(() => import('./ai/AICreationsGallery').then(m => ({ default: m.AICreationsGallery })));
const AICreditsShop = lazy(() => import('./ai/AICreditsShop').then(m => ({ default: m.AICreditsShop })));

interface ActionBarProps {
  className?: string;
  rightPanelMode?: 'colors' | 'metadata';
  onToggleRightPanel?: () => void;
}

/** When true, mint button is disabled and shows "Minting continues soon." on hover. Set to false to re-enable. */
const GENERATOR_MINTING_PAUSED = false;

/**
 * Tooltip that renders in a portal above the trigger, so it's never clipped by overflow.
 *
 * Behavior by input type:
 *   Desktop (hover: hover) — show on mouseenter, hide on mouseleave or click.
 *   Mobile (hover: none)   — show on long-press (~400ms hold), auto-dismiss after 1.5s.
 *                             Normal taps perform the button action without showing tooltip.
 *   Both                   — dismiss on scroll, touch elsewhere, or any click inside.
 *                             CSS safety net: `@media (hover: none) { display: none }` in
 *                             theme.css hides the portal even if JS state is stale.
 */
function ActionBarTooltip({
  content,
  children,
  disabled,
}: {
  content: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reactively track whether the device supports hover (handles hybrid devices)
  const [hasHover, setHasHover] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(hover: hover)').matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover)');
    const onChange = (e: MediaQueryListEvent) => setHasHover(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
    };
  }, []);

  const updatePos = useCallback(() => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.top });
    }
  }, []);

  // Reposition while visible
  useLayoutEffect(() => {
    if (!visible) return;
    updatePos();
    const onScrollOrResize = () => updatePos();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [visible, updatePos]);

  // When visible: dismiss on any touch or click outside, or scroll
  useEffect(() => {
    if (!visible) return;
    const dismiss = () => setVisible(false);
    window.addEventListener('touchstart', dismiss, { passive: true, capture: true });
    window.addEventListener('scroll', dismiss, { passive: true, capture: true });
    return () => {
      window.removeEventListener('touchstart', dismiss, { capture: true });
      window.removeEventListener('scroll', dismiss, { capture: true });
    };
  }, [visible]);

  const show = useCallback(() => {
    updatePos();
    setVisible(true);
    // Safety net: auto-dismiss after 3s no matter what (prevents permanent stuck state)
    if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
    autoDismissTimer.current = setTimeout(() => setVisible(false), 3000);
  }, [updatePos]);

  const hide = useCallback(() => {
    setVisible(false);
    if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
  }, []);

  // Desktop: hover to show, leave or click to hide
  const hoverHandlers = hasHover
    ? {
        onMouseEnter: show,
        onMouseLeave: hide,
      }
    : {};

  // Mobile: long-press (400ms hold) to show, auto-dismiss after 1.5s
  const touchHandlers = !hasHover
    ? {
        onTouchStart: () => {
          longPressTimer.current = setTimeout(() => {
            show();
            // Auto-dismiss after 1.5s on mobile
            if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
            autoDismissTimer.current = setTimeout(() => setVisible(false), 1500);
          }, 400);
        },
        onTouchEnd: () => {
          // If released before 400ms, it's a normal tap — cancel the tooltip
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        },
        onTouchMove: () => {
          // Finger moved — cancel long-press
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        },
      }
    : {};

  return (
    <>
      <div
        ref={ref}
        className="relative"
        {...hoverHandlers}
        {...touchHandlers}
        // Dismiss on click — covers desktop clicking button while tooltip is shown
        onClick={visible ? hide : undefined}
      >
        {children}
      </div>
      {visible && !disabled &&
        createPortal(
          <div
            className="action-bar-tooltip fixed px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none z-[400] -translate-x-1/2 text-secondary"
            style={{
              left: pos.x,
              bottom: typeof window !== 'undefined' ? window.innerHeight - pos.y + 8 : 0,
            }}
            role="tooltip"
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}

export function ActionBar({ className = '', rightPanelMode, onToggleRightPanel }: ActionBarProps) {
  const {
    randomize,
    undo,
    redo,
    canUndo,
    canRedo,
    toggleFavorites,
    toggleExport,
    selectedLayers,
    selectedColors,
    g2Selections,
    selections,
    favorites,
    saveFavorite,
    canExport,
  } = useGenerator();
  const { credits, prepareMint, resetMintFlow, maxSupply, getTotalMintPrice, mintingPaused, totalMinted } = useMint();
  const { address, status: walletStatus, connect } = useSageWallet();
  const prefersReducedMotion = useReducedMotion();
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false);
  const [isMintModalOpen, setIsMintModalOpen] = useState(false);
  const [mintType, setMintType] = useState<'free' | 'paid'>('free');
  const [showGeneratorInfo, setShowGeneratorInfo] = useState(false);
  const [isFirstVisitInfo, setIsFirstVisitInfo] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const lastRandomizeRef = useRef<number>(0);
  const { openLightbox, creations, isAIEnhancedMode, enhancedImage, isLightboxOpen, isShopOpen, acceptedOptions, acceptedFamilies, enhancedCategories, aiTraitOverrides } = useAIEnhance();
  const [showCreationsGallery, setShowCreationsGallery] = useState(false);
  const [canvasImageBase64, setCanvasImageBase64] = useState<string | null>(null);

  // First-visit: auto-open How It Works modal
  useEffect(() => {
    const seen = safeStorage.getItem('wojak_generator_seen');
    if (!seen) {
      const timer = setTimeout(() => {
        setIsFirstVisitInfo(true);
        setShowGeneratorInfo(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Determine mint readiness
  const isWalletConnected = walletStatus === 'connected' && !!address;
  const hasFreeMintsAvailable = (credits?.free_mints_available ?? 0) > 0;

  // Use the same consolidated trait count as the metadata panel (7 trait types)
  const metadataAttributes = useMetadataAttributes();
  const traitCount = metadataAttributes.filter((a) => a.value !== '').length;
  const has7Traits = traitCount >= 7;
  const isSoldOut = totalMinted >= maxSupply && maxSupply > 0;
  const showMintingPaused = mintingPaused || GENERATOR_MINTING_PAUSED;

  // Auto-default to free mint when credits are available
  useEffect(() => {
    if (hasFreeMintsAvailable) setMintType('free');
  }, [hasFreeMintsAvailable]);

  const handleMintClick = useCallback(async () => {
    if (!isWalletConnected) {
      try {
        await connect();
      } catch (err) {
        console.error('[ActionBar] Wallet connect failed:', err);
      }
      return;
    }
    if (!canExport || !has7Traits) return;

    try {
      let imageBlob: Blob;

      if (isAIEnhancedMode && enhancedImage) {
        const res = await fetch(enhancedImage);
        if (!res.ok) throw new Error(`Failed to fetch image: HTTP ${res.status}`);
        imageBlob = await res.blob();
      } else {
        imageBlob = await exportImage(selectedLayers, {
          format: 'png',
          includeBackground: true,
          size: { preset: '1024' },
        }, g2Selections, selectedColors);
      }

      const effectiveMintType = hasFreeMintsAvailable ? mintType : 'paid';
      const layersForApi: Record<string, string> = {};
      for (const [key, value] of Object.entries(selectedLayers)) {
        if (!isSelectionPathEmpty(value)) {
          layersForApi[key] = value;
        }
      }
      const colorsForApi: Record<string, string> = { ...(selectedColors || {}) };

      // Build AI attributes from cumulative trait overrides (works for fresh + resumed creations)
      const hasOverrides = Object.keys(aiTraitOverrides).length > 0;
      const aiData = isAIEnhancedMode && (hasOverrides || enhancedCategories.size > 0)
        ? {
            aiEnhanced: true,
            aiAttributes: hasOverrides
              ? Object.entries(aiTraitOverrides).map(([category, label]) => ({
                  category,
                  label,
                  familyLabel: (acceptedFamilies as Record<string, string>)[category] ?? '',
                }))
              : Object.entries(acceptedOptions)
                  .filter(([, opt]) => opt != null)
                  .map(([category, opt]) => ({
                    category,
                    label: opt!.label,
                    familyLabel: (acceptedFamilies as Record<string, string>)[category] ?? '',
                  })),
          }
        : undefined;

      setIsMintModalOpen(true);
      prepareMint(imageBlob, layersForApi, colorsForApi, effectiveMintType, aiData);
    } catch (err) {
      console.error('[ActionBar] Failed to prepare mint:', err);
      const msg = err instanceof Error ? err.message : 'Failed to prepare image for minting.';
      toastService.error(msg, { duration: 8000 });
    }
  }, [isWalletConnected, canExport, has7Traits, selectedLayers, selectedColors, hasFreeMintsAvailable, mintType, connect, prepareMint, g2Selections, isAIEnhancedMode, enhancedImage, acceptedOptions, acceptedFamilies, enhancedCategories, aiTraitOverrides]);

  const handleEnhanceClick = useCallback(async () => {
    if (!canExport) return;
    try {
      const blob = await exportImage(selectedLayers, {
        format: 'png',
        includeBackground: true,
        size: { preset: '1024' },
      }, g2Selections, selectedColors);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setCanvasImageBase64(dataUrl);
        openLightbox();
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('[ActionBar] Failed to capture canvas for AI enhance:', err);
    }
  }, [canExport, selectedLayers, g2Selections, selectedColors, openLightbox]);

  const basePath = selectedLayers.Base;
  const hasSelection = !isSelectionPathEmpty(basePath);

  const handleRandomize = () => {
    const now = Date.now();
    if (now - lastRandomizeRef.current < 300) return;
    lastRandomizeRef.current = now;
    setIsRandomizing(true);
    randomize();
    setTimeout(() => setIsRandomizing(false), 500);
  };

  const getNextProjectName = () => {
    const projectNumbers = favorites
      .map((f) => {
        const match = f.name.match(/^Wojak\s*(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);
    const nextNumber = projectNumbers.length > 0 ? Math.max(...projectNumbers) + 1 : 1;
    return `Wojak ${nextNumber}`;
  };

  const selectionsMatch = (a: SelectionsSnapshot, b: SelectionsSnapshot): boolean => {
    const keysA = Object.keys(a) as (keyof SelectionsSnapshot)[];
    const keysB = Object.keys(b) as (keyof SelectionsSnapshot)[];
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      const selA = a[key];
      const selB = b[key];
      if (!selA || !selB) return false;
      if (selA.path !== selB.path) return false;
      if (JSON.stringify(selA.g2) !== JSON.stringify(selB.g2)) return false;
    }
    return true;
  };

  const isAlreadyInFavorites = favorites.some((f) => {
    if (!isFavoriteV2(f)) return false;
    return selectionsMatch(selections, f.unifiedSelections);
  });

  const handleSaveAndOpenFavorites = async () => {
    if (!hasSelection || isSaving) return;
    if (!isAlreadyInFavorites) {
      setIsSaving(true);
      try {
        await saveFavorite(getNextProjectName());
      } catch (error) {
        console.error('Failed to save favorite:', error);
      } finally {
        setIsSaving(false);
      }
    }
    toggleFavorites(true);
  };

  // Icon button component
  const ActionButton = ({
    onClick,
    disabled,
    isActive,
    icon,
    label,
    badge,
    variant: _variant = 'secondary',
    hideOnMobile,
  }: {
    onClick: () => void;
    disabled?: boolean;
    isActive?: boolean;
    icon: React.ReactNode;
    label: string;
    badge?: number;
    variant?: 'primary' | 'secondary';
    hideOnMobile?: boolean;
  }) => (
    <motion.button
      type="button"
      className={`action-btn${isActive ? ' action-btn--active' : ''}${disabled ? ' action-btn--disabled' : ''} relative flex items-center justify-center rounded-lg shrink-0 w-7 h-7 lg:w-8 lg:h-8${hideOnMobile ? ' hidden lg:flex' : ''}`}
      whileHover={disabled || prefersReducedMotion ? undefined : { scale: 1.02 }}
      whileTap={disabled || prefersReducedMotion ? undefined : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <div className="relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="action-btn-badge absolute -top-2 -right-2 min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold rounded-full">
            {badge}
          </span>
        )}
      </div>
    </motion.button>
  );

  // ── Mint bar state ──
  const showFreePaidToggle = isWalletConnected && hasFreeMintsAvailable && !showMintingPaused && !isSoldOut;
  const isFreeMint = showFreePaidToggle && mintType === 'free';

  const priceDisplay = (() => {
    if (showMintingPaused || isSoldOut) return '';
    if (!isWalletConnected) return '';
    const p = getTotalMintPrice(metadataAttributes, isAIEnhancedMode);
    if (isFreeMint) {
      const creditCost = Math.ceil(100 * p.totalXch / p.basePrice);
      return `${creditCost} credits`;
    }
    return `${p.totalXch.toFixed(2)} XCH`;
  })();

  const mintCtaLabel = (() => {
    if (showMintingPaused) return 'Soon';
    if (isSoldOut) return 'Sold Out';
    if (!isWalletConnected) return 'Connect';
    if (!has7Traits) return 'Mint';
    return 'Mint';
  })();

  const mintCtaDisabled = showMintingPaused || isSoldOut || (isWalletConnected && !has7Traits);

  return (
    <div className={`action-bar-wrapper flex flex-col gap-1.5 w-full ${className}`}>
      {/* ── Row 1: Icon toolbar — all actions visible, spread to fill width ── */}
      <div className="action-bar-container flex items-center justify-between px-1.5 lg:px-2 py-1 rounded-none lg:rounded-2xl w-full">
        {/* Left: Creation tools */}
        <div className="flex items-center gap-px lg:gap-0.5">
          <ActionBarTooltip content="Randomize">
            <motion.button
              type="button"
              className="relative flex items-center justify-center rounded-lg shrink-0 w-7 h-7 lg:w-8 lg:h-8 bg-transparent border-none transition-all duration-300"
              whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
              onClick={handleRandomize}
              aria-label="Randomize"
            >
              <motion.span
                className="text-base lg:text-lg block"
                animate={isRandomizing ? {
                  scale: [1, 1.15, 1],
                  rotate: [0, -10, 10, 0],
                } : { scale: 1, rotate: 0 }}
                transition={{ duration: 0.3 }}
              >
                🎲
              </motion.span>
            </motion.button>
          </ActionBarTooltip>

          <ActionBarTooltip content="Undo">
            <ActionButton onClick={undo} disabled={!canUndo} icon={<Undo2 size={16} />} label="Undo" />
          </ActionBarTooltip>
          <ActionBarTooltip content="Redo">
            <ActionButton onClick={redo} disabled={!canRedo} icon={<Redo2 size={16} />} label="Redo" />
          </ActionBarTooltip>

          <div className="h-5 w-px shrink-0 mx-0.5 lg:mx-1 bg-[var(--color-border)]" />

          <ActionBarTooltip content="Save">
            <ActionButton
              onClick={handleSaveAndOpenFavorites}
              disabled={!hasSelection || isSaving}
              icon={<Heart size={16} />}
              label="Save"
              badge={favorites.length}
            />
          </ActionBarTooltip>

          <div className="download-btn-container relative">
            <ActionBarTooltip content="Export">
              <ActionButton
                variant="primary"
                onClick={() => {
                  toggleExport(true);
                  if (hasSelection && !prefersReducedMotion) {
                    setShowDownloadSuccess(true);
                    setTimeout(() => setShowDownloadSuccess(false), 800);
                  }
                }}
                disabled={!hasSelection}
                icon={<Download size={16} />}
                label="Export"
              />
            </ActionBarTooltip>
            <AnimatePresence>
              {showDownloadSuccess && (
                <div className="success-sparkles">
                  {[...Array(6)].map((_, i) => (
                    <motion.span
                      key={i}
                      className="sparkle"
                      initial={{ scale: 0, x: 0, y: 0 }}
                      animate={{
                        scale: [0, 1, 0],
                        x: Math.cos((i * 60 * Math.PI) / 180) * 30,
                        y: Math.sin((i * 60 * Math.PI) / 180) * 30,
                      }}
                      transition={{ duration: 0.5, delay: i * 0.04 }}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Enhance with AI — hidden when already in AI Enhanced mode */}
          {!isAIEnhancedMode && (
            <ActionBarTooltip content="Enhance with AI">
              <ActionButton
                onClick={handleEnhanceClick}
                disabled={!hasSelection}
                icon={<Wand2 size={16} />}
                label="Enhance with AI"
              />
            </ActionBarTooltip>
          )}
        </div>

        {/* Right: Info & reference tools */}
        <div className="flex items-center gap-px lg:gap-0.5">
          <ActionBarTooltip content="How It Works">
            <ActionButton
              onClick={() => setShowGeneratorInfo(true)}
              icon={<Info size={16} />}
              label="How It Works"
            />
          </ActionBarTooltip>

          <ActionBarTooltip content="Free Mints">
            <ActionButton
              onClick={() => { window.location.href = '/free-mints.html'; }}
              icon={<Trophy size={16} />}
              label="Free Mints"
              badge={isWalletConnected ? (credits?.free_mints_available ?? 0) : undefined}
              hideOnMobile
            />
          </ActionBarTooltip>

          <ActionBarTooltip content="Prices">
            <ActionButton
              onClick={() => setShowPricing(true)}
              icon={<Tag size={16} />}
              label="Prices"
              hideOnMobile
            />
          </ActionBarTooltip>

          <ActionBarTooltip content="AI Creations">
            <ActionButton
              onClick={() => setShowCreationsGallery(true)}
              icon={<Images size={16} />}
              label="AI Creations"
              badge={creations.length || undefined}
              hideOnMobile
            />
          </ActionBarTooltip>

          {/* Metadata toggle — desktop only */}
          {onToggleRightPanel && (
            <ActionBarTooltip content={rightPanelMode !== 'colors' ? 'Colors' : 'Metadata'}>
              <ActionButton
                onClick={onToggleRightPanel}
                isActive={rightPanelMode === 'metadata'}
                icon={<span className="font-mono text-xs font-bold leading-none">{'{ }'}</span>}
                label={rightPanelMode !== 'colors' ? 'Colors' : 'Metadata'}
                hideOnMobile
              />
            </ActionBarTooltip>
          )}
        </div>
      </div>

      {/* ── Row 2: Mint bar — price | toggle | CTA ── */}
      <div className="mint-bar flex items-center w-full rounded-xl overflow-hidden">
        {/* Price & toggle section */}
        <div className="mint-bar-info flex items-center gap-2 flex-1 min-w-0 px-3">
          {priceDisplay ? (
            <span className="mint-bar-price font-bold text-sm tabular-nums whitespace-nowrap">
              {priceDisplay}
            </span>
          ) : !isWalletConnected && !showMintingPaused && !isSoldOut ? (
            <span className="mint-bar-hint text-xs whitespace-nowrap">
              Connect wallet to mint
            </span>
          ) : showMintingPaused ? (
            <span className="mint-bar-hint text-xs whitespace-nowrap">
              Minting continues soon
            </span>
          ) : isSoldOut ? (
            <span className="mint-bar-hint text-xs whitespace-nowrap">
              All 4,200 Wojaks minted
            </span>
          ) : !has7Traits ? (
            <span className="mint-bar-hint text-xs whitespace-nowrap">
              Select all traits
            </span>
          ) : null}

          {/* Free/Paid toggle */}
          {showFreePaidToggle && (
            <button
              type="button"
              className="mint-bar-toggle flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold shrink-0"
              onClick={() => setMintType((t) => (t === 'free' ? 'paid' : 'free'))}
              aria-label={isFreeMint ? 'Switch to paid mint' : 'Switch to free mint'}
            >
              {isFreeMint ? (
                <>
                  <Sparkles size={12} />
                  <span>Free</span>
                </>
              ) : (
                <>
                  <Wallet size={12} />
                  <span>XCH</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* CTA button — the actual mint trigger */}
        <motion.button
          type="button"
          className={`mint-bar-cta flex items-center justify-center gap-1.5 px-5 shrink-0 font-semibold text-sm${mintCtaDisabled ? ' mint-bar-cta--disabled' : ''}`}
          whileHover={mintCtaDisabled || prefersReducedMotion ? undefined : { scale: 1.02 }}
          whileTap={mintCtaDisabled || prefersReducedMotion ? undefined : { scale: 0.98 }}
          onClick={handleMintClick}
          disabled={mintCtaDisabled}
          aria-label={mintCtaLabel}
        >
          {!isWalletConnected && !showMintingPaused && !isSoldOut ? (
            <Wallet size={15} />
          ) : (
            <Sparkles size={15} />
          )}
          <span>{mintCtaLabel}</span>
        </motion.button>
      </div>

      {/* Mint Flow Modal */}
      <MintFlowModal
        isOpen={isMintModalOpen}
        onClose={() => {
          setIsMintModalOpen(false);
          resetMintFlow();
        }}
      />

      {/* Generator Info Modal */}
      <GeneratorInfo
        isOpen={showGeneratorInfo}
        onClose={() => {
          setShowGeneratorInfo(false);
          if (isFirstVisitInfo) {
            safeStorage.setItem('wojak_generator_seen', 'true');
            setIsFirstVisitInfo(false);
          }
        }}
      />

      {/* Pricing Lightbox */}
      <PricingLightbox
        isOpen={showPricing}
        onClose={() => setShowPricing(false)}
      />

      {/* AI Enhance Lightbox — lazy-loaded, mounted only when open */}
      {isLightboxOpen && (
        <Suspense fallback={null}>
          <AIEnhanceLightbox currentImage={canvasImageBase64} />
        </Suspense>
      )}

      {/* AI Creations Gallery — lazy-loaded */}
      {showCreationsGallery && (
        <Suspense fallback={null}>
          <AICreationsGallery
            isOpen={showCreationsGallery}
            onClose={() => setShowCreationsGallery(false)}
          />
        </Suspense>
      )}

      {/* AI Credits Shop — lazy-loaded */}
      {isShopOpen && (
        <Suspense fallback={null}>
          <AICreditsShop />
        </Suspense>
      )}
    </div>
  );
}

export default ActionBar;
