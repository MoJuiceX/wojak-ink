/**
 * Sage Wallet Types and Constants for React
 * Chia-only WalletConnect configuration
 */

// ============================================================================
// CONSTANTS
// ============================================================================

// Chia blockchain chain identifiers
export const CHIA_CHAIN = 'chia:mainnet';
export const CHIA_TESTNET_CHAIN = 'chia:testnet';

// WalletConnect Project ID from https://dashboard.reown.com
export const WALLET_CONNECT_PROJECT_ID = '500876ce87398e4721f71b6aa681a193';

// ============================================================================
// CHIA METHODS (const object instead of enum for erasableSyntaxOnly)
// ============================================================================

// Chia-specific methods for WalletConnect (Sage wallet)
export const ChiaMethod = {
  // CHIP-0002 methods (essential for Sage wallet)
  Chip0002GetPublicKeys: 'chip0002_getPublicKeys',
  Chip0002GetAssetBalance: 'chip0002_getAssetBalance',
  Chip0002SignMessage: 'chip0002_signMessage',
  Chip0002SendTransaction: 'chip0002_sendTransaction',

  // Standard Chia methods
  LogIn: 'chia_logIn',
  GetWallets: 'chia_getWallets',
  GetTransaction: 'chia_getTransaction',
  GetWalletBalance: 'chia_getWalletBalance',
  GetCurrentAddress: 'chia_getCurrentAddress',
  GetPublicKey: 'chia_getPublicKey',
  Send: 'chia_send',
  SignMessageById: 'chia_signMessageById',
  SignMessageByAddress: 'chia_signMessageByAddress',
  GetAddress: 'chia_getAddress',
  TakeOffer: 'chia_takeOffer',
  VerifySignature: 'chia_verifySignature',
  GetNextAddress: 'chia_getNextAddress',
  GetSyncStatus: 'chia_getSyncStatus',
  GetAllOffers: 'chia_getAllOffers',
  GetOffersCount: 'chia_getOffersCount',
  CreateOfferForIds: 'chia_createOfferForIds',
  CancelOffer: 'chia_cancelOffer',
  CheckOfferValidity: 'chia_checkOfferValidity',
  GetOfferSummary: 'chia_getOfferSummary',
  GetOfferData: 'chia_getOfferData',
  GetOfferRecord: 'chia_getOfferRecord',
  CreateNewCatWallet: 'chia_createNewCATWallet',
  GetCatWalletInfo: 'chia_getCATWalletInfo',
  GetCatAssetId: 'chia_getCATAssetId',
  SpendCat: 'chia_spendCAT',
  AddCatToken: 'chia_addCATToken',
  GetNfts: 'chia_getNfts',
  GetNftInfo: 'chia_getNFTInfo',
  MintNft: 'chia_mintNFT',
  TransferNft: 'chia_transferNFT',
  GetNftsCount: 'chia_getNFTsCount',
  CreateNewDidWallet: 'chia_createNewDIDWallet',
  SetDidName: 'chia_setDIDName',
  SetNftDid: 'chia_setNFTDID',
  GetNftWalletsWithDids: 'chia_getNFTWalletsWithDIDs',
  GetWalletAddresses: 'chia_getWalletAddresses',
} as const;

// WalletConnect events
export const WalletConnectEvent = {
  SessionProposal: 'session_proposal',
  SessionRequest: 'session_request',
  SessionDelete: 'session_delete',
  SessionUpdate: 'session_update',
} as const;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface SageAccount {
  address: string;
  chainId: string;
}

export interface SageSession {
  topic: string;
  accounts: SageAccount[];
  chains: string[];
  metadata: unknown;
}

export interface SignMessageResult {
  signature: string;
  publicKey: string;
}

export interface AssetBalance {
  confirmed: string;
  spendable: string;
  pending: string;
}

export interface NFTInfo {
  nftId: string;
  launcherId: string;
  nftCoinId: string;
  ownerDid: string | null;
  royaltyPercentage: number | null;
  royaltyAddress: string;
  targetAddress: string;
  uris: string[];
  hash: string;
  metaUris: string[];
  metaHash: string;
  editionTotal: number;
  editionNumber: number;
  mintHeight: number;
  didId: string | null;
  minterDid: string | null;
}

// MintGarden API response types
export interface MintGardenNFT {
  encoded_id: string;
  name: string;
  collection_id: string;
  collection_name: string;
  preview_uri: string;
  thumbnail_uri: string;
  data_uri: string;
  owner_address: string;
  minter_address: string;
  mint_height: number;
}

export interface MintGardenResponse {
  items: MintGardenNFT[];
  count: number;
  total: number;
}

// Wallet context state
export interface SageWalletState {
  status: ConnectionStatus;
  address: string;
  session: SageSession | null;
  error: string | null;
  isInitialized: boolean;
}

// Wallet context actions
export interface SageWalletActions {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<SignMessageResult>;
  getAssetBalance: (assetId?: string | null) => Promise<AssetBalance>;
  takeOffer: (offer: string, fee?: number) => Promise<unknown>;
  hasRequiredNFTs: (collectionId: string) => Promise<boolean>;
  getNFTs: (collectionId?: string) => Promise<MintGardenNFT[]>;
}

// Combined context type
export interface SageWalletContextType extends SageWalletState, SageWalletActions {}

// Configuration options
export interface SageWalletConfig {
  projectId?: string;
  metadata?: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
  relayUrl?: string;
  storageKey?: string;
  autoConnect?: boolean;
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

// Default configuration
export const DEFAULT_CONFIG: Required<SageWalletConfig> = {
  projectId: WALLET_CONNECT_PROJECT_ID,
  metadata: {
    name: 'Wojak.ink',
    description: 'Tang Gang NFT Collection',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://wojak.ink',
    icons: ['https://wojak.ink/favicon.ico'],
  },
  relayUrl: 'wss://relay.walletconnect.com',
  storageKey: 'sage-wallet-session',
  autoConnect: true,
  onConnect: () => {},
  onDisconnect: () => {},
  onError: () => {},
};
