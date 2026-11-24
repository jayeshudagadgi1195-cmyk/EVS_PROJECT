import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// During development every /api request is forwarded to the Flask backend.
// VITE_BASE is set to /EVS_PROJECT/ by the GitHub Pages workflow; '/' for local use.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true },
    },
  },
})
