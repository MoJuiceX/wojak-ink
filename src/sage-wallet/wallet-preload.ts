/**
 * Isolated wallet preload entrypoint.
 *
 * App.tsx dynamically imports this module during idle time so Vite can keep the
 * preload boundary separate from SageWalletProvider's static imports.
 */
export async function preloadWalletDependencies(): Promise<void> {
  const mod = await import('./lazy-wallet-client');
  await mod.preloadWalletDependencies();
}

