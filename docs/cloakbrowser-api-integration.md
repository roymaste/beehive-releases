# CloakBrowser API 深度集成调研报告

> 调研目标：找出蜂巢项目如何从「命令行参数启动 CloakBrowser」升级为「通过 API/SDK 深度集成」
> 调研时间：2026-05-15

---

## 一、CloakBrowser 项目本身提供的 API

### 1.1 GitHub 仓库
- **主仓库**: https://github.com/CloakHQ/CloakBrowser
- **Manager 仓库**: https://github.com/CloakHQ/CloakBrowser-Manager
- **PyPI**: `pip install cloakbrowser`
- **npm**: `npm install cloakbrowser`
- **Docker Hub**: `cloakhq/cloakbrowser`

### 1.2 核心 API 模式

CloakBrowser 提供 **三层 API 模式**，从低到高：

#### 层 1: 命令行参数（CLI Flags）—— 蜂巢目前用的方式
```bash
chrome --fingerprint=12345 \
  --fingerprint-platform=windows \
  --fingerprint-timezone=Asia/Tokyo \
  --fingerprint-locale=ja-JP \
  --proxy-server=socks5://host:1080 \
  --remote-debugging-port=9222
```
- **问题**: 每次启动都是独立进程，无法动态管理；没有 profile 持久化；没有 REST API

#### 层 2: Python/JS SDK —— `cloakbrowser` 包
```python
from cloakbrowser import launch, launch_persistent_context

# 基础启动
browser = launch(proxy="http://proxy:8080", humanize=True)

# 持久化 profile（cookies/localStorage 跨会话保留）
ctx = launch_persistent_context("./my-profile", timezone="America/New_York")

# 异步版本
from cloakbrowser import launch_async, launch_persistent_context_async
context = await launch_persistent_context_async(...)
```
- **本质**: 薄封装层，底层还是调用 Chromium 二进制 + 命令行参数
- **优势**: 自动处理二进制下载、stealth args 组装、proxy 解析、geoip 等

#### 层 3: `cloakserve` —— CDP Multiplexer（REST-ish + WebSocket）
```bash
# 启动 CDP 多路复用服务器
docker run -d -p 9222:9222 cloakhq/cloakbrowser cloakserve

# 客户端通过 CDP over HTTP/WebSocket 连接
browser = pw.chromium.connect_over_cdp("http://localhost:9222?fingerprint=12345")
```
- **特性**:
  - 每个 `fingerprint` seed 对应一个独立的 Chrome 进程
  - 支持 query params 动态配置: `?fingerprint=123&timezone=Asia/Tokyo&proxy=...`
  - HTTP 端点: `GET /` (状态), `GET /json/version`, `GET /json/list`
  - WebSocket 代理: `/devtools/browser`, `/fingerprint/{seed}/devtools/...`
  - 连接复用：同一 seed 复用同一进程
- **局限**: 不是完整的 REST API，没有 profile CRUD；主要是 CDP 代理

### 1.3 CloakBrowser Manager —— 完整的 Profile Manager + REST API

这是 CloakBrowser 官方提供的 **自托管 profile 管理器**，对标 Multilogin/GoLogin/AdsPower：

```bash
docker run -p 8080:8080 -v cloakprofiles:/data cloakhq/cloakbrowser-manager
```

**REST API 端点**:
```
GET    /api/profiles              # 列出所有 profile
POST   /api/profiles              # 创建 profile
GET    /api/profiles/{id}         # 获取 profile
PUT    /api/profiles/{id}         # 更新 profile
DELETE /api/profiles/{id}         # 删除 profile
POST   /api/profiles/{id}/launch  # 启动浏览器
POST   /api/profiles/{id}/stop    # 停止浏览器
GET    /api/profiles/{id}/status  # 获取运行状态
GET    /api/profiles/{id}/cdp     # CDP 连接信息
GET    /api/status                # 系统状态
```

**Profile 模型**:
```python
{
  "id": "uuid",
  "name": "Twitter Account 1",
  "fingerprint_seed": 12345,
  "proxy": "http://user:pass@host:8080",
  "timezone": "America/New_York",
  "locale": "en-US",
  "platform": "windows",
  "user_agent": "...",
  "screen_width": 1920,
  "screen_height": 1080,
  "gpu_vendor": "...",
  "gpu_renderer": "...",
  "hardware_concurrency": 8,
  "humanize": true,
  "headless": false,
  "user_data_dir": "/data/profiles/...",
  "status": "running",  # or "stopped"
  "cdp_url": "/api/profiles/{id}/cdp",
  "vnc_ws_port": 5901   # noVNC 实时查看
}
```

**自动化连接**:
```python
from playwright.async_api import async_playwright

async with async_playwright() as pw:
    browser = await pw.chromium.connect_over_cdp(
        "http://localhost:8080/api/profiles/<profile-id>/cdp"
    )
    page = browser.contexts[0].pages[0]
    await page.goto("https://twitter.com")
```

---

## 二、其他指纹浏览器的 API 模式（对标分析）

| 浏览器 | API 类型 | Profile 管理 | CDP 连接 | 特点 |
|--------|---------|-------------|---------|------|
| **AdsPower** | REST API | ✅ 完整 | ✅ 提供 | 商业产品，API 需付费 |
| **GoLogin** | REST API + SDK | ✅ 完整 | ✅ 提供 | 商业产品，有 Orbita 内核 |
| **Multilogin** | SDK (有限) | ✅ 完整 | ⚠️ 有限 | 老牌，API 较封闭 |
| **Dolphin Anty** | REST API (有限) | ✅ 完整 | ⚠️ 有限 | 俄罗斯产品，API 功能少 |
| **CloakBrowser** | Python/JS SDK + `cloakserve` + Manager | ✅ (Manager) | ✅ (原生) | **开源免费**，三层 API |

### 2.1 AdsPower API 模式（典型商业方案）
```python
# 1. 创建/获取 profile
POST /api/v1/profile/create
POST /api/v1/profile/list

# 2. 启动浏览器，获取 CDP ws endpoint
POST /api/v1/browser/start
# 返回: {"ws://127.0.0.1:xxxxx/devtools/browser/..."}

# 3. 用 Playwright/Selenium 连接 CDP
browser = pw.chromium.connect_over_cdp(ws_url)

# 4. 关闭
POST /api/v1/browser/stop
```
- **核心模式**: REST API 管理 profile + 返回 CDP WebSocket URL 供自动化工具连接

### 2.2 GoLogin API 模式
```python
# SDK 方式
from gologin import GoLogin

profile_id = gl.create_profile({"name": "Profile 1", "proxy": {...}})
ws_url = gl.start_profile(profile_id)  # 返回 CDP ws URL
# ... 自动化操作 ...
gl.stop_profile(profile_id)
```
- **核心模式**: SDK 封装 REST API，同样返回 CDP URL

---

## 三、蜂巢项目目前的方式 vs API 集成方式

### 3.1 当前方式（命令行参数启动）

**代码位置**: `/home/joyandjoe/beehive-agent/desktop/beehive-browser/src/lib.rs`

```rust
#[tauri::command]
fn launch_cloak(config: LaunchConfig, state: tauri::State<CloakState>) -> Result<String, String> {
    let binary = find_cloak_binary(config.kernel_version.as_deref())?;
    let mut cmd = Command::new(&binary);
    
    // 手动组装所有命令行参数
    cmd.arg(format!("--user-data-dir={}", data_dir.display()));
    cmd.arg("--no-first-run");
    // ... 20+ 个 fingerprint flags
    if let Some(seed) = config.fingerprint_seed {
        cmd.arg(format!("--fingerprint={}", seed));
    }
    cmd.arg(format!("--fingerprint-platform={}", plat));
    // ... proxy, headless, cdp port, etc.
    
    let child = cmd.spawn()?;
    // 只返回 pid，没有 CDP 连接管理
}
```

**问题**:
1. **无 Profile 持久化管理** — 每次启动都是全新进程，没有 profile 数据库
2. **无 CDP 连接端点返回** — 启动后不知道 CDP port，需要外部猜测
3. **无生命周期管理** — 进程崩溃/退出后无自动重启、无状态监控
4. **命令行参数脆弱** — 参数顺序、格式错误会导致启动失败
5. **无多实例调度** — 无法管理多个 profile 的并发启动
6. **Rust 侧负担重** — 所有 fingerprint 逻辑都要在 Rust 里手动拼接

### 3.2 理想的 API 集成方式

**方案 A: 直接集成 CloakBrowser Python SDK**（推荐短期）
```python
# 在 Python 后端（desktop_agent.py / saas）中使用
from cloakbrowser import launch_persistent_context_async

context = await launch_persistent_context_async(
    user_data_dir=f"~/.beehive/profiles/{profile_id}",
    headless=False,
    proxy=profile.proxy,
    timezone=profile.timezone,
    locale=profile.locale,
    humanize=True,
    args=[f"--remote-debugging-port={cdp_port}"],
)
# 返回的 context 自带 CDP，可以直接操作
```
- **优势**: 立即可用，无需额外服务，CloakBrowser 官方维护
- **劣势**: 仍需自己管理 profile 数据库和生命周期

**方案 B: 部署 CloakBrowser Manager 作为独立服务**（推荐中长期）
```python
# 蜂巢后端 → HTTP 调用 Manager API
import httpx

async def launch_browser(profile_id: str):
    async with httpx.AsyncClient() as client:
        # 创建 profile
        resp = await client.post("http://localhost:8080/api/profiles", json={
            "name": "Twitter Bot 1",
            "fingerprint_seed": 12345,
            "proxy": "socks5://...",
            "timezone": "Asia/Tokyo",
        })
        profile = resp.json()
        
        # 启动
        resp = await client.post(f"http://localhost:8080/api/profiles/{profile['id']}/launch")
        return resp.json()["cdp_url"]  # "/api/profiles/{id}/cdp"

# 然后连接 CDP 自动化
browser = await pw.chromium.connect_over_cdp(f"http://localhost:8080{cdp_url}")
```
- **优势**: 
  - 完整的 profile CRUD
  - 内置 VNC 实时查看（noVNC）
  - 自动生命周期管理（崩溃检测、自动清理）
  - 与蜂巢现有 FastAPI 后端天然契合
  - 开源免费，可二次开发
- **劣势**: 需要多部署一个 Docker 服务（~2GB 镜像）

**方案 C: 自建轻量级 Profile Manager**（折中）
- 在蜂巢现有 FastAPI 后端中，仿照 CloakBrowser-Manager 的模式：
  - 复用 `cloakbrowser` Python SDK 的 `launch_persistent_context_async()`
  - 自己实现 profile 数据库（SQLite/PostgreSQL）
  - 自己实现 CDP proxy（参考 Manager 的 WebSocket proxy 代码）
  - 自己实现 VNC 集成（可选）
- **优势**: 完全控制，无外部依赖
- **劣势**: 开发工作量大，需要维护 CDP proxy、VNC 等复杂逻辑

---

## 四、具体集成建议

### 4.1 短期（1-2 周）
**在 Python 执行层替换 Rust 的命令行启动**

当前桌面端 `lib.rs` 的 `launch_cloak` 命令直接 `Command::spawn()` 启动 chrome 二进制。建议：

1. **桌面端保持现状**（Rust 启动器作为 fallback）
2. **VPS/服务器端使用 Python SDK**:
   ```python
   # saas/services/browser_service.py
   from cloakbrowser import launch_persistent_context_async
   
   async def launch_profile(profile: Profile):
       ctx = await launch_persistent_context_async(
           user_data_dir=profile.data_dir,
           proxy=profile.proxy,
           timezone=profile.timezone,
           # ...
       )
       return ctx  # 直接返回 Playwright context
   ```
3. **利用 `cloakserve` 做 CDP 服务化**:
   ```bash
   # 在 VPS 上启动 cloakserve
   cloakserve --port=9222
   ```
   然后各执行器通过 CDP URL 连接，而不是直接管理进程

### 4.2 中期（1 个月）
**部署 CloakBrowser-Manager 或自建 Profile Manager**

- 将 Manager 作为可选组件集成到蜂巢部署脚本中
- 蜂巢后端通过 HTTP API 调用 Manager 管理 profile
- 前端管理看板直接复用 Manager 的 REST API

### 4.3 关键收益对比

| 维度 | 当前命令行方式 | SDK 方式 | Manager API 方式 |
|------|-------------|---------|-----------------|
| Profile 持久化 | ❌ 无 | ⚠️ 需自建 | ✅ 内置 SQLite |
| CDP 连接管理 | ❌ 手动猜端口 | ⚠️ 需自建 | ✅ 自动返回 URL |
| 多实例调度 | ❌ 无 | ⚠️ 需自建 | ✅ 内置 |
| 崩溃自动恢复 | ❌ 无 | ❌ 无 | ✅ 内置 |
| VNC 实时查看 | ❌ 无 | ❌ 无 | ✅ 内置 noVNC |
| 指纹参数管理 | ❌ 手动拼接 | ✅ SDK 自动 | ✅ 自动 |
| 开发成本 | 低 | 中 | 低（复用开源） |

---

## 五、核心代码参考

### CloakBrowser Python SDK 关键函数
```python
# cloakbrowser/__init__.py
from .browser import (
    launch, launch_async,
    launch_context, launch_context_async,
    launch_persistent_context, launch_persistent_context_async,
    build_args, maybe_resolve_geoip,
)
```

### CloakBrowser Manager API 端点汇总
```
GET    /api/status
POST   /api/auth/login
GET    /api/auth/status

GET    /api/profiles
POST   /api/profiles
GET    /api/profiles/{id}
PUT    /api/profiles/{id}
DELETE /api/profiles/{id}

POST   /api/profiles/{id}/launch
POST   /api/profiles/{id}/stop
GET    /api/profiles/{id}/status
GET    /api/profiles/{id}/cdp
POST   /api/profiles/{id}/clipboard

WS     /api/profiles/{id}/cdp
WS     /api/profiles/{id}/cdp/devtools/{path}
WS     /api/profiles/{id}/vnc  (VNC WebSocket)
```

### 蜂巢当前 Rust 启动器位置
- `/home/joyandjoe/beehive-agent/desktop/beehive-browser/src/lib.rs` — Tauri 桌面端
- `/home/joyandjoe/beehive-agent/scripts/cloak-launcher/src/main.rs` — 独立 CLI 启动器

---

## 六、结论

**CloakBrowser 已经提供了完整的 API 生态**：
1. **Python/JS SDK** — 替代手动命令行参数拼接
2. **`cloakserve`** — CDP 多路复用，适合服务化部署
3. **CloakBrowser-Manager** — 完整的 Profile Manager + REST API + VNC，可直接集成

**蜂巢项目的最佳路径**:
- **立即**: 在 Python 后端引入 `cloakbrowser` SDK，替换部分手动命令行启动逻辑
- **短期**: 在 VPS 部署场景中引入 `cloakserve` 做 CDP 服务化
- **中期**: 评估直接集成 CloakBrowser-Manager（Docker 部署）或自建轻量版 Manager API
- **长期**: 完全通过 REST API 管理 profile，Rust 桌面端只做轻量级 launcher/CDP client
