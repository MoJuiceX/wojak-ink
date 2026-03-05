/**
 * WojakFighterCard - Individual card for a Your Wojak in the gallery grid
 *
 * Shows the wojak image + combat identity overlay including:
 * - Type badge (if in combat)
 * - Edition number
 * - Level
 * - Power score
 * - Win/Loss record (if has battles)
 * - Owner name (if available)
 */

import { Zap } from 'lucide-react';
import { getTypeColor } from '@/lib/combat/data/type-colors';
import { getNftImageUrl } from '@/services/constants';
import { getPreferredIpfsUrl } from '@/utils/ipfs';

interface WojakFighter {
  nft_id: string;
  edition: number;
  type: string | null;
  level: number;
  power: number;
  wins: number;
  losses: number;
  ownerName: string;
  imageUri?: string | null;
  customName?: string | null;
}

interface WojakFighterCardProps {
  wojak: WojakFighter;
  onClick?: () => void;
}

export function WojakFighterCard({ wojak, onClick }: WojakFighterCardProps) {
  const typeColor = wojak.type ? getTypeColor(wojak.type) : '#a0a0b0';
  const imageUrl = getPreferredIpfsUrl(wojak.imageUri) || getNftImageUrl(wojak.edition);
  const hasCombatData = !!wojak.type;

  return (
    <div
      className="wojak-fighter-card"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      style={{ cursor: onClick ? 'pointer' : undefined }}
    >
      {/* Image */}
      <div className="wojak-fighter-image">
        <img
          src={imageUrl}
          alt={wojak.customName || `Wojak #${wojak.edition}`}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        {/* Type badge overlay - only show if has combat data */}
        {hasCombatData && wojak.type && (
          <span
            className="wojak-fighter-type"
            style={{ background: `${typeColor}cc`, color: '#fff' }}
          >
            {wojak.type}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="wojak-fighter-info">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {wojak.customName ? wojak.customName : `#${wojak.edition}`}
          </span>
          {hasCombatData && (
            <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
              Lv.{wojak.level}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-secondary">
          <span className="flex items-center gap-0.5">
            <Zap size={10} />
            {wojak.power}
          </span>
          {hasCombatData && (wojak.wins > 0 || wojak.losses > 0) && (
            <span>{wojak.wins}W/{wojak.losses}L</span>
          )}
        </div>
        {wojak.ownerName && (
          <span className="text-xs text-muted truncate">{wojak.ownerName}</span>
        )}
      </div>
    </div>
  );
}
