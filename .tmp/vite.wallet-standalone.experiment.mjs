import { build } from 'vite';
import path from 'path';

const getPkg = (id) => {
  const i = id.lastIndexOf('/node_modules/');
  if (i === -1) return null;
  const p = id.slice(i + '/node_modules/'.length).split('/');
  return p[0]?.startsWith('@') && p[1] ? `${p[0]}/${p[1]}` : (p[0] || null);
};
const walletUi = new Set(['@walletconnect/modal','@walletconnect/modal-core','@walletconnect/modal-ui','lit','lit-html','qrcode','valtio','@lit/reactive-element']);
const walletCrypto = new Set(['ox','multiformats','uint8arrays','blakejs','@msgpack/msgpack']);
await build({
  configFile: false,
  build: {
    emptyOutDir: true,
    outDir: '.tmp/wc-vite-out',
    minify: 'esbuild',
    sourcemap: false,
    lib: {
      entry: path.resolve('src/wallet-connect-standalone.ts'),
      formats: ['es'],
      fileName: () => 'wallet-connect-standalone.entry.js',
    },
    rollupOptions: {
      output: {
        entryFileNames: 'wallet-connect-standalone.entry.js',
        chunkFileNames: 'wallet-connect-standalone-[name]-[hash].js',
        manualChunks(id) {
          if (id.includes('vite/preload-helper') || id.includes('commonjsHelpers.js')) return 'runtime';
          const pkg = getPkg(id);
          if (!pkg) return;
          if (walletUi.has(pkg) || pkg.startsWith('@motionone/')) return 'wallet-ui';
          if (walletCrypto.has(pkg) || pkg.startsWith('@scure/') || pkg.startsWith('@noble/')) return 'wallet-crypto';
          if (pkg === '@walletconnect/sign-client' || pkg === '@walletconnect/core' || pkg.startsWith('@walletconnect/jsonrpc-') || pkg.startsWith('@walletconnect/relay-')) return 'wallet-protocol';
          if (pkg.startsWith('@walletconnect/')) return 'wallet-core';
        },
      },
    },
  },
});
