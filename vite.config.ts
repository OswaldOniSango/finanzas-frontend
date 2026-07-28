import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const proxy = {
  '/api': {
    target: process.env.VITE_API_URL ?? 'http://localhost:8080',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy },
  // El build de producción se sirve contra la misma API, para poder probarlo igual que el dev.
  preview: { port: 4173, proxy },
})
