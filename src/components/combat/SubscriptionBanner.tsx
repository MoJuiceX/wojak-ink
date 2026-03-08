/**
 * Subscription Banner for Fight Club
 *
 * Shows subscription status and handles premium payment flow.
 * - Trial: Shows days remaining
 * - Free: Shows upgrade CTA
 * - Premium: Shows badge with expiry
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Crown, Clock, Zap } from 'lucide-react';
import { useSageWallet } from '@/sage-wallet';
import { useToast } from '@/contexts/ToastContext';
import { API_ENDPOINTS } from '@/services/constants';

interface SubscriptionStatus {
  tier: 'trial' | 'free' | 'premium';
  battlesPerDay: number;
  battlesToday: number;
  battlesRemaining: number;
  trialDaysRemaining?: number;
  expiresAt?: string;
}

// Treasury address from environment
const TREASURY_ADDRESS = import.meta.env.VITE_TREASURY_XCH_ADDRESS || '';
const PREMIUM_PRICE_XCH = 1.0;

interface SubscriptionBannerProps {
  playerDid: string | null;
}

export function SubscriptionBanner({ playerDid }: SubscriptionBannerProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { sendXCH, status: walletStatus } = useSageWallet();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  // Fetch subscription status
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription-status', playerDid],
    queryFn: async () => {
      if (!playerDid) return null;
      const res = await fetch(`${API_ENDPOINTS.subscriptionStatus}?did=${encodeURIComponent(playerDid)}`);
      if (!res.ok) throw new Error('Failed to fetch subscription');
      const data = await res.json();
      return data as SubscriptionStatus;
    },
    enabled: !!playerDid,
    staleTime: 30000, // 30 seconds
  });

  // Payment mutation
  const payMutation = useMutation({
    mutationFn: async (txId: string) => {
      const res = await fetch('/api/subscription/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did: playerDid, txId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Payment failed');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Premium activated! Enjoy 4 battles/day.');
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Payment verification failed');
    },
  });

  const handleSubscribe = async () => {
    if (!playerDid || walletStatus !== 'connected') {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!TREASURY_ADDRESS) {
      toast.error('Payment system not configured');
      return;
    }

    setIsPaying(true);
    try {
      // Send XCH via wallet
      const txId = await sendXCH(TREASURY_ADDRESS, PREMIUM_PRICE_XCH);

      // Record payment on backend
      await payMutation.mutateAsync(txId);
      setShowConfirm(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Payment failed';
      if (!msg.includes('cancelled')) {
        toast.error(msg);
      }
    } finally {
      setIsPaying(false);
    }
  };

  if (isLoading || !subscription) {
    return null;
  }

  // Premium badge (compact)
  if (subscription.tier === 'premium') {
    const expiresDate = subscription.expiresAt ? new Date(subscription.expiresAt) : null;
    const daysLeft = expiresDate
      ? Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;
    const showRenew = daysLeft <= 7;

    return (
      <div className="flex items-center gap-2 mb-1">
        <span
          className="badge flex items-center gap-1"
          style={{ background: 'var(--color-gold-15)', color: 'var(--color-gold)' }}
        >
          <Crown size={12} />
          Premium
        </span>
        {expiresDate && (
          <span className="text-secondary text-sm">
            {daysLeft} days left
          </span>
        )}
        {showRenew && (
          <button
            type="button"
            className="btn btn-ghost text-sm"
            onClick={() => setShowConfirm(true)}
            disabled={isPaying}
            style={{ padding: '4px 8px' }}
          >
            Renew
          </button>
        )}
      </div>
    );
  }

  // Trial banner
  if (subscription.tier === 'trial') {
    return (
      <div
        className="card p-3 mb-1 flex items-center gap-3"
        style={{ borderColor: 'var(--color-cyan)', borderWidth: 1 }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-cyan-15)',
            flexShrink: 0,
          }}
        >
          <Clock size={18} style={{ color: 'var(--color-cyan)' }} />
        </div>
        <div className="flex-1">
          <p className="font-medium" style={{ fontSize: 14 }}>
            Free Trial: {subscription.trialDaysRemaining} days left
          </p>
          <p className="text-secondary" style={{ fontSize: 12 }}>
            {subscription.battlesPerDay} battles/day
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost text-sm"
          onClick={() => setShowConfirm(true)}
          style={{ padding: '6px 10px' }}
        >
          Subscribe
        </button>
      </div>
    );
  }

  // Free tier banner (upgrade CTA)
  return (
    <>
      <div
        className="card p-3 mb-1 flex items-center gap-3"
        style={{ borderColor: 'var(--color-primary)', borderWidth: 1 }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary-15)',
            flexShrink: 0,
          }}
        >
          <Zap size={18} className="text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-medium" style={{ fontSize: 14 }}>
            Free Plan: 1 battle/day
          </p>
          <p className="text-secondary" style={{ fontSize: 12 }}>
            Upgrade for 4 battles/day — 1 XCH/month
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary text-sm"
          onClick={() => setShowConfirm(true)}
          style={{ padding: '6px 12px' }}
        >
          Subscribe
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={() => !isPaying && setShowConfirm(false)}
        >
          <div
            className="card p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <div
                className="p-3 rounded-full"
                style={{ background: 'var(--color-gold-15)' }}
              >
                <Crown size={28} style={{ color: 'var(--color-gold)' }} />
              </div>
            </div>
            <h2 className="text-xl font-bold text-center mb-2">
              Upgrade to Premium
            </h2>
            <p className="text-secondary text-center mb-4">
              Get 4 battles per day for 30 days
            </p>
            <div
              className="p-3 rounded-lg mb-4 text-center"
              style={{ background: 'var(--color-white-5)' }}
            >
              <p className="text-2xl font-bold">1 XCH</p>
              <p className="text-secondary text-sm">per month</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={() => setShowConfirm(false)}
                disabled={isPaying}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary flex-1"
                onClick={handleSubscribe}
                disabled={isPaying || walletStatus !== 'connected'}
              >
                {isPaying ? 'Processing...' : 'Pay 1 XCH'}
              </button>
            </div>
            {walletStatus !== 'connected' && (
              <p className="text-error text-sm text-center mt-3">
                Connect wallet to subscribe
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
