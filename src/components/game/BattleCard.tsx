import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface BattleNft {
  id: string;
  edition: number;
  ownerDid: string;
  name: string;
  scoreDelta?: number;
}

interface BattleCardProps {
  battleId: number;
  nftA: BattleNft;
  nftB: BattleNft;
  endsAt: string;
  status: string;
  winner?: string | null;
  resolvedAt?: string | null;
}

function useCountdown(endsAt: string) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining('Ended');
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${hours}h ${mins}m`);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [endsAt]);

  return remaining;
}

function formatDelta(delta: number | undefined): string {
  if (delta == null) return '?';
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

export function BattleCard({
  battleId, nftA, nftB, endsAt, status, winner, resolvedAt,
}: BattleCardProps) {
  const countdown = useCountdown(endsAt);
  const isActive = status === 'active';
  const isCompleted = status === 'completed';
  const isDraw = status === 'draw';
  const isResolved = isCompleted || isDraw;

  const aWon = winner === nftA.id;
  const bWon = winner === nftB.id;

  return (
    <div className="card-static p-4 flex flex-col gap-3">
      {/* Timer / Result */}
      <div className="flex items-center justify-between">
        {isResolved ? (
          <span className={`badge ${isCompleted ? 'badge-success' : 'badge-cyan'}`}>
            {isDraw ? 'Draw' : 'Completed'}
          </span>
        ) : (
          <span className="badge badge-cyan">{countdown}</span>
        )}
        <span className="text-xs text-muted">
          {isResolved && resolvedAt
            ? new Date(resolvedAt).toLocaleDateString()
            : `#${battleId}`}
        </span>
      </div>

      {/* Side-by-side NFTs */}
      <div className="flex gap-4">
        {/* NFT A */}
        <div className={`flex-1 flex flex-col items-center gap-2 ${isCompleted && !aWon ? 'opacity-40' : ''}`}>
          <div
            className="battle-nft-image"
            style={aWon ? { borderColor: 'var(--color-success)', boxShadow: '0 0 12px rgba(34, 197, 94, 0.3)' } : undefined}
          >
            <Link to={`/swipe/wojak/${nftA.edition}`}>
              <img
                src={`https://assets.mintgarden.io/thumbnails/medium/${nftA.id}.png`}
                alt={nftA.name}
                className="w-full rounded-lg"
                loading="lazy"
              />
            </Link>
          </div>
          <Link to={`/swipe/wojak/${nftA.edition}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <p className="text-sm font-semibold text-center">{nftA.name}</p>
          </Link>
          <span className="text-xs text-secondary">#{nftA.edition}</span>
          {isResolved && (
            <span
              className={`text-sm font-bold ${(nftA.scoreDelta ?? 0) > 0 ? 'text-accent' : 'text-muted'}`}
              style={(nftA.scoreDelta ?? 0) < 0 ? { color: 'var(--color-error)' } : undefined}
            >
              {formatDelta(nftA.scoreDelta)}
            </span>
          )}
          {aWon && <span className="badge badge-success">Winner</span>}
        </div>

        {/* VS divider */}
        <div className="flex items-center">
          <span className="text-xl font-bold text-muted">VS</span>
        </div>

        {/* NFT B */}
        <div className={`flex-1 flex flex-col items-center gap-2 ${isCompleted && !bWon ? 'opacity-40' : ''}`}>
          <div
            className="battle-nft-image"
            style={bWon ? { borderColor: 'var(--color-success)', boxShadow: '0 0 12px rgba(34, 197, 94, 0.3)' } : undefined}
          >
            <Link to={`/swipe/wojak/${nftB.edition}`}>
              <img
                src={`https://assets.mintgarden.io/thumbnails/medium/${nftB.id}.png`}
                alt={nftB.name}
                className="w-full rounded-lg"
                loading="lazy"
              />
            </Link>
          </div>
          <Link to={`/swipe/wojak/${nftB.edition}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <p className="text-sm font-semibold text-center">{nftB.name}</p>
          </Link>
          <span className="text-xs text-secondary">#{nftB.edition}</span>
          {isResolved && (
            <span
              className={`text-sm font-bold ${(nftB.scoreDelta ?? 0) > 0 ? 'text-accent' : 'text-muted'}`}
              style={(nftB.scoreDelta ?? 0) < 0 ? { color: 'var(--color-error)' } : undefined}
            >
              {formatDelta(nftB.scoreDelta)}
            </span>
          )}
          {bWon && <span className="badge badge-success">Winner</span>}
        </div>
      </div>

      {/* Active battle hint */}
      {isActive && (
        <p className="text-xs text-secondary text-center">
          Scores are hidden until the battle ends. Vote in Swipe to influence the outcome!
        </p>
      )}
    </div>
  );
}
