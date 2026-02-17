// Active Battle Card — shows current battle state, challenge, or empty state.
import { useState, useEffect } from 'react';
import { Swords } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Battle {
  battleId: string;
  status: string;
  endsAt: string;
  yourNftId: string;
  yourEdition: number;
  opponentNftId: string;
  opponentEdition: number;
  yourVotes: number;
  opponentVotes: number;
}

interface ActiveBattleCardProps {
  did: string;
}

function timeRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Ending soon';
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

export function ActiveBattleCard({ did }: ActiveBattleCardProps) {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/game/battle-list?did=${did}&status=active`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.success) setBattles(data.battles || []);
      })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [did]);

  if (loading) {
    return (
      <div className="card-static p-4">
        <div className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-md)' }} />
      </div>
    );
  }

  // No active battles
  if (battles.length === 0) {
    return (
      <div className="card-static p-4 flex flex-col items-center gap-2">
        <Swords size={24} className="text-muted" />
        <span className="text-muted" style={{ fontSize: 13 }}>No active battles</span>
        <Link to="/games/your-wojak/battles" className="btn btn-primary" style={{ fontSize: 13 }}>
          Find a Battle
        </Link>
      </div>
    );
  }

  // Show the battle ending soonest
  const sorted = [...battles].sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime());
  const battle = sorted[0];
  const remaining = sorted.length - 1;

  const yourWinning = battle.yourVotes > battle.opponentVotes;
  const opponentWinning = battle.opponentVotes > battle.yourVotes;

  return (
    <div className="card-static p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-secondary" style={{ fontSize: 14, fontWeight: 500 }}>Active Battle</span>
        <span className="badge badge-cyan">{timeRemaining(battle.endsAt)}</span>
      </div>

      <div className="flex items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <img
            src={`https://assets.mintgarden.io/thumbnails/medium/${battle.yourNftId}.png`}
            alt={`Your Wojak #${battle.yourEdition}`}
            style={{
              width: 60,
              height: 60,
              borderRadius: 'var(--radius-md)',
              objectFit: 'cover',
              border: yourWinning ? '2px solid var(--color-success)' : opponentWinning ? '2px solid var(--color-error)' : '2px solid var(--color-border)',
            }}
          />
          <span style={{ fontSize: 13, color: yourWinning ? 'var(--color-success)' : opponentWinning ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
            {battle.yourVotes}
          </span>
        </div>

        <span className="text-muted" style={{ fontSize: 12 }}>VS</span>

        <div className="flex flex-col items-center gap-1">
          <img
            src={`https://assets.mintgarden.io/thumbnails/medium/${battle.opponentNftId}.png`}
            alt={`Opponent Wojak #${battle.opponentEdition}`}
            style={{
              width: 60,
              height: 60,
              borderRadius: 'var(--radius-md)',
              objectFit: 'cover',
              border: opponentWinning ? '2px solid var(--color-success)' : yourWinning ? '2px solid var(--color-error)' : '2px solid var(--color-border)',
            }}
          />
          <span style={{ fontSize: 13, color: opponentWinning ? 'var(--color-success)' : yourWinning ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
            {battle.opponentVotes}
          </span>
        </div>
      </div>

      <Link to="/games/your-wojak/battles" className="btn btn-secondary w-full text-center" style={{ fontSize: 13 }}>
        View Battle
      </Link>

      {remaining > 0 && (
        <Link to="/games/your-wojak/battles" className="text-accent text-center" style={{ fontSize: 12 }}>
          +{remaining} more active
        </Link>
      )}
    </div>
  );
}
