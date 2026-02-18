/**
 * Action Bar Component
 *
 * Control buttons for randomize, undo/redo, save, export, and MINT.
 */

import { useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
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
} from 'lucide-react';
import { useGenerator } from '@/contexts/GeneratorContext';
import { useMint } from '@/contexts/MintContext';
import { useSageWallet } from '@/sage-wallet';
import { useLayout } from '@/hooks/useLayout';
import { isSelectionPathEmpty } from '@/types/generator';
import { exportImage } from '@/services/canvasRenderer';
import { useMetadataAttributes } from './MetadataPreview';
import { MintFlowModal } from './MintFlowModal';
import { GeneratorInfo } from './GeneratorInfo';
import { PricingLightbox } from './PricingLightbox';

interface ActionBarProps {
  className?: string;
  rightPanelMode?: 'colors' | 'metadata';
  onToggleRightPanel?: () => void;
}

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
            className="fixed px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none z-[9999] -translate-x-1/2"
            style={{
              left: pos.x,
              bottom: typeof window !== 'undefined' ? window.innerHeight - pos.y + 8 : 0,
              background: 'rgba(0, 0, 0, 0.9)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
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

  // First-visit: auto-open How It Works modal
  useEffect(() => {
    const seen = localStorage.getItem('wojak_generator_seen');
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
  const canMint = canExport && isWalletConnected && has7Traits && !isSoldOut && !mintingPaused;

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
      const webpBlob = await exportImage(selectedLayers, {
        format: 'png',
        includeBackground: true,
        size: { preset: '1024' },
      }, g2Selections);

      const effectiveMintType = hasFreeMintsAvailable ? mintType : 'paid';
      const layersForApi: Record<string, string> = {};
      for (const [key, value] of Object.entries(selectedLayers)) {
        if (!isSelectionPathEmpty(value)) {
          layersForApi[key] = value;
        }
      }
      const colorsForApi: Record<string, string> = { ...(selectedColors || {}) };

      setIsMintModalOpen(true);
      prepareMint(webpBlob, layersForApi, colorsForApi, effectiveMintType);
    } catch (err) {
      console.error('[ActionBar] Failed to prepare mint:', err);
    }
  }, [isWalletConnected, canExport, has7Traits, selectedLayers, selectedColors, hasFreeMintsAvailable, mintType, connect, prepareMint, g2Selections]);

  const basePath = selectedLayers.Base;
  const hasSelection = !isSelectionPathEmpty(basePath);

  const handleRandomize = () => {
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

  const handleSaveAndOpenFavorites = async () => {
    if (!hasSelection || isSaving) return;

    setIsSaving(true);
    try {
      // Auto-save with generated name
      await saveFavorite(getNextProjectName());
    } catch (error) {
      console.error('Failed to save favorite:', error);
    } finally {
      setIsSaving(false);
    }
    // Open favorites modal
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
    variant = 'secondary',
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
      className={`relative flex items-center justify-center rounded-lg shrink-0 ${
        variant === 'primary' ? 'w-9 h-9' : 'w-8 h-8'
      }`}
      style={{
        background: isActive
          ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.25), rgba(249, 115, 22, 0.1))'
          : 'transparent',
        color: disabled
          ? 'var(--color-text-muted)'
          : isActive
            ? 'white'
            : 'var(--color-text-secondary)',
        opacity: disabled ? 0.5 : 1,
        border: isActive
          ? '1px solid rgba(249, 115, 22, 0.6)'
          : '1px solid transparent',
        boxShadow: isActive
          ? '0 0 20px rgba(249, 115, 22, 0.3), inset 0 0 15px rgba(249, 115, 22, 0.1)'
          : 'none',
        transition: 'all 0.3s ease',
      }}
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
            className="absolute -top-2 -right-2 min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold rounded-full"
            style={{
              background: '#F97316',
              color: 'white',
              boxShadow: '0 0 8px rgba(249, 115, 22, 0.5)',
            }}
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
      className={`flex items-center justify-between px-2 py-1.5 rounded-2xl flex-nowrap w-full ${className}`}
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Randomize button — always randomizes all layers + colors */}
      <ActionBarTooltip content="Randomize">
        <motion.button
          className="relative flex items-center justify-center rounded-lg shrink-0 w-8 h-8"
          style={{
            background: 'transparent',
            border: 'none',
            transition: 'all 0.3s ease',
          }}
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
          icon={<Undo2 size={16} />}
          label="Undo"
        />
      </ActionBarTooltip>
      <ActionBarTooltip content="Redo">
        <ActionButton
          onClick={redo}
          disabled={!canRedo}
          icon={<Redo2 size={16} />}
          label="Redo"
        />
      </ActionBarTooltip>

      {/* Visual group separator */}
      <div
        className="h-6 w-px shrink-0 mx-0.5"
        style={{ background: 'var(--color-border)' }}
      />

      {/* Save to favorites */}
      <ActionBarTooltip content="Save">
        <ActionButton
          onClick={handleSaveAndOpenFavorites}
          disabled={!hasSelection || isSaving}
          icon={<Heart size={20} />}
          label="Save"
          badge={favorites.length}
        />
      </ActionBarTooltip>

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
            icon={<Download size={22} />}
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

      {/* Copy button removed — users can export/download instead */}

      {/* Overflow menu — secondary actions */}
      <div className="relative" ref={overflowMenuRef}>
        <ActionBarTooltip content="More" disabled={showOverflowMenu}>
          <ActionButton
            onClick={() => setShowOverflowMenu((v) => !v)}
            isActive={showOverflowMenu}
            icon={<MoreHorizontal size={20} />}
            label="More options"
          />
        </ActionBarTooltip>
        <AnimatePresence>
          {showOverflowMenu && (
            <motion.div
              initial={{ opacity: 0, y: isDesktop ? 4 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: isDesktop ? 4 : -4 }}
              className={`absolute ${isDesktop ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 z-50 rounded-xl overflow-hidden py-1 whitespace-nowrap`}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              }}
            >
              {/* Free Mints / Leaderboard */}
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors"
                style={{ color: 'var(--color-text)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => {
                  setShowOverflowMenu(false);
                  window.location.href = '/free-mints.html';
                }}
              >
                <Trophy size={16} style={{ color: 'var(--color-primary)' }} />
                <span>Free Mints</span>
                {isWalletConnected && (credits?.free_mints_available ?? 0) > 0 && (
                  <span
                    className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'var(--color-primary)', color: 'white' }}
                  >
                    {credits!.free_mints_available}
                  </span>
                )}
              </button>

              {/* Trait Prices */}
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors"
                style={{ color: 'var(--color-text)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => {
                  setShowOverflowMenu(false);
                  setShowPricing(true);
                }}
              >
                <Tag size={16} style={{ color: 'var(--color-primary)' }} />
                <span>Prices</span>
              </button>

              {/* Metadata toggle — desktop only */}
              {onToggleRightPanel && (
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors"
                  style={{ color: 'var(--color-text)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => {
                    setShowOverflowMenu(false);
                    onToggleRightPanel();
                  }}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700 }}>{'{ }'}</span>
                  <span>{rightPanelMode !== 'colors' ? 'Colors' : 'Metadata'}</span>
                </button>
              )}

              {/* How It Works */}
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors"
                style={{ color: 'var(--color-text)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => {
                  setShowOverflowMenu(false);
                  setShowGeneratorInfo(true);
                }}
              >
                <Info size={16} style={{ color: 'var(--color-text-secondary)' }} />
                <span>How It Works</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Mint Section ── */}
      <div
        className="flex items-center gap-2 pl-2 ml-1"
        style={{ borderLeft: '1px solid var(--color-border)' }}
      >
        {/* Free/Paid toggle */}
        {isWalletConnected && hasFreeMintsAvailable && !mintingPaused && (
          <ActionBarTooltip content={mintType === 'free' ? 'Switch to paid mint' : 'Switch to free mint'}>
            <ActionButton
              onClick={() => setMintType((t) => (t === 'free' ? 'paid' : 'free'))}
              isActive={mintType === 'free'}
              icon={mintType === 'free' ? <Sparkles size={18} /> : <Coins size={18} />}
              label={mintType === 'free' ? 'Free' : 'Paid'}
            />
          </ActionBarTooltip>
        )}

        {/* Price display — always visible */}
        {!mintingPaused && (() => {
          if (isWalletConnected && hasFreeMintsAvailable && mintType === 'free') {
            // Free mint: show credit cost
            const price = getTotalMintPrice();
            const creditCost = Math.ceil(100 * price.totalXch / price.basePrice);
            return (
              <span className="text-xs font-semibold tabular-nums whitespace-nowrap" style={{ color: 'var(--color-primary)' }}>
                {creditCost} credits
              </span>
            );
          }
          // Paid mint (or not connected): show single total XCH
          const price = getTotalMintPrice();
          return (
            <span className="text-xs font-semibold tabular-nums whitespace-nowrap" style={{ color: 'var(--color-primary)' }}>
              {price.totalXch.toFixed(2)} XCH
            </span>
          );
        })()}

        {/* Mint / Connect button */}
        {!isWalletConnected ? (
          <ActionBarTooltip content="Connect to mint">
            <ActionButton
              onClick={handleMintClick}
              icon={<Wallet size={22} />}
              label="Connect"
            />
          </ActionBarTooltip>
        ) : (
          <ActionBarTooltip
            content={mintingPaused ? 'Minting opens Friday!' : isSoldOut ? 'All 4,200 Wojaks minted!' : !has7Traits ? 'Select all 7 traits to mint' : 'Mint your Wojak'}
          >
            <ActionButton
              variant="primary"
              onClick={handleMintClick}
              disabled={!canMint}
              icon={<Sparkles size={22} />}
              label="Mint"
            />
          </ActionBarTooltip>
        )}

        {/* Supply counter with hover tooltip */}
        {maxSupply > 0 && (
          <ActionBarTooltip content={`${totalMinted > 0 ? Math.max(1, Math.round((totalMinted / maxSupply) * 100)) : 0}% minted \u2022 ${maxSupply - totalMinted} remaining`}>
            <span
              className="text-[11px] tabular-nums whitespace-nowrap cursor-default"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {totalMinted}/{maxSupply}
            </span>
          </ActionBarTooltip>
        )}
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
            localStorage.setItem('wojak_generator_seen', 'true');
            setIsFirstVisitInfo(false);
          }
        }}
      />

      {/* Pricing Lightbox */}
      <PricingLightbox
        isOpen={showPricing}
        onClose={() => setShowPricing(false)}
      />
    </div>
  );
}

export default ActionBar;
