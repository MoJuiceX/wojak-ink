/**
 * Sage Wallet Hook (Standalone)
 *
 * A standalone hook for Sage wallet integration that doesn't require
 * the context provider. Useful for simpler use cases or when you want
 * to manage state yourself.
 *
 * For most use cases, prefer the SageWalletProvider + useSageWallet combo.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { SignClient } from '@walletconnect/sign-client';
import type { WalletConnectModal } from '@walletconnect/modal';
import type { SessionTypes, ProposalTypes } from '@walletconnect/types';

import { isValidChiaAddress } from '@/lib/validation';
import { safeStorage } from '@/utils/safeStorage';
import {
  ChiaMethod,
  CHIA_CHAIN,
  DEFAULT_CONFIG,
} from './sage-wallet-types';
import type {
  ConnectionStatus,
  SageSession,
  SignMessageResult,
  AssetBalance,
  MintGardenNFT,
  MintGardenResponse,
  SageWalletConfig,
} from './sage-wallet-types';
import { createSignClient, createWalletConnectModal } from './lazy-wallet-client';

interface UseSageWalletStandaloneReturn {
  // State
  status: ConnectionStatus;
  address: string;
  session: SageSession | null;
  error: string | null;
  isInitialized: boolean;
  isConnected: boolean;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<SignMessageResult>;
  getAssetBalance: (assetId?: string | null) => Promise<AssetBalance>;
  takeOffer: (offer: string, fee?: number) => Promise<unknown>;
  transferNFT: (nftCoinId: string, targetAddress: string, fee?: number) => Promise<unknown>;
  hasRequiredNFTs: (collectionId: string) => Promise<boolean>;
  getNFTs: (collectionId?: string) => Promise<MintGardenNFT[]>;

  // Utils
  shortenAddress: (addr?: string) => string;
}

export function useSageWalletStandalone(
  userConfig?: Partial<SageWalletConfig>
): UseSageWalletStandaloneReturn {
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  // State
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [address, setAddress] = useState('');
  const [session, setSession] = useState<SageSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Refs
  const signClientRef = useRef<InstanceType<typeof SignClient> | null>(null);
  const modalRef = useRef<WalletConnectModal | null>(null);
  const currentSessionRef = useRef<SessionTypes.Struct | null>(null);
  const initializingRef = useRef(false);

  // Computed
  const isConnected = status === 'connected' && !!address;

  // Helper: Shorten address for display
  const shortenAddress = useCallback((addr?: string): string => {
    const a = addr || address;
    if (!a) return '';
    return `${a.slice(0, 6)}...${a.slice(-4)}`;
  }, [address]);

  // Initialize WalletConnect
  const initialize = useCallback(async () => {
    if (initializingRef.current || signClientRef.current) return;

    initializingRef.current = true;

    try {
      signClientRef.current = await createSignClient({
        projectId: config.projectId,
        metadata: config.metadata,
        relayUrl: config.relayUrl,
        logger: 'error',
      });

      modalRef.current = await createWalletConnectModal({
        projectId: config.projectId,
        themeMode: 'dark',
        enableExplorer: false,
        themeVariables: {
          '--wcm-z-index': '100000',
        },
      });

      // Event listeners
      signClientRef.current.on('session_delete', () => {
        handleDisconnect();
      });

      // Check existing sessions
      if (config.autoConnect) {
        const sessions = signClientRef.current.session.getAll();
        if (sessions.length > 0) {
          const lastSession = sessions[sessions.length - 1];
          currentSessionRef.current = lastSession;

          try {
            await updateAddressFromWallet();
            setStatus('connected');
          } catch {
            currentSessionRef.current = null;
          }
        }
      }

      setIsInitialized(true);
    } catch (err) {
      console.error('[SageWallet] Init failed:', err);
      setError(err instanceof Error ? err.message : 'Init failed');
      setIsInitialized(true);
    } finally {
      initializingRef.current = false;
    }
  }, [config.projectId, config.metadata, config.relayUrl, config.autoConnect]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update address from wallet via RPC
  const updateAddressFromWallet = useCallback(async () => {
    const client = signClientRef.current;
    const sess = currentSessionRef.current;

    if (!client || !sess) throw new Error('No session');

    const result = await client.request({
      topic: sess.topic,
      chainId: CHIA_CHAIN,
      request: { method: ChiaMethod.GetAddress, params: {} },
    });

    const addr = typeof result === 'string' ? result : (result as { address?: string })?.address || '';

    if (!isValidChiaAddress(addr)) throw new Error('Invalid address');

    setAddress(addr);
    setSession({
      topic: sess.topic,
      accounts: [{ address: addr, chainId: CHIA_CHAIN }],
      chains: [CHIA_CHAIN],
      metadata: sess.peer?.metadata,
    });

    safeStorage.setJSON(config.storageKey, { topic: sess.topic, address: addr });
    config.onConnect?.(addr);

    return addr;
  }, [config.storageKey, config.onConnect]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle disconnect
  const handleDisconnect = useCallback(() => {
    currentSessionRef.current = null;
    setStatus('disconnected');
    setAddress('');
    setSession(null);
    setError(null);
    safeStorage.removeItem(config.storageKey);
    config.onDisconnect?.();
  }, [config.storageKey, config.onDisconnect]); // eslint-disable-line react-hooks/exhaustive-deps

  // Connect to wallet
  const connect = useCallback(async () => {
    const client = signClientRef.current;
    const modal = modalRef.current;

    if (!client) throw new Error('Not initialized');
    if (isConnected) return;

    try {
      setStatus('connecting');
      setError(null);

      const requiredNamespaces: Record<string, ProposalTypes.RequiredNamespace> = {
        chia: {
          methods: [
            'chip0002_getPublicKeys',
            'chia_signMessageByAddress',
            'chia_getAddress',
            'chia_takeOffer',
            'chia_send',
            'chip0002_getAssetBalance',
            'chia_transferNFT',
          ],
          chains: [CHIA_CHAIN],
          events: [],
        },
      };

      const { uri, approval } = await client.connect({ requiredNamespaces });

      if (uri && modal) {
        await modal.openModal({ uri });
        const sess = await approval();
        modal.closeModal();

        currentSessionRef.current = sess;
        await updateAddressFromWallet();
        setStatus('connected');
      }
    } catch (err: unknown) {
      modalRef.current?.closeModal();
      setStatus('disconnected');
      setError(err instanceof Error ? err.message : 'Connection failed');
      config.onError?.(err instanceof Error ? err : new Error('Connection failed'));
      throw err;
    }
  }, [isConnected, updateAddressFromWallet, config.onError]); // eslint-disable-line react-hooks/exhaustive-deps

  // Disconnect from wallet
  const disconnect = useCallback(async () => {
    try {
      const client = signClientRef.current;
      const sess = currentSessionRef.current;

      if (client && sess) {
        const { getSdkError } = await import('@walletconnect/utils');
        await client.disconnect({
          topic: sess.topic,
          reason: getSdkError('USER_DISCONNECTED'),
        });
      }
    } catch (err) {
      console.error('[SageWallet] Disconnect error:', err);
    }
    handleDisconnect();
  }, [handleDisconnect]);

  // Sign a message
  const signMessage = useCallback(async (message: string): Promise<SignMessageResult> => {
    const client = signClientRef.current;
    const sess = currentSessionRef.current;

    if (!client || !sess || !address) throw new Error('Not connected');

    const result = await client.request({
      topic: sess.topic,
      chainId: CHIA_CHAIN,
      request: {
        method: ChiaMethod.SignMessageByAddress,
        params: { address, message },
      },
    });

    return result as SignMessageResult;
  }, [address]);

  // Get asset balance
  const getAssetBalance = useCallback(async (assetId?: string | null): Promise<AssetBalance> => {
    const client = signClientRef.current;
    const sess = currentSessionRef.current;

    if (!client || !sess) throw new Error('Not connected');

    const result = await client.request({
      topic: sess.topic,
      chainId: CHIA_CHAIN,
      request: {
        method: ChiaMethod.Chip0002GetAssetBalance,
        params: { type: assetId ? 'cat' : 'xch', assetId: assetId || undefined },
      },
    });

    return result as AssetBalance;
  }, []);

  // Take an offer
  const takeOffer = useCallback(async (offer: string, fee: number = 0): Promise<unknown> => {
    const client = signClientRef.current;
    const sess = currentSessionRef.current;

    if (!client || !sess) throw new Error('Not connected');

    return client.request({
      topic: sess.topic,
      chainId: CHIA_CHAIN,
      request: {
        method: ChiaMethod.TakeOffer,
        params: { offer, fee },
      },
    });
  }, []);

  // Transfer an NFT to another address
  const transferNFT = useCallback(async (nftCoinId: string, targetAddress: string, fee: number = 0): Promise<unknown> => {
    const client = signClientRef.current;
    const sess = currentSessionRef.current;

    if (!client || !sess) throw new Error('Not connected');

    return client.request({
      topic: sess.topic,
      chainId: CHIA_CHAIN,
      request: {
        method: ChiaMethod.TransferNft,
        params: { nftCoinId, targetAddress, fee },
      },
    });
  }, []);

  // Check if user has NFTs from collection (via MintGarden API)
  const hasRequiredNFTs = useCallback(async (collectionId: string): Promise<boolean> => {
    if (!address || !isValidChiaAddress(address) || !collectionId?.trim()) return false;

    try {
      const res = await fetch(
        `https://api.mintgarden.io/address/${address}/nfts?type=owned&collection_id=${collectionId}`
      );
      if (!res.ok) return false;

      const data: MintGardenResponse = await res.json();
      return data.items && data.items.length > 0;
    } catch {
      return false;
    }
  }, [address]);

  // Get NFTs from wallet (via MintGarden API)
  const getNFTs = useCallback(async (collectionId?: string): Promise<MintGardenNFT[]> => {
    if (!address) throw new Error('Not connected');

    let url = `https://api.mintgarden.io/address/${address}/nfts?type=owned`;
    if (collectionId) url += `&collection_id=${collectionId}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data: MintGardenResponse = await res.json();
    return data.items || [];
  }, [address]);

  // Auto-initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    // State
    status,
    address,
    session,
    error,
    isInitialized,
    isConnected,

    // Actions
    connect,
    disconnect,
    signMessage,
    getAssetBalance,
    takeOffer,
    transferNFT,
    hasRequiredNFTs,
    getNFTs,

    // Utils
    shortenAddress,
  };
}
