/**
 * WojakFighterCard - Individual card for a Your Wojak fighter in the gallery grid
 *
 * Shows the fighter image + combat identity overlay including:
 * - Type badge
 * - Edition number
 * - Level
 * - Power score
 * - Win/Loss record
 * - Owner name (if available)
 */

import { Zap } from 'lucide-react';
import { TYPE_COLORS } from './YourWojakSection';

interface WojakFighter {
  nft_id: string;
  edition: number;
  type: string;
  level: number;
  power: number;
  wins: number;
  losses: number;
  ownerName: string;
}

interface WojakFighterCardProps {
  wojak: WojakFighter;
}

export function WojakFighterCard({ wojak }: WojakFighterCardProps) {
  const typeColor = TYPE_COLORS[wojak.type] || '#a0a0b0';
  const imageUrl = `https://assets.mintgarden.io/thumbnails/medium/${wojak.nft_id}.png`;

  return (
    <div className="wojak-fighter-card">
      {/* Image */}
      <div className="wojak-fighter-image">
        <img
          src={imageUrl}
          alt={`Wojak #${wojak.edition}`}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '';
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        {/* Type badge overlay */}
        <span
          className="wojak-fighter-type"
          style={{ background: `${typeColor}cc`, color: '#fff' }}
        >
          {wojak.type}
        </span>
      </div>

      {/* Info */}
      <div className="wojak-fighter-info">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">#{wojak.edition}</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
            Lv.{wojak.level}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-secondary">
          <span className="flex items-center gap-0.5">
            <Zap size={10} />
            {wojak.power}
          </span>
          <span>{wojak.wins}W/{wojak.losses}L</span>
        </div>
        {wojak.ownerName && (
          <span className="text-xs text-muted truncate">{wojak.ownerName}</span>
        )}
      </div>
    </div>
  );
}
