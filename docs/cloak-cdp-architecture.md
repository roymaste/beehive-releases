# 蜂巢智能体 — CloakBrowser CDP 自动化技术方案

> 蜂巢智能体的核心能力：**AI Agent 通过 CDP 协议控制 CloakBrowser 浏览器，代替用户执行社交媒体运营操作。**
>
> 本文件是项目核心技术备忘录，所有 Agent 自动化功能的架构决策以此为基准。

---

## 一、什么是 CDP（Chrome DevTools Protocol）

CDP 是 Chrome/Chromium 内置的远程调试协议。浏览器启动时加 `--remote-debugging-port=9222` 参数，就会在 `ws://127.0.0.1:9222` 暴露一个 WebSocket 端点。

Playwright / Puppeteer / Selenium 等工具通过 `connect_over_cdp(url)` 连接这个端*口*，然后可以：
- 控制标签页导航（打开任意 URL）
- 操作 DOM（点击、输入、取值）
- 拦截网络请求/响应
- 执行 JavaScript
- 截图
- 管理 Cookie/Storage
- 注入拟人行为

---

## 二、CloakBrowser 内核 = Chromium

CloakBrowser 是我们使用的开源浏览器内核。它的本质就是一个**修改过的 Chromium**（Chromium 146/147），额外加了：
- 浏览器指纹伪造（Canvas/WebGL/Fonts/Timezone 等）
- WebRTC 泄漏防护
- 代理支持
- 拟人操作引擎

**关键事实：CloakBrowser 是 Chromium，所以它原生支持 CDP，不需要任何桥接或协议转换。**

```
~/.cloakbrowser/chromium-146.0.7680.177.4/chromium-146.0.7680.177.3/chrome
                                                                    └── Chromium 147 二进制
                                                                    └── 也有 chromedriver！
```

---

## 三、架构总览：CDP 数据流

```
┌──────────────────────────────────────────────────────────────────┐
│                  蜂巢桌面客户端（Tauri 壳）                        │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  WebView（WebKitGTK / WebView2 / WKWebView）               │   │
│  │  加载 VPS 前端页面                                          │   │
│  │  用户看到的产品界面                                          │   │
│  └────────────────────┬───────────────────────────────────────┘   │
│                       │ invoke('launch_cloak', {cdp_port: 9222}) │
│                       ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  Rust 后端（Tauri Command）                                │   │
│  │  launch_cloak(config):                                     │   │
│  │    1. find_cloak_binary() → ~/.cloakbrowser/.../chrome     │   │
│  │    2. --remote-debugging-port={cdp_port}                   │   │
│  │    3. --user-data-dir=~/.beehive/profiles/{tenant}/{id}    │   │
│  │    4. 返回 {cdp_port, pid, profile_id}                     │   │
│  └────────────────────┬───────────────────────────────────────┘   │
│                       │ stdout: {cdp_port: 9222}                 │
│                       ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  CloakBrowser 进程（Chromium 147）                         │   │
│  │  ws://127.0.0.1:9222  ←──  CDP WebSocket                  │   │
│  │  多配置文件隔离（每个账号独立 user-data-dir）               │   │
│  └────────────────────┬───────────────────────────────────────┘   │
│                       │                                           │
└───────────────────────┼───────────────────────────────────────────┘
                        │ Playwright connect_over_cdp()
                        ▼
           ┌──────────────────────────┐
           │  AI Agent 自动化执行层    │
           │                          │
           │  ┌────────────────────┐   │
           │  │  RPA 脚本层         │   │
           │  │  rpa_twitter.py    │   │
           │  │  rpa_instagram.py  │   │  ← 待开发
           │  │  rpa_linkedin.py   │   │  ← 待开发
           │  │  rpa_reddit.py     │   │  ← 待开发
           │  │  rpa_cdp_client.py │   │
           │  └────────────────────┘   │
           │  ┌────────────────────┐   │
           │  │ 高级封装（待选型）   │   │
           │  │  ├─ agent_executor │   │
           │  │  │  (cdp_use依赖)  │   │
           │  │  └─ 平台适配器      │   │
           │  └────────────────────┘   │
           └──────────────────────────┘
```

---

## 四、CDP 的核心应用场景

### 4.1 多账号社交媒体运营

这是蜂巢智能体的核心价值。用户配置 N 个社交媒体账号（Twitter/IG/LinkedIn/Reddit 等），每个账号使用独立的 CloakBrowser 配置文件（user-data-dir）。

AI Agent 替用户执行的操作：
| 操作 | 技术实现 | 状态 |
|------|---------|------|
| 登录账号 | CDP 控制页面 → 填账号密码/API Key | ✅ Twitter 已实现 |
| 发帖/推文 | CDP 控制页面 → 输入内容 → 点击发布 | ✅ Twitter 已实现 |
| 点赞/转发/评论 | CDP 自动互动 | ⬜ 待开发 |
| 浏览推荐内容 | CDP 模拟滚屏 + 停留 | ⬜ 待开发 |
| 数据采集 | CDP 抓取页面数据 + API 拦截 | ⬜ 待开发 |
| 定时发布 | CDP + Agent 调度 | ⬜ 待开发 |

### 4.2 指纹保护

CloakBrowser 的核心价值是**指纹伪造**。通过 CDP 启动的每个浏览器实例都带独立指纹（Canvas/WebGL/Fonts/Timezone），让不同账号看起来来自不同设备。

CDP 启动参数中包含所有指纹配置：
```
--fingerprint={seed}
--fingerprint-platform={platform}
--fingerprint-timezone={timezone}
--fingerprint-locale={locale}
--fingerprint-screen-width={w}
--fingerprint-screen-height={h}
--fingerprint-gpu-vendor={vendor}
--fingerprint-gpu-renderer={renderer}
--fingerprint-hardware-concurrency={c}
--fingerprint-humanize           # 启用拟人行为引擎
```

### 4.3 拟人行为

`--fingerprint-humanize` 标志启用 CloakBrowser 内置的拟人行为引擎。在 CDP 层面的配合操作：
- **模拟鼠标轨迹**：不规则曲线移动到目标元素
- **模拟人类打字**：随机延迟（80-250ms），偶尔停顿思考
- **随机抖动**：点击前在目标周围移动 2-3 次
- **视口行为**：滚动、停留时间随机化

我们在 Playwright 测试中也实现了相同逻辑（`human_type` / `human_click` 函数）。

---

## 五、当前实现状态（2026-05-15）

### ✅ 已实现

| 层 | 功能 | 文件 |
|----|------|------|
| Rust 后端 | `LaunchConfig` 含 `cdp_port` 字段 | `desktop/beehive-browser/src/lib.rs:103` |
| Rust 后端 | `launch_cloak` 传 `--remote-debugging-port` | `lib.rs:413-414` |
| Rust 后端 | 自动分配可用端口（从 9222 开始检测） | `lib.rs:304` |
| Rust 后端 | 启动后返回 `{cdp_port, pid, profile_id}` | `lib.rs:449` |
| Rust 后端 | `post_tweet` Agent 任务（启动 Cloak + CDP + RPA） | `lib.rs:1450-1507` |
| Rust 后端 | CDP 健康检测 `check_cdp()` | `lib.rs:554` |
| 前端 | `launchLocalBeehiveBrowser()` 调 `invoke('launch_cloak')` | `frontend/src/lib/desktop.ts:66` |
| RPA | `rpa_cdp_client.py` — 原始 CDP WebSocket 客户端 | `beehive-agent/scripts/rpa/` |
| RPA | `rpa_twitter.py` — Twitter 登录/发推/浏览 | `beehive-agent/scripts/rpa/` |
| RPA | `rpa_human_behavior.py` — 拟人操作工具 | `beehive-agent/scripts/rpa/` |
| 测试 | 拟人测试脚本支持 `CDP_MODE=true` 连 CloakBrowser | `.hermes/scripts/anthropomorphic_test.py` |

### ⚠️ 部分实现

| 层 | 问题 | 影响 |
|----|------|------|
| 前端 | `LaunchResult` 接口**没有 `cdp_port` 字段** | 启动后前端拿到 PID 但拿不到 CDP 端口号 |
| 前端 | 没有把 `cdp_port` 传给后端 API/Agent | Agent 编排层不知道连哪个端口 |
| RPA | `agent_executor.py` 依赖 `cdp_use` 包未安装 | 高级元素检测不能跑 |
| 集成 | `beehive-agent/scripts/rpa/` 不在 `beehive-releases/desktop/` 下 | `post_tweet` 引用路径可能失效 |

### ❌ 未实现

| 功能 | 备注 |
|------|------|
| Instagram RPA | 需要开发 |
| LinkedIn RPA | 需要开发 |
| Reddit RPA | 需要开发 |
| 统一任务调度器 | 把 cdp_port 注入 Agent 执行上下文 |
| 定时发布引擎 | 按时间表自动执行 RPA 任务 |
| CDP 仪表盘（前端 UI） | 展示 CDP 连接状态、实时控制台 |
| 失败重试机制 | CDP 断开后自动重连 |

---

## 六、关键代码参考

### 启动 CloakBrowser 带 CDP

```python
import asyncio, subprocess
from playwright.async_api import async_playwright

# 1. 启动 CloakBrowser（Chromium 147）带 CDP
proc = await asyncio.create_subprocess_exec(
    "/home/joyandjoe/.cloakbrowser/chromium-146.0.7680.177.4/chromium-146.0.7680.177.3/chrome",
    "--remote-debugging-port=9222",
    "--no-sandbox",
    "--disable-gpu",
    "--user-data-dir=/tmp/cloak-cdp-test",
    stderr=asyncio.subprocess.PIPE,
)
await asyncio.sleep(5)  # 等浏览器启动

# 2. 连接 CDP
async with async_playwright() as p:
    browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9222")
    page = browser.contexts[0].pages[0]

    # 3. 执行操作
    await page.goto("https://twitter.com")
    await page.fill("input[name='text']", "username")

    # 4. 清理
    proc.send_signal(signal.SIGTERM)
    await asyncio.wait_for(proc.wait(), timeout=5)
```

### Rust 端 CDP 启动（现有代码）

```rust
// lib.rs:413
let cdp_port = config.cdp_port.unwrap_or_else(|| assign_cdp_port(9222));
cmd.arg(format!("--remote-debugging-port={}", cdp_port));

// 返回
Ok(serde_json::json!({
    "status": "running",
    "pid": pid,
    "profile_id": config.profile_id,
    "cdp_port": cdp_port,
}))
```

### Rust 端 post_tweet Agent 任务（现有代码）

```rust
// lib.rs ~1450
// 1. launch_cloak with cdp_port → {cdp_port, pid}
// 2. 调 rpa_twitter.py 传入 cdp_port + tweet_content
// 3. 完成后 kill CloakBrowser
```

---

## 七、Agent 自动化执行流程（完整设计）

```
用户触发任务（前端界面）
    │
    ▼
后端 API 接收请求（创建 Agent 任务）
    │
    ▼
Agent 编排器决定执行策略
    ├── 需要浏览器操作？→ 分配 CloakBrowser 实例
    ├── 不需要？→ 直接调 API（如 OpenAPI 发帖）
    │
    ▼
CloakBrowser 启动（Tauri invoke）
    ├── --remote-debugging-port=XXXX（自动分配）
    ├── --user-data-dir=~/.beehive/profiles/{tenant}/{profile}
    ├── --fingerprint-*（用户配置的指纹参数）
    └── 返回 cdp_port
    │
    ▼
Agent 执行引擎连接 CDP
    ├── playwright.connect_over_cdp("ws://127.0.0.1:XXXX")
    ├── page.goto(target_url)
    ├── 模拟人类操作（拟人行为引擎）
    └── 执行任务（发帖/点赞/采集）
    │
    ▼
任务完成
    ├── 返回结果给用户
    ├── 截图/日志保存
    └── CloakBrowser 关闭（SIGTERM）
```

---

## 八、开发优先级

| 优先级 | 任务 | 技术栈 | 预计工时 |
|--------|------|--------|---------|
| **P0** | 修复前端 `LaunchResult` 缺 `cdp_port` | TS | 小 |
| **P0** | 前端启动 CloakBrowser 后，把 `cdp_port` 通过 API 同步到 Agent 任务上下文 | TS + Python | 中 |
| **P0** | 把 `beehive-agent/scripts/rpa/` 完整复制到 `beehive-releases/desktop/` | Shell | 小 |
| **P1** | RPA 扩展：Instagram/LinkedIn/Reddit 三种平台 | Python + Playwright | 大（每种 1-2天） |
| **P1** | CDP 重连/健康检查/超时处理 | Rust + Python | 中 |
| **P2** | 前端 CDP 状态面板（显示已连接/断开、端口号、PID） | TS + React | 中 |
| **P2** | 定时发布引擎（cron 触发的 Agent 任务） | Python + 调度 | 中 |
| **P3** | 高级封装选型（cdp_use vs 自研） | Python | 调研 |

---

## 九、验证方法

### 快速验证 CDP 是否工作

```bash
# 1. 启动 CloakBrowser 带 CDP
~/.cloakbrowser/chromium-146.0.7680.177.4/chromium-146.0.7680.177.3/chrome \
  --remote-debugging-port=9222 --no-sandbox --user-data-dir=/tmp/cdp-test &

# 2. 确认 CDP 就绪
curl -s http://127.0.0.1:9222/json/version

# 输出示例：
# {"Browser": "Chrome/147.0.7727.137", "webSocketDebuggerUrl": "ws://..."}

# 3. Playwright 连接
python3 -c "
import asyncio
from playwright.async_api import async_playwright
async def t():
    async with async_playwright() as p:
        b = await p.chromium.connect_over_cdp('http://127.0.0.1:9222')
        page = b.contexts[0].pages[0]
        await page.goto('https://example.com')
        print('Title:', await page.title())
asyncio.run(t())
"
```

### 运行拟人测试（CDP 模式）

```bash
CDP_MODE=true python3 ~/.hermes/scripts/anthropomorphic_test.py
```

---

## 十、相关文件索引

| 文件 | 说明 |
|------|------|
| `desktop/beehive-browser/src/lib.rs` | Tauri 后端：`launch_cloak`、`post_tweet`、CDP 启动 |
| `frontend/src/lib/desktop.ts` | 前端：`launchLocalBeehiveBrowser()`、`LaunchResult` |
| `beehive-agent/scripts/rpa/rpa_cdp_client.py` | 原始 CDP WebSocket 客户端 |
| `beehive-agent/scripts/rpa/rpa_twitter.py` | Twitter 自动化（CDP 模式） |
| `beehive-agent/scripts/rpa/rpa_human_behavior.py` | 拟人操作工具 |
| `beehive-agent/tests/anthropomorphic_test_final.py` | 全链路拟人测试（支持 CDP_MODE） |
| `.hermes/scripts/anthropomorphic_test.py` | cronjob 每日测试（支持 CDP_MODE） |

---

> **版本**: 1.0 (2026-05-15)
> **作者**: 蜂巢智能体中控系统
> **关联文档**: 产品架构设计 / PRD / 详细工作计划
