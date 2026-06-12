import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API = process.env.VITE_API_URL || 'http://localhost:3000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // API endpoints used by the frontend
      '/auth': {
        target: API,
        changeOrigin: true
      },
      '/courts': {
        target: API,
        changeOrigin: true
      },
      '/jobs': {
        target: API,
        changeOrigin: true
      },
      '/lawyers': {
        target: API,
        changeOrigin: true
      },
      // Socket.io websocket path
      '/socket.io': {
        target: API,
        ws: true,
        changeOrigin: true
      }
    }
  }
})
