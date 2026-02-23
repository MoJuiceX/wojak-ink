/**
 * Sage Wallet React Integration
 * 
 * Complete WalletConnect integration for Sage wallet (Chia blockchain)
 * 
 * @example Basic Usage with Provider
 * ```tsx
 * import { SageWalletProvider, useSageWallet, SageConnectButton } from './sage-wallet';
 * 
 * function App() {
 *   return (
 *     <SageWalletProvider>
 *       <MyApp />
 *     </SageWalletProvider>
 *   );
 * }
 * 
 * function MyApp() {
 *   const { address, status, connect, disconnect } = useSageWallet();
 *   
 *   return (
 *     <div>
 *       <SageConnectButton />
 *       {address && <p>Connected: {address}</p>}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example Standalone Hook (without Provider)
 * ```tsx
 * import { useSageWalletStandalone } from './sage-wallet';
 * 
 * function WalletButton() {
 *   const { address, isConnected, connect, disconnect, shortenAddress } = useSageWalletStandalone();
 *   
 *   return (
 *     <button onClick={isConnected ? disconnect : connect}>
 *       {isConnected ? shortenAddress() : 'Connect'}
 *     </button>
 *   );
 * }
 * ```
 */

// Provider and main hook
export { SageWalletProvider, useSageWallet, SageWalletContext } from './SageWalletProvider';

// Standalone hook (no provider needed)
export { useSageWalletStandalone } from './useSageWalletStandalone';

// Ready-to-use components
export { SageConnectButton, SageWalletStatus, NFTGate, WalletFAB } from './SageWalletComponents';

// Types and constants
export {
  // Constants
  CHIA_CHAIN,
  CHIA_TESTNET_CHAIN,
  WALLET_CONNECT_PROJECT_ID,
  DEFAULT_CONFIG,
  
  // Enums
  ChiaMethod,
  WalletConnectEvent,
  
  // Types
  type ConnectionStatus,
  type SageAccount,
  type SageSession,
  type SignMessageResult,
  type AssetBalance,
  type NFTInfo,
  type MintGardenNFT,
  type MintGardenResponse,
  type SageWalletState,
  type SageWalletActions,
  type SageWalletContextType,
  type SageWalletConfig,
} from './sage-wallet-types';
