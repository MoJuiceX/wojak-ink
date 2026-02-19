/**
 * Credit Leaderboard Component
 *
 * Two-section layout:
 *   1. "Your Credits" card — personal balance, free mints, usage (wallet connected)
 *   2. "Top Supporters" table — community ranking by credits earned
 *
 * Opens in a lightbox matching the gallery NFT lightbox size.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Star, Sparkles, Coins, Wallet } from 'lucide-react';
import { useSageWallet, SageConnectButton } from '@/sage-wallet';
import { Lightbox } from '@/components/ui/Lightbox';

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  earned: number;
  spent: number;
  balance: number;
  freeMints: number;
  mintsUsed: number;
  yourWojakBought: number;
}

interface UserCredits {
  earned: number;
  balance: number;
  freeMints: number;
  freeMintsUsed: number;
  paidMints: number;
  totalPurchases: number;
}

interface CreditLeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
}

function truncateWallet(wallet: string): string {
  if (!wallet || wallet.length < 14) return wallet;
  return `${wallet.slice(0, 8)}…${wallet.slice(-6)}`;
}

export function CreditLeaderboard({ isOpen, onClose }: CreditLeaderboardProps) {
  const { address, status } = useSageWallet();
  const [items, setItems] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const userRowRef = useRef<HTMLTableRowElement>(null);

  const isConnected = status === 'connected' && !!address;
  const userEntry = isConnected ? items.find((e) => e.wallet === address) : null;

  // Fetch leaderboard
  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    fetch('/api/credits/leaderboard?limit=100&sort=earned')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load leaderboard');
        return res.json();
      })
      .then((data) => {
        setItems(data.items || []);
      })
      .catch((err) => {
        setError(err.message || 'Something went wrong');
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  // Fetch personal balance (always when connected, for the personal card)
  useEffect(() => {
    if (!isOpen || !isConnected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserCredits(null);
      return;
    }
    fetch(`/api/credits/balance?wallet=${address}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setUserCredits({
            earned: data.earned ?? 0,
            balance: data.balance ?? 0,
            freeMints: data.freeMints ?? 0,
            freeMintsUsed: data.freeMintsUsed ?? 0,
            paidMints: data.paidMints ?? 0,
            totalPurchases: data.totalPurchases ?? 0,
          });
        } else {
          setUserCredits(null);
        }
      })
      .catch(() => setUserCredits(null));
  }, [isOpen, isConnected, address]);

  // Auto-scroll to user's row after data loads
  useEffect(() => {
    if (!loading && userRowRef.current) {
      setTimeout(() => {
        userRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [loading, items, address]);

  const scrollToUser = useCallback(() => {
    userRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  return (
    <Lightbox
      isOpen={isOpen}
      onClose={onClose}
      size="gallery"
    >
      <div className="flex flex-col h-full min-h-0">
        {loading && (
          <div className="flex items-center justify-center py-24 flex-1" role="status" aria-label="Loading">
            <Loader2 size={40} className="animate-spin text-accent" />
          </div>
        )}
        {error && (
          <p className="text-center text-secondary py-8">{error}</p>
        )}
        {!loading && !error && (
          <div className="flex-1 min-h-0 flex flex-col gap-4">

            {/* ── Your Credits Card ── */}
            {!isConnected ? (
              <div
                className="rounded-xl p-4 flex items-center justify-between"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className="flex items-center gap-3">
                  <Wallet size={20} className="text-muted" />
                  <span className="text-sm text-secondary">Connect wallet to see your credits</span>
                </div>
                <SageConnectButton
                  variant="glass"
                  size="sm"
                  connectText="Connect"
                />
              </div>
            ) : (
              <div
                className="rounded-xl p-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.08), rgba(255, 107, 0, 0.02))',
                  border: '1px solid rgba(255, 107, 0, 0.2)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-secondary uppercase tracking-wider">Your Credits</span>
                  {userEntry && (
                    <button
                      type="button"
                      onClick={scrollToUser}
                      className="text-xs font-medium hover:underline text-accent"
                    >
                      Rank #{userEntry.rank}
                    </button>
                  )}
                </div>

                {userCredits ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Credits Earned */}
                    <div className="flex flex-col">
                      <span className="text-[11px] text-muted mb-0.5">Credits Earned</span>
                      <span className="text-lg font-bold tabular-nums text-primary">
                        {userCredits.earned.toLocaleString()}
                      </span>
                    </div>
                    {/* Free Mints Available */}
                    <div className="flex flex-col">
                      <span className="text-[11px] text-muted mb-0.5">Free Mints</span>
                      <span
                        className="text-lg font-bold tabular-nums flex items-center gap-1.5"
                        style={{ color: userCredits.freeMints > 0 ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
                      >
                        <Sparkles size={16} />
                        {userCredits.freeMints}
                      </span>
                    </div>
                    {/* Free Mints Used */}
                    <div className="flex flex-col">
                      <span className="text-[11px] text-muted mb-0.5">Free Mints Used</span>
                      <span className="text-lg font-bold tabular-nums text-secondary">
                        {userCredits.freeMintsUsed}
                      </span>
                    </div>
                    {/* Paid Mints */}
                    <div className="flex flex-col">
                      <span className="text-[11px] text-muted mb-0.5">Paid Mints</span>
                      <span className="text-lg font-bold tabular-nums text-secondary flex items-center gap-1.5">
                        <Coins size={16} />
                        {userCredits.paidMints}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-2" role="status" aria-label="Loading">
                    <Loader2 size={16} className="animate-spin text-muted" />
                    <span className="text-sm text-muted">Loading...</span>
                  </div>
                )}

                {userCredits && userCredits.earned === 0 && (
                  <p className="text-xs text-muted mt-3">
                    Buy Wojak Farmers Plot NFTs to earn credits. 100 credits = 1 free mint.
                  </p>
                )}
              </div>
            )}

            {/* ── Top Supporters ── */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center gap-2 px-1 mb-2">
                <Star size={14} style={{ color: 'var(--color-gold)' }} />
                <span className="text-xs font-medium text-secondary uppercase tracking-wider">Top Supporters</span>
                <span className="text-xs text-muted">
                  — ranked by credits earned from Plot NFT purchases
                </span>
              </div>

              <div className="flex-1 min-h-0 overflow-auto">
                {items.length === 0 ? (
                  <p className="text-center text-muted py-8">No supporters yet</p>
                ) : (
                  <div className="rounded-xl overflow-hidden border border-[var(--color-border)]" style={{ background: 'var(--color-surface)' }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <th className="text-left py-2.5 px-3 text-muted font-medium w-10">#</th>
                          <th className="text-left py-2.5 px-3 text-muted font-medium">Wallet</th>
                          <th className="text-right py-2.5 px-3 text-muted font-medium" title="Total credits earned from Plot NFT purchases">Credits</th>
                          <th className="text-right py-2.5 px-3 text-muted font-medium" title="Total Your Wojak mints (free + paid)">Mints</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((entry) => {
                          const isCurrent = isConnected && entry.wallet === address;
                          const totalMints = entry.mintsUsed + entry.yourWojakBought;
                          const rankClass = entry.rank === 1 ? 'text-amber-400' : entry.rank === 2 ? 'text-slate-400' : entry.rank === 3 ? 'text-amber-700' : 'text-muted';
                          return (
                            <tr
                              key={entry.wallet}
                              ref={isCurrent ? userRowRef : undefined}
                              className="hover:bg-[var(--color-surface-hover)] transition-colors"
                              style={{
                                background: isCurrent ? 'rgba(255, 107, 0, 0.12)' : undefined,
                                borderLeft: isCurrent
                                  ? '3px solid var(--color-primary)'
                                  : entry.rank === 1 ? '3px solid #fbbf24'
                                  : entry.rank === 2 ? '3px solid #94a3b8'
                                  : entry.rank === 3 ? '3px solid #cd7f32'
                                  : undefined,
                              }}
                            >
                              <td className={`py-2.5 px-3 font-variant-numeric tabular-nums font-semibold ${isCurrent ? 'text-accent' : rankClass}`}>
                                {entry.rank}
                              </td>
                              <td
                                className="py-2.5 px-3 font-mono truncate max-w-[200px]"
                                title={entry.wallet}
                                style={isCurrent ? { color: 'var(--color-primary)' } : undefined}
                              >
                                {truncateWallet(entry.wallet)}
                                {isCurrent && (
                                  <span className="ml-1 text-xs font-semibold text-accent">(you)</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-variant-numeric tabular-nums font-semibold">
                                {entry.earned.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-variant-numeric tabular-nums text-secondary">
                                {totalMints > 0 ? totalMints : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Lightbox>
  );
}

export default CreditLeaderboard;
