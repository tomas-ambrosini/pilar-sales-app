import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
             if (id.includes('lucide-react')) return 'vendor-icons';
             if (id.includes('framer-motion')) return 'vendor-motion';
             if (id.includes('@supabase')) return 'vendor-supabase';
             if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor-react';
             if (id.includes('@hello-pangea/dnd')) return 'vendor-dnd';
             return 'vendor-core';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000 // Just to be safe, elevate the threshold slightly as these are modern connections
  }
})
