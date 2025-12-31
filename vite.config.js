import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Support client-side routing - Vite dev server handles SPA routing by default
    // All routes will fallback to index.html
    // Enable network access for mobile device testing
    host: true, // Listen on all network interfaces
    port: 5173, // Default Vite port
    // Proxy API requests to Cloudflare Pages functions (for local dev)
    // In production, these are handled by Cloudflare Pages
    // Note: This requires running `wrangler pages dev` separately on port 8788
    // If the proxy fails, the API call will fail with a clear error
    proxy: {
      '/api': {
        target: 'http://localhost:8788', // Cloudflare Pages local dev server
        changeOrigin: true,
        rewrite: (path) => path, // Keep /api prefix
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.warn('API proxy error - is wrangler pages dev running?', err.message)
          })
        },
      },
      // Proxy for Treasury APIs to avoid CORS issues
      '/treasury-api': {
        target: 'https://api.v2.tibetswap.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/treasury-api/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.warn('Treasury API proxy error:', err.message)
          })
        },
      },
      // XCHScan API proxy (primary)
      '/xchscan-api': {
        target: 'https://api.xchscan.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/xchscan-api/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.warn('XCHScan API proxy error:', err.message)
          })
        },
      },
      // Spacescan API proxy (fallback)
      '/spacescan-api': {
        target: 'https://api2.spacescan.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/spacescan-api/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.warn('Spacescan API proxy error:', err.message)
          })
        },
      },
      '/coingecko-api': {
        target: 'https://api.coingecko.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/coingecko-api/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.warn('CoinGecko API proxy error:', err.message)
          })
        },
      },
    },
  },
  // For production builds, ensure proper routing
  build: {
    rollupOptions: {
      // Ensure proper handling of routes
    },
  },
  // Ensure proper base path for routing
  base: '/',
})

