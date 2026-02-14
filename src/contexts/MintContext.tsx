/* eslint-disable react-refresh/only-export-components */
/**
 * MintContext
 *
 * Credits (free mints), mint flow state, and collection supply for the Generator.
 * Fetches credits from /api/credits/balance and supply from trade values / MintGarden.
 *
 * AUDIT FIX: Added acceptOfferInWallet() to call takeOffer via WalletConnect,
 * then confirm the mint via /api/mint/confirm. Added confirmMintManual() for
 * users who already accepted the offer outside the flow.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
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
  | 'confirm'
  | 'signing'
  | 'submitting'
  | 'accepting'
  | 'success'
  | 'error';

export interface PendingMintInfo {
  mintId: number;
  offerFile: string | null;
  expiresAt: string | null;
  totalPriceXch: number | null;
}

export interface MintSuccessInfo {
  mintNumber: number;
  launcherId: string | null;
  mintgardenUrl: string | null;
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
  pendingMint: PendingMintInfo | null;
  successResult: MintSuccessInfo | null;
  errorMessage: string | null;
  startMint: (
    imageBlob: Blob,
    selectedLayers: Record<string, string>,
    selectedColors: Record<string, string>,
    mintType: 'free' | 'paid'
  ) => Promise<void>;
  acceptOfferInWallet: () => Promise<void>;
  confirmMintManual: () => Promise<void>;
  resetMintFlow: () => void;
  totalMinted: number;
  maxSupply: number;
  refetchCredits: () => Promise<void>;
  getTraitPricing: (category: string, traitDisplayName: string) => TraitPricingEntry | null;
  getTotalMintPrice: () => TotalMintPrice;
}

const DEFAULT_MAX_SUPPLY = 4200;

const MintContext = createContext<MintContextValue | null>(null);

// ============ Provider ============

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

const BASE_PRICE_XCH = 0.2;
const PRICING_REFRESH_MS = 60_000;

export function MintProvider({ children }: { children: ReactNode }) {
  const { address, status: walletStatus, takeOffer } = useSageWallet();
  const [credits, setCredits] = useState<MintCredits | null>(null);
  const [mintStep, setMintStep] = useState<MintStep>('idle');
  const [pendingMint, setPendingMint] = useState<PendingMintInfo | null>(null);
  const [successResult, setSuccessResult] = useState<MintSuccessInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [totalMinted, setTotalMinted] = useState(0);
  const [maxSupply, setMaxSupply] = useState(DEFAULT_MAX_SUPPLY);
  const [traitPricing, setTraitPricing] = useState<Record<string, { usageCount: number; effectiveUsage: number; surchargeXch: number; fairShare: number }>>({});
  const metadataAttributes = useMetadataAttributes();

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

  // Resume pending paid mint on load (e.g. after reload during countdown)
  useEffect(() => {
    if (walletStatus !== 'connected' || !address || !isValidChiaAddress(address)) return;
    let cancelled = false;
    fetch(`/api/mint/status?wallet=${encodeURIComponent(address)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.pending) return;
        setPendingMint({
          mintId: data.pending.mintId,
          offerFile: data.pending.offerFile ?? null,
          expiresAt: data.pending.expiresAt ?? null,
          totalPriceXch: data.pending.totalPriceXch ?? null,
        });
        setMintStep('signing');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [walletStatus, address]);

  // Fetch full pricing data (traits + supply) with 60s auto-refresh
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

  const resetMintFlow = useCallback(() => {
    setMintStep('idle');
    setPendingMint(null);
    setSuccessResult(null);
    setErrorMessage(null);
  }, []);

  const startMint = useCallback(
    async (
      imageBlob: Blob,
      selectedLayers: Record<string, string>,
      selectedColors: Record<string, string>,
      mintType: 'free' | 'paid'
    ) => {
      if (!address || !isValidChiaAddress(address)) {
        setMintStep('error');
        setErrorMessage('Wallet not connected');
        return;
      }
      setMintStep('submitting');
      setPendingMint(null);
      setSuccessResult(null);
      setErrorMessage(null);
      try {
        const imageBase64 = await blobToBase64(imageBlob);
        const res = await fetch('/api/mint/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: address,
            selectedLayers,
            selectedColors,
            imageBase64,
            mintType,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMintStep('error');
          setErrorMessage(data.error || 'Mint failed');
          return;
        }
        if (data.pending && data.mintId) {
          setPendingMint({
            mintId: data.mintId,
            offerFile: data.offerFile ?? null,
            expiresAt: data.expiresAt ?? null,
            totalPriceXch: data.totalPriceXch ?? null,
          });
          setMintStep('signing');
          refetchCredits();
          return;
        }
        if (data.success) {
          setSuccessResult({
            mintNumber: data.mintNumber ?? 0,
            launcherId: data.launcherId ?? null,
            mintgardenUrl: data.mintgardenUrl ?? null,
          });
          setMintStep('success');
          refetchCredits();
          return;
        }
        setMintStep('error');
        setErrorMessage('Unexpected response from server');
      } catch (err) {
        console.error('[MintContext] startMint error:', err);
        setMintStep('error');
        setErrorMessage(err instanceof Error ? err.message : 'Mint failed');
      }
    },
    [address, refetchCredits]
  );

  // Accept the offer in Sage wallet via WalletConnect, then confirm
  const acceptOfferInWallet = useCallback(async () => {
    if (!pendingMint?.offerFile || !address) return;

    setMintStep('accepting');
    setErrorMessage(null);
    try {
      // Send takeOffer to Sage wallet via WalletConnect
      await takeOffer(pendingMint.offerFile, 0);

      // Offer accepted — confirm the mint on the backend
      const res = await fetch('/api/mint/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mintId: pendingMint.mintId,
          walletAddress: address,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setSuccessResult({
          mintNumber: data.mintNumber ?? 0,
          launcherId: data.launcherId ?? null,
          mintgardenUrl: data.mintgardenUrl ?? null,
        });
        setMintStep('success');
        refetchCredits();
      } else if (data.pending) {
        // NFT not yet on-chain — stay on signing step
        setMintStep('signing');
      } else {
        setMintStep('error');
        setErrorMessage(data.error || 'Confirmation failed');
      }
    } catch (err) {
      console.error('[MintContext] acceptOfferInWallet error:', err);
      // User may have rejected in wallet — go back to signing
      setMintStep('signing');
    }
  }, [pendingMint, address, takeOffer, refetchCredits]);

  // Manual confirm for users who already accepted the offer outside the flow
  const confirmMintManual = useCallback(async () => {
    if (!pendingMint?.mintId || !address) return;

    setMintStep('submitting');
    setErrorMessage(null);
    try {
      const res = await fetch('/api/mint/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mintId: pendingMint.mintId,
          walletAddress: address,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setSuccessResult({
          mintNumber: data.mintNumber ?? 0,
          launcherId: data.launcherId ?? null,
          mintgardenUrl: data.mintgardenUrl ?? null,
        });
        setMintStep('success');
        refetchCredits();
      } else if (data.pending) {
        setMintStep('signing');
        setErrorMessage('NFT not confirmed yet. It may take a moment to appear on-chain.');
      } else {
        setMintStep('signing');
        setErrorMessage(data.error || 'Not confirmed yet');
      }
    } catch (err) {
      console.error('[MintContext] confirmMintManual error:', err);
      setMintStep('signing');
      setErrorMessage('Failed to confirm. Try again.');
    }
  }, [pendingMint, address, refetchCredits]);

  const value = useMemo<MintContextValue>(
    () => ({
      credits,
      mintStep,
      pendingMint,
      successResult,
      errorMessage,
      startMint,
      acceptOfferInWallet,
      confirmMintManual,
      resetMintFlow,
      totalMinted,
      maxSupply,
      refetchCredits,
      getTraitPricing,
      getTotalMintPrice,
    }),
    [credits, mintStep, pendingMint, successResult, errorMessage, startMint, acceptOfferInWallet, confirmMintManual, resetMintFlow, totalMinted, maxSupply, refetchCredits, getTraitPricing, getTotalMintPrice]
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
