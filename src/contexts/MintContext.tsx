/* eslint-disable react-refresh/only-export-components */
/**
 * Mint Context
 *
 * State management for Phase 2 "Your Wojak" minting.
 * Handles credit balance, pricing, mint flow, and supply tracking.
 * Reads wallet state from SageWalletProvider (app-level).
 */

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from 'react';
import { useSageWallet } from '@/sage-wallet';

// ============ Types ============

export type MintFlowStep =
  | 'idle'
  | 'preparing'      // Uploading image + calling backend
  | 'awaiting_offer'  // Offer returned, presenting to user
  | 'countdown'       // User sent to Sage, waiting for acceptance
  | 'confirming'      // Polling /api/mint/confirm
  | 'success'         // Mint confirmed!
  | 'failed'          // Something went wrong
  | 'expired';        // Offer timed out

export interface TraitSurcharge {
  trait_category: string;
  trait_name: string;
  usage_count: number;
  surcharge_xch: number;
}

export interface PricingData {
  base_price_xch: number;
  surcharges: TraitSurcharge[];
  highest_surcharge_xch: number;
  highest_surcharge_trait: string | null;
  total_price_xch: number;
  floor_price_xch: number;
  total_supply: number;
  max_supply: number;
}

export interface CreditBalance {
  wallet: string;
  total_earned: number;
  total_spent: number;
  balance: number;
  free_mints_available: number;
}

export interface PendingMint {
  mint_id: number;
  mint_number: number;
  nft_name: string;
  offer_file?: string;
  launcher_id?: string;
  expires_at?: string;
  total_price_xch?: number;
  base_price_xch?: number;
  surcharge_xch?: number;
  highest_surcharge_trait?: string;
  ipfs_image_uri?: string;
  ipfs_metadata_uri?: string;
  coin_id?: string;
  status?: string;
}

export interface MintContextType {
  // Credit state
  credits: CreditBalance | null;
  isLoadingCredits: boolean;
  refreshCredits: () => Promise<void>;

  // Pricing state
  pricing: PricingData | null;
  isLoadingPricing: boolean;
  fetchPricing: (layers: Record<string, string>) => Promise<void>;

  // Mint flow
  mintStep: MintFlowStep;
  pendingMint: PendingMint | null;
  mintError: string | null;
  mintingInProgress: boolean;
  countdownSeconds: number;

  // Actions
  startMint: (
    imageBlob: Blob,
    layers: Record<string, string>,
    colors: Record<string, string>,
    mintType: 'paid' | 'free'
  ) => Promise<void>;
  confirmPaidMint: () => Promise<void>;
  resetMintFlow: () => void;
  copyOfferToClipboard: () => Promise<boolean>;

  // Supply
  totalMinted: number;
  maxSupply: number;
}

const MintContext = createContext<MintContextType | null>(null);

// ============ API helpers ============

const API_BASE = '';  // Same origin

async function fetchApi<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ============ Provider ============

interface MintProviderProps {
  children: ReactNode;
}

export function MintProvider({ children }: MintProviderProps) {
  const { address, status: walletStatus, takeOffer } = useSageWallet();

  // Credit balance
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);

  // Pricing
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [isLoadingPricing, setIsLoadingPricing] = useState(false);

  // Mint flow
  const [mintStep, setMintStep] = useState<MintFlowStep>('idle');
  const [pendingMint, setPendingMint] = useState<PendingMint | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(0);

  // Supply
  const [totalMinted, setTotalMinted] = useState(0);
  const maxSupply = 4200;

  // Refs
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mintingInProgressRef = useRef(false);

  // ── Fetch credit balance ──
  const refreshCredits = useCallback(async () => {
    if (!address) {
      setCredits(null);
      return;
    }

    setIsLoadingCredits(true);
    try {
      const data = await fetchApi<CreditBalance>(
        `/api/credits/balance?wallet=${encodeURIComponent(address)}`
      );
      setCredits(data);
    } catch (err) {
      console.error('[MintContext] Failed to fetch credits:', err);
      setCredits(null);
    } finally {
      setIsLoadingCredits(false);
    }
  }, [address]);

  // Auto-fetch credits when wallet connects
  useEffect(() => {
    if (walletStatus === 'connected' && address) {
      refreshCredits();
    } else {
      setCredits(null);
    }
  }, [walletStatus, address, refreshCredits]);

  // ── Fetch pricing ──
  const fetchPricing = useCallback(async (layers: Record<string, string>) => {
    setIsLoadingPricing(true);
    try {
      const params = new URLSearchParams();
      for (const [category, traitName] of Object.entries(layers)) {
        if (traitName && traitName !== 'none' && traitName !== '') {
          params.append(`layer_${category}`, traitName);
        }
      }
      const data = await fetchApi<PricingData>(
        `/api/mint/pricing?${params.toString()}`
      );
      setPricing(data);
      setTotalMinted(data.total_supply || 0);
    } catch (err) {
      console.error('[MintContext] Failed to fetch pricing:', err);
    } finally {
      setIsLoadingPricing(false);
    }
  }, []);

  // ── Countdown timer ──
  const startCountdown = useCallback((expiresAt: string) => {
    // Clear any existing countdown
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      );
      setCountdownSeconds(remaining);

      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        setMintStep('expired');
      }
    };

    updateCountdown();
    countdownRef.current = setInterval(updateCountdown, 1000);
  }, []);

  // ── Clean up timers on unmount ──
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (confirmPollRef.current) clearInterval(confirmPollRef.current);
    };
  }, []);

  // ── Start mint ──
  const startMint = useCallback(
    async (
      imageBlob: Blob,
      layers: Record<string, string>,
      colors: Record<string, string>,
      mintType: 'paid' | 'free'
    ) => {
      if (mintingInProgressRef.current) {
        console.warn('[MintContext] Mint already in progress');
        return;
      }
      if (!address) {
        setMintError('Please connect your Sage wallet first');
        return;
      }

      mintingInProgressRef.current = true;
      setMintStep('preparing');
      setMintError(null);
      setPendingMint(null);

      try {
        // Build form data
        const formData = new FormData();
        formData.append('image', imageBlob, 'wojak.webp');
        formData.append('layers_json', JSON.stringify(layers));
        formData.append('colors_json', JSON.stringify(colors));
        formData.append('wallet', address);
        formData.append('mint_type', mintType);

        // Call prepare endpoint
        const response = await fetch('/api/mint/prepare', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            (errorData as { error?: string }).error || `Mint failed (${response.status})`
          );
        }

        const data = (await response.json()) as PendingMint;
        setPendingMint(data);

        if (mintType === 'free') {
          // Free mint completes immediately
          setMintStep('success');
          // Refresh credits after free mint
          refreshCredits();
        } else if (data.offer_file) {
          // Paid mint — present offer
          setMintStep('awaiting_offer');

          if (data.expires_at) {
            startCountdown(data.expires_at);
          }
        } else {
          throw new Error('No offer file returned from server');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setMintError(message);
        setMintStep('failed');
      } finally {
        mintingInProgressRef.current = false;
      }
    },
    [address, refreshCredits, startCountdown]
  );

  // ── Send offer to Sage wallet ──
  const sendOfferToWallet = useCallback(async () => {
    if (!pendingMint?.offer_file) {
      setMintError('No offer file available');
      return;
    }

    try {
      setMintStep('countdown');

      // Call chia_takeOffer via WalletConnect
      await takeOffer(pendingMint.offer_file, 0);

      // Offer was accepted — start polling for on-chain confirmation
      setMintStep('confirming');

      // Poll /api/mint/confirm every 5 seconds
      let pollCount = 0;
      const maxPolls = 60; // 5 minutes max

      confirmPollRef.current = setInterval(async () => {
        pollCount++;
        if (pollCount > maxPolls) {
          if (confirmPollRef.current) clearInterval(confirmPollRef.current);
          setMintError('Confirmation timed out. Your NFT may still be processing.');
          setMintStep('failed');
          return;
        }

        try {
          const result = await fetchApi<{
            status: string;
            retry?: boolean;
            nft_name?: string;
          }>('/api/mint/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mint_id: pendingMint.mint_id,
              launcher_id: pendingMint.launcher_id,
            }),
          });

          if (result.status === 'confirmed' || result.status === 'minted') {
            if (confirmPollRef.current) clearInterval(confirmPollRef.current);
            setMintStep('success');
          }
          // If status is 'pending' with retry: true, keep polling
        } catch {
          // Errors during polling are non-fatal, keep trying
          console.warn('[MintContext] Confirm poll failed, retrying...');
        }
      }, 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Wallet rejected the offer';
      setMintError(message);
      setMintStep('failed');
    }
  }, [pendingMint, takeOffer]);

  // ── Confirm paid mint (called from UI) ──
  const confirmPaidMint = useCallback(async () => {
    await sendOfferToWallet();
  }, [sendOfferToWallet]);

  // ── Copy offer to clipboard ──
  const copyOfferToClipboard = useCallback(async (): Promise<boolean> => {
    if (!pendingMint?.offer_file) return false;
    try {
      await navigator.clipboard.writeText(pendingMint.offer_file);
      return true;
    } catch {
      return false;
    }
  }, [pendingMint]);

  // ── Reset mint flow ──
  const resetMintFlow = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (confirmPollRef.current) clearInterval(confirmPollRef.current);
    setMintStep('idle');
    setPendingMint(null);
    setMintError(null);
    setCountdownSeconds(0);
    mintingInProgressRef.current = false;
  }, []);

  const contextValue: MintContextType = {
    credits,
    isLoadingCredits,
    refreshCredits,
    pricing,
    isLoadingPricing,
    fetchPricing,
    mintStep,
    pendingMint,
    mintError,
    mintingInProgress: mintingInProgressRef.current,
    countdownSeconds,
    startMint,
    confirmPaidMint,
    resetMintFlow,
    copyOfferToClipboard,
    totalMinted,
    maxSupply,
  };

  return (
    <MintContext.Provider value={contextValue}>
      {children}
    </MintContext.Provider>
  );
}

// ============ Hook ============

export function useMint(): MintContextType {
  const ctx = useContext(MintContext);
  if (!ctx) {
    throw new Error('useMint must be used within a MintProvider');
  }
  return ctx;
}
