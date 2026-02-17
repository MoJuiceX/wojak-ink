// Game Position Bar — sticky bottom bar showing current player's position.
import { Link } from 'react-router-dom';

interface PlayerPosition {
  rank: number;
  powerLevel: number;
  pointsToNext?: number;
  nextRank?: number;
}

interface WojakPosition {
  rank: number;
  nftId: string;
  name: string;
  netScore: number;
}

interface GamePositionBarProps {
  mode: 'players' | 'wojaks';
  isRegistered: boolean;
  playerPosition?: PlayerPosition | null;
  wojakPosition?: WojakPosition | null;
}

export function GamePositionBar({ mode, isRegistered, playerPosition, wojakPosition }: GamePositionBarProps) {
  if (!isRegistered) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          zIndex: 50,
        }}
      >
        <div className="flex items-center justify-center" style={{ maxWidth: 720, margin: '0 auto', padding: '12px 16px' }}>
          <Link to="/your-wojak/dashboard" className="btn btn-primary" style={{ fontSize: 13 }}>
            Join the game
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        zIndex: 50,
      }}
    >
      <div className="flex items-center" style={{ maxWidth: 720, margin: '0 auto', padding: '12px 16px' }}>
        {mode === 'players' && playerPosition && (
          <>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-primary)', marginRight: 12 }}>You</span>
            <span style={{ fontSize: 14, fontWeight: 700, marginRight: 8 }}>#{playerPosition.rank}</span>
            <span className="text-secondary" style={{ fontSize: 14 }}>
              {playerPosition.powerLevel.toLocaleString()} pts
            </span>
            <span className="flex-1" />
            {playerPosition.pointsToNext != null && playerPosition.nextRank != null && (
              <span className="text-muted" style={{ fontSize: 12 }}>
                {playerPosition.pointsToNext.toLocaleString()} pts to #{playerPosition.nextRank}
              </span>
            )}
          </>
        )}

        {mode === 'wojaks' && wojakPosition && (
          <>
            <img
              src={`https://assets.mintgarden.io/thumbnails/medium/${wojakPosition.nftId}.png`}
              alt={wojakPosition.name}
              style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', objectFit: 'cover', marginRight: 8 }}
            />
            <span style={{ fontSize: 13, color: 'var(--color-primary)', marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {wojakPosition.name}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>#{wojakPosition.rank}</span>
            <span className="flex-1" />
            <span className="text-muted" style={{ fontSize: 12 }}>
              +{wojakPosition.netScore} votes
            </span>
          </>
        )}

        {mode === 'players' && !playerPosition && (
          <span className="text-muted" style={{ fontSize: 13 }}>Not ranked yet</span>
        )}
        {mode === 'wojaks' && !wojakPosition && (
          <span className="text-muted" style={{ fontSize: 13 }}>No ranked Wojaks yet</span>
        )}
      </div>
    </div>
  );
}
