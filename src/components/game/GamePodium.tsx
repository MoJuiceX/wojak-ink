// Game Podium — top 3 display with classic podium arrangement.
import { Link } from 'react-router-dom';
import { getTier } from '@/lib/tiers';
import { getPreferredIpfsUrl } from '@/utils/ipfs';

interface PodiumEntry {
  rank: number;
  did?: string;
  walletAddress?: string;
  displayName?: string | null;
  name?: string;
  nftId?: string;
  editionNumber?: number;
  powerLevel?: number;
  netScore?: number;
  imageUri?: string;
}

interface GamePodiumProps {
  entries: PodiumEntry[];
  mode: 'players' | 'wojaks';
}

const RANK_COLORS: Record<number, string> = {
  1: 'rgba(255, 215, 0, 0.9)',
  2: 'rgba(192, 192, 192, 0.8)',
  3: 'rgba(205, 127, 50, 0.8)',
};

const RANK_GLOWS: Record<number, string> = {
  1: '0 0 20px rgba(255, 215, 0, 0.3)',
  2: '0 0 12px rgba(192, 192, 192, 0.15)',
  3: '0 0 12px rgba(205, 127, 50, 0.15)',
};

function truncateWallet(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 7)}...${addr.slice(-3)}`;
}

function PodiumCard({ entry, mode, isFirst }: { entry: PodiumEntry; mode: 'players' | 'wojaks'; isFirst: boolean }) {
  const avatarSize = isFirst ? 64 : 48;
  const padding = isFirst ? 20 : 16;
  const scoreSize = isFirst ? 18 : 15;
  const glow = RANK_GLOWS[entry.rank] || 'none';

  const imageUrl = entry.imageUri
    ? (getPreferredIpfsUrl(entry.imageUri) || entry.imageUri)
    : undefined;

  return (
    <div
      className="card-static flex flex-col items-center gap-2"
      style={{ padding, boxShadow: glow, flex: 1, minWidth: 0 }}
    >
      {entry.editionNumber ? (
        <Link to={`/fight-club/rankings`} style={{ position: 'relative', display: 'block', cursor: 'pointer' }}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={entry.name || `#${entry.editionNumber || '?'}`}
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: 'var(--radius-md)',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className="text-muted" style={{ fontSize: 16 }}>?</span>
            </div>
          )}
          <span
            style={{
              position: 'absolute',
              top: -6,
              left: -6,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: RANK_COLORS[entry.rank] || 'var(--color-border)',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            #{entry.rank}
          </span>
        </Link>
      ) : (
        <div style={{ position: 'relative' }}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={entry.name || `#${entry.editionNumber || '?'}`}
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: 'var(--radius-md)',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className="text-muted" style={{ fontSize: 16 }}>?</span>
            </div>
          )}
          <span
            style={{
              position: 'absolute',
              top: -6,
              left: -6,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: RANK_COLORS[entry.rank] || 'var(--color-border)',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            #{entry.rank}
          </span>
        </div>
      )}

      {mode === 'players' ? (
        <>
          <span className="text-secondary" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
            {entry.displayName || (entry.walletAddress ? truncateWallet(entry.walletAddress) : 'Unknown')}
          </span>
          <span style={{ fontSize: scoreSize, fontWeight: 700 }}>
            {(entry.powerLevel || 0).toLocaleString()}
          </span>
          {entry.powerLevel != null && (
            <span className={`power-level-badge ${getTier(entry.powerLevel).class}`} style={{ fontSize: 11 }}>
              {getTier(entry.powerLevel).label}
            </span>
          )}
        </>
      ) : (
        <>
          {entry.editionNumber ? (
            <Link to={`/fight-club/rankings`} style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', color: 'inherit', textDecoration: 'none' }}>
              {entry.name || `Your Wojak #${entry.editionNumber}`}
            </Link>
          ) : (
            <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              {entry.name || 'Unknown Wojak'}
            </span>
          )}
          <span style={{ fontSize: scoreSize, fontWeight: 700 }}>
            +{entry.netScore || 0} votes
          </span>
          {(entry.displayName || entry.walletAddress) && (
            <span className="text-muted" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              by {entry.displayName || (entry.walletAddress ? truncateWallet(entry.walletAddress) : '')}
            </span>
          )}
        </>
      )}
    </div>
  );
}

export function GamePodium({ entries, mode }: GamePodiumProps) {
  if (entries.length === 0) {
    return (
      <div className="flex items-end justify-center gap-3">
        {[2, 1, 3].map(rank => (
          <div
            key={rank}
            className="card-static flex flex-col items-center gap-2"
            style={{ padding: rank === 1 ? 20 : 16, flex: 1, minWidth: 0 }}
          >
            <div
              style={{
                width: rank === 1 ? 64 : 48,
                height: rank === 1 ? 64 : 48,
                borderRadius: 'var(--radius-md)',
                border: '2px dashed var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className="text-muted" style={{ fontSize: 16 }}>?</span>
            </div>
            <span className="text-muted" style={{ fontSize: 12 }}>Unclaimed</span>
          </div>
        ))}
      </div>
    );
  }

  // Arrange: #2 left, #1 center, #3 right
  const ordered = [
    entries.find(e => e.rank === 2),
    entries.find(e => e.rank === 1),
    entries.find(e => e.rank === 3),
  ].filter(Boolean) as PodiumEntry[];

  return (
    <div className="flex items-end justify-center gap-3">
      {ordered.map(entry => (
        <PodiumCard key={entry.rank} entry={entry} mode={mode} isFirst={entry.rank === 1} />
      ))}
    </div>
  );
}
