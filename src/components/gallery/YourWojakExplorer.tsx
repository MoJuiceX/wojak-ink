/**
 * YourWojakExplorer Component
 *
 * Full-featured lightbox for Your Wojak NFTs, matching the Wojak Farmers Plot explorer design.
 * - Thumbnail strip on the left
 * - NFT image on left with expand button
 * - NFT details on right with tabs
 */

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Expand,
  Minimize2,
  ExternalLink,
  Shuffle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// MintGarden NFT type from the collection listing
interface MintGardenNFT {
  id: string;
  encoded_id: string;
  name: string;
  description?: string;
  edition_number: number;
  edition_total: number;
  thumbnail_uri: string;
  collection_id: string;
  collection_name: string;
  owner_address_encoded_id?: string;
  minted_at: string;
}

// Full NFT detail from MintGarden API
interface MintGardenNFTDetail {
  id: string;
  encoded_id: string;
  data: {
    thumbnail_uri: string;
    preview_uri: string;
    data_uris: string[];
    metadata_json: {
      name: string;
      description: string;
      edition: number;
      edition_total: number;
      edition_number: number;
      attributes: Array<{
        trait_type: string;
        value: string;
      }>;
      collection: {
        name: string;
      };
    };
  };
  owner_address_encoded_id?: string;
  minted_at?: string;
}

interface YourWojakExplorerProps {
  isOpen: boolean;
  onClose: () => void;
  nfts: MintGardenNFT[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

type DetailTab = 'traits' | 'history';

const tabs: { id: DetailTab; label: string }[] = [
  { id: 'traits', label: 'Attributes' },
  { id: 'history', label: 'History' },
];

// Truncate wallet address
function truncateAddress(address: string): string {
  if (!address || address.length <= 10) return address || 'Unknown';
  return `${address.slice(0, 5)}...${address.slice(-4)}`;
}

// Fetch full NFT details from MintGarden
async function fetchNFTDetail(encodedId: string): Promise<MintGardenNFTDetail | null> {
  try {
    const isDev = import.meta.env.DEV;
    const basePath = isDev ? '/mintgarden-api' : '/api/mintgarden';
    const response = await fetch(`${basePath}/nfts/${encodedId}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) return null;
    return response.json();
  } catch (err) {
    console.error('[YourWojakExplorer] Error fetching NFT detail:', err);
    return null;
  }
}

// Thumbnail Strip Component for MintGarden NFTs
function YourWojakThumbnailStrip({
  nfts,
  currentIndex,
  onIndexChange,
  visibleCount = 9,
}: {
  nfts: MintGardenNFT[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  visibleCount?: number;
}) {
  const thumbnailSize = 56;
  const thumbnailGap = 8;

  // Calculate which thumbnails to show
  const visibleRange = useMemo(() => {
    const halfVisible = Math.floor(visibleCount / 2);
    let start = currentIndex - halfVisible;
    let end = currentIndex + halfVisible;

    if (start < 0) {
      start = 0;
      end = Math.min(visibleCount - 1, nfts.length - 1);
    }
    if (end >= nfts.length) {
      end = nfts.length - 1;
      start = Math.max(0, end - visibleCount + 1);
    }

    return { start, end };
  }, [currentIndex, visibleCount, nfts.length]);

  const visibleThumbnails = useMemo(() => {
    const items = [];
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      items.push({
        nft: nfts[i],
        index: i,
        distance: Math.abs(i - currentIndex),
      });
    }
    return items;
  }, [nfts, visibleRange, currentIndex]);

  const stripHeight = visibleCount * (thumbnailSize + thumbnailGap) - thumbnailGap;

  return (
    <div
      className="flex flex-col items-center"
      style={{ width: 80, padding: `${thumbnailGap}px` }}
    >
      <div className="relative" style={{ height: stripHeight }}>
        <AnimatePresence mode="popLayout">
          {visibleThumbnails.map(({ nft, index, distance }) => {
            const isCurrent = index === currentIndex;
            const isAdjacent = distance === 1;
            const isFar = distance >= 2;
            const opacity = isCurrent ? 1 : isAdjacent ? 0.85 : 0.5;
            const positionInList = index - visibleRange.start;
            const yPosition = positionInList * (thumbnailSize + thumbnailGap);

            return (
              <motion.button
                type="button"
                key={nft.encoded_id}
                className="absolute left-0 right-0 rounded-lg overflow-hidden focus:outline-none"
                style={{
                  width: thumbnailSize,
                  height: thumbnailSize,
                  border: isCurrent
                    ? '2px solid var(--color-primary)'
                    : '1px solid var(--color-border)',
                  boxShadow: isCurrent
                    ? '0 0 12px rgba(255, 107, 0, 0.4)'
                    : 'none',
                }}
                initial={{ opacity: 0, y: yPosition }}
                animate={{ opacity, y: yPosition, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                whileHover={{
                  opacity: isFar ? 0.8 : 1,
                  borderColor: isCurrent
                    ? 'var(--color-primary)'
                    : 'rgba(255, 107, 0, 0.5)',
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onIndexChange(index)}
              >
                <img
                  src={nft.thumbnail_uri || `https://assets.mintgarden.io/thumbnails/medium/${nft.encoded_id}.png`}
                  alt={nft.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  draggable={false}
                />
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Attribute Card Component
function AttributeCard({ trait }: { trait: { trait_type: string; value: string } }) {
  return (
    <div
      className="trait-card p-3"
      style={{
        background: 'var(--color-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: '10px',
      }}
    >
      <p className="text-xs uppercase tracking-wide mb-1 text-muted">
        {trait.trait_type}
      </p>
      <p className="font-medium text-primary">
        {trait.value}
      </p>
    </div>
  );
}

// Attributes Tab Content
function AttributesTab({ attributes }: { attributes: Array<{ trait_type: string; value: string }> }) {
  if (!attributes || attributes.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted">
        No attributes found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {attributes.map((trait, index) => (
        <AttributeCard key={index} trait={trait} />
      ))}
    </div>
  );
}

// History Tab Content
function HistoryTab({ mintedAt }: { mintedAt: string }) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-2">
      <div
        className="flex items-center justify-between p-3 rounded-lg"
        style={{
          background: 'var(--color-elevated)',
          border: '1px solid var(--color-border)',
        }}
      >
        <p className="font-medium text-sm text-primary">Minted</p>
        <span className="text-xs text-muted">
          {formatDate(mintedAt)}
        </span>
      </div>
    </div>
  );
}

export function YourWojakExplorer({
  isOpen,
  onClose,
  nfts,
  currentIndex,
  onIndexChange,
}: YourWojakExplorerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('traits');
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [isImageHovered, setIsImageHovered] = useState(false);

  const currentNft = nfts[currentIndex] || null;

  // Fetch full NFT details for attributes
  const { data: nftDetail } = useQuery({
    queryKey: ['your-wojak-detail', currentNft?.encoded_id],
    queryFn: () => currentNft ? fetchNFTDetail(currentNft.encoded_id) : null,
    enabled: isOpen && !!currentNft?.encoded_id,
    staleTime: 300000, // 5 minutes
  });

  const attributes = nftDetail?.data?.metadata_json?.attributes || [];
  const ownerAddress = nftDetail?.owner_address_encoded_id || currentNft?.owner_address_encoded_id;

  // Navigation helpers
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < nfts.length - 1;

  const handlePrevious = useCallback(() => {
    if (canGoPrev) {
      onIndexChange(currentIndex - 1);
    }
  }, [canGoPrev, currentIndex, onIndexChange]);

  const handleNext = useCallback(() => {
    if (canGoNext) {
      onIndexChange(currentIndex + 1);
    }
  }, [canGoNext, currentIndex, onIndexChange]);

  const shuffleToRandom = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * nfts.length);
    onIndexChange(randomIndex);
  }, [nfts.length, onIndexChange]);

  // Focus management
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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
          handlePrevious();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          handleNext();
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
  }, [isOpen, isImageExpanded, handlePrevious, handleNext, shuffleToRandom, onClose]);

  if (!currentNft) return null;

  const imageUrl = currentNft.thumbnail_uri || `https://assets.mintgarden.io/thumbnails/medium/${currentNft.encoded_id}.png`;

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0"
            style={{
              zIndex: 100,
              background: 'rgba(10, 10, 15, 0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Main container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: 110, padding: '32px' }}
            role="dialog"
            aria-modal="true"
            aria-label="NFT Explorer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Flex container for thumbnails + lightbox */}
            <div className="flex items-center gap-6 max-h-[90vh]">
              {/* Thumbnail strip */}
              <motion.div
                className="flex-shrink-0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                <YourWojakThumbnailStrip
                  nfts={nfts}
                  currentIndex={currentIndex}
                  onIndexChange={onIndexChange}
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
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                }}
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                {/* Left side - NFT Image + Action */}
                <div
                  className="relative flex flex-col px-6 pb-6"
                  style={{
                    width: '45%',
                    paddingTop: '80px',
                    background: 'var(--color-elevated)',
                  }}
                >
                  {/* NFT Image */}
                  <div
                    className="relative w-full aspect-square rounded-xl overflow-hidden"
                    style={{
                      border: '1px solid var(--color-border)',
                    }}
                    onMouseEnter={() => setIsImageHovered(true)}
                    onMouseLeave={() => setIsImageHovered(false)}
                  >
                    <img
                      src={imageUrl}
                      alt={currentNft.name}
                      className="w-full h-full object-cover"
                    />

                    {/* External link button */}
                    <button
                      type="button"
                      className="absolute bottom-3 right-3 w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
                      style={{
                        background: 'rgba(0, 0, 0, 0.5)',
                        color: 'white',
                      }}
                      onClick={() => window.open(`https://mintgarden.io/nfts/${currentNft.encoded_id}`, '_blank')}
                      aria-label="Open on MintGarden"
                    >
                      <ExternalLink size={18} />
                    </button>

                    {/* Navigation arrows */}
                    <AnimatePresence>
                      {isImageHovered && (
                        <>
                          {canGoPrev && (
                            <motion.button
                              type="button"
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
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              aria-label="Previous NFT"
                            >
                              <ChevronLeft size={24} />
                            </motion.button>
                          )}
                          {canGoNext && (
                            <motion.button
                              type="button"
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
                              whileHover={{ scale: 1.1 }}
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

                  {/* Action button - below image */}
                  <button
                    type="button"
                    className="w-full py-3 px-4 rounded-xl mt-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 hover:opacity-80"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                    onClick={() => window.open(`https://mintgarden.io/nfts/${currentNft.encoded_id}`, '_blank')}
                  >
                    <ExternalLink size={14} />
                    View on MintGarden
                  </button>
                </div>

                {/* Right side - Details */}
                <div className="flex-1 flex flex-col p-6 overflow-hidden">
                  {/* Top bar */}
                  <div className="absolute top-4 left-6 right-6 flex items-center z-10">
                    <div className="flex items-center gap-2">
                      {/* Expand button */}
                      <motion.button
                        type="button"
                        className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors text-secondary"
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                        }}
                        onClick={() => setIsImageExpanded(true)}
                        whileHover={{ background: 'var(--color-surface-hover)' }}
                        whileTap={{ scale: 0.95 }}
                        aria-label="Expand image"
                        title="Expand"
                      >
                        <Expand size={18} />
                      </motion.button>

                      {/* Shuffle button */}
                      <motion.button
                        type="button"
                        className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors text-secondary"
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                        }}
                        onClick={shuffleToRandom}
                        whileHover={{ background: 'var(--color-surface-hover)' }}
                        whileTap={{ scale: 0.95 }}
                        aria-label="Shuffle to random NFT"
                        title="Shuffle"
                      >
                        <Shuffle size={18} />
                      </motion.button>
                    </div>
                  </div>

                  {/* NFT Info */}
                  <div className="flex items-center gap-3 mb-6">
                    {/* NFT Name */}
                    <span
                      className="text-2xl font-bold text-primary"
                      style={{ minWidth: '180px' }}
                    >
                      {currentNft.name}
                    </span>

                    {/* Edition info */}
                    <span className="text-sm text-muted">
                      Edition #{currentNft.edition_number} of {currentNft.edition_total}
                    </span>

                    {/* Divider */}
                    <span className="text-sm text-muted">|</span>

                    {/* Owner */}
                    <span className="text-sm text-muted">
                      Owned by:{' '}
                      {ownerAddress ? (
                        <a
                          href={`https://mintgarden.io/address/${ownerAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer hover:underline text-accent"
                        >
                          {truncateAddress(ownerAddress)}
                        </a>
                      ) : (
                        <span className="text-muted">Loading...</span>
                      )}
                    </span>
                  </div>

                  {/* Tabs */}
                  <div
                    className="flex gap-1 mb-4 p-1 rounded-lg"
                    style={{ background: 'var(--color-elevated)' }}
                  >
                    {tabs.map((tab) => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          className="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors"
                          style={{
                            background: isActive
                              ? 'var(--color-surface)'
                              : 'transparent',
                            color: isActive
                              ? 'var(--color-text)'
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
                        {activeTab === 'traits' && <AttributesTab attributes={attributes} />}
                        {activeTab === 'history' && <HistoryTab mintedAt={currentNft.minted_at} />}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

              {/* Close button - outside lightbox to the right */}
              <motion.button
                ref={closeButtonRef}
                type="button"
                className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl transition-colors focus:outline-none self-start mt-4 text-secondary"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
                onClick={onClose}
                whileHover={{ background: 'var(--color-surface-hover)', scale: 1.05 }}
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
              type="button"
              className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-xl transition-colors text-secondary"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setIsImageExpanded(false);
              }}
              whileHover={{ background: 'var(--color-surface-hover)', scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Close fullscreen"
            >
              <Minimize2 size={24} />
            </motion.button>

            {/* NFT name */}
            <div
              className="absolute top-6 left-6 px-4 py-2 rounded-xl"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <span className="font-bold text-lg text-primary">
                {currentNft.name}
              </span>
            </div>

            {/* Fullscreen image */}
            <motion.img
              src={imageUrl}
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

export default YourWojakExplorer;
