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
        target: 'http://192.168.1.250:8001',
        changeOrigin: true,
        // ak na backende nemáš prefix /api v root-e, nechaj rewrite takto:
        // rewrite: (path) => path,  // tu netreba meniť
      },
    },
  },
})