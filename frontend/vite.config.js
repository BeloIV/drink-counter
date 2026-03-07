import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['drinkcounter.bytboyzserver.xyz'],
    proxy: {
      // všetko na /api pošli do Django
      '/api': {
        target: 'http://backend:8001',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://backend:8001',
        changeOrigin: true,
      },
    },
  },
})