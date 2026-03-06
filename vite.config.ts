import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

const getNodeModulePackage = (id: string): string | null => {
  const nodeModulesIndex = id.lastIndexOf('/node_modules/')
  if (nodeModulesIndex === -1) return null

  const packagePath = id.slice(nodeModulesIndex + '/node_modules/'.length)
  const parts = packagePath.split('/')
  if (parts[0]?.startsWith('@') && parts[1]) {
    return `${parts[0]}/${parts[1]}`
  }
  return parts[0] ?? null
}

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
])

const walletCryptoPackages = new Set([
  'ox',
  '@msgpack/msgpack',
  'multiformats',
  'uint8arrays',
  'blakejs',
])

const walletCorePackages = new Set([
  '@walletconnect/core',
  '@walletconnect/environment',
  '@walletconnect/events',
  '@walletconnect/keyvaluestorage',
  '@walletconnect/logger',
  '@walletconnect/relay-auth',
  '@walletconnect/safe-json',
  '@walletconnect/sign-client',
  '@walletconnect/time',
  '@walletconnect/types',
  '@walletconnect/utils',
  '@walletconnect/window-getters',
  '@walletconnect/window-metadata',
  'events',
  'idb-keyval',
  'unstorage',
])

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useHttps = process.env.HTTPS === 'true'
  const isPlaywrightLocalSafe = process.env.PW_LOCAL_SAFE === '1'

  return {
    plugins: [
      react(),
      tailwindcss(),
      useHttps && basicSsl(),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': '/src',
        '@components': '/src/components',
        '@pages': '/src/pages',
        '@hooks': '/src/hooks',
        '@utils': '/src/utils',
        '@assets': '/src/assets',
        // Force single React instance for all imports
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
        'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime'),
      },
      // Dedupe React and related packages to prevent multiple instances
      dedupe: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        '@tanstack/react-query',
        '@tanstack/query-core',
        'framer-motion',
      ],
    },
    // Pre-bundle dependencies to ensure single React instance
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        '@tanstack/react-query',
        'framer-motion',
      ],
      force: false,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Keep Vite/Rollup helper modules in a tiny shared runtime chunk.
            // Otherwise Rollup may place the preload helper inside a manual vendor chunk
            // (e.g. vendor-wallet-ui), which forces that large chunk onto the startup path.
            if (
              id.includes('vite/preload-helper') ||
              id.includes('commonjsHelpers.js') ||
              id.includes('vite/modulepreload-polyfill')
            ) {
              return 'vendor-runtime'
            }

            // Large generator internals are used by lazy routes (Generator + RuleBuilder),
            // but Rollup may hoist them into the entry chunk as shared code.
            if (
              id.includes('/src/contexts/GeneratorContext.tsx') ||
              id.includes('/src/contexts/generatorReducer.ts') ||
              id.includes('/src/contexts/generatorStateUtils.ts') ||
              id.includes('/src/services/canvasRenderer') ||
              id.includes('/src/services/generatorService.ts') ||
              id.includes('/src/lib/wojakRules.ts') ||
              id.includes('/src/lib/traitNameMap.ts')
            ) {
              return 'feature-generator-core'
            }

            const pkg = getNodeModulePackage(id)
            if (!pkg) return

            // React core - loaded on every page
            if (
              pkg === 'react' ||
              pkg === 'react-dom' ||
              pkg === 'react-router' ||
              pkg === 'react-router-dom' ||
              pkg.startsWith('@clerk/')
            ) {
              return 'vendor-react'
            }

            if (pkg === '@react-oauth/google' || pkg === 'jwt-decode') {
              return 'vendor-auth'
            }

            // Animation library - separate chunk to defer loading
            if (pkg === 'framer-motion') {
              return 'vendor-animation'
            }

            // WalletConnect ecosystem - split by family so one chunk does not grow >600k
            if (walletUiPackages.has(pkg)) {
              return 'vendor-wallet-ui'
            }

            if (walletCryptoPackages.has(pkg) || pkg.startsWith('@scure/') || pkg.startsWith('@noble/')) {
              return 'vendor-wallet-crypto'
            }

            if (walletCorePackages.has(pkg) || pkg.startsWith('@walletconnect/')) {
              return 'vendor-wallet'
            }

            // Icons library
            if (pkg === 'lucide-react') {
              return 'vendor-icons'
            }

            // Data fetching & state management
            if (pkg === '@tanstack/react-query' || pkg === '@tanstack/query-core' || pkg === 'zustand') {
              return 'vendor-data'
            }

            // DnD Kit - drag and drop utilities
            if (pkg.startsWith('@dnd-kit/')) {
              return 'vendor-dnd'
            }

            // Socket.io client
            if (pkg === 'socket.io-client') {
              return 'vendor-socket'
            }

            // Utilities group
            if (pkg === 'lodash' || pkg === 'date-fns') {
              return 'vendor-utils'
            }
          },
        },
      },
      // Keep a stricter budget signal now that chunk splitting reduced the main entry chunk.
      chunkSizeWarningLimit: 600,
    },
    server: {
      port: 5174, // Dedicated port for wojak-ink (5173 often used by other projects)
      host: true, // Allow network access
      allowedHosts: ['localhost', '.trycloudflare.com', '.loca.lt', '.ngrok.io', '.ngrok-free.app'],
      proxy: {
        // API routes - safe local Playwright mode disables this production proxy.
        ...(!isPlaywrightLocalSafe ? {
          '/api': {
            target: 'https://wojak.ink',
            changeOrigin: true,
            secure: true,
          },
        } : {}),
        '/spacescan-api': {
          target: 'https://api.spacescan.io',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/spacescan-api/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (env.VITE_SPACESCAN_API_KEY) {
                proxyReq.setHeader('x-api-key', env.VITE_SPACESCAN_API_KEY);
              }
            });
          },
        },
        '/coingecko-api': {
          target: 'https://api.coingecko.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/coingecko-api/, ''),
        },
        '/mintgarden-api': {
          target: 'https://api.mintgarden.io',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/mintgarden-api/, ''),
        },
        '/dexie-api': {
          target: 'https://api.dexie.space',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/dexie-api/, ''),
        },
      },
    },
  }
})
