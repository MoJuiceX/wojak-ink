#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const assetsDir = path.join(repoRoot, 'public', 'assets');
const entrySource = path.join(repoRoot, 'src', 'wallet-connect-standalone.ts');

const ENTRY_FILE = 'wallet-connect-standalone.js';
const GENERATED_PREFIX = 'wallet-connect-standalone-';

const walletUiPackages = new Set([
  '@walletconnect/modal',
  '@walletconnect/modal-core',
  '@walletconnect/modal-ui',
  '@motionone/animation',
  '@motionone/dom',
  '@motionone/easing',
  '@motionone/utils',
  '@lit/reactive-element',
  'lit',
  'lit-html',
  'qrcode',
  'detect-browser',
  'dijkstrajs',
  'valtio',
]);

const walletCryptoPackages = new Set([
  'ox',
  '@msgpack/msgpack',
  'multiformats',
  'uint8arrays',
  'blakejs',
]);

function getNodeModulePackage(id) {
  const nodeModulesIndex = id.lastIndexOf('/node_modules/');
  if (nodeModulesIndex === -1) return null;
  const packagePath = id.slice(nodeModulesIndex + '/node_modules/'.length);
  const parts = packagePath.split('/');
  if (parts[0]?.startsWith('@') && parts[1]) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0] ?? null;
}

async function cleanupOldStandaloneArtifacts() {
  const entries = await fs.readdir(assetsDir, { withFileTypes: true });
  const deletes = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (
      entry.name === ENTRY_FILE ||
      (entry.name.startsWith(GENERATED_PREFIX) && entry.name.endsWith('.js'))
    ) {
      deletes.push(fs.unlink(path.join(assetsDir, entry.name)));
    }
  }
  await Promise.all(deletes);
}

async function summarizeOutputs() {
  const entries = await fs.readdir(assetsDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (
      entry.name === ENTRY_FILE ||
      (entry.name.startsWith(GENERATED_PREFIX) && entry.name.endsWith('.js'))
    ) {
      const abs = path.join(assetsDir, entry.name);
      const stat = await fs.stat(abs);
      files.push({ name: entry.name, bytes: stat.size });
    }
  }
  files.sort((a, b) => b.bytes - a.bytes);
  const formatKb = (bytes) => (bytes / 1024).toFixed(2);
  console.log('[wallet-standalone] generated files:');
  for (const file of files) {
    console.log(`  - ${file.name}: ${formatKb(file.bytes)} kB`);
  }
  const oversized = files.filter((f) => f.bytes > 406 * 1024);
  if (oversized.length) {
    throw new Error(
      `Standalone wallet asset budget exceeded (>406kB): ${oversized
        .map((f) => `${f.name} (${formatKb(f.bytes)}kB)`)
        .join(', ')}`
    );
  }
}

async function main() {
  await fs.access(entrySource);
  await fs.mkdir(assetsDir, { recursive: true });

  await cleanupOldStandaloneArtifacts();

  await build({
    configFile: false,
    publicDir: false,
    build: {
      emptyOutDir: false,
      outDir: assetsDir,
      minify: 'esbuild',
      sourcemap: false,
      target: 'es2020',
      reportCompressedSize: false,
      lib: {
        entry: entrySource,
        formats: ['es'],
        fileName: () => ENTRY_FILE,
      },
      rollupOptions: {
        output: {
          entryFileNames: ENTRY_FILE,
          chunkFileNames: `${GENERATED_PREFIX}[name]-[hash].js`,
          manualChunks(id) {
            if (
              id.includes('vite/preload-helper') ||
              id.includes('commonjsHelpers.js') ||
              id.includes('vite/modulepreload-polyfill')
            ) {
              return 'runtime';
            }

            const pkg = getNodeModulePackage(id);
            if (!pkg) return;

            if (walletUiPackages.has(pkg)) return 'wallet-ui';

            if (
              walletCryptoPackages.has(pkg) ||
              pkg.startsWith('@scure/') ||
              pkg.startsWith('@noble/')
            ) {
              return 'wallet-crypto';
            }

            if (
              pkg === '@walletconnect/sign-client' ||
              pkg === '@walletconnect/core' ||
              pkg.startsWith('@walletconnect/jsonrpc-') ||
              pkg.startsWith('@walletconnect/relay-')
            ) {
              return 'wallet-protocol';
            }

            if (pkg.startsWith('@walletconnect/')) {
              return 'wallet-core';
            }
          },
        },
      },
    },
  });

  await summarizeOutputs();
}

main().catch((error) => {
  console.error(`[wallet-standalone] ${error?.stack || error}`);
  process.exitCode = 1;
});
