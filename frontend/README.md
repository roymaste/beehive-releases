# 蜂巢智能体 — 前端

> **React 19 + TypeScript + Vite + Tailwind CSS v4**
> 最后更新: 2026-05-18

## 技术栈

| 核心 | 版本 | 用途 |
|------|------|------|
| React | 19.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 6.x | 构建工具 + HMR |
| Tailwind CSS | v4 | 原子化样式 |
| Radix UI | 最新 | 无样式 UI 原语 |
| shadcn/ui | — | Radix 封装组件库 |
| TanStack Query (React Query) | — | 服务端状态管理 |
| React Router | 7.x | 路由 |
| React Hook Form | — | 表单处理 |
| Zod | — | 表单验证 |
| Sonner | — | Toast 通知 |
| Recharts | — | 图表 |
| Recharts | — | 图表 |
| Lucide / Radix Icons | — | 图标库 |
| Vitest + Testing Library | — | 测试 |

## 目录结构

```
frontend/
├── src/
│   ├── App.tsx                 # 根组件（路由定义）
│   ├── main.tsx                # 入口
│   ├── lib/                    # 工具函数
│   ├── context/                # React Context (Auth, Theme, Layout, Search)
│   ├── hooks/                  # 自定义 Hooks
│   ├── components/             # UI 组件
│   │   ├── ui/                 # shadcn/ui 基础组件
│   │   ├── layout/             # 布局组件 (sidebar, nav, header)
│   │   └── data-table/         # 通用数据表格组件
│   ├── pages/                  # 页面级组件
│   │   ├── DashboardPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── sign-in.tsx
│   │   ├── sign-up.tsx
│   │   ├── billing/
│   │   ├── api-keys/
│   │   ├── webhooks/
│   │   ├── executors/
│   │   ├── profiles/
│   │   ├── proxies/
│   │   ├── referrals/
│   │   ├── team/
│   │   ├── kernels/
│   │   ├── system/
│   │   ├── AgentConsolePage.tsx
│   │   ├── AgentManagementPage.tsx
│   │   ├── AIWorkflowPage.tsx
│   │   └── admin/              # 管理后台页面
│   ├── api/                    # API 请求层
│   └── styles/                 # 全局样式
├── dist/                       # 构建产物
├── vite.config.ts              # Vite 配置
├── tsconfig.json               # TypeScript 配置
└── package.json                # 依赖管理
```

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器 (http://localhost:5173)
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

## 测试

```bash
# 运行测试
npm run test

# 监听模式
npm run test:watch
```

## 代码生成

```bash
# 从后端生成 API 类型定义
npm run gen:api
```

## 构建产物

`dist/` 目录输出静态资源，由后端 FastAPI 挂载提供服务。
