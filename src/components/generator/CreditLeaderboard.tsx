/**
 * Credit Leaderboard Component
 *
 * Shows top credit holders from /api/credits/leaderboard in a lightbox
 * matching the gallery NFT lightbox size. Close button top-right.
 */

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useSageWallet } from '@/sage-wallet';
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

interface CreditLeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
}

function truncateWallet(wallet: string): string {
  if (!wallet || wallet.length < 14) return wallet;
  return `${wallet.slice(0, 8)}…${wallet.slice(-6)}`;
}

export function CreditLeaderboard({ isOpen, onClose }: CreditLeaderboardProps) {
  const { address } = useSageWallet();
  const [items, setItems] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <Lightbox
      isOpen={isOpen}
      onClose={onClose}
      title="Credit Leaderboard"
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
                    const isCurrent = address && entry.wallet === address;
                    const rankClass = entry.rank === 1 ? 'text-amber-400' : entry.rank === 2 ? 'text-slate-400' : entry.rank === 3 ? 'text-amber-700' : 'text-muted';
                    return (
                      <tr
                        key={entry.wallet}
                        className="hover:bg-[var(--color-surface-hover)] transition-colors"
                        style={{
                          background: isCurrent ? 'rgba(255, 107, 0, 0.08)' : entry.rank <= 3 ? undefined : 'rgba(255,255,255,0.02)',
                          borderLeft: entry.rank === 1 ? '3px solid #fbbf24' : entry.rank === 2 ? '3px solid #94a3b8' : entry.rank === 3 ? '3px solid #cd7f32' : undefined,
                        }}
                      >
                        <td className={`py-3 px-4 font-variant-numeric tabular-nums font-semibold ${rankClass}`}>
                          {entry.rank}
                        </td>
                        <td className="py-3 px-4 font-mono truncate max-w-[180px]" title={entry.wallet}>
                          {truncateWallet(entry.wallet)}
                          {isCurrent && (
                            <span className="ml-1 text-accent text-xs">(you)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-variant-numeric tabular-nums font-semibold">
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
            <p className="text-muted text-xs mt-4 px-1">
              Credits earned from XCH purchases of Wojak Farmers Plot NFTs. 100 credits = 1 free mint.
            </p>
          </div>
        )}
      </div>
    </Lightbox>
  );
}

export default CreditLeaderboard;
