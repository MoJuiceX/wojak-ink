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

