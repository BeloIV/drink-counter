import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['drinkcounter.bytboyzserver.xyz'],
    proxy: {
      '/api': {
        target: 'http://backend:8001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            proxyReq.setHeader('X-Forwarded-Host', req.headers.host || '')
          })
        },
      },
      '/media': {
        target: 'http://backend:8001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            proxyReq.setHeader('X-Forwarded-Host', req.headers.host || '')
          })
        },
      },
      '/__site-login__': {
        target: 'http://backend:8001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            proxyReq.setHeader('X-Forwarded-Host', req.headers.host || '')
          })
        },
      },
    },
  },
})