import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND_URL = 'http://backend:8001'

// The backend's Google sign-in check needs the host the browser actually used.
function backendProxy() {
  return {
    target: BACKEND_URL,
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyRequest, request) => {
        proxyRequest.setHeader('X-Forwarded-Host', request.headers.host || '')
      })
    },
  }
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: process.env.PUBLIC_HOST ? [process.env.PUBLIC_HOST] : [],
    proxy: {
      '/api': backendProxy(),
      '/media': backendProxy(),
    },
  },
})
