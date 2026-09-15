import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND_URL = 'http://backend:8001'

// The backend's site-password check needs the host the browser actually used.
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
    allowedHosts: ['drinkcounter.bytboyzserver.xyz'],
    proxy: {
      '/api': backendProxy(),
      '/media': backendProxy(),
      '/__site-login__': backendProxy(),
    },
  },
})
