import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useHttps = process.env.HTTPS === 'true'

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
            // Use function-based chunking for more control
            
            // React core - loaded on every page
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
              return 'vendor-react';
            }
            
            // Animation library - separate chunk to defer loading
            if (id.includes('node_modules/framer-motion')) {
              return 'vendor-animation';
            }
            
            // WalletConnect - heavy, only needed for wallet features
            if (
              id.includes('node_modules/@walletconnect/modal') ||
              id.includes('node_modules/@walletconnect/sign-client') ||
              id.includes('node_modules/@walletconnect/types') ||
              id.includes('node_modules/@walletconnect/utils')
            ) {
              return 'vendor-wallet';
            }
            
            // Auth - Clerk is heavy
            if (id.includes('node_modules/@clerk/clerk-react')) {
              return 'vendor-clerk';
            }
            
            // Icons library
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
            
            // Data fetching & state management
            if (id.includes('node_modules/@tanstack/react-query') || id.includes('node_modules/zustand')) {
              return 'vendor-data';
            }
            
            // DnD Kit - drag and drop utilities
            if (id.includes('node_modules/@dnd-kit')) {
              return 'vendor-dnd';
            }
            
            // Socket.io client
            if (id.includes('node_modules/socket.io-client')) {
              return 'vendor-socket';
            }
            
            // Utilities group
            if (id.includes('node_modules/lodash') || id.includes('node_modules/date-fns')) {
              return 'vendor-utils';
            }
          },
        },
      },
      // Increased chunk size warning to 800KB since we're aggressive with splitting
      chunkSizeWarningLimit: 800,
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
      },
    },
  }
})
