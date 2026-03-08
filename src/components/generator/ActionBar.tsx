/**
 * Action Bar Component
 *
 * Control buttons for randomize, undo/redo, save, export, and MINT.
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
  Coins,
  Trophy,
  Info,
  MoreHorizontal,
  Tag,
  Wand2,
} from 'lucide-react';
import { useGenerator } from '@/contexts/GeneratorContext';
import { useMint } from '@/contexts/MintContext';
import { useSageWallet } from '@/sage-wallet';
import { useLayout } from '@/hooks/useLayout';
import { isSelectionPathEmpty, isFavoriteV2 } from '@/types/generator';
import type { SelectionsSnapshot } from '@/types/generator';
import { exportImage } from '@/services/canvasRenderer';
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

/** Tooltip that renders in a portal above the trigger, so it's never clipped by overflow */
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

  const updatePos = useCallback(() => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.top });
    }
  }, []);

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

  return (
    <>
      <div
        ref={ref}
        className="relative"
        onMouseEnter={() => {
          updatePos();
          setVisible(true);
        }}
        onMouseLeave={() => setVisible(false)}
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
  const { isDesktop } = useLayout();
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false);
  const [isMintModalOpen, setIsMintModalOpen] = useState(false);
  const [mintType, setMintType] = useState<'free' | 'paid'>('free');
  const [showGeneratorInfo, setShowGeneratorInfo] = useState(false);
  const [isFirstVisitInfo, setIsFirstVisitInfo] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const overflowMenuRef = useRef<HTMLDivElement>(null);
  const lastRandomizeRef = useRef<number>(0);
  const { openLightbox, creations, isAIEnhancedMode, enhancedImage, isLightboxOpen, isShopOpen } = useAIEnhance();
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

  useEffect(() => {
    if (!showOverflowMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (overflowMenuRef.current && !overflowMenuRef.current.contains(e.target as Node)) {
        setShowOverflowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showOverflowMenu]);

  // Determine mint readiness
  const isWalletConnected = walletStatus === 'connected' && !!address;

  const hasFreeMintsAvailable = (credits?.free_mints_available ?? 0) > 0;

  // Use the same consolidated trait count as the metadata panel (7 trait types)
  const metadataAttributes = useMetadataAttributes();
  const traitCount = metadataAttributes.filter((a) => a.value !== '').length;
  const has7Traits = traitCount >= 7;
  const isSoldOut = totalMinted >= maxSupply && maxSupply > 0;
  const showMintingPaused = mintingPaused || GENERATOR_MINTING_PAUSED;
  const canMint = canExport && isWalletConnected && has7Traits && !isSoldOut && !showMintingPaused;

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
        // Convert AI enhanced base64 data URL to a Blob
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

      setIsMintModalOpen(true);
      prepareMint(imageBlob, layersForApi, colorsForApi, effectiveMintType);
    } catch (err) {
      console.error('[ActionBar] Failed to prepare mint:', err);
    }
  }, [isWalletConnected, canExport, has7Traits, selectedLayers, selectedColors, hasFreeMintsAvailable, mintType, connect, prepareMint, g2Selections, isAIEnhancedMode, enhancedImage]);

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
    if (now - lastRandomizeRef.current < 300) return; // Debounce 300ms
    lastRandomizeRef.current = now;
    setIsRandomizing(true);
    randomize();
    setTimeout(() => setIsRandomizing(false), 500);
  };

  // Generate the next project name
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

  // Check if current selection already exists in favorites
  const selectionsMatch = (a: SelectionsSnapshot, b: SelectionsSnapshot): boolean => {
    const keysA = Object.keys(a) as (keyof SelectionsSnapshot)[];
    const keysB = Object.keys(b) as (keyof SelectionsSnapshot)[];
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      const selA = a[key];
      const selB = b[key];
      if (!selA || !selB) return false;
      if (selA.path !== selB.path) return false;
      // Compare G2 data if present
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

    // Only save if not already in favorites
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
    // Always open favorites modal
    toggleFavorites(true);
  };

  // Styled action button - icon only, primary for Export/Mint, secondary for others
  const ActionButton = ({
    onClick,
    disabled,
    isActive,
    icon,
    label,
    badge,
    children,
    variant: _variant = 'secondary',
  }: {
    onClick: () => void;
    disabled?: boolean;
    isActive?: boolean;
    icon: React.ReactNode;
    label: string;
    badge?: number;
    children?: React.ReactNode;
    variant?: 'primary' | 'secondary';
  }) => (
    <motion.button
      type="button"
      className={`action-btn${isActive ? ' action-btn--active' : ''}${disabled ? ' action-btn--disabled' : ''} relative flex items-center justify-center rounded-lg shrink-0 w-8 h-8`}
      whileHover={disabled || prefersReducedMotion ? undefined : { scale: 1.02 }}
      whileTap={disabled || prefersReducedMotion ? undefined : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <div className="relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span
            className="action-btn-badge absolute -top-2 -right-2 min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold rounded-full"
          >
            {badge}
          </span>
        )}
      </div>
      {children}
    </motion.button>
  );

  return (
    <div
      className={`action-bar-container flex items-center justify-between px-1 lg:px-2 py-1.5 rounded-none lg:rounded-2xl flex-nowrap w-full ${className}`}
    >
      {/* Left group — utility icons (grouped to prevent layout shift when mint section changes) */}
      <div className="flex items-center gap-0.5">
      {/* Randomize button — always randomizes all layers + colors */}
      <ActionBarTooltip content="Randomize">
        <motion.button
          type="button"
          className="relative flex items-center justify-center rounded-lg shrink-0 w-8 h-8 bg-transparent border-none transition-all duration-300"
          whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
          onClick={handleRandomize}
          aria-label="Randomize"
        >
          <motion.span
            className="text-lg block"
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

      {/* Undo/Redo side by side */}
      <ActionBarTooltip content="Undo">
        <ActionButton
          onClick={undo}
          disabled={!canUndo}
          icon={<Undo2 size={18} />}
          label="Undo"
        />
      </ActionBarTooltip>
      <ActionBarTooltip content="Redo">
        <ActionButton
          onClick={redo}
          disabled={!canRedo}
          icon={<Redo2 size={18} />}
          label="Redo"
        />
      </ActionBarTooltip>

      {/* Visual group separator */}
      <div
        className="h-6 w-px shrink-0 mx-0.5 bg-[var(--color-border)]"
      />

      {/* Save to favorites — desktop only in main bar (mobile: in overflow) */}
      {isDesktop && (
        <ActionBarTooltip content="Save">
          <ActionButton
            onClick={handleSaveAndOpenFavorites}
            disabled={!hasSelection || isSaving}
            icon={<Heart size={18} />}
            label="Save"
            badge={favorites.length}
          />
        </ActionBarTooltip>
      )}

      {/* Export button - primary */}
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
            icon={<Download size={18} />}
            label="Export"
          />
        </ActionBarTooltip>
        {/* Success sparkles */}
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
            icon={<Wand2 size={18} />}
            label="Enhance with AI"
          />
        </ActionBarTooltip>
      )}

      {/* How It Works — visible on all screens */}
      <ActionBarTooltip content="How It Works">
        <ActionButton
          onClick={() => setShowGeneratorInfo(true)}
          icon={<Info size={18} />}
          label="How It Works"
        />
      </ActionBarTooltip>

      {/* Overflow menu — secondary actions */}
      <div className="relative" ref={overflowMenuRef}>
        <ActionBarTooltip content="More" disabled={showOverflowMenu}>
          <ActionButton
            onClick={() => setShowOverflowMenu((v) => !v)}
            isActive={showOverflowMenu}
            icon={<MoreHorizontal size={18} />}
            label="More options"
          />
        </ActionBarTooltip>
        <AnimatePresence>
          {showOverflowMenu && (
            <motion.div
              initial={{ opacity: 0, y: isDesktop ? 4 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: isDesktop ? 4 : -4 }}
              className={`action-bar-dropdown absolute ${isDesktop ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 z-50 rounded-xl overflow-hidden py-1 whitespace-nowrap`}
            >
              {/* Save — mobile only (desktop shows in main bar) */}
              {!isDesktop && (
                <button
                  type="button"
                  className="action-menu-item w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-primary"
                  onClick={() => {
                    setShowOverflowMenu(false);
                    handleSaveAndOpenFavorites();
                  }}
                  disabled={!hasSelection || isSaving}
                >
                  <Heart size={16} className="text-accent" />
                  <span>Save</span>
                  {favorites.length > 0 && (
                    <span
                      className="action-menu-item-badge ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full"
                    >
                      {favorites.length}
                    </span>
                  )}
                </button>
              )}

              {/* Free Mints / Leaderboard */}
              <button
                type="button"
                className="action-menu-item w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-primary"
                onClick={() => {
                  setShowOverflowMenu(false);
                  window.location.href = '/free-mints.html';
                }}
              >
                <Trophy size={16} className="text-accent" />
                <span>Free Mints</span>
                {isWalletConnected && (credits?.free_mints_available ?? 0) > 0 && (
                  <span
                    className="action-menu-item-badge ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full"
                  >
                    {credits!.free_mints_available}
                  </span>
                )}
              </button>

              {/* Trait Prices */}
              <button
                type="button"
                className="action-menu-item w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-primary"
                onClick={() => {
                  setShowOverflowMenu(false);
                  setShowPricing(true);
                }}
              >
                <Tag size={16} className="text-accent" />
                <span>Prices</span>
              </button>

              {/* My AI Creations */}
              <button
                type="button"
                className="action-menu-item w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-primary"
                onClick={() => {
                  setShowOverflowMenu(false);
                  setShowCreationsGallery(true);
                }}
              >
                <Wand2 size={16} className="text-accent" />
                <span>AI Creations</span>
                {creations.length > 0 && (
                  <span className="action-menu-item-badge ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {creations.length}
                  </span>
                )}
              </button>

              {/* Metadata toggle — desktop only */}
              {onToggleRightPanel && (
                <button
                  type="button"
                  className="action-menu-item w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-primary"
                  onClick={() => {
                    setShowOverflowMenu(false);
                    onToggleRightPanel();
                  }}
                >
                  <span className="font-mono text-sm font-bold">{'{ }'}</span>
                  <span>{rightPanelMode !== 'colors' ? 'Colors' : 'Metadata'}</span>
                </button>
              )}

              {/* How It Works moved to main bar */}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>{/* end left group */}

      {/* ── Mint Section ── */}
      <div
        className="flex items-center gap-1 lg:gap-3 pl-1 lg:pl-2 ml-0.5 lg:ml-1 border-l border-[var(--color-border)]"
      >
        {/* Free/Paid toggle — desktop: visibility:hidden to keep layout stable; mobile: display:none to save space */}
        {(isWalletConnected && hasFreeMintsAvailable && !showMintingPaused) ? (
          <ActionBarTooltip content={mintType === 'free' ? 'Switch to paid mint' : 'Switch to free mint'}>
            <ActionButton
              onClick={() => setMintType((t) => (t === 'free' ? 'paid' : 'free'))}
              isActive={mintType === 'free'}
              icon={mintType === 'free' ? <Sparkles size={18} /> : <Coins size={18} />}
              label={mintType === 'free' ? 'Free' : 'Paid'}
            />
          </ActionBarTooltip>
        ) : isDesktop ? (
          <div style={{ width: 32, height: 32, flexShrink: 0 }} />
        ) : null}

        {/* Price display — always visible, min-width prevents layout shift */}
        {!showMintingPaused && (() => {
          if (isWalletConnected && hasFreeMintsAvailable && mintType === 'free') {
            // Free mint: show credit cost
            const price = getTotalMintPrice(metadataAttributes);
            const creditCost = Math.ceil(100 * price.totalXch / price.basePrice);
            return (
              <span className="text-xs font-semibold tabular-nums whitespace-nowrap text-accent" style={{ minWidth: isDesktop ? 80 : undefined, textAlign: 'center', flexShrink: 0 }}>
                {creditCost} credits
              </span>
            );
          }
          // Paid mint (or not connected): show single total XCH
          const price = getTotalMintPrice(metadataAttributes);
          return (
            <span className="text-xs font-semibold tabular-nums whitespace-nowrap text-accent" style={{ minWidth: isDesktop ? 80 : undefined, textAlign: 'center', flexShrink: 0 }}>
              {price.totalXch.toFixed(2)} XCH
            </span>
          );
        })()}

        {/* Mint / Connect button */}
        {showMintingPaused ? (
          <ActionBarTooltip content="Minting continues soon.">
            <button
              disabled
              className="action-btn--paused px-4 py-1.5 rounded-lg text-sm font-semibold"
            >
              Soon
            </button>
          </ActionBarTooltip>
        ) : !isWalletConnected ? (
          <ActionBarTooltip content="Connect to mint">
            <ActionButton
              onClick={handleMintClick}
              icon={<Wallet size={18} />}
              label="Connect"
            />
          </ActionBarTooltip>
        ) : (
          <ActionBarTooltip
            content={isSoldOut ? 'All 4,200 Wojaks minted!' : !has7Traits ? 'Select all 7 traits to mint' : 'Mint your Wojak'}
          >
            <motion.button
              type="button"
              className="action-bar-mint-btn relative flex items-center justify-center rounded-lg shrink-0 w-8 h-8"
              whileHover={!canMint || prefersReducedMotion ? undefined : { scale: 1.05 }}
              whileTap={!canMint || prefersReducedMotion ? undefined : { scale: 0.95 }}
              onClick={handleMintClick}
              disabled={!canMint}
              aria-label="Mint"
            >
              <Sparkles size={18} />
            </motion.button>
          </ActionBarTooltip>
        )}

        {/* Supply counter removed — shown in title bar instead */}
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
