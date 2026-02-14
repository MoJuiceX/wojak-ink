/**
 * Credit Leaderboard Component
 *
 * Shows top credit holders from /api/credits/leaderboard in a lightbox
 * matching the gallery NFT lightbox size. Close button top-right.
 * Wallet connect button + highlighted row for connected user.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Star } from 'lucide-react';
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

interface UserBalance {
  earned: number;
  balance: number;
  freeMints: number;
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
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const userRowRef = useRef<HTMLTableRowElement>(null);

  const isConnected = status === 'connected' && !!address;
  const userEntry = isConnected ? items.find((e) => e.wallet === address) : null;

  useEffect(() => {
    if (!isOpen) return;
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

  // Fetch individual balance when connected but not in top 100
  useEffect(() => {
    if (!isOpen || !isConnected || loading) return;
    const inList = items.some((e) => e.wallet === address);
    if (inList) {
      setUserBalance(null);
      return;
    }
    fetch(`/api/credits/balance?wallet=${address}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data && (data.earned > 0 || data.balance > 0)) {
          setUserBalance({
            earned: data.earned ?? 0,
            balance: data.balance ?? 0,
            freeMints: data.freeMints ?? Math.floor((data.balance ?? 0) / 100),
          });
        } else {
          setUserBalance(null);
        }
      })
      .catch(() => setUserBalance(null));
  }, [isOpen, isConnected, address, loading, items]);

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
          <div className="flex items-center justify-center py-24 flex-1">
            <Loader2 size={40} className="animate-spin text-accent" />
          </div>
        )}
        {error && (
          <p className="text-center text-secondary py-8">{error}</p>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="text-center text-muted py-12">No data yet</p>
        )}
        {!loading && !error && items.length > 0 && (
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Wallet status bar */}
            <div className="flex items-center justify-between px-1 pb-3">
              {!isConnected ? (
                <SageConnectButton
                  variant="glass"
                  size="sm"
                  connectText="Connect wallet to find yourself"
                />
              ) : (
                <div className="flex items-center gap-2 text-xs">
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#22c55e',
                      display: 'inline-block',
                      boxShadow: '0 0 6px rgba(34,197,94,0.5)',
                    }}
                  />
                  <span className="font-mono text-secondary">{truncateWallet(address)}</span>
                  {userEntry && (
                    <button
                      type="button"
                      onClick={scrollToUser}
                      className="text-accent hover:underline"
                    >
                      Rank #{userEntry.rank}
                    </button>
                  )}
                  {!userEntry && userBalance && (
                    <span className="text-muted">Not yet ranked</span>
                  )}
                </div>
              )}
            </div>

            {/* Leaderboard table */}
            <div className="flex-1 min-h-0 overflow-auto">
              <div className="rounded-xl overflow-hidden border border-[var(--color-border)]" style={{ background: 'var(--color-surface)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <th className="text-left py-3 px-4 text-muted font-medium w-12">#</th>
                      <th className="text-left py-3 px-4 text-muted font-medium">Wallet</th>
                      <th className="text-right py-3 px-4 text-muted font-medium">Credits</th>
                      <th className="text-right py-3 px-4 text-muted font-medium">Available</th>
                      <th className="text-right py-3 px-4 text-muted font-medium">Paid mint</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((entry) => {
                      const isCurrent = isConnected && entry.wallet === address;
                      const rankClass = entry.rank === 1 ? 'text-amber-400' : entry.rank === 2 ? 'text-slate-400' : entry.rank === 3 ? 'text-amber-700' : 'text-muted';
                      return (
                        <tr
                          key={entry.wallet}
                          ref={isCurrent ? userRowRef : undefined}
                          className="hover:bg-[var(--color-surface-hover)] transition-colors"
                          style={{
                            background: isCurrent ? 'rgba(255, 107, 0, 0.15)' : entry.rank <= 3 ? undefined : 'rgba(255,255,255,0.02)',
                            borderLeft: isCurrent
                              ? '3px solid var(--color-primary)'
                              : entry.rank === 1 ? '3px solid #fbbf24'
                              : entry.rank === 2 ? '3px solid #94a3b8'
                              : entry.rank === 3 ? '3px solid #cd7f32'
                              : undefined,
                          }}
                        >
                          <td className={`py-3 px-4 font-variant-numeric tabular-nums font-semibold ${isCurrent ? 'text-accent' : rankClass}`}>
                            <span className="flex items-center gap-1">
                              {isCurrent && <Star size={14} fill="var(--color-primary)" stroke="var(--color-primary)" />}
                              {entry.rank}
                            </span>
                          </td>
                          <td
                            className="py-3 px-4 font-mono truncate max-w-[180px]"
                            title={entry.wallet}
                            style={isCurrent ? { color: 'var(--color-primary)' } : undefined}
                          >
                            {truncateWallet(entry.wallet)}
                            {isCurrent && (
                              <span className="ml-1 text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>(you)</span>
                            )}
                          </td>
                          <td className={`py-3 px-4 text-right font-variant-numeric tabular-nums font-semibold ${isCurrent ? '' : ''}`}>
                            {entry.earned.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-variant-numeric tabular-nums text-secondary">
                            {entry.freeMints}
                          </td>
                          <td className="py-3 px-4 text-right font-variant-numeric tabular-nums text-secondary">
                            {entry.yourWojakBought}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* User not in top 100 card */}
              {isConnected && !userEntry && userBalance && (
                <div
                  className="mt-3 rounded-lg p-3 flex items-center gap-3 text-sm"
                  style={{
                    background: 'rgba(255, 107, 0, 0.1)',
                    border: '1px solid rgba(255, 107, 0, 0.25)',
                  }}
                >
                  <Star size={16} fill="var(--color-primary)" stroke="var(--color-primary)" />
                  <span>
                    You have <strong className="text-accent">{userBalance.earned.toLocaleString()}</strong> credits
                    ({userBalance.freeMints} free mint{userBalance.freeMints !== 1 ? 's' : ''})
                    — keep buying to climb the ranks!
                  </span>
                </div>
              )}

              <p className="text-muted text-xs mt-4 px-1">
                Credits earned from XCH purchases of Wojak Farmers Plot NFTs. 100 credits = 1 free mint.
              </p>
            </div>
          </div>
        )}
      </div>
    </Lightbox>
  );
}

export default CreditLeaderboard;
