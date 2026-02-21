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
import { useMetadataAttributes, type MetadataAttribute } from '@/components/generator/MetadataPreview';
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
  queuePosition?: number;
  queueTotal?: number;
  combat?: {
    type: string;
    nature: string;
    ability: string;
    moves: { id: string; name: string; power: number; accuracy: number; category: string; description: string }[];
  };
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

interface PendingMintParams {
  imageBlob: Blob;
  selectedLayers: Record<string, string>;
  selectedColors: Record<string, string>;
  mintType: 'free' | 'paid';
}

interface MintContextValue {
  credits: MintCredits | null;
  mintStep: MintStep;
  currentJob: MintJob | null;
  errorMessage: string | null;
  /** Seconds until rate limit resets (from 429 retryAfterSeconds); 0 or null when not rate limited */
  rateLimitRetryAfterSeconds: number | null;
  pendingMintType: 'free' | 'paid' | null;
  pendingMintParams: PendingMintParams | null;
  mintingPaused: boolean;
  customName: string;
  setCustomName: (name: string) => void;

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
  resetMintFlow: () => void;
  retryMint: () => void;

  // Supply
  totalMinted: number;
  maxSupply: number;

  // Credits
  refetchCredits: () => Promise<void>;

  // Pricing
  getTraitPricing: (category: string, traitDisplayName: string) => TraitPricingEntry | null;
  getTotalMintPrice: (attrs?: MetadataAttribute[]) => TotalMintPrice;
  isTop3Trait: (category: string, traitName: string) => boolean;
  top3Traits: Record<string, string[]>;
}

const DEFAULT_MAX_SUPPLY = 4200;
const BASE_PRICE_XCH = 0.2;
const PRICING_REFRESH_MS = 60_000;
const POLL_INTERVAL_ACTIVE = 3000;
const POLL_MAX_DURATION = 10 * 60 * 1000; // 10 minutes

// Progressive backoff intervals for awaiting_payment polling (hits MintGarden API each cycle)
const POLL_BACKOFF_SCHEDULE = [
  { afterMs: 0, intervalMs: 5000 },       // First 30s: every 5s
  { afterMs: 30_000, intervalMs: 10_000 }, // 30s-2min: every 10s
  { afterMs: 120_000, intervalMs: 15_000 },// 2-5min: every 15s
  { afterMs: 300_000, intervalMs: 20_000 },// 5min+: every 20s
];

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
  const [rateLimitRetryAfterSeconds, setRateLimitRetryAfterSeconds] = useState<number | null>(null);
  const [totalMinted, setTotalMinted] = useState(0);
  const [maxSupply, setMaxSupply] = useState(DEFAULT_MAX_SUPPLY);
  const [traitPricing, setTraitPricing] = useState<Record<string, { usageCount: number; effectiveUsage: number; surchargeXch: number }>>({});
  const [top3Traits, setTop3Traits] = useState<Record<string, string[]>>({});
  const [mintingPaused, setMintingPaused] = useState(false);
  const [pendingMintParams, setPendingMintParams] = useState<{
    imageBlob: Blob;
    selectedLayers: Record<string, string>;
    selectedColors: Record<string, string>;
    mintType: 'free' | 'paid';
  } | null>(null);
  const [customName, setCustomName] = useState('');
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
          if (data?.top3) {
            setTop3Traits(data.top3);
          }
          setMintingPaused(!!data?.mintingPaused);
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

  const getTotalMintPrice = useCallback((overrideAttrs?: MetadataAttribute[]): TotalMintPrice => {
    const attrs = overrideAttrs ?? metadataAttributes;
    let maxSurcharge = 0;
    let maxSurchargeTrait = '';

    for (const attr of attrs) {
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

  // Top-3 trait check: uses server-provided top3 list from /api/mint/pricing
  const isTop3Trait = useCallback(
    (category: string, traitName: string): boolean => {
      return (top3Traits[category] || []).includes(traitName);
    },
    [top3Traits]
  );

  // ── Polling ──

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  }, []);

  const pollingStartTimeRef = useRef<number>(0);
  const lastConfirmCallRef = useRef<number>(0);
  const currentStepRef = useRef<string>('');
  const isSubmittingRef = useRef<boolean>(false);
  const CONFIRM_DEDUP_MS = 10_000; // Don't call confirm-payment more than once per 10s

  const startPolling = useCallback((jobId: number, walletAddr: string, initialStep?: string) => {
    stopPolling();
    pollingStartTimeRef.current = Date.now();
    lastConfirmCallRef.current = 0;
    currentStepRef.current = initialStep || '';

    const poll = async () => {
      try {
        const res = await fetch(`/api/mint/job?id=${jobId}&wallet=${encodeURIComponent(walletAddr)}`);
        if (!res.ok) return;
        const data = await res.json() as MintJob;

        setCurrentJob(data);
        currentStepRef.current = data.step;

        if (data.step === 'awaiting_payment') {
          setMintStep('awaiting_payment');

          // Auto-detect payment: call confirm-payment (no launcherId) to let
          // the server check if the NFT has appeared on-chain yet.
          // Deduped: skip if called less than 10s ago to avoid burning rate limit.
          const now = Date.now();
          if (now - lastConfirmCallRef.current >= CONFIRM_DEDUP_MS) {
            lastConfirmCallRef.current = now;
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

    // Get the right interval based on current step and elapsed time.
    // Reads currentStepRef so the interval adapts when the step changes
    // (e.g. from processing to awaiting_payment).
    const getInterval = (): number => {
      if (currentStepRef.current !== 'awaiting_payment') return POLL_INTERVAL_ACTIVE;
      const elapsed = Date.now() - pollingStartTimeRef.current;
      // Find the highest matching backoff tier
      let interval = POLL_BACKOFF_SCHEDULE[0].intervalMs;
      for (const tier of POLL_BACKOFF_SCHEDULE) {
        if (elapsed >= tier.afterMs) interval = tier.intervalMs;
      }
      return interval;
    };

    // Initial poll
    poll();

    // Start with adaptive interval — re-schedule after each poll to adjust backoff
    const scheduleNext = () => {
      pollingRef.current = setTimeout(() => {
        poll().then(() => {
          if (pollingRef.current !== null) {
            scheduleNext(); // Schedule next poll with potentially updated interval
          }
        });
      }, getInterval()) as unknown as ReturnType<typeof setInterval>;
    };
    scheduleNext();

    // Safety: stop polling after 10 minutes
    pollingTimeoutRef.current = setTimeout(stopPolling, POLL_MAX_DURATION);
  }, [stopPolling, refetchCredits]);

  // Countdown for rate limit retry (so UI can show "Try again in X seconds")
  useEffect(() => {
    if (rateLimitRetryAfterSeconds == null || rateLimitRetryAfterSeconds <= 0) return;
    const id = setInterval(() => {
      setRateLimitRetryAfterSeconds((prev) => (prev == null || prev <= 1 ? null : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [rateLimitRetryAfterSeconds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // ── Stuck-mint detection: auto-fail if no progress for 60 seconds ──
  // Fix for the "stuck at step 1 of 6" bug: if processJob crashes silently
  // in waitUntil, the job sits in an intermediate state. Without this guard,
  // the user sees a spinner until the 10-minute polling timeout expires.
  // This detector fires after 60s of no step change and treats it as an error.
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSeenStepRef = useRef<string | null>(null);

  useEffect(() => {
    // Only monitor during active (non-terminal) states
    if (mintStep !== 'submitted') {
      if (stuckTimerRef.current) {
        clearTimeout(stuckTimerRef.current);
        stuckTimerRef.current = null;
      }
      lastSeenStepRef.current = null;
      return;
    }

    const currentStep = currentJob?.step;
    if (!currentStep) return;

    // Step changed → reset timer
    if (currentStep !== lastSeenStepRef.current) {
      lastSeenStepRef.current = currentStep;
      if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);

      stuckTimerRef.current = setTimeout(() => {
        // Still on the same non-terminal step after 60s → likely stuck
        console.warn(`[MintContext] Mint appears stuck at step '${currentStep}' for 60s — marking as error`);
        setMintStep('error');
        setErrorMessage('Minting took too long. Please try again.');
        stopPolling();
      }, 60_000);
    }

    return () => {
      if (stuckTimerRef.current) {
        clearTimeout(stuckTimerRef.current);
        stuckTimerRef.current = null;
      }
    };
  }, [mintStep, currentJob?.step, stopPolling]);

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
          .catch(() => { });
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

        // Restore idempotencyKey for dedup protection on recovered sessions
        if (data.job.idempotencyKey) {
          setIdempotencyKey(data.job.idempotencyKey);
        }

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
      .catch(() => { });
    return () => {
      cancelled = true;
    };
  }, [walletStatus, address, mintStep, startPolling]);

  // ── Mint Flow Actions ──

  const resetMintFlow = useCallback(() => {
    setRateLimitRetryAfterSeconds(null);
    setMintStep('idle');
    setCurrentJob(null);
    setErrorMessage(null);
    setPendingMintParams(null);
    setIdempotencyKey(null);
    stopPolling();
  }, [stopPolling]);

  // Retry: reset flow back to idle so the user can start a fresh mint attempt.
  // Clear idempotencyKey — pendingMintParams is already null, so the stale key
  // serves no dedup purpose and a fresh UUID will be generated in prepareMint().
  const retryMint = useCallback(() => {
    setMintStep('idle');
    setCurrentJob(null);
    setErrorMessage(null);
    setRateLimitRetryAfterSeconds(null);
    setPendingMintParams(null);
    setIdempotencyKey(null);
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
    if (isSubmittingRef.current) return; // Prevent double-submit (e.g. double-click before state updates)
    isSubmittingRef.current = true;

    // Capture key and params before any setState/await so duplicate calls use same idempotency key
    const params = pendingMintParams;
    const key = idempotencyKey || crypto.randomUUID();

    setMintStep('submitted');
    setErrorMessage(null);
    setPendingMintParams(null);

    try {
      const imageBase64 = await blobToBase64(params.imageBlob);

      const res = await fetch('/api/mint/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          selectedLayers: params.selectedLayers,
          selectedColors: params.selectedColors,
          imageBase64,
          mintType: params.mintType,
          idempotencyKey: key,
          customName: customName.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        setMintStep('error');
        setErrorMessage(data.error || 'Mint submission failed');
        setRateLimitRetryAfterSeconds(
          res.status === 429 && typeof data.retryAfterSeconds === 'number'
            ? Math.max(0, data.retryAfterSeconds)
            : null
        );
        return;
      }

      // Job created — start polling (use server step/label when present so we show step 2 right away)
      setCurrentJob({
        jobId: data.jobId,
        step: data.step || 'queued',
        mintType: data.mintType || params.mintType,
        stepLabel: data.stepLabel ?? 'Preparing your mint...',
        stepNumber: data.stepNumber ?? 1,
        totalSteps: data.totalSteps ?? (params.mintType === 'paid' ? 6 : 5),
        creditsSpent: data.creditCost,
      });

      startPolling(data.jobId, address);
    } catch (err) {
      console.error('[MintContext] confirmMint error:', err);
      setMintStep('error');
      setErrorMessage(err instanceof Error ? err.message : 'Mint failed');
    } finally {
      isSubmittingRef.current = false;
    }
  }, [pendingMintParams, address, idempotencyKey, customName, startPolling]);

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

  // Accept offer in Sage wallet via WalletConnect.
  // After takeOffer succeeds, polling + cleanup auto-finalize handle confirmation.
  // No manual confirm-payment call needed — the polling loop (lines 337-350)
  // already calls confirm-payment on each cycle during awaiting_payment.
  const acceptOfferInWallet = useCallback(async () => {
    if (!currentJob?.offerFile || !address) return;

    try {
      // Send takeOffer to Sage wallet via WalletConnect
      await takeOffer(currentJob.offerFile, 0);
      // Offer accepted — polling will auto-detect the payment and finalize
    } catch (err) {
      console.error('[MintContext] acceptOfferInWallet error:', err);
      // User may have rejected in wallet — stay on awaiting_payment
    }
  }, [currentJob, address, takeOffer]);

  // confirmMintManual removed — auto-finalize via polling + cleanup is the
  // official paid mint confirmation path. confirm-payment.ts is kept as an
  // admin/fallback endpoint but is no longer called from UI buttons.

  // ── Context Value ──

  const value = useMemo<MintContextValue>(
    () => ({
      credits,
      mintStep,
      currentJob,
      errorMessage,
      rateLimitRetryAfterSeconds,
      pendingMintType: pendingMintParams?.mintType ?? null,
      pendingMintParams,
      mintingPaused,
      customName,
      setCustomName,
      prepareMint,
      confirmMint,
      confirmPayment,
      acceptOfferInWallet,
      resetMintFlow,
      retryMint,
      totalMinted,
      maxSupply,
      refetchCredits,
      getTraitPricing,
      getTotalMintPrice,
      isTop3Trait,
      top3Traits,
    }),
    [credits, mintStep, currentJob, errorMessage, rateLimitRetryAfterSeconds, pendingMintParams, mintingPaused, customName, prepareMint, confirmMint, confirmPayment, acceptOfferInWallet, resetMintFlow, retryMint, totalMinted, maxSupply, refetchCredits, getTraitPricing, getTotalMintPrice, isTop3Trait, top3Traits]
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
