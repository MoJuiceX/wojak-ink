/**
 * AnalysisBadges Component
 *
 * Displays analysis badges and high provenance traits.
 */

import { motion, useReducedMotion } from 'framer-motion';
import {
  Crown,
  Star,
  Trophy,
  TrendingDown,
  Anchor,
  Sparkles,
  Gem,
  Heart,
  Shield,
} from 'lucide-react';
import type {
  AnalysisBadge,
  ProvenanceInfo,
  RareCombo,
  BadgeType,
} from '@/types/bigpulp';
import {
  badgeVariants,
  badgeTransition,
  badgeContainerVariants,
} from '@/config/bigpulpAnimations';

interface AnalysisBadgesProps {
  badges: AnalysisBadge[];
  provenance: ProvenanceInfo;
  rareCombos: RareCombo[];
}

// Icon mapping for badge types
const BADGE_ICONS: Record<BadgeType, React.ElementType> = {
  'crown-holder': Crown,
  'special-edition': Star,
  'top-10-percent': Trophy,
  'floor-snipe': TrendingDown,
  'whale-territory': Anchor,
  'rare-combo': Sparkles,
  'high-provenance': Gem,
  'virgin-wallet': Heart,
  'og-holder': Shield,
};

function BadgePill({ badge }: { badge: AnalysisBadge }) {
  const prefersReducedMotion = useReducedMotion();
  const Icon = BADGE_ICONS[badge.type] || Sparkles;

  return (
    <motion.div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
      style={{
        background: `${badge.color}15`,
        border: `1px solid ${badge.color}40`,
        color: badge.color,
      }}
      variants={prefersReducedMotion ? undefined : badgeVariants}
      transition={badgeTransition}
      role="status"
      title={badge.description}
    >
      <Icon size={14} />
      <span>{badge.label}</span>
    </motion.div>
  );
}

function ProvenanceCard({
  trait,
}: {
  trait: { category: string; value: string; rarity: number; reason: string };
}) {
  const prefersReducedMotion = useReducedMotion();

  const impactColors = {
    high: '#fbbf24',
    medium: '#f59e0b',
    low: '#78716c',
  };

  return (
    <motion.div
      className="p-3 rounded-xl transition-colors"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
      variants={prefersReducedMotion ? undefined : badgeVariants}
      transition={badgeTransition}
      whileHover={
        prefersReducedMotion
          ? undefined
          : {
              borderColor: 'var(--color-primary)',
            }
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Trophy size={14} style={{ color: impactColors.high }} />
            <span
              className="font-medium text-sm truncate"
              style={{ color: 'var(--color-text)' }}
            >
              {trait.value}
            </span>
          </div>
          <p
            className="text-xs mt-1 line-clamp-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {trait.reason}
          </p>
        </div>
        <span
          className="text-xs font-mono flex-shrink-0"
          style={{ color: 'var(--color-text-secondary)' }}
          aria-label={`${trait.rarity} percent rarity`}
        >
          {trait.rarity.toFixed(1)}%
        </span>
      </div>
    </motion.div>
  );
}

function RareComboCard({ combo }: { combo: RareCombo }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="p-3 rounded-xl"
      style={{
        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(168, 85, 247, 0.1))',
        border: '1px solid rgba(236, 72, 153, 0.3)',
      }}
      variants={prefersReducedMotion ? undefined : badgeVariants}
      transition={badgeTransition}
    >
      <div className="flex items-start gap-2">
        <Gem size={16} style={{ color: '#ec4899' }} className="flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {combo.comboName && (
            <p
              className="font-medium text-sm"
              style={{ color: 'var(--color-text)' }}
            >
              "{combo.comboName}"
            </p>
          )}
          <p
            className="text-xs"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {combo.traits.join(' + ')}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Only {combo.occurrences} NFTs have this combo
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function AnalysisBadges({
  badges,
  provenance,
  rareCombos,
}: AnalysisBadgesProps) {
  const prefersReducedMotion = useReducedMotion();

  if (badges.length === 0 && provenance.highValueTraits.length === 0 && rareCombos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Badges */}
      {badges.length > 0 && (
        <motion.div
          className="space-y-2"
          variants={prefersReducedMotion ? undefined : badgeContainerVariants}
          initial="initial"
          animate="animate"
        >
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Analysis
          </h3>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <BadgePill key={badge.id} badge={badge} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Divider */}
      {badges.length > 0 &&
        (provenance.highValueTraits.length > 0 || rareCombos.length > 0) && (
          <div
            className="h-px"
            style={{ background: 'var(--color-border)' }}
          />
        )}

      {/* High Provenance Traits */}
      {provenance.highValueTraits.length > 0 && (
        <motion.div
          className="space-y-2"
          variants={prefersReducedMotion ? undefined : badgeContainerVariants}
          initial="initial"
          animate="animate"
        >
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            High Provenance Traits
          </h3>
          <div className="space-y-2">
            {provenance.highValueTraits.map((trait, i) => (
              <ProvenanceCard key={`${trait.category}-${trait.value}-${i}`} trait={trait} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Rare Combos */}
      {rareCombos.length > 0 && (
        <motion.div
          className="space-y-2"
          variants={prefersReducedMotion ? undefined : badgeContainerVariants}
          initial="initial"
          animate="animate"
        >
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Rare Combos
          </h3>
          <div className="space-y-2">
            {rareCombos.map((combo, i) => (
              <RareComboCard key={`combo-${i}`} combo={combo} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default AnalysisBadges;
