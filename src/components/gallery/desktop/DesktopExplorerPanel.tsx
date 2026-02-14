/**
 * DesktopExplorerPanel Component
 *
 * Centered lightbox for desktop NFT exploration.
 * Design inspired by Pudgy Penguins marketplace.
 * - Thumbnail strip outside lightbox on the left
 * - NFT image on left with expand button
 * - NFT details on right with tabs
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Expand,
  Minimize2,
  ExternalLink,
  Shuffle,
  Hash,
  Crown,
  DollarSign,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useGallery } from '@/hooks/useGallery';
import { DESKTOP_LAYOUT } from '@/config/desktopLayout';
import { GALLERY_ANIMATIONS } from '@/config/galleryAnimations';
import { ThumbnailStrip } from './ThumbnailStrip';
import { ExplorerOverlay } from './ExplorerOverlay';
import { FilterPills } from '../FilterPills';
import { Tooltip } from '@/components/ui/Tooltip';
import type { NFT, SortMode } from '@/types/nft';
import {
  formatPriceXCH,
  formatPriceUSD,
} from '@/utils/mockData';
import { getMintGardenNftUrl } from '@/services/marketApi';
import { fetchNFTOwnerByEdition, type NFTOwnerInfo } from '@/services/nftDataService';
import { useTraitRankings, type TooltipData } from '@/hooks/useTraitRankings';
import { useSalesHistory } from '@/hooks/useSalesHistory';
import { useXchPrice } from '@/hooks/data/useTreasuryData';
import {
  getCachedNFTBadges,
  getCachedBadgeSystem,
  preloadBadgeData,
  type NFTBadgeEntry,
  type BadgeSystem,
} from '@/services/badgeService';

// Sort helper types and functions
type SortBase = 'id' | 'rarity' | 'price';

function getSortBase(mode: SortMode): SortBase {
  if (mode.startsWith('id')) return 'id';
  if (mode.startsWith('rarity')) return 'rarity';
  return 'price';
}

function getSortDirection(mode: SortMode): 'asc' | 'desc' {
  return mode.endsWith('-desc') ? 'desc' : 'asc';
}

function toggleSortMode(currentMode: SortMode, base: SortBase): SortMode {
  const currentBase = getSortBase(currentMode);
  const currentDir = getSortDirection(currentMode);
  if (currentBase === base) {
    return `${base}-${currentDir === 'asc' ? 'desc' : 'asc'}` as SortMode;
  }
  return `${base}-asc` as SortMode;
}

function getTraitRarityClass(rarityPct: number): string {
  if (rarityPct < 5) return 'trait-gold';
  if (rarityPct < 15) return 'trait-purple';
  if (rarityPct < 30) return 'trait-blue';
  return '';
}

interface DesktopExplorerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type DetailTab = 'traits' | 'history';

const tabs: { id: DetailTab; label: string }[] = [
  { id: 'traits', label: 'Attributes' },
  { id: 'history', label: 'History' },
];

// Truncate wallet address (first 5 + last 4)
function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 5)}...${address.slice(-4)}`;
}

// Trait Ranking Tooltip Component
function TraitRankingTooltip({ data }: { data: TooltipData }) {
  return (
    <div
      className="p-3 rounded-lg min-w-[260px] max-w-[300px] font-mono text-sm"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div
        className="font-bold text-xs uppercase tracking-wide mb-2 pb-2"
        style={{
          color: 'var(--color-accent)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {data.category} Rarity
      </div>

      {/* Rarest bookend */}
      {data.rarest && (
        <>
          <TraitRankingRow entry={data.rarest} isCurrent={false} />
          <div
            className="text-center py-1 text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ...
          </div>
        </>
      )}

      {/* Context window */}
      {data.contextWindow.map((entry) => (
        <TraitRankingRow
          key={entry.rank}
          entry={entry}
          isCurrent={entry.trait === data.currentTrait}
        />
      ))}

      {/* Most common bookend */}
      {data.mostCommon && (
        <>
          <div
            className="text-center py-1 text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ...
          </div>
          <TraitRankingRow entry={data.mostCommon} isCurrent={false} />
        </>
      )}
    </div>
  );
}

// Individual row in the tooltip - table-like with fixed columns
function TraitRankingRow({
  entry,
  isCurrent,
}: {
  entry: { rank: number; trait: string; count: number };
  isCurrent: boolean;
}) {
  return (
    <div
      className="grid py-1.5 px-2 rounded-md"
      style={{
        gridTemplateColumns: '20px 36px 1fr 50px',
        gap: '4px',
        alignItems: 'center',
        background: isCurrent ? 'rgba(247, 147, 26, 0.3)' : 'transparent',
        border: isCurrent ? '2px solid var(--color-accent)' : '1px solid transparent',
        boxShadow: isCurrent ? '0 0 12px rgba(247, 147, 26, 0.4)' : 'none',
        margin: isCurrent ? '0 -2px' : '0',
      }}
    >
      {/* Arrow indicator column */}
      <span style={{ color: 'var(--color-accent)', textAlign: 'center' }}>
        {isCurrent ? '▶' : ''}
      </span>
      {/* Rank column */}
      <span
        className="text-right"
        style={{
          color: isCurrent ? 'var(--color-accent)' : 'var(--color-text-muted)',
          fontWeight: isCurrent ? 700 : 400,
        }}
      >
        #{entry.rank}
      </span>
      {/* Trait name column */}
      <span
        className="truncate"
        style={{
          color: isCurrent ? 'var(--color-accent)' : 'var(--color-text-primary)',
          fontWeight: isCurrent ? 700 : 400,
        }}
      >
        {entry.trait}
      </span>
      {/* Count column */}
      <span
        className="text-right"
        style={{
          color: isCurrent ? 'var(--color-accent)' : 'var(--color-text-muted)',
          fontWeight: isCurrent ? 700 : 400,
        }}
      >
        {entry.count}
      </span>
    </div>
  );
}

// Attribute Card Component with trait ranking
function AttributeCard({
  trait,
  getTooltipData,
}: {
  trait: NFT['traits'][0];
  getTooltipData: (category: string, traitValue: string) => TooltipData | null;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const handleMouseEnter = () => {
    const data = getTooltipData(trait.category, trait.value);
    setTooltipData(data);

    // Calculate fixed position based on card's position
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.bottom + 8, // 8px below the card
        left: rect.left,
      });
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  // Get rank info for display
  const rankInfo = tooltipData || getTooltipData(trait.category, trait.value);

  return (
    <div
      ref={cardRef}
      className={`trait-card p-3 ${getTraitRarityClass(trait.rarity)}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <p
        className="text-xs uppercase tracking-wide mb-1"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {trait.category}
      </p>
      {/* Trait value (left) + rank (right) on same row */}
      <div className="flex items-baseline justify-between gap-2">
        <p
          className="font-medium truncate"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {trait.value}
        </p>
        {rankInfo && (
          <span
            className="text-xs cursor-help whitespace-nowrap"
            style={{ color: 'var(--color-accent)', opacity: 0.8 }}
          >
            {rankInfo.currentRank}/{rankInfo.total}
          </span>
        )}
      </div>

      {/* Tooltip - fixed position, renders on top of everything */}
      <AnimatePresence>
        {showTooltip && tooltipData && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              zIndex: 9999,
            }}
          >
            <TraitRankingTooltip data={tooltipData} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Attributes Tab Content
function AttributesTab({
  nft,
  getTooltipData,
}: {
  nft: NFT;
  getTooltipData: (category: string, traitValue: string) => TooltipData | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {nft.traits.map((trait, index) => (
        <AttributeCard key={index} trait={trait} getTooltipData={getTooltipData} />
      ))}
    </div>
  );
}

// History Tab Content - Sales only
// Collection mint date (WFP minted Dec 2023)
const COLLECTION_MINT_DATE = new Date('2023-12-15T00:00:00Z').getTime();

function HistoryTab({ nftId }: { nftId: number }) {
  const { sales, isLoading } = useSalesHistory(nftId);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div
        className="py-12 text-center text-sm"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
      {/* Sales history */}
      {sales.map((sale) => (
        <div
          key={`${sale.nftId}-${sale.timestamp}`}
          className="flex items-center justify-between p-3 rounded-lg"
          style={{
            background: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div>
            <p
              className="font-medium text-sm"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Sold for {formatPriceXCH(sale.xchEquivalent)}
            </p>
            {sale.currency === 'CAT' && (
              <p
                className="text-xs mt-0.5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                (Paid in CAT: {sale.amount.toLocaleString()})
              </p>
            )}
          </div>
          <span
            className="text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {formatDate(sale.timestamp)}
          </span>
        </div>
      ))}

      {/* Mint entry - always shown */}
      <div
        className="flex items-center justify-between p-3 rounded-lg"
        style={{
          background: 'var(--color-bg-tertiary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <p
          className="font-medium text-sm"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Minted
        </p>
        <span
          className="text-xs"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {formatDate(COLLECTION_MINT_DATE)}
        </span>
      </div>
    </div>
  );
}

export function DesktopExplorerPanel({
  isOpen,
  onClose,
}: DesktopExplorerPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [, setDirection] = useState<'forward' | 'backward' | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('traits');
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  // Navigation arrows - show on hover
  const [isImageHovered, setIsImageHovered] = useState(false);

  // Owner info from MintGarden
  const [ownerInfo, setOwnerInfo] = useState<NFTOwnerInfo | null>(null);
  // Badge data
  const [badges, setBadges] = useState<NFTBadgeEntry | null>(null);
  const [badgeSystem, setBadgeSystem] = useState<BadgeSystem | null>(null);

  const {
    filteredNfts,
    currentNftIndex,
    currentNft,
    sortMode,
    filterMode,
    listedCount,
    navigateToNft,
    setSortMode,
    setFilterMode,
    shuffleToRandom,
  } = useGallery();

  // Trait rankings for attribute tooltips
  const { getTooltipData } = useTraitRankings();

  // XCH price for USD calculation
  const { data: xchPrice } = useXchPrice();
  const calculateUsd = (xch: number) => {
    const price = xchPrice ?? 5; // Fallback to $5 if not loaded
    return xch * price;
  };

  const { zIndex } = DESKTOP_LAYOUT;

  // Track navigation direction for image transitions
  const handleNavigate = useCallback(
    (newIndex: number) => {
      setDirection(newIndex > currentNftIndex ? 'forward' : 'backward');
      navigateToNft(newIndex);
    },
    [currentNftIndex, navigateToNft]
  );

  // Focus management
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  // Fetch owner info via MintGarden
  useEffect(() => {
    if (!currentNft || !isOpen) {
      queueMicrotask(() => setOwnerInfo(null));
      return;
    }

    // Reset owner info when NFT changes
    queueMicrotask(() => setOwnerInfo(null));

    const edition = currentNft.tokenId;
    fetchNFTOwnerByEdition(edition).then((info) => {
      setOwnerInfo(info);
    }).catch((err) => {
      console.error('[DesktopExplorerPanel] Error fetching owner:', err);
    });
  }, [currentNft, isOpen]);

  // Load badge data
  useEffect(() => {
    if (!currentNft || !isOpen) {
      queueMicrotask(() => setBadges(null));
      return;
    }

    preloadBadgeData().then(() => {
      const nftBadges = getCachedNFTBadges(currentNft.tokenId);
      const system = getCachedBadgeSystem();
      setBadges(nftBadges);
      setBadgeSystem(system);
    });
  }, [currentNft, isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          if (isImageExpanded) {
            setIsImageExpanded(false);
          } else {
            onClose();
          }
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          if (currentNftIndex > 0) {
            handleNavigate(currentNftIndex - 1);
          }
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          if (currentNftIndex < filteredNfts.length - 1) {
            handleNavigate(currentNftIndex + 1);
          }
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          shuffleToRandom();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isImageExpanded, currentNftIndex, filteredNfts.length, handleNavigate, shuffleToRandom, onClose]);

  // Navigation helpers
  const canGoPrev = currentNftIndex > 0;
  const canGoNext = currentNftIndex < filteredNfts.length - 1;

  const handlePrevious = useCallback(() => {
    if (canGoPrev) {
      handleNavigate(currentNftIndex - 1);
    }
  }, [canGoPrev, currentNftIndex, handleNavigate]);

  const handleNext = useCallback(() => {
    if (canGoNext) {
      handleNavigate(currentNftIndex + 1);
    }
  }, [canGoNext, currentNftIndex, handleNavigate]);

  // Open external link
  const handleOpenExternal = useCallback(() => {
    if (currentNft?.listing?.listingUrl) {
      window.open(currentNft.listing.listingUrl, '_blank', 'noopener,noreferrer');
    }
  }, [currentNft]);

  if (!currentNft) return null;

  return (
    <>
      {/* Overlay */}
      <ExplorerOverlay isVisible={isOpen} onClose={onClose} />

      {/* Main container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            className="fixed inset-0 flex items-center justify-center"
            style={{
              zIndex: zIndex.panel,
              padding: '32px',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="NFT Explorer"
            {...GALLERY_ANIMATIONS.lightbox.overlay}
          >
            {/* Flex container for thumbnails + lightbox */}
            <div className="flex items-center gap-6 max-h-[90vh]">
              {/* Thumbnail strip - outside lightbox */}
              <motion.div
                className="flex-shrink-0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                <ThumbnailStrip
                  nfts={filteredNfts}
                  currentIndex={currentNftIndex}
                  onIndexChange={handleNavigate}
                  visibleCount={9}
                />
              </motion.div>

              {/* Lightbox */}
              <motion.div
                className="relative flex rounded-2xl overflow-hidden"
                style={{
                  width: '1100px',
                  maxWidth: 'calc(100vw - 200px)',
                  height: '680px',
                  maxHeight: '90vh',
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                }}
                onClick={(e) => e.stopPropagation()}
                {...GALLERY_ANIMATIONS.lightbox.content}
              >
                {/* Left side - NFT Image + Price */}
                <div
                  className="relative flex flex-col px-6 pb-6"
                  style={{
                    width: '45%',
                    paddingTop: '80px',
                    background: 'var(--color-bg-tertiary)',
                  }}
                >
                  {/* NFT Image */}
                  <div
                    className={`relative w-full aspect-square rounded-xl overflow-hidden nft-explorer-image rarity-${currentNft.rarityTier}`}
                    onMouseEnter={() => setIsImageHovered(true)}
                    onMouseLeave={() => setIsImageHovered(false)}
                  >
                    <img
                      src={currentNft.imageUrl}
                      alt={currentNft.name}
                      className="w-full h-full object-cover"
                    />

                    {/* External link button */}
                    {currentNft.listing && (
                      <button
                        className="absolute bottom-3 right-3 w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
                        style={{
                          background: 'rgba(0, 0, 0, 0.5)',
                          color: 'white',
                        }}
                        onClick={handleOpenExternal}
                        aria-label="Open listing"
                      >
                        <ExternalLink size={18} />
                      </button>
                    )}

                    {/* Navigation arrows - appear on hover */}
                    <AnimatePresence>
                      {isImageHovered && (
                        <>
                          {/* Left arrow */}
                          {canGoPrev && (
                            <motion.button
                              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full cursor-pointer"
                              style={{
                                background: 'rgba(0, 0, 0, 0.6)',
                                color: 'white',
                                backdropFilter: 'blur(8px)',
                              }}
                              onClick={handlePrevious}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              whileHover={{ scale: 1.1, background: 'rgba(0, 0, 0, 0.8)' }}
                              whileTap={{ scale: 0.95 }}
                              aria-label="Previous NFT"
                            >
                              <ChevronLeft size={24} />
                            </motion.button>
                          )}

                          {/* Right arrow */}
                          {canGoNext && (
                            <motion.button
                              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full cursor-pointer"
                              style={{
                                background: 'rgba(0, 0, 0, 0.6)',
                                color: 'white',
                                backdropFilter: 'blur(8px)',
                              }}
                              onClick={handleNext}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              whileHover={{ scale: 1.1, background: 'rgba(0, 0, 0, 0.8)' }}
                              whileTap={{ scale: 0.95 }}
                              aria-label="Next NFT"
                            >
                              <ChevronRight size={24} />
                            </motion.button>
                          )}
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Price box - below image */}
                  <div
                    className="w-full p-4 rounded-xl mt-4"
                    style={{
                      background: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {currentNft.listing ? (
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-baseline gap-2">
                          <span
                            className="text-xl font-bold"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {formatPriceXCH(currentNft.listing.priceXCH)}
                          </span>
                          <span
                            className="text-sm"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            ≈ {formatPriceUSD(calculateUsd(currentNft.listing.priceXCH))}
                          </span>
                        </div>
                        <button
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
                          style={{
                            background: '#22c55e',
                            color: 'white',
                          }}
                          onClick={handleOpenExternal}
                        >
                          Buy
                        </button>
                      </div>
                    ) : (
                      <button
                        className="explorer-action-btn flex-1"
                        onClick={async () => {
                          const url = await getMintGardenNftUrl(Number(currentNft.tokenId));
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        <ExternalLink size={14} />
                        View on MintGarden
                      </button>
                    )}
                  </div>
                </div>

                {/* Right side - Details */}
                <div className="flex-1 flex flex-col p-6 overflow-hidden">
                  {/* Top bar - all in same row */}
                  <div className="absolute top-4 left-6 right-6 flex items-center z-10">
                    {/* Left: Filter pills + Expand + Shuffle + Sort buttons */}
                    <div className="flex items-center">
                      <FilterPills
                        activeFilter={filterMode}
                        onFilterChange={setFilterMode}
                        listedCount={listedCount}
                      />

                      {/* Expand button - with gap after filter pills */}
                      <Tooltip text="Expand">
                        <motion.button
                          className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors ml-4"
                          style={{
                            background: 'var(--color-glass-bg)',
                            color: 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border)',
                          }}
                          onClick={() => setIsImageExpanded(true)}
                          whileHover={{ background: 'var(--color-glass-hover)' }}
                          whileTap={{ scale: 0.95 }}
                          aria-label="Expand image"
                        >
                          <Expand size={18} />
                        </motion.button>
                      </Tooltip>

                      {/* Shuffle + Sort buttons - with larger gap */}
                      <div className="flex items-center gap-2 ml-4">
                        <Tooltip text="Shuffle">
                          <motion.button
                            className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
                            style={{
                              background: 'var(--color-glass-bg)',
                              color: 'var(--color-text-secondary)',
                              border: '1px solid var(--color-border)',
                            }}
                            onClick={shuffleToRandom}
                            whileHover={{ background: 'var(--color-glass-hover)' }}
                            whileTap={{ scale: 0.95 }}
                            aria-label="Shuffle to random NFT"
                          >
                            <Shuffle size={18} />
                          </motion.button>
                        </Tooltip>
                        <Tooltip text="Sort by ID">
                          <motion.button
                            className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
                            style={{
                              background: 'var(--color-glass-bg)',
                              color: getSortBase(sortMode) === 'id' ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                              border: getSortBase(sortMode) === 'id' ? '1px solid var(--color-brand-primary)' : '1px solid var(--color-border)',
                            }}
                            onClick={() => setSortMode(toggleSortMode(sortMode, 'id'))}
                            whileHover={{ background: 'var(--color-glass-hover)' }}
                            whileTap={{ scale: 0.95 }}
                            aria-label="Sort by ID"
                            aria-pressed={getSortBase(sortMode) === 'id'}
                          >
                            <div className="relative">
                              <Hash size={18} />
                              {getSortBase(sortMode) === 'id' && (
                                getSortDirection(sortMode) === 'asc' ? (
                                  <ChevronUp size={10} className="absolute -bottom-1 -right-1" style={{ color: 'var(--color-brand-primary)', strokeWidth: 3 }} />
                                ) : (
                                  <ChevronDown size={10} className="absolute -bottom-1 -right-1" style={{ color: 'var(--color-brand-primary)', strokeWidth: 3 }} />
                                )
                              )}
                            </div>
                          </motion.button>
                        </Tooltip>
                        <Tooltip text="Sort by rank">
                          <motion.button
                            className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
                            style={{
                              background: 'var(--color-glass-bg)',
                              color: getSortBase(sortMode) === 'rarity' ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                              border: getSortBase(sortMode) === 'rarity' ? '1px solid var(--color-brand-primary)' : '1px solid var(--color-border)',
                            }}
                            onClick={() => setSortMode(toggleSortMode(sortMode, 'rarity'))}
                            whileHover={{ background: 'var(--color-glass-hover)' }}
                            whileTap={{ scale: 0.95 }}
                            aria-label="Sort by rarity"
                            aria-pressed={getSortBase(sortMode) === 'rarity'}
                          >
                            <div className="relative">
                              <Crown size={18} />
                              {getSortBase(sortMode) === 'rarity' && (
                                getSortDirection(sortMode) === 'asc' ? (
                                  <ChevronUp size={10} className="absolute -bottom-1 -right-1" style={{ color: 'var(--color-brand-primary)', strokeWidth: 3 }} />
                                ) : (
                                  <ChevronDown size={10} className="absolute -bottom-1 -right-1" style={{ color: 'var(--color-brand-primary)', strokeWidth: 3 }} />
                                )
                              )}
                            </div>
                          </motion.button>
                        </Tooltip>
                        <Tooltip text="Sort by value">
                          <motion.button
                            className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
                            style={{
                              background: 'var(--color-glass-bg)',
                              color: getSortBase(sortMode) === 'price' ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                              border: getSortBase(sortMode) === 'price' ? '1px solid var(--color-brand-primary)' : '1px solid var(--color-border)',
                            }}
                            onClick={() => setSortMode(toggleSortMode(sortMode, 'price'))}
                            whileHover={{ background: 'var(--color-glass-hover)' }}
                            whileTap={{ scale: 0.95 }}
                            aria-label="Sort by price"
                            aria-pressed={getSortBase(sortMode) === 'price'}
                          >
                            <div className="relative">
                              <DollarSign size={18} />
                              {getSortBase(sortMode) === 'price' && (
                                getSortDirection(sortMode) === 'asc' ? (
                                  <ChevronUp size={10} className="absolute -bottom-1 -right-1" style={{ color: 'var(--color-brand-primary)', strokeWidth: 3 }} />
                                ) : (
                                  <ChevronDown size={10} className="absolute -bottom-1 -right-1" style={{ color: 'var(--color-brand-primary)', strokeWidth: 3 }} />
                                )
                              )}
                            </div>
                          </motion.button>
                        </Tooltip>
                      </div>
                    </div>

                  </div>

                  {/* NFT Info - in content flow, pulled up to align with top bar */}
                  <div className="flex items-center gap-3 mb-6" style={{ marginTop: '0px' }}>
                    {/* NFT Name - fixed width to prevent layout shift */}
                    <span
                      className="text-2xl font-bold"
                      style={{
                        color: 'var(--color-text-primary)',
                        minWidth: '180px',
                      }}
                    >
                      {currentNft.name}
                    </span>

                    {/* Crown + Rank - fixed width */}
                    <div
                      className="flex items-center gap-1"
                      style={{ minWidth: '70px' }}
                    >
                      <Crown
                        size={18}
                        style={{ color: 'var(--color-brand-primary)' }}
                      />
                      <span
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        #{currentNft.rarityRank}
                      </span>
                    </div>

                    {/* Divider */}
                    <span
                      className="text-sm"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      |
                    </span>

                    {/* Owner */}
                    <span
                      className="text-sm"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      Owned by:{' '}
                      {ownerInfo ? (
                        <a
                          href={ownerInfo.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer hover:underline transition-colors relative z-50"
                          style={{
                            color: 'var(--color-brand-primary)',
                            textDecoration: 'none',
                            pointerEvents: 'auto',
                          }}
                        >
                          {ownerInfo.name || truncateAddress(ownerInfo.address)}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>Loading...</span>
                      )}
                    </span>
                  </div>

                  {/* Badges */}
                  {badges && badges.badges.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {badges.badges.map((badge) => {
                        const def = badgeSystem?.badges[badge.badge];
                        return (
                          <span
                            key={badge.badge}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              background: 'var(--color-glass-bg)',
                              border: '1px solid var(--color-border)',
                              color: 'var(--color-text-secondary)',
                            }}
                          >
                            <span>{def?.emoji || '🏅'}</span>
                            <span>{badge.badge}</span>
                          </span>
                        );
                      })}
                      {badges.flags.includes('HOAMI Edition') && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: 'rgba(168, 85, 247, 0.2)',
                            border: '1px solid rgba(168, 85, 247, 0.5)',
                            color: '#a855f7',
                          }}
                        >
                          <span>💜</span>
                          <span>HOAMI</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Tabs */}
                  <div
                    className="flex gap-1 mb-4 p-1 rounded-lg"
                    style={{ background: 'var(--color-bg-tertiary)' }}
                  >
                    {tabs.map((tab) => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          className="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors"
                          style={{
                            background: isActive
                              ? 'var(--color-bg-secondary)'
                              : 'transparent',
                            color: isActive
                              ? 'var(--color-text-primary)'
                              : 'var(--color-text-muted)',
                            border: isActive
                              ? '1px solid var(--color-border)'
                              : '1px solid transparent',
                          }}
                          onClick={() => setActiveTab(tab.id)}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab content */}
                  <div className="flex-1 overflow-y-auto">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        {activeTab === 'traits' && <AttributesTab nft={currentNft} getTooltipData={getTooltipData} />}
                        {activeTab === 'history' && <HistoryTab nftId={Number(currentNft.tokenId)} />}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

              {/* Close button - outside lightbox to the right */}
              <motion.button
                ref={closeButtonRef}
                className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 self-start mt-4"
                style={{
                  background: 'var(--color-glass-bg)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
                onClick={onClose}
                whileHover={{ background: 'var(--color-glass-hover)', scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Close explorer"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                <X size={24} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen image overlay */}
      <AnimatePresence>
        {isImageExpanded && currentNft && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center"
            style={{
              zIndex: 200,
              background: 'rgba(0, 0, 0, 0.95)',
              cursor: 'zoom-out',
            }}
            onClick={() => setIsImageExpanded(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Close button */}
            <motion.button
              className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-xl transition-colors"
              style={{
                background: 'var(--color-glass-bg)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setIsImageExpanded(false);
              }}
              whileHover={{ background: 'var(--color-glass-hover)', scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Close fullscreen"
            >
              <Minimize2 size={24} />
            </motion.button>

            {/* NFT name */}
            <div
              className="absolute top-6 left-6 px-4 py-2 rounded-xl"
              style={{
                background: 'var(--color-glass-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <span
                className="font-bold text-lg"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {currentNft.name}
              </span>
            </div>

            {/* Fullscreen image */}
            <motion.img
              src={currentNft.imageUrl}
              alt={currentNft.name}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl"
              style={{
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              }}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default DesktopExplorerPanel;
