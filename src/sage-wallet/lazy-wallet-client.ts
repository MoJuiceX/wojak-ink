/**
 * Lazy loader for WalletConnect clients.
 * 
 * This module defers importing WalletConnect (@walletconnect/sign-client and modal)
 * until they are actually needed, reducing bundle size for users who don't use wallet features.
 */

import type { SignClient } from '@walletconnect/sign-client';
import type { WalletConnectModal } from '@walletconnect/modal';

let cachedSignClient: typeof SignClient | null = null;
let cachedModal: typeof WalletConnectModal | null = null;

export type SignClientInitConfig = Parameters<typeof SignClient.init>[0];
export type WalletConnectModalConfig = ConstructorParameters<typeof WalletConnectModal>[0];

/**
 * Lazy-load SignClient from @walletconnect/sign-client
 * Returns the class, not an instance
 */
export async function getSignClientClass(): Promise<typeof SignClient> {
  if (cachedSignClient) return cachedSignClient;
  
  const module = await import('@walletconnect/sign-client');
  cachedSignClient = module.SignClient;
  return cachedSignClient;
}

/**
 * Lazy-load WalletConnectModal from @walletconnect/modal
 * Returns the class, not an instance
 */
export async function getWalletConnectModalClass(): Promise<typeof WalletConnectModal> {
  if (cachedModal) return cachedModal;
  
  const module = await import('@walletconnect/modal');
  cachedModal = module.WalletConnectModal;
  return cachedModal;
}

/**
 * Create a new SignClient instance with lazy loading
 */
export async function createSignClient(config: SignClientInitConfig): Promise<InstanceType<typeof SignClient>> {
  const SignClientClass = await getSignClientClass();
  return SignClientClass.init(config);
}

/**
 * Create a new WalletConnectModal instance with lazy loading
 */
export async function createWalletConnectModal(config: WalletConnectModalConfig): Promise<InstanceType<typeof WalletConnectModal>> {
  const ModalClass = await getWalletConnectModalClass();
  return new ModalClass(config);
}

/**
 * Pre-warm the cache by loading both modules
 * Call this during idle time to avoid loading latency when wallet is first used
 */
export async function preloadWalletDependencies(): Promise<void> {
  try {
    await Promise.all([
      getSignClientClass(),
      getWalletConnectModalClass(),
    ]);
  } catch (err) {
    console.warn('[Wallet] Failed to preload dependencies:', err);
  }
}
