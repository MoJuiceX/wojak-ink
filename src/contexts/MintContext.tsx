/* eslint-disable react-refresh/only-export-components */
/**
 * MintContext — Queue-Based Architecture
 *
 * Credits, mint flow state, collection supply, and job polling for the Generator.
 * Replaces synchronous prepare/confirm with async submit→poll→process model.
 *
 * Flow:
 *   1. User clicks Mint → prepareMint() stores params, sets step to 'confirming'
 *   2. User confirms → confirmMint() calls /api/mint/submit, starts polling
 *   3. Polling hits /api/mint/job every 3s, updates currentJob state
 *   4. Paid mints pause at 'awaiting_payment' → user confirms → confirmPayment()
 *   5. Polling detects 'completed'/'failed'/'refunded' → done
 *   6. On page reload: /api/mint/active-job detects in-progress job → resume polling
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useSageWallet } from '@/sage-wallet';
import { fetchCollectionStats } from '@/services/tradeValuesService';
import { useMetadataAttributes } from '@/components/generator/MetadataPreview';
import { isValidChiaAddress } from '@/lib/validation';

// ============ Types ============

export interface MintCredits {
  free_mints_available: number;
  balance?: number;
  earned?: number;
  spent?: number;
}

export type MintStep =
  | 'idle'
  | 'confirming'
  | 'submitted'
  | 'awaiting_payment'
  | 'success'
  | 'error';

export interface MintJob {
  jobId: number;
  step: string;
  mintType: 'paid' | 'free';
  stepLabel: string;
  stepNumber: number;
  totalSteps: number;
  mintNumber?: number;
  offerFile?: string;
  launcherId?: string;
  mintgardenUrl?: string;
  creditsSpent?: number;
  creditsRemaining?: number;
  error?: string;
  creditsRefunded?: boolean;
  createdAt?: string;
  expiresAt?: string;
}

export interface TraitPricingEntry {
  usageCount: number;
  surchargeXch: number;
}

export interface TotalMintPrice {
  basePrice: number;
  surchargeXch: number;
  surchargeTraitName: string;
  totalXch: number;
}

interface MintContextValue {
  credits: MintCredits | null;
  mintStep: MintStep;
  currentJob: MintJob | null;
  errorMessage: string | null;
  pendingMintType: 'free' | 'paid' | null;

  // Actions
  prepareMint: (
    imageBlob: Blob,
    selectedLayers: Record<string, string>,
    selectedColors: Record<string, string>,
    mintType: 'free' | 'paid'
  ) => void;
  confirmMint: () => Promise<void>;
  confirmPayment: (launcherId: string) => Promise<void>;
  acceptOfferInWallet: () => Promise<void>;
  confirmMintManual: () => Promise<void>;
  resetMintFlow: () => void;
  retryMint: () => void;

  // Supply
  totalMinted: number;
  maxSupply: number;

  // Credits
  refetchCredits: () => Promise<void>;

  // Pricing
  getTraitPricing: (category: string, traitDisplayName: string) => TraitPricingEntry | null;
  getTotalMintPrice: () => TotalMintPrice;
  isPremiumTrait: (category: string, traitName: string) => boolean;
  getPremiumCreditCost: (category: string, traitName: string) => number | null;
}

const DEFAULT_MAX_SUPPLY = 4200;
const BASE_PRICE_XCH = 0.2;
const PRICING_REFRESH_MS = 60_000;
const POLL_INTERVAL_ACTIVE = 3000;
const POLL_INTERVAL_AWAITING = 10000; // Slower polling during awaiting_payment (hits external API)
const POLL_MAX_DURATION = 10 * 60 * 1000; // 10 minutes

const MintContext = createContext<MintContextValue | null>(null);

// ============ Helpers ============

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64 || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ============ Provider ============

export function MintProvider({ children }: { children: ReactNode }) {
  const { address, status: walletStatus, takeOffer } = useSageWallet();
  const [credits, setCredits] = useState<MintCredits | null>(null);
  const [mintStep, setMintStep] = useState<MintStep>('idle');
  const [currentJob, setCurrentJob] = useState<MintJob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [totalMinted, setTotalMinted] = useState(0);
  const [maxSupply, setMaxSupply] = useState(DEFAULT_MAX_SUPPLY);
  const [traitPricing, setTraitPricing] = useState<Record<string, { usageCount: number; effectiveUsage: number; surchargeXch: number; fairShare: number }>>({});
  const [pendingMintParams, setPendingMintParams] = useState<{
    imageBlob: Blob;
    selectedLayers: Record<string, string>;
    selectedColors: Record<string, string>;
    mintType: 'free' | 'paid';
  } | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const metadataAttributes = useMetadataAttributes();

  // ── Credits ──

  const refetchCredits = useCallback(async () => {
    if (!address || !isValidChiaAddress(address)) return;
    try {
      const res = await fetch(`/api/credits/balance?wallet=${encodeURIComponent(address)}`);
      if (!res.ok) return;
      const data = await res.json();
      setCredits({
        free_mints_available: data.freeMints ?? 0,
        balance: data.balance,
        earned: data.earned,
        spent: data.spent,
      });
    } catch (err) {
      console.warn('[MintContext] Failed to fetch credits:', err);
      setCredits(null);
    }
  }, [address]);

  useEffect(() => {
    if (walletStatus !== 'connected' || !address) {
      setCredits(null);
      return;
    }
    refetchCredits();
  }, [walletStatus, address, refetchCredits]);

  // ── Pricing + Supply ──

  useEffect(() => {
    let cancelled = false;
    const fetchPricing = () => {
      fetch('/api/mint/pricing')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled) return;
          if (data?.supply) {
            setTotalMinted(data.supply.minted ?? 0);
            setMaxSupply(data.supply.total ?? DEFAULT_MAX_SUPPLY);
          }
          if (data?.traits) {
            setTraitPricing(data.traits);
          }
        })
        .catch(() => {
          if (cancelled) return;
          fetchCollectionStats()
            .then((stats) => {
              if (!cancelled) {
                setTotalMinted(stats.supply);
                setMaxSupply(stats.supply >= DEFAULT_MAX_SUPPLY ? stats.supply : DEFAULT_MAX_SUPPLY);
              }
            })
            .catch(() => {
              if (!cancelled) {
                setTotalMinted(0);
                setMaxSupply(DEFAULT_MAX_SUPPLY);
              }
            });
        });
    };

    fetchPricing();
    const intervalId = setInterval(fetchPricing, PRICING_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  // ── Trait Pricing Helpers ──

  const getTraitPricing = useCallback(
    (category: string, traitDisplayName: string): TraitPricingEntry | null => {
      const key = `${category}_${traitDisplayName}`;
      const entry = traitPricing[key];
      if (!entry) return null;
      return { usageCount: entry.usageCount, surchargeXch: entry.surchargeXch };
    },
    [traitPricing]
  );

  const getTotalMintPrice = useCallback((): TotalMintPrice => {
    let maxSurcharge = 0;
    let maxSurchargeTrait = '';

    for (const attr of metadataAttributes) {
      if (attr.trait_type === 'Base') continue;
      const key = `${attr.trait_type}_${attr.value}`;
      const entry = traitPricing[key];
      if (entry && entry.surchargeXch > maxSurcharge) {
        maxSurcharge = entry.surchargeXch;
        maxSurchargeTrait = attr.value;
      }
    }

    return {
      basePrice: BASE_PRICE_XCH,
      surchargeXch: Math.round(maxSurcharge * 100) / 100,
      surchargeTraitName: maxSurchargeTrait,
      totalXch: Math.round((BASE_PRICE_XCH + maxSurcharge) * 100) / 100,
    };
  }, [metadataAttributes, traitPricing]);

  // Premium trait identification: top 3 by surcharge per category
  const PREMIUM_TOP_N = 3;
  const premiumTraitKeys = useMemo(() => {
    const byCategory: Record<string, { key: string; surcharge: number }[]> = {};
    for (const [key, entry] of Object.entries(traitPricing)) {
      const sep = key.indexOf('_');
      if (sep < 0) continue;
      const cat = key.slice(0, sep);
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({ key, surcharge: entry.surchargeXch });
    }
    const premium = new Set<string>();
    for (const items of Object.values(byCategory)) {
      items.sort((a, b) => b.surcharge - a.surcharge);
      for (let i = 0; i < Math.min(PREMIUM_TOP_N, items.length); i++) {
        if (items[i].surcharge > 0) premium.add(items[i].key);
      }
    }
    return premium;
  }, [traitPricing]);

  const isPremiumTrait = useCallback(
    (category: string, traitName: string) => premiumTraitKeys.has(`${category}_${traitName}`),
    [premiumTraitKeys]
  );

  const getPremiumCreditCost = useCallback(
    (category: string, traitName: string): number | null => {
      const key = `${category}_${traitName}`;
      if (!premiumTraitKeys.has(key)) return null;
      const entry = traitPricing[key];
      if (!entry) return null;
      return Math.round(100 * (BASE_PRICE_XCH + entry.surchargeXch) / BASE_PRICE_XCH);
    },
    [premiumTraitKeys, traitPricing]
  );

  // ── Polling ──

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  }, []);

  const startPolling = useCallback((jobId: number, walletAddr: string, initialStep?: string) => {
    stopPolling();

    const poll = async () => {
      try {
        const res = await fetch(`/api/mint/job?id=${jobId}&wallet=${encodeURIComponent(walletAddr)}`);
        if (!res.ok) return;
        const data = await res.json() as MintJob;

        setCurrentJob(data);

        if (data.step === 'awaiting_payment') {
          setMintStep('awaiting_payment');

          // Auto-detect payment: call confirm-payment (no launcherId) to let
          // the server check if the NFT has appeared on-chain yet.
          // This handles users who accepted the offer directly in Sage.
          try {
            const confirmRes = await fetch('/api/mint/confirm-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ jobId, walletAddress: walletAddr }),
            });
            const confirmData = await confirmRes.json().catch(() => ({}));
            if (confirmData.success) {
              // Server finalized — next poll will pick up completed state
              return;
            }
            // pending = not yet on-chain, keep polling
          } catch {
            // Ignore — next poll will try again
          }
        }

        if (data.step === 'completed') {
          setMintStep('success');
          stopPolling();
          refetchCredits();
        }

        if (data.step === 'failed' || data.step === 'refunded') {
          setMintStep('error');
          setErrorMessage(data.error || 'Mint failed');
          stopPolling();
          if (data.creditsRefunded) {
            refetchCredits();
          }
        }
      } catch (err) {
        console.warn('[MintContext] Poll failed:', err);
      }
    };

    // Initial poll
    poll();

    // Start interval — use shorter interval for active processing,
    // slower during awaiting_payment (since each poll also hits MintGarden API)
    const interval = initialStep === 'awaiting_payment' ? POLL_INTERVAL_AWAITING : POLL_INTERVAL_ACTIVE;
    pollingRef.current = setInterval(poll, interval);

    // Safety: stop polling after 10 minutes
    pollingTimeoutRef.current = setTimeout(stopPolling, POLL_MAX_DURATION);
  }, [stopPolling, refetchCredits]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // Immediate re-poll when tab becomes visible (handles backgrounded tabs)
  useEffect(() => {
    if (!currentJob || !address) return;
    const terminalSteps = ['completed', 'failed', 'refunded'];
    if (terminalSteps.includes(currentJob.step)) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && pollingRef.current) {
        // Trigger an immediate poll instead of waiting for the next interval
        fetch(`/api/mint/job?id=${currentJob.jobId}&wallet=${encodeURIComponent(address)}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (!data) return;
            setCurrentJob(data as MintJob);
            if (data.step === 'awaiting_payment') setMintStep('awaiting_payment');
            if (data.step === 'completed') { setMintStep('success'); stopPolling(); refetchCredits(); }
            if (data.step === 'failed' || data.step === 'refunded') {
              setMintStep('error');
              setErrorMessage(data.error || 'Mint failed');
              stopPolling();
              if (data.creditsRefunded) refetchCredits();
            }
          })
          .catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [currentJob, address, stopPolling, refetchCredits]);

  // ── Page Reload Recovery ──

  useEffect(() => {
    if (walletStatus !== 'connected' || !address || !isValidChiaAddress(address)) return;
    if (mintStep !== 'idle') return; // Don't interfere with active flow

    let cancelled = false;
    fetch(`/api/mint/active-job?wallet=${encodeURIComponent(address)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.job) return;
        const job = data.job as MintJob;
        setCurrentJob(job);

        if (job.step === 'awaiting_payment') {
          setMintStep('awaiting_payment');
        } else if (job.step === 'completed') {
          setMintStep('success');
        } else if (job.step === 'failed' || job.step === 'refunded') {
          setMintStep('error');
          setErrorMessage(job.error || 'Mint failed');
        } else {
          setMintStep('submitted');
        }

        // Resume polling if job is still active
        if (!['completed', 'failed', 'refunded'].includes(job.step)) {
          startPolling(job.jobId, address, job.step);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [walletStatus, address, mintStep, startPolling]);

  // ── Mint Flow Actions ──

  const resetMintFlow = useCallback(() => {
    setMintStep('idle');
    setCurrentJob(null);
    setErrorMessage(null);
    setPendingMintParams(null);
    setIdempotencyKey(null);
    stopPolling();
  }, [stopPolling]);

  // Retry: reset flow back to idle but keep the same idempotency key for dedup
  const retryMint = useCallback(() => {
    setMintStep('idle');
    setCurrentJob(null);
    setErrorMessage(null);
    setPendingMintParams(null);
    // Keep idempotencyKey so the server deduplicates if the original submission succeeded
    stopPolling();
  }, [stopPolling]);

  // Step 1: Store params + show confirm modal
  const prepareMint = useCallback(
    (
      imageBlob: Blob,
      selectedLayers: Record<string, string>,
      selectedColors: Record<string, string>,
      mintType: 'free' | 'paid'
    ) => {
      setPendingMintParams({ imageBlob, selectedLayers, selectedColors, mintType });
      setIdempotencyKey(crypto.randomUUID());
      setMintStep('confirming');
      setErrorMessage(null);
      setCurrentJob(null);
    },
    []
  );

  // Step 2: Submit to /api/mint/submit
  const confirmMint = useCallback(async () => {
    if (!pendingMintParams || !address || !isValidChiaAddress(address)) return;
    const { imageBlob, selectedLayers, selectedColors, mintType } = pendingMintParams;
    const key = idempotencyKey || crypto.randomUUID();

    setMintStep('submitted');
    setErrorMessage(null);
    setPendingMintParams(null);

    try {
      const imageBase64 = await blobToBase64(imageBlob);

      const res = await fetch('/api/mint/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          selectedLayers,
          selectedColors,
          imageBase64,
          mintType,
          idempotencyKey: key,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        setMintStep('error');
        setErrorMessage(data.error || 'Mint submission failed');
        return;
      }

      // Job created — start polling
      setCurrentJob({
        jobId: data.jobId,
        step: data.step || 'queued',
        mintType: data.mintType || mintType,
        stepLabel: 'Preparing your mint...',
        stepNumber: 1,
        totalSteps: mintType === 'paid' ? 6 : 5,
        creditsSpent: data.creditCost,
      });

      startPolling(data.jobId, address);
    } catch (err) {
      console.error('[MintContext] confirmMint error:', err);
      setMintStep('error');
      setErrorMessage(err instanceof Error ? err.message : 'Mint failed');
    }
  }, [pendingMintParams, address, idempotencyKey, startPolling]);

  // Step 3 (paid): Confirm payment with launcher ID
  const confirmPayment = useCallback(async (launcherId: string) => {
    if (!currentJob || !address) return;

    try {
      const res = await fetch('/api/mint/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: currentJob.jobId,
          walletAddress: address,
          launcherId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (data.success) {
        // Polling will pick up the completed state
      } else if (data.pending) {
        // Not yet confirmed on-chain — keep waiting
      } else {
        setErrorMessage(data.error || 'Payment confirmation failed');
      }
    } catch (err) {
      console.error('[MintContext] confirmPayment error:', err);
    }
  }, [currentJob, address]);

  // Accept offer in Sage wallet via WalletConnect, then confirm
  const acceptOfferInWallet = useCallback(async () => {
    if (!currentJob?.offerFile || !address) return;

    try {
      // Send takeOffer to Sage wallet via WalletConnect
      await takeOffer(currentJob.offerFile, 0);

      // Offer accepted — call confirm-payment
      // Don't set step here; polling will pick up the server-side state
      const res = await fetch('/api/mint/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: currentJob.jobId,
          walletAddress: address,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        // Polling will catch the completion
      } else if (data.pending) {
        // Still pending — polling continues
      }
    } catch (err) {
      console.error('[MintContext] acceptOfferInWallet error:', err);
      // User may have rejected in wallet — stay on awaiting_payment
    }
  }, [currentJob, address, takeOffer]);

  // Manual confirm for users who already accepted the offer outside the flow
  const confirmMintManual = useCallback(async () => {
    if (!currentJob || !address) return;

    try {
      const res = await fetch('/api/mint/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: currentJob.jobId,
          walletAddress: address,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        // Polling picks up completed
      } else if (data.pending) {
        setErrorMessage('NFT not confirmed yet. It may take a moment to appear on-chain.');
      } else {
        setErrorMessage(data.error || 'Not confirmed yet');
      }
    } catch (err) {
      console.error('[MintContext] confirmMintManual error:', err);
      setErrorMessage('Failed to confirm. Try again.');
    }
  }, [currentJob, address]);

  // ── Context Value ──

  const value = useMemo<MintContextValue>(
    () => ({
      credits,
      mintStep,
      currentJob,
      errorMessage,
      pendingMintType: pendingMintParams?.mintType ?? null,
      prepareMint,
      confirmMint,
      confirmPayment,
      acceptOfferInWallet,
      confirmMintManual,
      resetMintFlow,
      retryMint,
      totalMinted,
      maxSupply,
      refetchCredits,
      getTraitPricing,
      getTotalMintPrice,
      isPremiumTrait,
      getPremiumCreditCost,
    }),
    [credits, mintStep, currentJob, errorMessage, pendingMintParams, prepareMint, confirmMint, confirmPayment, acceptOfferInWallet, confirmMintManual, resetMintFlow, retryMint, totalMinted, maxSupply, refetchCredits, getTraitPricing, getTotalMintPrice, isPremiumTrait, getPremiumCreditCost]
  );

  return <MintContext.Provider value={value}>{children}</MintContext.Provider>;
}

// ============ Hook ============

export function useMint(): MintContextValue {
  const ctx = useContext(MintContext);
  if (!ctx) {
    throw new Error('useMint must be used within MintProvider');
  }
  return ctx;
}
