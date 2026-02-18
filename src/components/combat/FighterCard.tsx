/**
 * FighterCard — compact combat info overlay for NFT cards.
 *
 * Shows type badge, level, ELO, ability, moves, and W/L/D record.
 */

import type { CombatType } from '@/lib/combat/types';

interface FighterCardProps {
  nftId: string;
  edition?: number;
  type: CombatType;
  nature: string;
  ability: string;
  level: number;
  elo: number;
  moves: string[];
  record: { wins: number; losses: number; draws: number };
  imageUrl?: string;
  compact?: boolean;
}

export function FighterCard({
  edition,
  type,
  nature,
  ability,
  level,
  elo,
  moves,
  record,
  imageUrl,
  compact = false,
}: FighterCardProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className={`badge badge-${type.toLowerCase()}`}>{type}</span>
        <span className="text-muted">Lv.{level}</span>
        <span className="text-muted">ELO {elo}</span>
      </div>
    );
  }

  return (
    <div className="card p-4 flex flex-col gap-3">
      {/* Image */}
      {imageUrl && (
        <div className="battle-nft-image">
          <img src={imageUrl} alt={`Wojak #${edition}`} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        {edition != null && (
          <span className="font-semibold text-sm">Wojak #{edition}</span>
        )}
      </div>

      {/* Type + Level + ELO */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`badge badge-${type.toLowerCase()}`}>{type}</span>
        <span className="text-xs text-secondary">Lv. {level}</span>
        <span className="text-xs text-muted">ELO {elo}</span>
      </div>

      {/* Nature + Ability */}
      <div className="text-xs text-secondary">
        <span>{nature}</span>
        <span className="text-muted"> | </span>
        <span>{ability}</span>
      </div>

      {/* Moves */}
      <div className="flex flex-wrap gap-1">
        {moves.map((move) => (
          <span key={move} className="combat-preview-badge text-xs">
            {move.replace(/^poke_\w+_/, '').replace(/-/g, ' ')}
          </span>
        ))}
      </div>

      {/* Record */}
      <div className="flex items-center gap-3 text-xs">
        <span className="text-success">W: {record.wins}</span>
        <span className="text-error">L: {record.losses}</span>
        <span className="text-secondary">D: {record.draws}</span>
      </div>
    </div>
  );
}
