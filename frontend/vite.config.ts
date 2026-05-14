/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
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

// Mock dashboard stats for dev screenshot testing
const mockDashboardPlugin = () => ({
  name: 'vite-plugin-mock-dashboard',
  configureServer(server: any) {
    server.middlewares.use('/api/v1/dashboard/stats', (req: any, res: any) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      if (req.method === 'OPTIONS') { res.end('{}'); return }
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        total_envs: 24,
        running_envs: 18,
        stopped_envs: 6,
        total_proxies: 12,
        bound_proxies: 10,
        today_posts: 47,
        success_rate: 87.5,
        recent_profiles: [
          { id: '1', name: 'Twitter 主账号', platform: 'twitter', runtime_status: 'running', group: '社交媒体组', updated_at: new Date(Date.now() - 300000).toISOString() },
          { id: '2', name: '小红书 品牌号', platform: 'xhs', runtime_status: 'running', group: '电商运营组', updated_at: new Date(Date.now() - 900000).toISOString() },
          { id: '3', name: '抖音 带货号', platform: 'douyin', runtime_status: 'stopped', group: '短视频组', updated_at: new Date(Date.now() - 3600000).toISOString() },
          { id: '4', name: 'LinkedIn 企业页', platform: 'linkedin', runtime_status: 'running', group: 'B2B组', updated_at: new Date(Date.now() - 7200000).toISOString() },
          { id: '5', name: '微博 官方号', platform: 'weibo', runtime_status: 'running', group: '社交媒体组', updated_at: new Date(Date.now() - 10800000).toISOString() },
        ],
        tenant_count: 1,
        platform_count: 5,
        ip_count: 12,
        active_tasks: 8,
      }))
    })
    server.middlewares.use('/api/v1/admin/dashboard', (req: any, res: any) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      if (req.method === 'OPTIONS') { res.end('{}'); return }
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        total_clients: 156,
        active_clients: 89,
        total_environments: 1248,
        running_environments: 987,
        total_proxies: 512,
        total_automations: 342,
      }))
    })
    server.middlewares.use('/api/v1/admin/clients', (req: any, res: any) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      if (req.method === 'OPTIONS') { res.end('{}'); return }
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        clients: [
          { id: '1', name: '科技前沿', email: 'tech@example.com', status: 'active', plan_type: 'enterprise', environment_count: 48, created_at: '2024-01-15T08:00:00Z' },
          { id: '2', name: '品牌星球', email: 'brand@example.com', status: 'active', plan_type: 'pro', environment_count: 24, created_at: '2024-02-20T10:00:00Z' },
          { id: '3', name: '新媒体实验室', email: 'lab@example.com', status: 'active', plan_type: 'basic', environment_count: 12, created_at: '2024-03-10T14:00:00Z' },
          { id: '4', name: '创意工坊', email: 'creative@example.com', status: 'suspended', plan_type: 'free', environment_count: 3, created_at: '2024-04-05T09:00:00Z' },
          { id: '5', name: '数字营销部', email: 'marketing@example.com', status: 'active', plan_type: 'pro', environment_count: 36, created_at: '2024-05-12T11:00:00Z' },
        ],
        total: 156,
      }))
    })
  },
})

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    scriptTemplatesPlugin(),
    mockDashboardPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: 'NetworkOnly',
            options: {},
          },
        ],
      },
      manifest: {
        name: '蜂巢智能体',
        short_name: '蜂巢',
        display: 'standalone',
        theme_color: '#000000',
      },
    }),
  ],
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
