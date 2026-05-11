/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { scriptTemplates } from './src/data/scriptTemplates'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Vite plugin: mock GET /api/v1/script-templates
const scriptTemplatesPlugin = () => ({
  name: 'vite-plugin-script-templates',
  configureServer(server: any) {
    server.middlewares.use('/api/v1/script-templates', (req: any, res: any) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      if (req.method === 'OPTIONS') { res.end('{}'); return }
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ templates: scriptTemplates }))
    })
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss(), scriptTemplatesPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://107.173.70.124:8000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
