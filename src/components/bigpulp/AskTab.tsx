/**
 * AskTab Component
 *
 * Collection stats and expandable info sections.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown, BookOpen, Gem, Trophy, BarChart3, Award } from 'lucide-react';
import { useXchPrice } from '@/hooks/data/useTreasuryData';
import {
  loadBadgeSystem,
  loadBadgeMapping,
  type BadgeSystem,
  type BadgeMapping,
  type NFTBadgeInfo,
} from '@/services/badgeService';
import { useBigPulp } from '@/contexts/BigPulpContext';
import { getNftImageUrl } from '@/services/constants';
import type {
  MarketStats,
  AttributeStats,
  NFTSale,
} from '@/types/bigpulp';
import {
  statsCardVariants,
  statsContainerVariants,
  accordionVariants,
  accordionTransition,
  accordionArrowVariants,
  tabContentVariants,
} from '@/config/bigpulpAnimations';
import { QuickPrompts } from './QuickPrompts';
import { useContextualPrompts } from '@/hooks/useContextualPrompts';

interface AskTabProps {
  stats: MarketStats | null;
  topAttributes: AttributeStats[];
  topSales: NFTSale[];
  isLoading?: boolean;
}

type SectionId = 'provenance' | 'attributes' | 'sales' | 'badges';

interface SectionConfig {
  id: SectionId;
  icon: React.ElementType;
  title: string;
}

const SECTIONS: SectionConfig[] = [
  { id: 'provenance', icon: BookOpen, title: 'Learn Provenance' },
  { id: 'attributes', icon: Gem, title: 'Top 10 Valuable Attributes' },
  { id: 'sales', icon: Trophy, title: 'Top 10 Highest Sales' },
  { id: 'badges', icon: Award, title: 'Badge Gallery' },
];

function StatCard({
  label,
  value,
  subValue,
  usdValue,
}: {
  label: string;
  value: string;
  subValue?: string;
  usdValue?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="p-1.5 sm:p-3 rounded-lg sm:rounded-xl text-center flex flex-col items-center justify-center"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
      variants={prefersReducedMotion ? undefined : statsCardVariants}
      whileHover="hover"
    >
      <p
        className="text-xs sm:text-base font-bold whitespace-nowrap"
        style={{ color: 'var(--color-brand-primary)' }}
      >
        {value}
        {subValue && (
          <span
            className="text-[10px] sm:text-xs font-medium ml-0.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {subValue}
          </span>
        )}
        {usdValue && (
          <span
            className="text-[10px] sm:text-xs font-medium ml-0.5 sm:ml-1 hidden sm:inline"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ({usdValue})
          </span>
        )}
      </p>
      <p className="text-[10px] sm:text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </p>
    </motion.div>
  );
}

function ExpandableSection({
  section,
  isExpanded,
  onToggle,
  children,
}: {
  section: SectionConfig;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const prefersReducedMotion = useReducedMotion();
  const Icon = section.icon;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <button
        className="w-full flex items-center justify-between p-3 sm:p-4 text-left transition-colors"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={`section-${section.id}`}
        style={{
          background: isExpanded ? 'var(--color-surface-hover)' : 'transparent',
        }}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <Icon
            size={16}
            className="sm:w-[18px] sm:h-[18px]"
            style={{ color: 'var(--color-brand-primary)' }}
          />
          <span
            className="font-medium text-sm"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {section.title}
          </span>
        </div>
        <motion.div
          variants={prefersReducedMotion ? undefined : accordionArrowVariants}
          animate={isExpanded ? 'expanded' : 'collapsed'}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown
            size={18}
            style={{ color: 'var(--color-text-muted)' }}
          />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={`section-${section.id}`}
            role="region"
            aria-labelledby={`section-${section.id}-header`}
            variants={prefersReducedMotion ? undefined : accordionVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            transition={accordionTransition}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="p-3 sm:p-4 pt-0"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProvenanceContent() {
  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          className="p-3 rounded-lg"
          style={{ background: 'var(--color-bg-tertiary)' }}
        >
          <h4
            className="text-sm font-bold mb-2"
            style={{ color: 'var(--color-brand-primary)' }}
          >
            High Provenance
          </h4>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            These aren't necessarily the rarest attributes, but they're the most valuable. The community has spoken — Crown, Military Beret, Wizard Hat, Fedora, and Neckbeard command premium prices because of their cultural significance and meme status.
          </p>
        </div>

        <div
          className="p-3 rounded-lg"
          style={{ background: 'var(--color-bg-tertiary)' }}
        >
          <h4
            className="text-sm font-bold mb-2"
            style={{ color: 'var(--color-brand-primary)' }}
          >
            Rarest Attributes
          </h4>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            The scarcest attributes in the collection. Piccolo Turban, Piccolo Uniform, Fake It Mask, El Presidente, and Goose Suit are among the rarest pieces you can find. These dominate the top rankings.
          </p>
        </div>

        <div
          className="p-3 rounded-lg"
          style={{ background: 'var(--color-bg-tertiary)' }}
        >
          <h4
            className="text-sm font-bold mb-2"
            style={{ color: 'var(--color-brand-primary)' }}
          >
            Bases
          </h4>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Monkey Zoo represents the OG ape heritage from the early grove — primal energy meets Wojak culture. Papa Tang is the founder energy, the king of the grove himself, inspired by Tales of the Grove and WMC creator lore.
          </p>
        </div>

        <div
          className="p-3 rounded-lg"
          style={{ background: 'var(--color-bg-tertiary)' }}
        >
          <h4
            className="text-sm font-bold mb-2"
            style={{ color: 'var(--color-brand-primary)' }}
          >
            Named Combos
          </h4>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            The artist crafted these matching sets with intention. Ronin Helmet pairs with Ronin clothes and Ronin Dojo background. Wizard Hat matches Wizard Drip and Wizard Glasses. These aren't random — they're designed to work together as complete transformations.
          </p>
        </div>
      </div>
    </div>
  );
}

function TopAttributesContent({ attributes }: { attributes: AttributeStats[] }) {
  // Only include attributes with actual sales, sorted by average price
  const topTen = attributes
    .filter(a => a.totalSales > 0 && a.avgPrice > 0)
    .sort((a, b) => b.avgPrice - a.avgPrice)
    .slice(0, 10);

  if (topTen.length === 0) {
    return (
      <div className="pt-4 text-center">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          No trade data available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
        Attributes with highest average sale prices
      </p>
      <div className="space-y-2">
        {topTen.map((attr, index) => (
          <div
            key={`${attr.category}-${attr.value}`}
            className="flex items-center justify-between p-2 rounded-lg"
            style={{ background: 'var(--color-bg-tertiary)' }}
          >
            <div className="flex items-center gap-3">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: index < 3 ? '#fbbf24' : 'var(--color-brand-primary)',
                  color: index < 3 ? '#1a1a1a' : 'white',
                }}
              >
                {index + 1}
              </span>
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {attr.value}
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {attr.category} • {attr.totalSales} sales
                </p>
              </div>
            </div>
            <div className="text-right">
              <p
                className="text-sm font-medium"
                style={{ color: 'var(--color-brand-primary)' }}
              >
                {attr.avgPrice.toFixed(2)} XCH
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                avg price
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopSalesContent({ sales, isLoading }: { sales: NFTSale[]; isLoading?: boolean }) {
  const formatDate = useCallback((date: Date) => {
    const diff = Date.now() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
  }, []);

  if (isLoading) {
    return (
      <div className="pt-4">
        <div className="space-y-2">
          {/* Skeleton loading state */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-2 rounded-lg animate-pulse"
              style={{ background: 'var(--color-bg-tertiary)' }}
            >
              <div
                className="w-6 h-6 rounded-full flex-shrink-0"
                style={{ background: 'var(--color-surface-hover)' }}
              />
              <div
                className="w-10 h-10 rounded-lg flex-shrink-0"
                style={{ background: 'var(--color-surface-hover)' }}
              />
              <div className="flex-1 space-y-2">
                <div
                  className="h-4 w-24 rounded"
                  style={{ background: 'var(--color-surface-hover)' }}
                />
                <div
                  className="h-3 w-16 rounded"
                  style={{ background: 'var(--color-surface-hover)' }}
                />
              </div>
              <div className="text-right space-y-2">
                <div
                  className="h-4 w-16 rounded ml-auto"
                  style={{ background: 'var(--color-surface-hover)' }}
                />
                <div
                  className="h-3 w-12 rounded ml-auto"
                  style={{ background: 'var(--color-surface-hover)' }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-center mt-3" style={{ color: 'var(--color-text-muted)' }}>
          Loading sales data...
        </p>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          No sales data available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="space-y-2">
        {sales.slice(0, 10).map((sale, index) => (
          <div
            key={`${sale.nft.id}-${index}`}
            className="flex items-center gap-3 p-2 rounded-lg"
            style={{ background: 'var(--color-bg-tertiary)' }}
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: index < 3 ? '#fbbf24' : 'var(--color-surface-hover)',
                color: index < 3 ? '#1a1a1a' : 'var(--color-text-secondary)',
              }}
            >
              {index + 1}
            </span>
            <div
              className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden"
              style={{ background: 'var(--color-surface-hover)' }}
            >
              <img
                src={sale.nft.imageUrl}
                alt={sale.nft.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium truncate"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {sale.nft.name}
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {formatDate(sale.date)}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p
                className="text-sm font-bold"
                style={{ color: 'var(--color-brand-primary)' }}
              >
                {sale.price.toFixed(1)} XCH
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                ${sale.priceUSD.toFixed(0)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Metadata entry type
interface MetadataEntry {
  edition: number;
  open_rarity_rank: number;
  attributes: Array<{ trait_type: string; value: string }>;
}

// Helper to get NFT name from metadata (matches bigpulpService.ts format)
function getNftName(edition: number, metadata: MetadataEntry[]): string {
  const paddedId = String(edition).padStart(4, '0');
  const nftMetadata = metadata.find(m => m.edition === edition);

  if (nftMetadata) {
    const baseAttr = nftMetadata.attributes.find(a => a.trait_type === 'Base');
    if (baseAttr) {
      return `${baseAttr.value} #${paddedId}`;
    }
  }

  // Fallback to generic name if metadata not found
  return `Wojak #${paddedId}`;
}

// Hook to load NFT metadata for ranks and names
function useNftMetadata(): {
  ranks: Record<string, number>;
  names: Record<string, string>;
  metadata: MetadataEntry[];
} {
  const [data, setData] = useState<{
    ranks: Record<string, number>;
    names: Record<string, string>;
    metadata: MetadataEntry[];
  }>({
    ranks: {},
    names: {},
    metadata: [],
  });

  useEffect(() => {
    fetch('/assets/nft-data/metadata.json')
      .then(res => res.json())
      .then((metadata: MetadataEntry[]) => {
        const ranks: Record<string, number> = {};
        const names: Record<string, string> = {};
        for (const nft of metadata) {
          const id = String(nft.edition);
          ranks[id] = nft.open_rarity_rank;
          names[id] = getNftName(nft.edition, metadata);
        }
        setData({ ranks, names, metadata });
      })
      .catch(err => console.error('Failed to load NFT metadata:', err));
  }, []);

  return data;
}

interface NFTWithBadgeInfo {
  id: string;
  qualification: NFTBadgeInfo['qualification'];
  matched: string[];
  flags: string[];
}

function BadgeGalleryContent() {
  const prefersReducedMotion = useReducedMotion();
  const [badgeSystem, setBadgeSystem] = useState<BadgeSystem | null>(null);
  const [badgeMapping, setBadgeMapping] = useState<BadgeMapping | null>(null);
  const [expandedBadge, setExpandedBadge] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { ranks, names } = useNftMetadata();
  const { searchNFT, setSearchQuery } = useBigPulp();

  // Handle NFT click - search and scroll to BigPulp
  const handleNftClick = useCallback((nftId: string) => {
    // Set the search query and trigger search
    setSearchQuery(nftId);
    searchNFT(nftId);

    // Scroll to top of page where BigPulp's take is displayed
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchNFT, setSearchQuery]);

  // Load badge data
  useEffect(() => {
    async function loadData() {
      try {
        const [system, mapping] = await Promise.all([
          loadBadgeSystem(),
          loadBadgeMapping(),
        ]);
        setBadgeSystem(system);
        setBadgeMapping(mapping);
      } catch (err) {
        console.error('Failed to load badge data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Group NFTs by badge
  const nftsByBadge = useMemo(() => {
    if (!badgeMapping) return {};

    const grouped: Record<string, NFTWithBadgeInfo[]> = {};

    for (const [nftId, entry] of Object.entries(badgeMapping.nft_badges)) {
      for (const badgeInfo of entry.badges) {
        if (!grouped[badgeInfo.badge]) {
          grouped[badgeInfo.badge] = [];
        }
        grouped[badgeInfo.badge].push({
          id: nftId,
          qualification: badgeInfo.qualification,
          matched: badgeInfo.matched,
          flags: entry.flags || [],
        });
      }
    }

    return grouped;
  }, [badgeMapping]);

  if (loading || !badgeSystem) {
    return (
      <div className="pt-4 text-center">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Loading badge gallery...
        </p>
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-3">
      {/* Summary */}
      <div
        className="p-3 rounded-lg text-center"
        style={{ background: 'var(--color-bg-tertiary)' }}
      >
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <span className="font-bold" style={{ color: 'var(--color-brand-primary)' }}>
            {badgeSystem.nfts_with_badges.toLocaleString()}
          </span>
          {' '}NFTs with badges ({badgeSystem.coverage_percent}% of collection)
        </p>
      </div>

      {/* Badge sections - sorted by rarity */}
      {badgeSystem.badges_ranked_by_rarity.map((badge) => {
        const definition = badgeSystem.badges[badge.name];
        const nfts = nftsByBadge[badge.name] || [];
        const isExpanded = expandedBadge === badge.name;

        // Sort NFTs by rarity rank
        const sortedNfts = [...nfts].sort((a, b) => {
          const rankA = ranks[a.id] ?? 9999;
          const rankB = ranks[b.id] ?? 9999;
          return rankA - rankB;
        });

        return (
          <div
            key={badge.name}
            className="rounded-lg overflow-hidden"
            style={{
              background: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
            }}
          >
            {/* Badge header */}
            <button
              className="w-full flex items-center justify-between p-3 text-left transition-colors hover:bg-white/5"
              onClick={() => setExpandedBadge(isExpanded ? null : badge.name)}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{badge.emoji}</span>
                <span
                  className="font-medium text-sm"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {badge.name}
                </span>
                <span
                  className="text-xs"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  ({badge.count})
                </span>
              </div>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={16} style={{ color: 'var(--color-text-muted)' }} />
              </motion.div>
            </button>

            {/* Expanded content */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div
                    className="p-3 pt-0"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                  >
                    {/* Lore */}
                    <p
                      className="text-xs italic mt-2 mb-3"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {definition?.lore || ''}
                    </p>

                    {/* NFT Grid */}
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {sortedNfts.map((nft) => (
                        <div
                          key={nft.id}
                          className="relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-105 hover:z-10"
                          style={{ background: 'var(--color-surface)' }}
                          title={`${names[nft.id] || `Wojak #${nft.id.padStart(4, '0')}`}`}
                          onClick={() => handleNftClick(nft.id)}
                        >
                          {/* NFT Image */}
                          <img
                            src={getNftImageUrl(nft.id)}
                            alt={names[nft.id] || `Wojak #${nft.id.padStart(4, '0')}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {/* NFT ID badge - bottom left */}
                          <div
                            className="absolute bottom-0.5 left-0.5 px-1 py-0.5 rounded text-[8px] font-bold"
                            style={{
                              background: 'rgba(0,0,0,0.7)',
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            #{nft.id.padStart(4, '0')}
                          </div>
                          {/* HOAMI Edition indicator */}
                          {nft.flags.includes('HOAMI Edition') && (
                            <div
                              className="absolute top-0.5 right-0.5 px-1 py-0.5 rounded text-[8px]"
                              style={{
                                background: 'rgba(168, 85, 247, 0.9)',
                                color: 'white',
                              }}
                              title="HOAMI Edition"
                            >
                              💜
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div
      className="p-3 rounded-xl animate-pulse"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        className="h-6 w-16 rounded mx-auto mb-2"
        style={{ background: 'var(--color-border)' }}
      />
      <div
        className="h-3 w-12 rounded mx-auto"
        style={{ background: 'var(--color-border)' }}
      />
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div
      className="rounded-xl overflow-hidden animate-pulse"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-5 h-5 rounded"
            style={{ background: 'var(--color-border)' }}
          />
          <div
            className="h-4 w-40 rounded"
            style={{ background: 'var(--color-border)' }}
          />
        </div>
        <div
          className="w-5 h-5 rounded"
          style={{ background: 'var(--color-border)' }}
        />
      </div>
    </div>
  );
}

export function AskTab({
  stats,
  topAttributes,
  topSales,
  isLoading = false,
}: AskTabProps) {
  const prefersReducedMotion = useReducedMotion();
  const [expandedSection, setExpandedSection] = useState<SectionId | null>(null);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const { data: xchPrice } = useXchPrice();
  const quickPrompts = useContextualPrompts([]);

  const handleQuickPrompt = useCallback((prompt: string) => {
    // Quick prompts hint at future AI chat functionality.
    // For now, expand the most relevant section based on the prompt.
    const lower = prompt.toLowerCase();
    if (lower.includes('trait') || lower.includes('rarest') || lower.includes('attribute')) {
      setExpandedSection('attributes');
    } else if (lower.includes('sale') || lower.includes('deal') || lower.includes('undervalued')) {
      setExpandedSection('sales');
    } else {
      setExpandedSection('provenance');
    }
  }, []);

  // Use real XCH price for USD calculations
  const realXchPrice = xchPrice ?? 5.32;

  const handleToggle = useCallback((sectionId: SectionId) => {
    setExpandedSection((prev) => (prev === sectionId ? null : sectionId));
  }, []);

  // Loading skeleton
  if (isLoading || !stats) {
    return (
      <div className="space-y-6 p-4">
        <div>
          <div
            className="h-4 w-40 rounded mb-3 animate-pulse"
            style={{ background: 'var(--color-border)' }}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        </div>
        <div
          className="h-px"
          style={{ background: 'var(--color-border)' }}
        />
        <div className="space-y-3">
          <SectionSkeleton />
          <SectionSkeleton />
          <SectionSkeleton />
          <SectionSkeleton />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-3 sm:space-y-6 p-2 sm:p-4"
      variants={prefersReducedMotion ? undefined : tabContentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Collection Statistics - Collapsible like other sections */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <button
          className="w-full flex items-center justify-between p-3 sm:p-4 text-left transition-colors"
          onClick={() => setIsStatsExpanded(!isStatsExpanded)}
          aria-expanded={isStatsExpanded}
          style={{
            background: isStatsExpanded ? 'var(--color-surface-hover)' : 'transparent',
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <BarChart3
              size={16}
              className="sm:w-[18px] sm:h-[18px]"
              style={{ color: 'var(--color-brand-primary)' }}
            />
            <span
              className="font-medium text-sm"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Collection Statistics
            </span>
          </div>
          <motion.div
            variants={prefersReducedMotion ? undefined : accordionArrowVariants}
            animate={isStatsExpanded ? 'expanded' : 'collapsed'}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown
              size={18}
              style={{ color: 'var(--color-text-muted)' }}
            />
          </motion.div>
        </button>
        <AnimatePresence initial={false}>
          {isStatsExpanded && (
            <motion.div
              variants={prefersReducedMotion ? undefined : accordionVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              transition={accordionTransition}
              style={{ overflow: 'hidden' }}
            >
              <div
                className="p-2 sm:p-4 pt-0"
                style={{ borderTop: '1px solid var(--color-border)' }}
              >
                <motion.div
                  className="grid grid-cols-5 gap-1.5 sm:gap-2 pt-3 sm:pt-4"
                  variants={prefersReducedMotion ? undefined : statsContainerVariants}
                  initial="initial"
                  animate="animate"
                >
                  <StatCard
                    label="Supply"
                    value={stats.totalSupply.toLocaleString()}
                  />
                  <StatCard
                    label="Trades"
                    value={stats.totalTrades.toLocaleString()}
                  />
                  <StatCard
                    label="Floor"
                    value={`${stats.floorPrice.toFixed(2)}`}
                    subValue="XCH"
                    usdValue={`$${(stats.floorPrice * realXchPrice).toFixed(2)}`}
                  />
                  <StatCard
                    label="Volume"
                    value={`${Math.floor(stats.totalVolume).toLocaleString()}`}
                    subValue="XCH"
                    usdValue={`$${Math.floor(stats.totalVolume * realXchPrice).toLocaleString()}`}
                  />
                  <StatCard
                    label="Market Cap"
                    value={`${Math.floor(stats.floorPrice * stats.totalSupply).toLocaleString()}`}
                    subValue="XCH"
                    usdValue={`$${Math.floor(stats.floorPrice * stats.totalSupply * realXchPrice).toLocaleString()}`}
                  />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expandable Sections */}
      <div className="space-y-2 sm:space-y-3">
        <ExpandableSection
          section={SECTIONS[0]}
          isExpanded={expandedSection === 'provenance'}
          onToggle={() => handleToggle('provenance')}
        >
          <ProvenanceContent />
        </ExpandableSection>

        <ExpandableSection
          section={SECTIONS[1]}
          isExpanded={expandedSection === 'attributes'}
          onToggle={() => handleToggle('attributes')}
        >
          <TopAttributesContent attributes={topAttributes} />
        </ExpandableSection>

        <ExpandableSection
          section={SECTIONS[2]}
          isExpanded={expandedSection === 'sales'}
          onToggle={() => handleToggle('sales')}
        >
          <TopSalesContent sales={topSales} isLoading={isLoading} />
        </ExpandableSection>

        <ExpandableSection
          section={SECTIONS[3]}
          isExpanded={expandedSection === 'badges'}
          onToggle={() => handleToggle('badges')}
        >
          <BadgeGalleryContent />
        </ExpandableSection>
      </div>

      {/* Quick Prompts */}
      <QuickPrompts
        prompts={quickPrompts}
        onSelect={handleQuickPrompt}
      />
    </motion.div>
  );
}

export default AskTab;
