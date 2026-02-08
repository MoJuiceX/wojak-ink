/**
 * Action Bar Component
 *
 * Control buttons for randomize, undo/redo, save, export, and MINT.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Undo2,
  Redo2,
  Heart,
  Download,
  Copy,
  Sparkles,
  Wallet,
  Coins,
  Trophy,
} from 'lucide-react';
import { useGenerator } from '@/contexts/GeneratorContext';
import { useMint } from '@/contexts/MintContext';
import { useSageWallet } from '@/sage-wallet';
import { useLayout } from '@/hooks/useLayout';
import { exportImage } from '@/services/canvasRenderer';
import { MintFlowModal } from './MintFlowModal';
import { CreditLeaderboard } from './CreditLeaderboard';

interface ActionBarProps {
  className?: string;
}

export function ActionBar({ className = '' }: ActionBarProps) {
  const {
    randomize,
    undo,
    redo,
    canUndo,
    canRedo,
    toggleFavorites,
    toggleExport,
    selectedLayers,
    favorites,
    saveFavorite,
    previewImage,
    canExport,
  } = useGenerator();
  const { credits, mintStep, startMint, resetMintFlow, totalMinted, maxSupply } = useMint();
  const { address, status: walletStatus, connect } = useSageWallet();
  const prefersReducedMotion = useReducedMotion();
  const { isDesktop } = useLayout();
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false);
  const [isMintModalOpen, setIsMintModalOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [mintType, setMintType] = useState<'free' | 'paid'>('free');

  // Determine mint readiness
  const isWalletConnected = walletStatus === 'connected' && !!address;
  const hasFreeMintsAvailable = (credits?.free_mints_available ?? 0) > 0;
  const canMint = canExport && isWalletConnected;

  // Handle mint button click
  const handleMintClick = useCallback(async () => {
    if (!isWalletConnected) {
      connect();
      return;
    }
    if (!canExport) return;

    // Render the image as WebP blob
    try {
      const webpBlob = await exportImage(selectedLayers, {
        format: 'webp',
        quality: 0.92,
        includeBackground: true,
        size: { preset: '1024' },
      });

      // Extract layer names and colors from selectedLayers
      const layerNames: Record<string, string> = {};
      const layerColors: Record<string, string> = {};
      for (const [key, value] of Object.entries(selectedLayers)) {
        if (value && value !== '' && value !== 'None') {
          // Extract trait name from path (e.g., "/assets/wojak-layers/Head/Crown.png" → "Crown")
          const parts = value.split('/');
          const fileName = parts[parts.length - 1];
          const traitName = fileName.replace(/\.[^/.]+$/, ''); // Remove extension
          layerNames[key] = traitName;
        }
      }

      // Determine mint type based on toggle
      const effectiveMintType = hasFreeMintsAvailable ? mintType : 'paid';

      setIsMintModalOpen(true);
      await startMint(webpBlob, layerNames, layerColors, effectiveMintType);
    } catch (err) {
      console.error('[ActionBar] Failed to prepare mint:', err);
    }
  }, [isWalletConnected, canExport, selectedLayers, hasFreeMintsAvailable, mintType, connect, startMint]);

  const basePath = selectedLayers.Base;
  const hasSelection = !!basePath && basePath !== '' && basePath !== 'None';

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

  const handleCopyToClipboard = async () => {
    if (!previewImage || isCopying) return;

    setIsCopying(true);
    try {
      // Create PNG blob from image using canvas for better compatibility
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = previewImage;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      ctx.drawImage(img, 0, 0);

      // Get PNG blob
      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create blob'))),
          'image/png'
        );
      });

      // Try clipboard API with PNG
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        try {
          const item = new ClipboardItem({ 'image/png': pngBlob });
          await navigator.clipboard.write([item]);
          setShowCopied(true);
          setTimeout(() => setShowCopied(false), 2000);
          return;
        } catch (clipboardError) {
          console.warn('Clipboard API failed:', clipboardError);
          // Continue to fallbacks
        }
      }

      // Fallback: Use Web Share API on mobile (for sharing)
      if (navigator.share && navigator.canShare) {
        const file = new File([pngBlob], 'wojak.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Wojak',
          });
          setShowCopied(true);
          setTimeout(() => setShowCopied(false), 2000);
          return;
        }
      }

      // Final fallback: Download the image
      const url = URL.createObjectURL(pngBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wojak.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy/share:', error);
    } finally {
      setIsCopying(false);
    }
  };

  // Styled action button matching category tab design
  const ActionButton = ({
    onClick,
    disabled,
    isActive,
    icon,
    label,
    badge,
    children,
  }: {
    onClick: () => void;
    disabled?: boolean;
    isActive?: boolean;
    icon: React.ReactNode;
    label: string;
    badge?: number;
    children?: React.ReactNode;
  }) => (
    <motion.button
      className="relative flex flex-col items-center gap-1 px-3 py-2 rounded-lg min-w-[60px]"
      style={{
        background: isActive
          ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.3), rgba(249, 115, 22, 0.1))'
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
      <span className="text-xs font-medium">{label}</span>
      {children}
    </motion.button>
  );

  return (
    <div
      className={`flex items-center justify-center gap-2 p-2 rounded-2xl flex-wrap ${className}`}
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Randomize button */}
      <ActionButton
        onClick={handleRandomize}
        isActive={isRandomizing}
        icon={
          <motion.span
            className="text-xl block"
            animate={isRandomizing ? {
              scale: [1, 1.15, 1],
              rotate: [0, -10, 10, 0],
            } : { scale: 1, rotate: 0 }}
            transition={{ duration: 0.3 }}
          >
            🎲
          </motion.span>
        }
        label="Random"
      />

      {/* Undo button */}
      <ActionButton
        onClick={undo}
        disabled={!canUndo}
        icon={<Undo2 size={20} />}
        label="Undo"
      />

      {/* Redo button */}
      <ActionButton
        onClick={redo}
        disabled={!canRedo}
        icon={<Redo2 size={20} />}
        label="Redo"
      />

      {/* Save to favorites */}
      <ActionButton
        onClick={handleSaveAndOpenFavorites}
        disabled={!hasSelection || isSaving}
        icon={<Heart size={20} />}
        label="Save"
        badge={favorites.length}
      />

      {/* Export button */}
      <div className="download-btn-container relative">
        <ActionButton
          onClick={() => {
            toggleExport(true);
            if (hasSelection && !prefersReducedMotion) {
              setShowDownloadSuccess(true);
              setTimeout(() => setShowDownloadSuccess(false), 600);
            }
          }}
          disabled={!hasSelection}
          isActive={hasSelection}
          icon={<Download size={20} />}
          label="Export"
        />
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

      {/* Copy to clipboard button - desktop only */}
      {isDesktop && (
        <div className="relative">
          <ActionButton
            onClick={handleCopyToClipboard}
            disabled={!hasSelection || isCopying}
            icon={<Copy size={20} />}
            label="Copy"
          />
          {showCopied && (
            <motion.div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
              style={{
                background: 'rgba(0, 0, 0, 0.9)',
                color: '#F97316',
                border: '1px solid rgba(249, 115, 22, 0.3)',
              }}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
            >
              Copied!
            </motion.div>
          )}
        </div>
      )}

      {/* Leaderboard button */}
      {isDesktop && isWalletConnected && (
        <ActionButton
          onClick={() => setIsLeaderboardOpen(true)}
          icon={<Trophy size={20} />}
          label="Credits"
          badge={credits?.free_mints_available}
        />
      )}

      {/* ── Mint Section ── */}
      <div
        className="flex items-center gap-2 pl-2 ml-1"
        style={{ borderLeft: '1px solid var(--color-border)' }}
      >
        {/* Free/Paid toggle (only when wallet connected and has credits) */}
        {isWalletConnected && hasFreeMintsAvailable && (
          <div className="flex flex-col items-center gap-0.5">
            <button
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors"
              style={{
                background: mintType === 'free'
                  ? 'rgba(34, 197, 94, 0.2)'
                  : 'rgba(255, 107, 0, 0.2)',
                color: mintType === 'free'
                  ? 'var(--color-success)'
                  : 'var(--color-primary)',
                border: `1px solid ${mintType === 'free' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255, 107, 0, 0.4)'}`,
              }}
              onClick={() => setMintType(mintType === 'free' ? 'paid' : 'free')}
              aria-label="Toggle mint type"
            >
              {mintType === 'free' ? (
                <><Coins size={10} /> Free</>
              ) : (
                <><Wallet size={10} /> XCH</>
              )}
            </button>
            {credits && (
              <span className="text-[9px] text-secondary">
                {credits.free_mints_available} free
              </span>
            )}
          </div>
        )}

        {/* Mint button */}
        <ActionButton
          onClick={handleMintClick}
          disabled={isWalletConnected ? !canExport : false}
          isActive={canMint}
          icon={
            !isWalletConnected ? (
              <Wallet size={20} />
            ) : (
              <Sparkles size={20} />
            )
          }
          label={
            !isWalletConnected
              ? 'Connect'
              : totalMinted >= maxSupply
                ? 'Sold Out'
                : 'Mint'
          }
        />

        {/* Supply counter */}
        {isDesktop && totalMinted > 0 && (
          <span className="text-[10px] text-muted whitespace-nowrap">
            {totalMinted.toLocaleString()}/{maxSupply.toLocaleString()}
          </span>
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

      {/* Credit Leaderboard Modal */}
      <CreditLeaderboard
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />
    </div>
  );
}

export default ActionBar;
