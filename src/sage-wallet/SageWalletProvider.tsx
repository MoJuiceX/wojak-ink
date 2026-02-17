/* eslint-disable react-refresh/only-export-components */
/**
 * Sage Wallet React Context & Provider
 * 
 * Provides WalletConnect integration for Sage wallet (Chia blockchain)
 * in React applications.
 */

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useRef,
} from 'react';
import type { ReactNode } from 'react';
import { SignClient } from '@walletconnect/sign-client';
import { WalletConnectModal } from '@walletconnect/modal';
import { getSdkError } from '@walletconnect/utils';
import { isValidChiaAddress } from '@/lib/validation';
import type { SessionTypes, ProposalTypes } from '@walletconnect/types';

import {
  ChiaMethod,
  CHIA_CHAIN,
  DEFAULT_CONFIG,
} from './sage-wallet-types';
import type {
  SageWalletContextType,
  SageWalletState,
  SageWalletConfig,
  SageSession,
  SignMessageResult,
  AssetBalance,
  MintGardenNFT,
  MintGardenResponse,
} from './sage-wallet-types';

// ============================================================================
// CONTEXT
// ============================================================================

const SageWalletContext = createContext<SageWalletContextType | null>(null);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface SageWalletProviderProps {
  children: ReactNode;
  config?: Partial<SageWalletConfig>;
}

export function SageWalletProvider({ children, config: userConfig }: SageWalletProviderProps) {
  // Merge user config with defaults
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  // State
  const [state, setState] = useState<SageWalletState>({
    status: 'disconnected',
    address: '',
    session: null,
    error: null,
    isInitialized: false,
  });

  // Refs for WalletConnect instances
  const signClientRef = useRef<InstanceType<typeof SignClient> | null>(null);
  const modalRef = useRef<WalletConnectModal | null>(null);
  const currentSessionRef = useRef<SessionTypes.Struct | null>(null);
  const initializingRef = useRef(false);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  const initialize = useCallback(async () => {
    if (initializingRef.current || signClientRef.current) {
      return;
    }

    initializingRef.current = true;

    try {
      // Initialize SignClient
      signClientRef.current = await SignClient.init({
        projectId: config.projectId,
        metadata: config.metadata,
        relayUrl: config.relayUrl,
        logger: 'error',
      });

      // Initialize Modal with high z-index to appear above Avatar Picker
      modalRef.current = new WalletConnectModal({
        projectId: config.projectId,
        themeMode: 'dark',
        enableExplorer: false,
        themeVariables: {
          '--wcm-z-index': '100000',
        },
      });

      // Set up event listeners
      setupEventListeners();

      // Check for existing sessions
      if (config.autoConnect) {
        await checkExistingSessions();
      }

      setState(prev => ({ ...prev, isInitialized: true }));
    } catch (error) {
      console.error('[SageWallet] Initialization failed:', error);
      setState(prev => ({
        ...prev,
        isInitialized: true,
        error: error instanceof Error ? error.message : 'Initialization failed',
      }));
      config.onError?.(error instanceof Error ? error : new Error('Initialization failed'));
    } finally {
      initializingRef.current = false;
    }
  }, [config.projectId, config.metadata, config.relayUrl, config.autoConnect]);

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  const setupEventListeners = useCallback(() => {
    const client = signClientRef.current;
    if (!client) return;

    client.on('session_delete', () => {
      handleDisconnect();
    });

    client.on('session_update', async () => {
      if (currentSessionRef.current) {
        await updateAddressFromWallet();
      }
    });

  }, []);

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  const checkExistingSessions = useCallback(async () => {
    const client = signClientRef.current;
    if (!client) return;

    try {
      const sessions = client.session.getAll();

      if (sessions.length > 0) {
        const lastSession = sessions[sessions.length - 1];
        currentSessionRef.current = lastSession;

        // Verify session with timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session verification timeout')), 5000)
        );

        try {
          await Promise.race([updateAddressFromWallet(), timeoutPromise]);
          setState(prev => ({ ...prev, status: 'connected' }));
        } catch {
          currentSessionRef.current = null;
          setState(prev => ({ ...prev, address: '' }));
        }
      }
    } catch (err) {
      console.error('[SageWallet] Error checking sessions:', err);
    }
  }, []);

  const updateAddressFromWallet = useCallback(async (): Promise<void> => {
    const client = signClientRef.current;
    const session = currentSessionRef.current;

    if (!client || !session) {
      throw new Error('No active session');
    }


    const result = await client.request({
      topic: session.topic,
      chainId: CHIA_CHAIN,
      request: {
        method: ChiaMethod.GetAddress,
        params: {},
      },
    });

    let address = '';
    if (typeof result === 'string') {
      address = result;
    } else if (result && typeof result === 'object' && 'address' in result) {
      address = (result as { address: string }).address;
    }

    if (!address || !isValidChiaAddress(address)) {
      throw new Error(`Invalid address: ${address}`);
    }

    // Update state
    const sessionData: SageSession = {
      topic: session.topic,
      accounts: [{ address, chainId: CHIA_CHAIN }],
      chains: [CHIA_CHAIN],
      metadata: session.peer?.metadata,
    };

    setState(prev => ({
      ...prev,
      address,
      session: sessionData,
      status: 'connected',
      error: null,
    }));

    // Save to localStorage
    localStorage.setItem(config.storageKey, JSON.stringify({ topic: session.topic, address }));
    
    // Callback
    config.onConnect?.(address);
    
  }, [config.storageKey, config.onConnect]);

  const handleDisconnect = useCallback(() => {
    currentSessionRef.current = null;
    localStorage.removeItem(config.storageKey);
    
    setState({
      status: 'disconnected',
      address: '',
      session: null,
      error: null,
      isInitialized: true,
    });
    
    config.onDisconnect?.();
  }, [config.storageKey, config.onDisconnect]);

  // ============================================================================
  // PUBLIC ACTIONS
  // ============================================================================

  const connect = useCallback(async (): Promise<void> => {
    const client = signClientRef.current;
    const modal = modalRef.current;

    if (!client) {
      throw new Error('Sage wallet not initialized');
    }

    // Already connected?
    if (state.address && state.status === 'connected') {
      return;
    }

    try {
      setState(prev => ({ ...prev, status: 'connecting', error: null }));

      // Required Chia namespace
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

        // Wait for approval
        const session = await approval();

        // Close modal
        modal.closeModal();

        currentSessionRef.current = session;

        // Get address
        await updateAddressFromWallet();
      }
    } catch (error: unknown) {
      console.error('[SageWallet] Connection failed:', error);

      // Close modal on error
      modalRef.current?.closeModal();

      setState(prev => ({
        ...prev,
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Connection failed',
      }));

      const errObj = error as Record<string, unknown>;
      if (typeof errObj?.message === 'string' && errObj.message.includes('User rejected') || errObj?.code === 5000) {
        throw new Error('Connection cancelled by user');
      }

      config.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }, [state.address, state.status, updateAddressFromWallet, config.onError]);

  const disconnect = useCallback(async (): Promise<void> => {

    try {
      const client = signClientRef.current;
      const session = currentSessionRef.current;

      if (client && session) {
        await client.disconnect({
          topic: session.topic,
          reason: getSdkError('USER_DISCONNECTED'),
        });
      }
    } catch (error) {
      console.error('[SageWallet] Disconnect error:', error);
    }

    handleDisconnect();
  }, [handleDisconnect]);

  const signMessage = useCallback(async (message: string): Promise<SignMessageResult> => {
    const client = signClientRef.current;
    const session = currentSessionRef.current;

    if (!client || !session || !state.address) {
      throw new Error('No active Sage wallet session');
    }


    const result = await client.request({
      topic: session.topic,
      chainId: CHIA_CHAIN,
      request: {
        method: ChiaMethod.SignMessageByAddress,
        params: {
          address: state.address,
          message,
        },
      },
    });

    const typedResult = result as { signature: string; publicKey: string };

    return {
      signature: typedResult.signature,
      publicKey: typedResult.publicKey,
    };
  }, [state.address]);

  const getAssetBalance = useCallback(async (assetId?: string | null): Promise<AssetBalance> => {
    const client = signClientRef.current;
    const session = currentSessionRef.current;

    if (!client || !session) {
      throw new Error('No active Sage wallet session');
    }

    const result = await client.request({
      topic: session.topic,
      chainId: CHIA_CHAIN,
      request: {
        method: ChiaMethod.Chip0002GetAssetBalance,
        params: {
          type: assetId ? 'cat' : 'xch',
          assetId: assetId || undefined,
        },
      },
    });

    return result as AssetBalance;
  }, []);

  const takeOffer = useCallback(async (offer: string, fee: number = 0): Promise<unknown> => {
    const client = signClientRef.current;
    const session = currentSessionRef.current;

    if (!client || !session) {
      throw new Error('No active Sage wallet session');
    }


    const result = await client.request({
      topic: session.topic,
      chainId: CHIA_CHAIN,
      request: {
        method: ChiaMethod.TakeOffer,
        params: { offer, fee },
      },
    });

    return result;
  }, []);

  const transferNFT = useCallback(async (nftCoinId: string, targetAddress: string, fee: number = 0): Promise<unknown> => {
    const client = signClientRef.current;
    const session = currentSessionRef.current;

    if (!client || !session) {
      throw new Error('No active Sage wallet session');
    }

    const result = await client.request({
      topic: session.topic,
      chainId: CHIA_CHAIN,
      request: {
        method: ChiaMethod.TransferNft,
        params: { nftCoinId, targetAddress, fee },
      },
    });

    return result;
  }, []);

  const hasRequiredNFTs = useCallback(async (collectionId: string): Promise<boolean> => {
    if (!state.address || !isValidChiaAddress(state.address)) {
      console.warn('[SageWallet] No valid address for NFT check');
      return false;
    }

    if (!collectionId?.trim()) {
      console.warn('[SageWallet] No collection ID provided');
      return false;
    }


    try {
      const response = await fetch(
        `https://api.mintgarden.io/address/${state.address}/nfts?type=owned&collection_id=${collectionId}`
      );

      if (!response.ok) {
        throw new Error(`MintGarden API error: ${response.status}`);
      }

      const data: MintGardenResponse = await response.json();
      const hasNfts = data.items && data.items.length > 0;

      return hasNfts;
    } catch (error) {
      console.error('[SageWallet] NFT check error:', error);
      return false;
    }
  }, [state.address]);

  const getNFTs = useCallback(async (collectionId?: string): Promise<MintGardenNFT[]> => {
    if (!state.address) {
      throw new Error('No wallet connected');
    }

    let url = `https://api.mintgarden.io/address/${state.address}/nfts?type=owned`;
    if (collectionId) {
      url += `&collection_id=${collectionId}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`MintGarden API error: ${response.status}`);
    }

    const data: MintGardenResponse = await response.json();
    return data.items || [];
  }, [state.address]);

  const getNFTCoinId = useCallback(async (launcherId: string): Promise<string> => {
    const client = signClientRef.current;
    const session = currentSessionRef.current;

    if (!client || !session) {
      throw new Error('No active Sage wallet session');
    }

    const result = await client.request({
      topic: session.topic,
      chainId: CHIA_CHAIN,
      request: {
        method: ChiaMethod.GetNftInfo,
        params: { coinId: launcherId },
      },
    });

    const nftInfo = result as { nftCoinId?: string; nft_coin_id?: string };
    const coinId = nftInfo.nftCoinId || nftInfo.nft_coin_id;
    if (!coinId) {
      throw new Error('Could not resolve NFT coin ID');
    }
    return coinId;
  }, []);

  const getDIDs = useCallback(async (): Promise<string[]> => {
    if (!state.address || !isValidChiaAddress(state.address)) {
      return [];
    }

    try {
      const response = await fetch(
        `https://api.mintgarden.io/address/${state.address}/nfts?type=owned&size=1`
      );

      if (!response.ok) return [];

      const data = await response.json() as {
        items: Array<{ owner_did?: string }>;
      };

      const dids = new Set<string>();
      for (const item of data.items || []) {
        if (item.owner_did && typeof item.owner_did === 'string' && item.owner_did.startsWith('did:chia:')) {
          dids.add(item.owner_did);
        }
      }

      return Array.from(dids);
    } catch (error) {
      console.error('[SageWallet] DID lookup error:', error);
      return [];
    }
  }, [state.address]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    initialize();
  }, [initialize]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const contextValue: SageWalletContextType = {
    ...state,
    connect,
    disconnect,
    signMessage,
    getAssetBalance,
    takeOffer,
    transferNFT,
    hasRequiredNFTs,
    getNFTs,
    getDIDs,
    getNFTCoinId,
  };

  return (
    <SageWalletContext.Provider value={contextValue}>
      {children}
    </SageWalletContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useSageWallet(): SageWalletContextType {
  const context = useContext(SageWalletContext);
  
  if (!context) {
    throw new Error('useSageWallet must be used within a SageWalletProvider');
  }
  
  return context;
}

// Export context for advanced usage
export { SageWalletContext };
