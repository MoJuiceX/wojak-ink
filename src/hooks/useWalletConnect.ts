/**
 * useWalletConnect Hook
 * 
 * Connects to Chia wallets (Sage, etc.) via WalletConnect
 */

import { useState, useCallback, useRef } from 'react';
import SignClient from '@walletconnect/sign-client';
import QRCode from 'qrcode';

const PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const CHAIN_ID = 'chia:mainnet';
const WOJAK_COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';

interface WalletConnectState {
  isConnecting: boolean;
  isConnected: boolean;
  qrCodeUri: string | null;
  connectionUri: string | null;
  walletAddress: string | null;
  nfts: any[];
  isLoadingNfts: boolean;
  nftDetectionUnavailable: boolean; // true if wallet doesn't support chia_getNFTs
  error: string | null;
}

export function useWalletConnect() {
  const [state, setState] = useState<WalletConnectState>({
    isConnecting: false,
    isConnected: false,
    qrCodeUri: null,
    connectionUri: null,
    walletAddress: null,
    nfts: [],
    isLoadingNfts: false,
    nftDetectionUnavailable: false,
    error: null,
  });

  const clientRef = useRef<SignClient | null>(null);
  const sessionRef = useRef<any>(null);

  // Initialize client
  const initClient = useCallback(async () => {
    if (!PROJECT_ID) {
      setState(s => ({ ...s, error: 'WalletConnect not configured' }));
      return null;
    }

    if (clientRef.current) {
      return clientRef.current;
    }

    try {
      const client = await SignClient.init({
        projectId: PROJECT_ID,
        metadata: {
          name: 'Wojak.ink',
          description: 'Wojak Farmers Plot NFT Explorer',
          url: 'https://wojak.ink',
          icons: ['https://wojak.ink/assets/icons/Wojak_logo.png'],
        },
      });

      clientRef.current = client;

      // Listen for session events
      client.on('session_event', (_args) => {
        // Session event received
      });

      client.on('session_delete', () => {
        sessionRef.current = null;
        setState(s => ({
          ...s,
          isConnected: false,
          walletAddress: null,
        }));
      });

      return client;
    } catch (error) {
      console.error('[WalletConnect] Init error:', error);
      setState(s => ({ ...s, error: 'Failed to initialize WalletConnect' }));
      return null;
    }
  }, []);

  // Connect to wallet
  const connect = useCallback(async () => {
    setState(s => ({ ...s, isConnecting: true, error: null, qrCodeUri: null }));

    try {
      const client = await initClient();
      if (!client) {
        setState(s => ({ ...s, isConnecting: false }));
        return;
      }

      // Create connection request - use optionalNamespaces for broader compatibility
      const { uri, approval } = await client.connect({
        optionalNamespaces: {
          chia: {
            methods: [
              'chia_getCurrentAddress',
              'chia_getNextAddress',
              'chia_getWalletAddresses',
              'chia_getWalletBalance',
              'chia_getNFTs',
              'chia_signMessage',
            ],
            chains: [CHAIN_ID],
            events: ['accountsChanged', 'chainChanged'],
          },
        },
      });

      if (uri) {
        // Generate QR code
        const qrCode = await QRCode.toDataURL(uri, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
        setState(s => ({ ...s, qrCodeUri: qrCode, connectionUri: uri }));

        // Also log the URI for copy/paste
      }

      // Wait for approval
      const session = await approval();
      sessionRef.current = session;

      // Mark as connected and start loading NFTs
      setState(s => ({
        ...s,
        isConnecting: false,
        isConnected: true,
        isLoadingNfts: true,
        qrCodeUri: null,
        connectionUri: null,
      }));

      // Auto-fetch NFTs after connection
      try {
        const result = await client.request({
          topic: session.topic,
          chainId: CHAIN_ID,
          request: {
            method: 'chia_getNFTs',
            params: {},
          },
        });


        // Filter for Wojak Farmers Plot NFTs
        const allNfts = (result as any)?.nfts || (result as any) || [];

        const wojakNfts = Array.isArray(allNfts)
          ? allNfts.filter((nft: any) => {
              const collectionId = nft.collection_id || nft.collectionId || nft.collectionID || '';
              const matches = collectionId.includes(WOJAK_COLLECTION_ID);
              return matches;
            })
          : [];


        setState(s => ({
          ...s,
          nfts: wojakNfts,
          isLoadingNfts: false,
        }));
      } catch (nftError: any) {
        console.error('[WalletConnect] Auto-fetch NFTs error:', nftError);
        const errorMsg = nftError.message || 'Failed to fetch NFTs';

        // Check if the wallet doesn't support chia_getNFTs
        const isUnsupported = errorMsg.toLowerCase().includes('unsupported') ||
                              errorMsg.toLowerCase().includes('not supported') ||
                              errorMsg.toLowerCase().includes('unknown method');

        if (isUnsupported) {
          setState(s => ({
            ...s,
            isLoadingNfts: false,
            nftDetectionUnavailable: true,
            error: null, // Don't show error for unsupported method
          }));
        } else {
          setState(s => ({
            ...s,
            isLoadingNfts: false,
            error: errorMsg,
          }));
        }
      }
    } catch (error: any) {
      console.error('[WalletConnect] Connect error:', error);
      setState(s => ({
        ...s,
        isConnecting: false,
        error: error.message || 'Failed to connect wallet',
      }));
    }
  }, [initClient]);

  // Fetch NFTs from connected wallet
  const fetchNfts = useCallback(async () => {
    if (!clientRef.current || !sessionRef.current) {
      return [];
    }

    setState(s => ({ ...s, isLoadingNfts: true, error: null }));

    try {
      const result = await clientRef.current.request({
        topic: sessionRef.current.topic,
        chainId: CHAIN_ID,
        request: {
          method: 'chia_getNFTs',
          params: {},
        },
      });


      // Filter for Wojak Farmers Plot NFTs
      const allNfts = (result as any)?.nfts || (result as any) || [];

      // Log first NFT structure for debugging
      if (Array.isArray(allNfts) && allNfts.length > 0) {
      }

      const wojakNfts = Array.isArray(allNfts)
        ? allNfts.filter((nft: any) => {
            const collectionId = nft.collection_id || nft.collectionId || nft.collectionID || '';
            return collectionId.includes(WOJAK_COLLECTION_ID);
          })
        : [];


      setState(s => ({
        ...s,
        nfts: wojakNfts,
        isLoadingNfts: false,
      }));

      return wojakNfts;
    } catch (error: any) {
      console.error('[WalletConnect] Fetch NFTs error:', error);
      setState(s => ({
        ...s,
        isLoadingNfts: false,
        error: error.message || 'Failed to fetch NFTs',
      }));
      return [];
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(async () => {
    if (clientRef.current && sessionRef.current) {
      try {
        await clientRef.current.disconnect({
          topic: sessionRef.current.topic,
          reason: { code: 6000, message: 'User disconnected' },
        });
      } catch (error) {
        console.error('[WalletConnect] Disconnect error:', error);
      }
    }
    sessionRef.current = null;
    setState({
      isConnecting: false,
      isConnected: false,
      qrCodeUri: null,
      connectionUri: null,
      walletAddress: null,
      nfts: [],
      isLoadingNfts: false,
      nftDetectionUnavailable: false,
      error: null,
    });
  }, []);

  // Cancel connection attempt
  const cancelConnect = useCallback(() => {
    setState(s => ({
      ...s,
      isConnecting: false,
      qrCodeUri: null,
      connectionUri: null,
      error: null,
    }));
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    cancelConnect,
    fetchNfts,
  };
}

export default useWalletConnect;
