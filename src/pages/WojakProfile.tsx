import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageTransition from '@/components/layout/PageTransition';
import { PageSEO } from '@/components/seo';

interface NftProfile {
  nft: {
    nftId: string | null;
    edition: number;
    name: string;
    customName: string | null;
    fullName: string;
    imageUri: string;
    ownerWallet: string | null;
    ownerDid: string | null;
    creatorWallet: string | null;
  };
  scores: {
    likes: number;
    dislikes: number;
    netScore: number;
    totalVotes: number;
  };
  battles: {
    total: number;
    wins: number;
    losses: number;
    draws: number;
    history: {
      id: number;
      opponentEdition: number;
      opponentName: string;
      result: 'win' | 'loss' | 'draw';
      scoreDelta: number;
      resolvedAt: string;
    }[];
  };
  sales: {
    date: string;
    price: string;
    currency: string;
    tokenCode: string | null;
    xchEquivalent: number;
    usdValue: number | null;
    source: string;
  }[];
}

function truncateWallet(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 7)}...${addr.slice(-3)}`;
}

function ProfileContent() {
  const { edition } = useParams<{ edition: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<NftProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!edition) return;
    setLoading(true);
    setError(false);
    fetch(`/api/game/wojak/${edition}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [edition]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4" style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
        <div className="skeleton" style={{ height: 24, width: 120 }} />
        <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
          <div className="skeleton" style={{ width: 200, height: 200, borderRadius: 'var(--radius-lg)' }} />
          <div className="flex flex-col gap-3 flex-1" style={{ minWidth: 200 }}>
            <div className="skeleton" style={{ height: 28, width: '80%' }} />
            <div className="skeleton" style={{ height: 16, width: '60%' }} />
            <div className="skeleton" style={{ height: 40, width: '100%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card-static p-8 flex flex-col items-center gap-4" style={{ maxWidth: 720, margin: '0 auto' }}>
        <h2 className="text-lg font-bold">NFT Not Found</h2>
        <p className="text-secondary text-sm">This Wojak doesn't exist or hasn't been minted yet.</p>
        <button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  const { nft, scores, battles, sales } = data;

  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: 720, margin: '0 auto', padding: 16, paddingBottom: 40 }}>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-secondary"
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0, alignSelf: 'flex-start' }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Hero: image + info */}
      <div className="flex gap-5" style={{ flexWrap: 'wrap' }}>
        {nft.imageUri ? (
          <img
            src={nft.imageUri}
            alt={nft.name}
            style={{
              width: 200,
              height: 200,
              borderRadius: 'var(--radius-lg)',
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span className="text-muted">No image</span>
          </div>
        )}

        <div className="flex flex-col gap-3 flex-1" style={{ minWidth: 200 }}>
          <div>
            <h1 className="text-xl font-bold">{nft.name}</h1>
            <span className="text-secondary" style={{ fontSize: 13 }}>
              Your Wojak #{nft.edition}
            </span>
          </div>

          {nft.ownerWallet && (
            <span className="text-muted" style={{ fontSize: 12 }}>
              Owned by {truncateWallet(nft.ownerWallet)}
            </span>
          )}

          <div className="card-static p-3 flex gap-4" style={{ flexWrap: 'wrap' }}>
            <div className="flex flex-col items-center">
              <span style={{ fontSize: 18, fontWeight: 700, color: scores.netScore >= 0 ? 'var(--color-primary)' : 'var(--color-error)' }}>
                {scores.netScore >= 0 ? '+' : ''}{scores.netScore}
              </span>
              <span className="text-muted" style={{ fontSize: 11 }}>net</span>
            </div>
            <div className="flex flex-col items-center">
              <span style={{ fontSize: 18, fontWeight: 700 }}>{scores.likes}</span>
              <span className="text-muted" style={{ fontSize: 11 }}>likes</span>
            </div>
            <div className="flex flex-col items-center">
              <span style={{ fontSize: 18, fontWeight: 700 }}>{scores.dislikes}</span>
              <span className="text-muted" style={{ fontSize: 11 }}>dislikes</span>
            </div>
            <div className="flex flex-col items-center">
              <span style={{ fontSize: 18, fontWeight: 700 }}>{scores.totalVotes}</span>
              <span className="text-muted" style={{ fontSize: 11 }}>total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Battle Record */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-secondary" style={{ fontSize: 14, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1 }}>
            Battle Record
          </h2>
          {battles.total > 0 && (
            <span className="text-muted" style={{ fontSize: 13 }}>
              {battles.wins}W - {battles.losses}L - {battles.draws}D
            </span>
          )}
        </div>

        {battles.history.length === 0 ? (
          <div className="card-static p-4 flex flex-col items-center gap-2">
            <span className="text-muted" style={{ fontSize: 13 }}>No battles yet.</span>
          </div>
        ) : (
          <div className="card-static flex flex-col">
            {battles.history.map(b => (
              <Link
                key={b.id}
                to={`/swipe/wojak/${b.opponentEdition}`}
                className="flex items-center gap-3"
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <span
                  className={`badge ${b.result === 'win' ? 'badge-success' : b.result === 'loss' ? '' : 'badge-cyan'}`}
                  style={b.result === 'loss' ? { background: 'rgba(239,68,68,0.15)', color: 'var(--color-error)' } : undefined}
                >
                  {b.result === 'win' ? 'Won' : b.result === 'loss' ? 'Lost' : 'Draw'}
                </span>
                <span className="text-secondary" style={{ fontSize: 13 }}>
                  vs {b.opponentName}
                </span>
                <span className="flex-1" />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: b.scoreDelta > 0 ? 'var(--color-primary)' : b.scoreDelta < 0 ? 'var(--color-error)' : 'var(--color-text-muted)',
                  }}
                >
                  {b.scoreDelta > 0 ? '+' : ''}{b.scoreDelta}
                </span>
                <span className="text-muted" style={{ fontSize: 12 }}>
                  {new Date(b.resolvedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Sales History */}
      <div className="flex flex-col gap-3">
        <h2 className="text-secondary" style={{ fontSize: 14, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1 }}>
          Sales History
        </h2>

        {sales.length === 0 ? (
          <div className="card-static p-4 flex flex-col items-center gap-2">
            <span className="text-muted" style={{ fontSize: 13 }}>No sales recorded.</span>
          </div>
        ) : (
          <div className="card-static flex flex-col">
            {sales.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-3"
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <span className="text-muted" style={{ fontSize: 12 }}>
                  {new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="flex-1" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  {s.price} {s.tokenCode || s.currency}
                </span>
                {s.usdValue != null && (
                  <span className="text-muted" style={{ fontSize: 12 }}>
                    ${s.usdValue.toFixed(2)}
                  </span>
                )}
                <span className="badge" style={{ fontSize: 10, textTransform: 'capitalize' }}>
                  {s.source}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WojakProfile() {
  const { edition } = useParams<{ edition: string }>();
  return (
    <>
      <PageSEO
        title={`Your Wojak #${edition || ''} — Wojak Swipe`}
        description={`Profile for Your Wojak #${edition || ''} — stats, battles, and sales history`}
        path={`/swipe/wojak/${edition || ''}`}
      />
      <PageTransition>
        <ProfileContent />
      </PageTransition>
    </>
  );
}
