// Game Leaderboard List — rank #4+ rows with pagination.
import { getTier } from '@/components/game/PowerLevelDisplay';

interface PlayerEntry {
  rank: number;
  did: string;
  powerLevel: number;
  topNft?: { nftId: string; editionNumber: number } | null;
}

interface WojakEntry {
  rank: number;
  nftId: string;
  editionNumber: number;
  name: string;
  netScore: number;
  likes: number;
  totalVotes: number;
  ownerDid?: string | null;
}

interface GameLeaderboardListProps {
  mode: 'players' | 'wojaks';
  playerEntries?: PlayerEntry[];
  wojakEntries?: WojakEntry[];
  currentDid?: string;
  total: number;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

function truncateDid(did: string): string {
  if (did.length <= 12) return did;
  return `${did.slice(0, 6)}...${did.slice(-4)}`;
}

function PlayerRow({ entry, isCurrent }: { entry: PlayerEntry; isCurrent: boolean }) {
  const tier = getTier(entry.powerLevel);
  const imageUrl = entry.topNft
    ? `https://assets.mintgarden.io/thumbnails/medium/${entry.topNft.nftId}.png`
    : undefined;

  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        borderLeft: isCurrent ? '2px solid var(--color-primary)' : '2px solid transparent',
        background: isCurrent ? 'rgba(255,107,0,0.05)' : 'transparent',
      }}
    >
      <span className="text-muted" style={{ fontSize: 14, fontWeight: 500, width: 32, textAlign: 'right', flexShrink: 0 }}>
        {entry.rank}
      </span>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div
          style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--color-border)', flexShrink: 0 }}
        />
      )}
      <div className="flex items-center gap-2 flex-1" style={{ minWidth: 0 }}>
        <span className="text-secondary" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {truncateDid(entry.did)}
        </span>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: `var(--color-${tier.name === 'Legend' ? 'primary' : tier.name === 'Top Tier' ? 'cyan' : 'text-muted'})`,
            flexShrink: 0,
          }}
        />
      </div>
      <span style={{ fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
        {entry.powerLevel.toLocaleString()}
      </span>
    </div>
  );
}

function WojakRow({ entry, isOwned }: { entry: WojakEntry; isOwned: boolean }) {
  const likeRatio = entry.totalVotes > 0 ? Math.round((entry.likes / entry.totalVotes) * 100) : 0;

  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        borderLeft: isOwned ? '2px solid var(--color-primary)' : '2px solid transparent',
        background: isOwned ? 'rgba(255,107,0,0.05)' : 'transparent',
      }}
    >
      <span className="text-muted" style={{ fontSize: 14, fontWeight: 500, width: 32, textAlign: 'right', flexShrink: 0 }}>
        {entry.rank}
      </span>
      <img
        src={`https://assets.mintgarden.io/thumbnails/medium/${entry.nftId}.png`}
        alt={entry.name}
        style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0 }}
      />
      <div className="flex flex-col flex-1" style={{ minWidth: 0 }}>
        <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.name}
        </span>
        <span className="text-muted" style={{ fontSize: 11 }}>
          #{entry.editionNumber}
        </span>
      </div>
      <div className="flex flex-col items-end" style={{ flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>
          {entry.netScore >= 0 ? '+' : ''}{entry.netScore}
        </span>
        <span className="text-muted" style={{ fontSize: 11 }}>
          {likeRatio}% liked
        </span>
      </div>
    </div>
  );
}

export function GameLeaderboardList({
  mode,
  playerEntries,
  wojakEntries,
  currentDid,
  total,
  hasMore,
  loading,
  onLoadMore,
}: GameLeaderboardListProps) {
  const count = mode === 'players' ? (playerEntries?.length || 0) : (wojakEntries?.length || 0);

  if (loading && count === 0) {
    return (
      <div className="flex flex-col">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3" style={{ padding: '10px 14px' }}>
            <div className="skeleton" style={{ width: 32, height: 16 }} />
            <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)' }} />
            <div className="skeleton flex-1" style={{ height: 16 }} />
            <div className="skeleton" style={{ width: 60, height: 16 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {mode === 'players' && playerEntries?.map(entry => (
        <PlayerRow key={entry.did} entry={entry} isCurrent={entry.did === currentDid} />
      ))}

      {mode === 'wojaks' && wojakEntries?.map(entry => (
        <WojakRow key={entry.nftId} entry={entry} isOwned={entry.ownerDid === currentDid} />
      ))}

      {(count > 0 || total > 0) && (
        <div className="flex flex-col items-center gap-2 p-4">
          <span className="text-muted" style={{ fontSize: 12 }}>
            Showing {count} of {total} {mode === 'players' ? 'players' : 'wojaks'}
          </span>
          {hasMore && (
            <button
              className="btn btn-ghost"
              onClick={onLoadMore}
              disabled={loading}
              style={{ fontSize: 13 }}
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
