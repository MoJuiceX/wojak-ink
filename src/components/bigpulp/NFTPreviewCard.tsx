/**
 * NFTPreviewCard Component
 *
 * Large NFT preview with analysis overlay and rarity progress bar.
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { NFTAnalysis, RarityTier } from '@/types/bigpulp';
import { previewCardVariants } from '@/config/bigpulpAnimations';
import { useTraitRankings, type TooltipData } from '@/hooks/useTraitRankings';

interface NFTPreviewCardProps {
  analysis: NFTAnalysis | null;
  isLoading: boolean;
  traits?: Record<string, string> | null;
  hpTraits?: string[] | null;
  namedCombos?: string[] | null;
  cultures?: string[] | null;
  isFiveHp?: boolean;
  isHomieEdition?: boolean;
  homieName?: string | null;
}

// Tier color mapping
const TIER_COLORS: Record<RarityTier, string> = {
  legendary: '#fbbf24', // Gold
  epic: '#a855f7', // Purple
  rare: '#3b82f6', // Blue
  uncommon: '#22c55e', // Green
  common: 'var(--color-text-muted)',
};

// Default attribute categories for WFP NFTs
const ATTRIBUTE_CATEGORIES = [
  'Base',
  'Face',
  'Mouth',
  'Face Wear',
  'Head',
  'Clothes',
  'Background',
];

// Trait Ranking Tooltip Component (adapted from Gallery)
function TraitRankingTooltip({ data }: { data: TooltipData }) {
  return (
    <div
      className="p-3 rounded-lg min-w-[220px] max-w-[260px] font-mono text-sm max-h-[280px] overflow-y-auto"
      style={{
        background: 'var(--color-bg-primary)',
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

// Individual row in the tooltip
function TraitRankingRow({
  entry,
  isCurrent,
}: {
  entry: { rank: number; trait: string; count: number };
  isCurrent: boolean;
}) {
  return (
    <div
      className="grid py-1 px-1.5 rounded-md"
      style={{
        gridTemplateColumns: '16px 28px 1fr 40px',
        gap: '4px',
        alignItems: 'center',
        background: isCurrent ? 'rgba(247, 147, 26, 0.3)' : 'transparent',
        border: isCurrent ? '2px solid var(--color-accent)' : '1px solid transparent',
        boxShadow: isCurrent ? '0 0 12px rgba(247, 147, 26, 0.4)' : 'none',
        margin: isCurrent ? '0 -2px' : '0',
      }}
    >
      {/* Arrow indicator column */}
      <span className="text-xs" style={{ color: 'var(--color-accent)', textAlign: 'center' }}>
        {isCurrent ? '▶' : ''}
      </span>
      {/* Rank column */}
      <span
        className="text-xs text-right"
        style={{
          color: isCurrent ? 'var(--color-accent)' : 'var(--color-text-muted)',
          fontWeight: isCurrent ? 700 : 400,
        }}
      >
        #{entry.rank}
      </span>
      {/* Trait name column */}
      <span
        className="text-xs truncate"
        style={{
          color: isCurrent ? 'var(--color-accent)' : 'var(--color-text-primary)',
          fontWeight: isCurrent ? 700 : 400,
        }}
      >
        {entry.trait}
      </span>
      {/* Count column */}
      <span
        className="text-xs text-right"
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

// Attribute row with ranking tooltip
function AttributeRow({
  category,
  value,
  getTooltipData,
  isLast,
  isHpTrait,
}: {
  category: string;
  value: string | undefined;
  getTooltipData: (category: string, traitValue: string) => TooltipData | null;
  isLast: boolean;
  isHpTrait?: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const handleMouseEnter = () => {
    if (!value) return;
    const data = getTooltipData(category, value);
    setTooltipData(data);

    // Calculate position based on row's position
    if (rowRef.current) {
      const rect = rowRef.current.getBoundingClientRect();
      // Position tooltip to the left of the metadata panel
      setTooltipPosition({
        top: rect.top,
        left: rect.left - 230, // Position to the left with some margin
      });
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  // Get rank info for display
  const rankInfo = value ? getTooltipData(category, value) : null;

  return (
    <div
      ref={rowRef}
      className="py-1.5"
      style={{ borderBottom: !isLast ? '1px solid var(--color-border)' : 'none' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="text-xs block" style={{ color: 'var(--color-text-muted)' }}>
        {category}
      </span>
      <div className="flex items-baseline justify-between gap-1">
        <span
          className="text-xs font-medium truncate flex items-center gap-1"
          style={{ color: value ? (isHpTrait ? 'var(--color-accent)' : 'var(--color-text-primary)') : 'var(--color-text-muted)' }}
        >
          {isHpTrait && <span title="High Provenance">★</span>}
          {value || '—'}
        </span>
        {rankInfo && (
          <span
            className="text-xs cursor-help whitespace-nowrap flex-shrink-0"
            style={{ color: 'var(--color-accent)', opacity: 0.8 }}
          >
            {rankInfo.currentRank}/{rankInfo.total}
          </span>
        )}
      </div>

      {/* Tooltip - fixed position */}
      <AnimatePresence>
        {showTooltip && tooltipData && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
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

export function NFTPreviewCard({
  analysis,
  isLoading,
  traits,
  hpTraits,
  namedCombos: _namedCombos, // Reserved for future use
  cultures: _cultures, // Reserved for future use
  isFiveHp,
  isHomieEdition,
  homieName,
}: NFTPreviewCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const { getTooltipData } = useTraitRankings();

  const { nft, rarity } = analysis || { nft: null, rarity: null };
  const tierColor = rarity ? TIER_COLORS[rarity.tier] : 'var(--color-border)';

  // Check if a trait value is high-provenance
  const isHpTrait = (value: string | undefined): boolean => {
    if (!value || !hpTraits) return false;
    return hpTraits.includes(value);
  };

  return (
    <div className="flex gap-3 h-full overflow-hidden">
      {/* NFT Preview Container - 1:1 ratio, takes available space */}
      <div
        className="rounded-2xl overflow-hidden flex-1 flex items-center justify-center"
        style={{
          background: 'rgba(10, 10, 10, 0.98)',
          border: `2px solid ${rarity ? `${tierColor}40` : 'rgba(255,255,255,0.1)'}`,
          aspectRatio: '1 / 1',
        }}
      >
        {/* Loading state */}
        {isLoading && (
          <div
            className="w-full h-full animate-pulse"
            style={{ background: 'var(--color-bg-tertiary)' }}
          />
        )}

        {/* Empty state */}
        {!analysis && !isLoading && (
          <div className="text-center p-4">
            <div
              className="w-16 h-16 rounded-xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: 'var(--color-bg-tertiary)' }}
            >
              <Sparkles
                size={28}
                style={{ color: 'var(--color-text-muted)' }}
                className={prefersReducedMotion ? '' : 'animate-pulse'}
              />
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Search for an NFT
            </p>
          </div>
        )}

        {/* NFT Image */}
        {nft && !isLoading && (
          <AnimatePresence mode="wait">
            <motion.div
              key={nft.id}
              className="relative w-full h-full"
              variants={prefersReducedMotion ? undefined : previewCardVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <img
                src={nft.imageUrl}
                alt={nft.name}
                className="w-full h-full object-contain"
                loading="lazy"
              />

              {/* Legendary shimmer effect */}
              {rarity?.tier === 'legendary' && !prefersReducedMotion && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(45deg, transparent 30%, rgba(251, 191, 36, 0.1) 50%, transparent 70%)',
                  }}
                  animate={{
                    backgroundPosition: ['0% 0%', '100% 100%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: 'reverse',
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Metadata Column - narrow */}
      <div
        className="rounded-2xl overflow-hidden flex flex-col flex-shrink-0"
        style={{
          background: 'rgba(10, 10, 10, 0.98)',
          border: '1px solid var(--color-border)',
          width: '160px',
        }}
      >
        {/* Header: Name/Rank/Badges */}
        <div className="p-3 pb-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)', minHeight: '52px' }}>
          <h3
            className="text-sm font-bold truncate"
            style={{ color: nft ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
          >
            {nft?.name || 'Metadata'}
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium" style={{ color: tierColor, visibility: rarity ? 'visible' : 'hidden' }}>
              👑 {rarity?.rank.toLocaleString() || '0'}
            </span>
            {/* Elite 5+ HP badge */}
            {isFiveHp && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' }}
                title="5+ High Provenance Traits - Top 1%"
              >
                ELITE
              </span>
            )}
            {/* Homie Edition badge */}
            {isHomieEdition && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#a855f7' }}
                title={`Homie Edition: ${homieName}`}
              >
                1/1
              </span>
            )}
          </div>
        </div>

        {/* Attributes list - category on top, value below, with rankings */}
        <div className="flex-1 p-3 pt-2">
          {ATTRIBUTE_CATEGORIES.map((category, index) => (
            <AttributeRow
              key={category}
              category={category}
              value={traits?.[category]}
              getTooltipData={getTooltipData}
              isLast={index === ATTRIBUTE_CATEGORIES.length - 1}
              isHpTrait={isHpTrait(traits?.[category])}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default NFTPreviewCard;
