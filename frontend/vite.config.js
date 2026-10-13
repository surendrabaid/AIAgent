import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  define: {
    'process.env.API_KEY': JSON.stringify('api-key-this-is-not-used-can-be-ignored!'),
  },
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api-proxy': 'http://127.0.0.1:5001',
      '/ws-proxy': { target: 'ws://127.0.0.1:5001', ws: true }
    }
  }
})

