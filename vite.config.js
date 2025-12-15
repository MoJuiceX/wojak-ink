import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Support client-side routing - Vite dev server handles SPA routing by default
    // All routes will fallback to index.html
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

