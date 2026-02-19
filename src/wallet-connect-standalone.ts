/**
 * Standalone WalletConnect bundle for static HTML pages (e.g. free-mints.html).
 * Bundled by Vite into public/assets/wallet-connect-standalone.js
 * Exposes window._sageConnect() and window._sageDisconnect()
 */

import SignClient from '@walletconnect/sign-client';
import { WalletConnectModal } from '@walletconnect/modal';

const PROJECT_ID = '500876ce87398e4721f71b6aa681a193';
const CHIA_CHAIN = 'chia:mainnet';
const STORAGE_KEY = 'sage-wallet-session';

let client: InstanceType<typeof SignClient> | null = null;
let modal: WalletConnectModal | null = null;
let connecting = false;

async function init() {
  try {
    client = await SignClient.init({
      projectId: PROJECT_ID,
      metadata: {
        name: 'Wojak.ink',
        description: 'Tang Gang NFT Collection',
        url: window.location.origin,
        icons: ['https://wojak.ink/favicon.ico'],
      },
      relayUrl: 'wss://relay.walletconnect.com',
      logger: 'error',
    });

    modal = new WalletConnectModal({
      projectId: PROJECT_ID,
      themeMode: 'dark',
      enableExplorer: false,
      themeVariables: { '--wcm-z-index': '100000' },
    });

  } catch (err) {
    console.warn('[WC] Init failed:', (err as Error).message);
  }
}

async function connect() {
  if (connecting) return;
  if (!client || !modal) {
    await init();
    if (!client || !modal) return;
  }

  connecting = true;
  try {
    const { uri, approval } = await client.connect({
      requiredNamespaces: {
        chia: {
          methods: [
            'chip0002_getPublicKeys',
            'chia_signMessageByAddress',
            'chia_getAddress',
            'chia_takeOffer',
            'chia_send',
            'chip0002_getAssetBalance',
          ],
          chains: [CHIA_CHAIN],
          events: [],
        },
      },
    });

    if (uri) {
      await modal.openModal({ uri });
      const session = await approval();
      modal.closeModal();

      // Get address from wallet
      const result = await client.request({
        topic: session.topic,
        chainId: CHIA_CHAIN,
        request: { method: 'chia_getAddress', params: {} },
      });
      const address = typeof result === 'string'
        ? result
        : (result as { address?: string })?.address || '';

      if (address) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          topic: session.topic,
          address,
        }));
        // Dispatch event so the page can react
        window.dispatchEvent(new CustomEvent('sage-wallet-connected', { detail: { address } }));
      }
    }
  } catch (err) {
    if (modal) modal.closeModal();
    const msg = (err as Error)?.message || '';
    if (!msg.includes('dismissed') && !msg.includes('Proposal expired')) {
      console.warn('[WC] Connect error:', msg);
    }
  } finally {
    connecting = false;
  }
}

// Expose globally
(window as any)._sageConnect = connect;

// Auto-init
init();
