// Game Leaderboard List — rank #4+ rows with pagination.
import { Link } from 'react-router-dom';
import { getTier } from '@/lib/tiers';
import { getPreferredIpfsUrl } from '@/utils/ipfs';

interface PlayerEntry {
  rank: number;
  did: string;
  walletAddress?: string;
  displayName?: string | null;
  powerLevel: number;
  topNft?: { nftId: string; editionNumber: number; imageUri?: string } | null;
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
  ownerWallet?: string | null;
  ownerDisplayName?: string | null;
  imageUri?: string;
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

function truncateWallet(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 7)}...${addr.slice(-3)}`;
}

function PlayerRow({ entry, isCurrent }: { entry: PlayerEntry; isCurrent: boolean }) {
  const tier = getTier(entry.powerLevel);
  const imageUrl = entry.topNft?.imageUri
    ? (getPreferredIpfsUrl(entry.topNft.imageUri) || entry.topNft.imageUri)
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
      {imageUrl && entry.topNft?.editionNumber ? (
        <Link to={`/fight-club/rankings`} style={{ flexShrink: 0 }}>
          <img
            src={imageUrl}
            alt=""
            style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', objectFit: 'cover' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </Link>
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div
          style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--color-border)', flexShrink: 0 }}
        />
      )}
      <div className="flex items-center gap-2 flex-1" style={{ minWidth: 0 }}>
        <span className="text-secondary" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.displayName || (entry.walletAddress ? truncateWallet(entry.walletAddress) : entry.did ? truncateWallet(entry.did) : 'Unknown')}
        </span>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: tier.class === 'tier-legend' ? 'var(--color-primary)' : tier.class === 'tier-top' ? 'var(--color-cyan)' : 'var(--color-text-muted)',
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
  const imageUrl = entry.imageUri
    ? (getPreferredIpfsUrl(entry.imageUri) || entry.imageUri)
    : undefined;

  return (
    <Link
      to={`/fight-club/rankings`}
      className="flex items-center gap-3"
      style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        borderLeft: isOwned ? '2px solid var(--color-primary)' : '2px solid transparent',
        background: isOwned ? 'rgba(255,107,0,0.05)' : 'transparent',
        textDecoration: 'none',
        color: 'inherit',
        cursor: 'pointer',
      }}
    >
      <span className="text-muted" style={{ fontSize: 14, fontWeight: 500, width: 32, textAlign: 'right', flexShrink: 0 }}>
        {entry.rank}
      </span>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={entry.name}
          style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div
          style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--color-border)', flexShrink: 0 }}
        />
      )}
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
    </Link>
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
              type="button"
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
