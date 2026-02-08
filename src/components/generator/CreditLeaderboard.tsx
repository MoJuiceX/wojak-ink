/**
 * Credit Leaderboard Component
 *
 * Lightbox modal showing top credit holders for Phase 2.
 * Accessible from the Generator via a trophy button.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Medal,
  Coins,
  Sparkles,
  X,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { useSageWallet } from '@/sage-wallet';
import { useMint } from '@/contexts/MintContext';

interface LeaderboardEntry {
  wallet_address: string;
  total_earned: number;
  total_spent: number;
  balance: number;
  free_mints_used: number;
  free_mints_available: number;
  rank: number;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  total_wallets: number;
  total_credits_issued: number;
}

interface CreditLeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
}

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy size={16} style={{ color: '#FFD700' }} />;
    case 2:
      return <Medal size={16} style={{ color: '#C0C0C0' }} />;
    case 3:
      return <Medal size={16} style={{ color: '#CD7F32' }} />;
    default:
      return <span className="text-xs text-muted w-4 text-center">{rank}</span>;
  }
}

export function CreditLeaderboard({ isOpen, onClose }: CreditLeaderboardProps) {
  const { address } = useSageWallet();
  const { credits } = useMint();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/credits/leaderboard?limit=25');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as LeaderboardData;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen, fetchLeaderboard]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 10000 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0"
          style={{
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(20px)',
          }}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="card relative w-full max-w-lg max-h-[80vh] flex flex-col"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <Trophy size={20} style={{ color: 'var(--color-primary)' }} />
              <h3 className="text-lg font-bold">Credit Leaderboard</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-ghost p-1.5"
                onClick={fetchLeaderboard}
                disabled={isLoading}
                aria-label="Refresh"
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              </button>
              <button
                className="btn btn-ghost p-1.5"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Your stats */}
          {credits && (
            <div
              className="mx-4 mt-4 rounded-xl p-3 flex items-center gap-3"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.15), rgba(255, 107, 0, 0.05))',
                border: '1px solid rgba(255, 107, 0, 0.3)',
              }}
            >
              <Wallet size={20} style={{ color: 'var(--color-primary)' }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-secondary">Your balance</div>
                <div className="font-bold flex items-center gap-2">
                  <Coins size={14} style={{ color: 'var(--color-primary)' }} />
                  <span>{credits.balance.toLocaleString()} credits</span>
                  <span className="text-xs text-secondary">
                    ({credits.free_mints_available} free mint{credits.free_mints_available !== 1 ? 's' : ''})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="flex-1 overflow-y-auto p-4">
            {error && (
              <div className="text-center text-secondary py-8">
                <p>{error}</p>
                <button className="btn btn-ghost mt-2 text-sm" onClick={fetchLeaderboard}>
                  Retry
                </button>
              </div>
            )}

            {isLoading && !data && (
              <div className="text-center text-secondary py-8">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                Loading...
              </div>
            )}

            {data && data.entries.length === 0 && (
              <div className="text-center text-secondary py-8">
                <Sparkles size={32} className="mx-auto mb-2 opacity-50" />
                <p>No credits issued yet.</p>
                <p className="text-xs mt-1">Buy Wojak Farmers Plot NFTs to earn credits!</p>
              </div>
            )}

            {data && data.entries.length > 0 && (
              <div className="flex flex-col gap-2">
                {/* Header */}
                <div className="flex items-center gap-3 px-3 py-1 text-xs text-muted font-medium">
                  <span className="w-6">#</span>
                  <span className="flex-1">Wallet</span>
                  <span className="w-20 text-right">Credits</span>
                  <span className="w-16 text-right">Free Mints</span>
                </div>

                {data.entries.map((entry) => {
                  const isYou = address && entry.wallet_address === address;

                  return (
                    <motion.div
                      key={entry.wallet_address}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{
                        background: isYou
                          ? 'rgba(255, 107, 0, 0.1)'
                          : 'rgba(255, 255, 255, 0.03)',
                        border: isYou
                          ? '1px solid rgba(255, 107, 0, 0.3)'
                          : '1px solid transparent',
                      }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: entry.rank * 0.03 }}
                    >
                      <div className="w-6 flex justify-center">
                        {getRankIcon(entry.rank)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">
                          {isYou ? 'You' : shortenAddress(entry.wallet_address)}
                        </span>
                        {isYou && (
                          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full" style={{
                            background: 'rgba(255, 107, 0, 0.2)',
                            color: 'var(--color-primary)',
                          }}>
                            you
                          </span>
                        )}
                      </div>
                      <span className="w-20 text-right text-sm font-medium">
                        {entry.balance.toLocaleString()}
                      </span>
                      <span className="w-16 text-right text-sm text-secondary">
                        {entry.free_mints_available}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer stats */}
          {data && (
            <div
              className="px-4 py-3 flex items-center justify-between text-xs text-muted"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <span>{data.total_wallets} collector{data.total_wallets !== 1 ? 's' : ''}</span>
              <span>{data.total_credits_issued?.toLocaleString() || 0} total credits issued</span>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default CreditLeaderboard;
