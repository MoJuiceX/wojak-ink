/* eslint-disable react-refresh/only-export-components */
/**
 * MintContext
 *
 * Credits (free mints), mint flow state, and collection supply for the Generator.
 * Fetches credits from /api/credits/balance and supply from trade values / MintGarden.
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

interface MintContextValue {
  credits: MintCredits | null;
  mintStep: MintStep;
  pendingMint: PendingMintInfo | null;
  successResult: MintSuccessInfo | null;
  startMint: (
    imageBlob: Blob,
    selectedLayers: Record<string, string>,
    selectedColors: Record<string, string>,
    mintType: 'free' | 'paid'
  ) => Promise<void>;
  resetMintFlow: () => void;
  totalMinted: number;
  maxSupply: number;
  refetchCredits: () => Promise<void>;
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

export function MintProvider({ children }: { children: ReactNode }) {
  const { address, status: walletStatus } = useSageWallet();
  const [credits, setCredits] = useState<MintCredits | null>(null);
  const [mintStep, setMintStep] = useState<MintStep>('idle');
  const [pendingMint, setPendingMint] = useState<PendingMintInfo | null>(null);
  const [successResult, setSuccessResult] = useState<MintSuccessInfo | null>(null);
  const [totalMinted, setTotalMinted] = useState(0);
  const [maxSupply, setMaxSupply] = useState(DEFAULT_MAX_SUPPLY);

  const refetchCredits = useCallback(async () => {
    if (!address || !address.startsWith('xch1')) return;
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
    if (walletStatus !== 'connected' || !address || !address.startsWith('xch1')) return;
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

  useEffect(() => {
    let cancelled = false;
    fetch('/api/mint/pricing')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.supply) {
          setTotalMinted(data.supply.minted ?? 0);
          setMaxSupply(data.supply.total ?? DEFAULT_MAX_SUPPLY);
        }
      })
      .catch(() => {
        if (!cancelled) {
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
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resetMintFlow = useCallback(() => {
    setMintStep('idle');
    setPendingMint(null);
    setSuccessResult(null);
  }, []);

  const startMint = useCallback(
    async (
      imageBlob: Blob,
      selectedLayers: Record<string, string>,
      selectedColors: Record<string, string>,
      mintType: 'free' | 'paid'
    ) => {
      if (!address || !address.startsWith('xch1')) {
        setMintStep('error');
        return;
      }
      setMintStep('submitting');
      setPendingMint(null);
      setSuccessResult(null);
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
      } catch (err) {
        console.error('[MintContext] startMint error:', err);
        setMintStep('error');
      }
    },
    [address, refetchCredits]
  );

  const value = useMemo<MintContextValue>(
    () => ({
      credits,
      mintStep,
      pendingMint,
      successResult,
      startMint,
      resetMintFlow,
      totalMinted,
      maxSupply,
      refetchCredits,
    }),
    [credits, mintStep, pendingMint, successResult, startMint, resetMintFlow, totalMinted, maxSupply, refetchCredits]
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
