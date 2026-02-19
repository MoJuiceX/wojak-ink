/**
 * Battle Counter — shows daily battle usage
 *
 * Displays "Battles today: X/Y" with a progress bar.
 * If limit reached, shows upgrade prompt or "come back tomorrow".
 */

import { useQuery } from '@tanstack/react-query';
import { Zap, Clock, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SubscriptionStatus {
  tier: 'trial' | 'free' | 'premium';
  battlesPerDay: number;
  battlesToday: number;
  battlesRemaining: number;
  trialDaysRemaining?: number;
  expiresAt?: string;
}

interface BattleCounterProps {
  playerDid: string | null;
}

export function BattleCounter({ playerDid }: BattleCounterProps) {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription-status', playerDid],
    queryFn: async () => {
      if (!playerDid) return null;
      const res = await fetch(`/api/subscription/status?did=${encodeURIComponent(playerDid)}`);
      if (!res.ok) throw new Error('Failed to fetch subscription');
      const data = await res.json();
      return data as SubscriptionStatus;
    },
    enabled: !!playerDid,
    staleTime: 30000,
  });

  if (isLoading || !subscription) {
    return null;
  }

  const { battlesToday, battlesPerDay, battlesRemaining, tier } = subscription;
  const progress = battlesPerDay > 0 ? (battlesToday / battlesPerDay) * 100 : 0;
  const limitReached = battlesRemaining <= 0;

  // Choose icon based on tier
  const TierIcon = tier === 'premium' ? Crown : tier === 'trial' ? Clock : Zap;
  const tierColor = tier === 'premium'
    ? 'var(--color-gold)'
    : tier === 'trial'
      ? 'var(--color-cyan)'
      : 'var(--color-primary)';

  return (
    <div
      className="card p-3 flex flex-col gap-2 w-full"
      style={{
        borderColor: limitReached ? 'var(--color-error)' : 'var(--color-border)',
        borderWidth: 1,
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TierIcon size={16} style={{ color: tierColor }} />
          <span className="text-sm font-medium">
            Battles Today
          </span>
        </div>
        <span
          className="text-sm font-bold"
          style={{ color: limitReached ? 'var(--color-error)' : 'var(--color-text)' }}
        >
          {battlesToday} / {battlesPerDay}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 6, background: 'var(--color-white-5)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(progress, 100)}%`,
            background: limitReached
              ? 'var(--color-error)'
              : tier === 'premium'
                ? 'var(--color-gold)'
                : 'var(--color-primary)',
          }}
        />
      </div>

      {/* Limit reached message */}
      {limitReached && (
        <div className="flex items-center justify-between text-sm pt-1">
          <span className="text-error">Daily limit reached</span>
          {tier === 'free' ? (
            <Link
              to="/fight-club"
              className="text-primary font-medium hover:underline"
            >
              Upgrade to Premium
            </Link>
          ) : (
            <span className="text-secondary">Come back tomorrow</span>
          )}
        </div>
      )}

      {/* Remaining battles hint */}
      {!limitReached && battlesRemaining <= 2 && battlesRemaining > 0 && (
        <p className="text-secondary text-xs">
          {battlesRemaining === 1 ? '1 battle remaining today' : `${battlesRemaining} battles remaining today`}
        </p>
      )}
    </div>
  );
}
