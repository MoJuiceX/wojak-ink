/**
 * NFTInfoCard Component
 *
 * Tabbed info card showing NFT details: Main, Metadata, History.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, ExternalLink } from 'lucide-react';
import type { NFT } from '@/types/nft';
import {
  formatPriceXCH,
  formatPriceUSD,
} from '@/utils/mockData';
import { getMintGardenNftUrl } from '@/services/marketApi';
import { useTraitRankings, type TooltipData } from '@/hooks/useTraitRankings';
import { fetchNFTOwnerByEdition, type NFTOwnerInfo } from '@/services/nftDataService';
import { useSalesHistory } from '@/hooks/useSalesHistory';
import { useXchPrice } from '@/hooks/data/useTreasuryData';
import {
  getCachedNFTBadges,
  getCachedBadgeSystem,
  preloadBadgeData,
  type NFTBadgeEntry,
  type BadgeSystem,
} from '@/services/badgeService';
import { FighterStatsPanel } from '@/components/combat/FighterStatsPanel';

type InfoTab = 'main' | 'metadata' | 'combat' | 'history';

interface NFTInfoCardProps {
  nft: NFT;
  activeTab: InfoTab;
  onTabChange: (tab: InfoTab) => void;
  onOpenExternal: () => void;
}

const tabs: { id: InfoTab; label: string }[] = [
  { id: 'main', label: 'Main' },
  { id: 'metadata', label: 'Attributes' },
  { id: 'combat', label: 'Combat' },
  { id: 'history', label: 'History' },
];

// Truncate wallet address
function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 5)}...${address.slice(-4)}`;
}

function getTraitRarityClass(rarityPct: number): string {
  if (rarityPct < 5) return 'trait-gold';
  if (rarityPct < 15) return 'trait-purple';
  if (rarityPct < 30) return 'trait-blue';
  return '';
}

function MainTabContent({
  nft,
  ownerInfo,
  onOpenExternal,
  badges,
  badgeSystem,
}: {
  nft: NFT;
  ownerInfo: NFTOwnerInfo | null;
  onOpenExternal: () => void;
  badges: NFTBadgeEntry | null;
  badgeSystem: BadgeSystem | null;
}) {
  const { data: xchPrice } = useXchPrice();

  // Calculate USD from XCH using real price
  const calculateUsd = (xch: number) => {
    const price = xchPrice ?? 5; // Fallback to $5 if not loaded
    return xch * price;
  };

  return (
    <div className="space-y-3">
      {/* Name and rank - like desktop */}
      <div className="flex items-center gap-2 flex-wrap">
        <h2
          className="text-lg font-bold text-primary"
        >
          {nft.name}
        </h2>
        <div className="flex items-center gap-1">
          <Crown size={16} className="text-accent" />
          <span
            className="text-sm font-medium text-secondary"
          >
            #{nft.rarityRank}
          </span>
        </div>
      </div>

      {/* Badges */}
      {badges && badges.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {badges.badges.map((badge) => {
            const def = badgeSystem?.badges[badge.badge];
            return (
              <span
                key={badge.badge}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-secondary"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
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

      {/* Owner */}
      <p className="text-sm text-muted">
        Owned by:{' '}
        {ownerInfo ? (
          <a
            href={ownerInfo.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline text-accent"
          >
            {ownerInfo.name || truncateAddress(ownerInfo.address)}
          </a>
        ) : (
          <span>Loading...</span>
        )}
      </p>

      {/* Price & Actions */}
      {nft.listing ? (
        <>
          <div className="flex items-baseline gap-2">
            <p
              className="text-xl font-bold text-primary"
            >
              {formatPriceXCH(nft.listing.priceXCH)}
            </p>
            <p
              className="text-sm text-muted"
            >
              ≈ {formatPriceUSD(calculateUsd(nft.listing.priceXCH))}
            </p>
          </div>
          <motion.button
            type="button"
            className="w-full flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: '#22c55e',
              color: 'white',
            }}
            onClick={onOpenExternal}
            whileTap={{ scale: 0.98 }}
          >
            Buy on {nft.listing.marketplace === 'mintgarden' ? 'MintGarden' : nft.listing.marketplace}
          </motion.button>
        </>
      ) : (
        <button
          type="button"
          className="explorer-action-btn flex-1"
          onClick={async () => {
            const url = await getMintGardenNftUrl(Number(nft.tokenId));
            window.open(url, '_blank', 'noopener,noreferrer');
          }}
        >
          <ExternalLink size={14} />
          View on MintGarden
        </button>
      )}
    </div>
  );
}

// Trait Ranking Row in popup - table-like with fixed columns
function TraitRankingRow({
  entry,
  isCurrent,
}: {
  entry: { rank: number; trait: string; count: number };
  isCurrent: boolean;
}) {
  return (
    <div
      className="grid py-1.5 px-2 rounded-md text-sm"
      style={{
        gridTemplateColumns: '18px 32px 1fr 44px',
        gap: '4px',
        alignItems: 'center',
        background: isCurrent ? 'rgba(247, 147, 26, 0.3)' : 'transparent',
        border: isCurrent ? '2px solid var(--color-accent)' : '1px solid transparent',
        boxShadow: isCurrent ? '0 0 12px rgba(247, 147, 26, 0.4)' : 'none',
        margin: isCurrent ? '0 -2px' : '0',
      }}
    >
      {/* Arrow indicator column */}
      <span className="text-xs text-accent" style={{ textAlign: 'center' }}>
        {isCurrent ? '▶' : ''}
      </span>
      {/* Rank column */}
      <span
        className="text-right text-xs"
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
          color: isCurrent ? 'var(--color-accent)' : 'var(--color-text)',
          fontWeight: isCurrent ? 700 : 400,
        }}
      >
        {entry.trait}
      </span>
      {/* Count column */}
      <span
        className="text-right text-xs"
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

// Trait Ranking Popup for mobile
function TraitRankingPopup({
  data,
  onClose,
}: {
  data: TooltipData;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[150] flex items-center justify-center px-4"
      style={{ background: 'var(--color-black-70)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-xs rounded-xl overflow-hidden"
        style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 8px 32px var(--color-black-40)',
        }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <span
            className="font-bold text-sm uppercase tracking-wide text-accent"
          >
            {data.category} Rarity
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted"
            aria-label="Close trait ranking"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 font-mono text-sm max-h-[50vh] overflow-y-auto">
          {/* Rarest bookend */}
          {data.rarest && (
            <>
              <TraitRankingRow entry={data.rarest} isCurrent={false} />
              <div
                className="text-center py-1 text-xs text-muted"
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
                className="text-center py-1 text-xs text-muted"
              >
                ...
              </div>
              <TraitRankingRow entry={data.mostCommon} isCurrent={false} />
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function MetadataTabContent({ nft }: { nft: NFT }) {
  const { getTooltipData } = useTraitRankings();
  const [selectedTrait, setSelectedTrait] = useState<TooltipData | null>(null);

  const handleTraitTap = (category: string, value: string) => {
    const data = getTooltipData(category, value);
    if (data) {
      setSelectedTrait(data);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {nft.traits.map((trait, index) => {
          const rankData = getTooltipData(trait.category, trait.value);

          return (
            <div
              key={index}
              className={`trait-card p-3 ${getTraitRarityClass(trait.rarity)}`}
            >
              {/* Category label */}
              <p
                className="text-xs uppercase tracking-wide mb-1 text-muted"
              >
                {trait.category}
              </p>
              {/* Value + Rank */}
              <div className="flex items-baseline justify-between gap-1">
                <p
                  className="text-sm font-medium truncate text-primary"
                >
                  {trait.value}
                </p>
                {rankData && (
                  <button
                    type="button"
                    onClick={() => handleTraitTap(trait.category, trait.value)}
                    className="text-xs px-1.5 py-0.5 rounded active:opacity-70 whitespace-nowrap"
                    style={{
                      background: 'rgba(247, 147, 26, 0.15)',
                      color: 'var(--color-accent)',
                      opacity: 0.8,
                    }}
                    aria-label={`View ${trait.category} trait rankings`}
                  >
                    {rankData.currentRank}/{rankData.total}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Trait ranking popup */}
      <AnimatePresence>
        {selectedTrait && (
          <TraitRankingPopup
            data={selectedTrait}
            onClose={() => setSelectedTrait(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Collection mint date (WFP minted Dec 2023)
const COLLECTION_MINT_DATE = new Date('2023-12-15T00:00:00Z').getTime();

function HistoryTabContent({ nftId }: { nftId: number }) {
  const { sales, isLoading } = useSalesHistory(nftId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset scroll position on mount and when content loads
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, []); // Run on mount

  useEffect(() => {
    if (!isLoading && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [isLoading]);

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
        className="py-8 text-center text-sm text-muted"
      >
        Loading...
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="space-y-1 max-h-48 overflow-y-auto">
      {/* Mint entry - always shown at top */}
      <div
        className="py-2"
        style={{
          borderBottom: sales.length > 0 ? '1px solid var(--color-border)' : 'none',
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-sm font-medium text-primary"
          >
            Minted
          </span>
          <span
            className="text-xs text-muted"
          >
            {formatDate(COLLECTION_MINT_DATE)}
          </span>
        </div>
      </div>

      {/* Sales history - chronological (newest first) */}
      {sales.map((sale) => (
        <div
          key={`${sale.nftId}-${sale.timestamp}`}
          className="py-2"
          style={{
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-sm font-medium text-primary"
            >
              Sold for {formatPriceXCH(sale.xchEquivalent)}
            </span>
            <span
              className="text-xs text-muted"
            >
              {formatDate(sale.timestamp)}
            </span>
          </div>
          {sale.currency === 'CAT' && (
            <p
              className="text-xs mt-0.5 text-muted"
            >
              (Paid in CAT: {sale.amount.toLocaleString()})
            </p>
          )}
        </div>
      ))}

      {/* No sales message */}
      {sales.length === 0 && (
        <p
          className="py-2 text-sm text-muted"
        >
          No sales history
        </p>
      )}
    </div>
  );
}

export function NFTInfoCard({
  nft,
  activeTab,
  onTabChange,
  onOpenExternal,
}: NFTInfoCardProps) {
  // Fetch owner info via MintGarden
  const [ownerInfo, setOwnerInfo] = useState<NFTOwnerInfo | null>(null);
  // Badge data
  const [badges, setBadges] = useState<NFTBadgeEntry | null>(null);
  const [badgeSystem, setBadgeSystem] = useState<BadgeSystem | null>(null);

  useEffect(() => {
    queueMicrotask(() => setOwnerInfo(null));
    const edition = nft.tokenId;
    fetchNFTOwnerByEdition(edition)
      .then((info) => setOwnerInfo(info))
      .catch((err) => console.error('[NFTInfoCard] Error fetching owner:', err));
  }, [nft.tokenId]);

  // Load badge data
  useEffect(() => {
    // Ensure badge data is preloaded
    preloadBadgeData().then(() => {
      const nftBadges = getCachedNFTBadges(nft.tokenId);
      const system = getCachedBadgeSystem();
      setBadges(nftBadges);
      setBadgeSystem(system);
    });
  }, [nft.tokenId]);

  return (
    <div
      className="card-static rounded-xl overflow-hidden"
    >
      {/* Tab bar */}
      <div
        className="relative flex"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              type="button"
              key={tab.id}
              className="flex-1 py-3 text-sm font-medium transition-colors relative"
              style={{
                color: isActive
                  ? 'var(--color-primary)'
                  : 'var(--color-text-muted)',
              }}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}

              {/* Active indicator */}
              {isActive && (
                <motion.div
                  className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
                  style={{
                    background: 'var(--color-primary)',
                  }}
                  layoutId="tab-indicator"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="p-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            {activeTab === 'main' && (
              <MainTabContent
                nft={nft}
                ownerInfo={ownerInfo}
                onOpenExternal={onOpenExternal}
                badges={badges}
                badgeSystem={badgeSystem}
              />
            )}
            {activeTab === 'metadata' && <MetadataTabContent nft={nft} />}
            {activeTab === 'combat' && (
              <FighterStatsPanel edition={Number(nft.tokenId)} />
            )}
            {activeTab === 'history' && <HistoryTabContent nftId={Number(nft.tokenId)} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default NFTInfoCard;
