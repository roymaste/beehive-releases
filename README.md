# 🐝 Beehive Agent - 蜂巢智能体

[![GitHub Stars](https://img.shields.io/github/stars/roymaste/beehive-releases?style=social)](https://github.com/roymaste/beehive-releases/stargazers)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-brightgreen)]()

> **多账号社媒运营 API 平台** — 一站式管理多个社交媒体账号，实现自动化发布、评论回复、粉丝互动等功能。

---

## ⚠️ 重要声明

**本仓库为部分开源项目：**
- ✅ **前端源码（frontend/）** — 开源，仅含 UI 组件和样式
- ✅ **Tauri 桌面端（desktop/）** — 开源，仅含客户端 UI 和自动更新逻辑
- ❌ **后端 API（saas/）** — 闭源，VPS 上商业运行
- ❌ **计费模块（billing/）** — 闭源
- ❌ **RPA 引擎（scripts/rpa/）** — 闭源

**完整功能需配合蜂巢智能体 VPS 后端服务使用。**

---

## 📌 产品简介

蜂巢智能体（Beehive Agent）是一款专为社交媒体运营者设计的**多账号管理 + 自动化运营 API 平台**。支持同时管理多个社交媒体账号，通过可视化界面或 API 接口实现内容发布、评论回复、粉丝互动等自动化操作。

### 🎯 核心场景

- **多账号管理**：集中管理多个社交媒体账号，支持 Twitter/X、Facebook、Instagram、TikTok 等平台
- **自动化发布**：定时发布内容，支持单账号或多账号同时发布
- **智能客服**：自动回复评论和私信，提高粉丝互动率
- **数据监控**：实时监控账号状态、发布效果、互动数据
- **API 集成**：提供 RESTful API，方便与现有系统集成

---

## ✨ 功能列表

### 账号管理
- [x] 多平台账号统一管理（Twitter/X、Facebook、Instagram、TikTok 等）
- [x] 账号分组与标签管理
- [x] 账号状态实时监控
- [x] 批量导入/导出账号

### 内容运营
- [x] 可视化文章编辑器
- [x] 定时发布任务
- [x] 批量发布到多个账号
- [x] 媒体资源管理（图片、视频）
- [x] 内容模板库

### 自动化运营
- [x] 评论自动回复
- [x] 私信关键词回复
- [x] 粉丝自动互动（点赞、关注、回关）
- [x] 自动化任务编排

### 运营数据
- [x] 发布效果统计
- [x] 账号健康度分析
- [x] 运营报表导出

### 开发者 API
- [x] RESTful API 接口
- [x] 多级 API Key 管理
- [x] 请求频率限制
- [x] 使用量统计

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         客户端层                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Web 前端       │  │  Tauri 桌面端    │  │   API 调用      │ │
│  │  (React+TypeScript)│  │ (Rust+WebView)  │  │  (REST API)     │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
└───────────┼─────────────────────┼─────────────────────┼─────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API 网关层                                 │
│                   (身份认证 / 限流 / 路由)                          │
└─────────────────────────────────────────────────────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                       业务服务层                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   账号服务     │  │   内容服务     │  │   任务服务     │          │
│  │  (Account)   │  │  (Content)   │  │  (Task)      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                       平台适配层                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Twitter  │ │ Facebook │ │Instagram │ │  TikTok  │  ...      │
│  │  Adapter │ │  Adapter │ │  Adapter │ │  Adapter │            │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
└─────────────────────────────────────────────────────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     社交媒体平台                                   │
│     Twitter/X  ·  Facebook  ·  Instagram  ·  TikTok  ...       │
└─────────────────────────────────────────────────────────────────┘
```

### 架构说明

| 层次 | 说明 | 开源状态 |
|------|------|----------|
| **客户端层** | Web 前端（React）、Tauri 桌面端、API 调用 | ✅ 开源 |
| **API 网关层** | 统一入口、身份认证、流量控制 | ❌ 闭源 |
| **业务服务层** | 核心业务逻辑（账号、内容、任务） | ❌ 闭源 |
| **平台适配层** | 各社交平台 API 封装 | ❌ 闭源 |

---

## 📸 截图预览

> 截图待添加

<!--
### 管理后台
![Dashboard](docs/screenshots/dashboard.png)

### 账号管理
![Accounts](docs/screenshots/accounts.png)

### 内容编辑
![Editor](docs/screenshots/editor.png)
-->

---

## 💻 安装方式

### 方式一：Windows 桌面端（推荐）

下载安装包 `Beehive Browser_x.x.x_x64-setup.exe`，运行安装向导完成安装。

📥 **[下载 Windows 版](https://github.com/roymaste/beehive-releases/releases)**

### 方式二：Linux 桌面端

```bash
# 下载 .deb 安装包
sudo dpkg -i beehive-browser_x.x.x_amd64.deb

# 或下载 .AppImage 便携版
chmod +x Beehive-Browser_x.x.x_amd64.AppImage
./Beehive-Browser_x.x.x_amd64.AppImage
```

📥 **[下载 Linux 版](https://github.com/roymaste/beehive-releases/releases)**

### 方式三：Web 前端

```bash
# 直接使用 Docker 运行
docker run -d \
  --name beehive-frontend \
  -p 3000:80 \
  -e API_BASE_URL=http://your-vps-ip:8008 \
  ghcr.io/roymaste/beehive-frontend:latest
```

或自行构建：
```bash
git clone https://github.com/roymaste/beehive-releases.git
cd beehive-releases/frontend
npm install
npm run build
```

---

## 🔧 配置说明

### 前端配置

复制 `frontend/.env.production.example` 为 `.env.production`，修改配置：

```env
VITE_API_URL=http://YOUR_VPS_IP:8008
```

### 桌面端配置

首次启动后，在设置中配置 VPS 服务器地址：

```
VPS 地址：http://YOUR_VPS_IP:8008
```

---

## 🛠️ 技术栈

### 前端
- **框架**：React 18 + TypeScript
- **构建工具**：Vite
- **UI 框架**：Tailwind CSS
- **状态管理**：React Context
- **HTTP 客户端**：Axios
- **路由**：React Router v6

### 桌面端
- **框架**：Tauri v2
- **语言**：Rust + TypeScript
- **前端**：WebView2 (Windows) / WebKit (Linux)
- **自动更新**：Tauri Updater Plugin

### 整体架构
- **后端**：Python FastAPI（闭源）
- **数据库**：PostgreSQL + Redis（闭源）
- **容器化**：Docker + Docker Compose（闭源）

---

## 📚 文档

- [快速入门指南](docs/getting-started.md)
- [Linux 安装教程](docs/install-linux.md)
- [Windows 安装教程](docs/install-windows.md)

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'Add some AmazingFeature'`
4. 推送到分支：`git push origin feature/AmazingFeature`
5. 创建 Pull Request

---

## 📄 开源许可

本项目采用 [AGPL v3](LICENSE) 开源许可。

**重要说明**：
- 前端代码（`frontend/` 目录）和桌面端代码（`desktop/` 目录）遵循 AGPL v3 许可
- 后端代码、计费模块、RPA 引擎等核心闭源模块不包含在本仓库中

---

## ⭐ 支持项目

如果这个项目对您有帮助，请给一个 Star！

[![Stargazers repo roster for @roymaste/beehive-releases](https://reporoster.com/stars/roymaste/beehive-releases)](https://github.com/roymaste/beehive-releases/stargazers)

---

## 📞 联系我们

- **官方网站**：[待添加]
- **技术支持**：[待添加]
- **问题反馈**：[GitHub Issues](https://github.com/roymaste/beehive-releases/issues)

---

<p align="center">
  <strong>Built with 🐝 by Beehive Team</strong>
</p>
