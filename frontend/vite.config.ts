import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In development the page runs on :5173 and forwards /api to the Go server.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
