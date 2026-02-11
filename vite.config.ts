import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useHttps = process.env.HTTPS === 'true'

  return {
    plugins: [
      react(),
      tailwindcss(),
      useHttps && basicSsl(),
      ViteImageOptimizer({
        png: { quality: 80 },
        jpeg: { quality: 80 },
        webp: { quality: 85 },
        includePublic: true,
        logStats: true,
      }),
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
          manualChunks: {
            // React core - loaded on every page
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // WalletConnect - heavy, only needed for wallet features
            'vendor-wallet': [
              '@walletconnect/modal',
              '@walletconnect/sign-client',
              '@walletconnect/types',
              '@walletconnect/utils',
            ],
            // Auth - Clerk is heavy
            'vendor-clerk': ['@clerk/clerk-react'],
            // Animation & UI
            'vendor-ui': ['framer-motion', 'lucide-react'],
            // Data fetching & state
            'vendor-data': ['@tanstack/react-query', 'zustand'],
            // Utilities
            'vendor-utils': ['lodash', 'date-fns'],
          },
        },
      },
    },
    server: {
      port: 5174, // Dedicated port for wojak-ink (5173 often used by other projects)
      host: true, // Allow network access
      allowedHosts: ['localhost', '.trycloudflare.com', '.loca.lt', '.ngrok.io', '.ngrok-free.app'],
      proxy: {
        // API routes - proxy to production for dev testing with real database
        '/api': {
          target: 'https://wojak.ink',
          changeOrigin: true,
          secure: true,
        },
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
        '/parsebot-api': {
          target: 'https://api.parse.bot',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/parsebot-api/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('x-api-key', env.VITE_PARSEBOT_API_KEY || '');
            });
          },
        },
      },
    },
  }
})
