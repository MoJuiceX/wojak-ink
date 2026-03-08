// Active Battle Card — shows current battle on the dashboard (spectator, no scores).
import { useState, useEffect } from 'react';
import { Swords } from 'lucide-react';
import { Link } from 'react-router-dom';

const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' fill='%2312121a'%3E%3Crect width='200' height='200' rx='14'/%3E%3Ctext x='100' y='108' text-anchor='middle' fill='%23606070' font-size='14' font-family='system-ui'%3EImage unavailable%3C/text%3E%3C/svg%3E";

interface BattleNft {
  id: string;
  edition: number;
  ownerDid: string;
  name: string;
  imageUri?: string;
}

interface Battle {
  id: number;
  nftA: BattleNft;
  nftB: BattleNft;
  status: string;
  endsAt: string;
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
    fetch(`/api/game/battle-list?voterDid=${did}&status=active`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        if (!cancelled && data.success) setBattles(data.battles || []);
      })
      .catch((err) => console.warn('[ActiveBattleCard] Fetch error:', err))
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

  if (battles.length === 0) {
    return (
      <div className="card-static p-4 flex flex-col items-center gap-2">
        <Swords size={24} className="text-muted" />
        <span className="text-muted" style={{ fontSize: 13 }}>No active battles</span>
        <Link to="/fight-club/battle" className="btn btn-primary" style={{ fontSize: 13 }}>
          Find a Battle
        </Link>
      </div>
    );
  }

  // Show the battle ending soonest
  const sorted = [...battles].sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime());
  const battle = sorted[0];
  const remaining = sorted.length - 1;

  // Guard against missing NFT data
  if (!battle.nftA || !battle.nftB) return null;

  // Determine which side is "yours" based on DID
  const isA = battle.nftA.ownerDid === did;
  const yourNft = isA ? battle.nftA : battle.nftB;
  const opponentNft = isA ? battle.nftB : battle.nftA;

  return (
    <div className="card-static p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-secondary" style={{ fontSize: 14, fontWeight: 500 }}>Active Battle</span>
        <span className="badge badge-cyan">{timeRemaining(battle.endsAt)}</span>
      </div>

      <div className="flex items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <Link to={`/fight-club/rankings`}>
            <img
              src={yourNft.imageUri || `https://assets.mainnet.mintgarden.io/thumbnails/medium/${yourNft.id}.png`}
              alt={yourNft.name}
              onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
              style={{
                width: 60,
                height: 60,
                borderRadius: 'var(--radius-md)',
                objectFit: 'cover',
                border: '2px solid var(--color-primary)',
              }}
            />
          </Link>
          <span className="text-xs text-secondary">You</span>
        </div>

        <span className="text-muted" style={{ fontSize: 12 }}>VS</span>

        <div className="flex flex-col items-center gap-1">
          <Link to={`/fight-club/rankings`}>
            <img
              src={opponentNft.imageUri || `https://assets.mainnet.mintgarden.io/thumbnails/medium/${opponentNft.id}.png`}
              alt={opponentNft.name}
              onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
              style={{
                width: 60,
                height: 60,
                borderRadius: 'var(--radius-md)',
                objectFit: 'cover',
                border: '2px solid var(--color-border)',
              }}
            />
          </Link>
          <span className="text-xs text-muted">#{opponentNft.edition}</span>
        </div>
      </div>

      <p className="text-xs text-secondary text-center">Scores hidden until battle ends</p>

      <Link to="/fight-club/battle" className="btn btn-secondary w-full text-center" style={{ fontSize: 13 }}>
        View Battle
      </Link>

      {remaining > 0 && (
        <Link to="/fight-club/battle" className="text-accent text-center" style={{ fontSize: 12 }}>
          +{remaining} more active
        </Link>
      )}
    </div>
  );
}
