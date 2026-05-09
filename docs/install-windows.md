# Windows 安装教程

本指南详细介绍在 Windows 系统上安装蜂巢智能体桌面端的方法。

---

## 系统要求

| 项目 | 最低要求 | 推荐配置 |
|------|----------|----------|
| 操作系统 | Windows 10 (1809+) | Windows 11 |
| 处理器 | x86_64 架构 | x86_64 架构 |
| 内存 | 4 GB RAM | 8 GB RAM |
| 磁盘空间 | 500 MB 可用空间 | 1 GB 可用空间 |
| 依赖 | WebView2 Runtime | WebView2 Runtime (最新) |

---

## 安装方式

### 方式一：NSIS 安装包（推荐）

#### 1. 下载安装包

从 [GitHub Releases](https://github.com/roymaste/beehive-releases/releases) 下载最新的 `Beehive Browser_x.x.x_x64-setup.exe` 文件。

#### 2. 运行安装向导

1. 双击下载的 `.exe` 文件
2. 如果出现 "Windows 已保护您的电脑" 提示，点击 "更多信息" → "仍要运行"
3. 选择安装语言（简体中文/English）
4. 阅读并同意许可协议
5. 选择安装位置（默认：`C:\Program Files\Beehive Browser`）
6. 点击 "安装"
7. 安装完成后点击 "完成"

#### 3. 启动程序

安装完成后，可以通过以下方式启动：

- **开始菜单**：搜索 "Beehive Browser" 并点击
- **桌面快捷方式**：双击桌面上的 "Beehive Browser" 图标
- **安装目录**：打开安装目录，双击 `Beehive Browser.exe`

#### 4. 卸载

可以通过以下方式卸载：

- **设置**：设置 → 应用 → 已安装的应用 → 找到 "Beehive Browser" → 点击 "卸载"
- **控制面板**：程序和功能 → 找到 "Beehive Browser" → 点击 "卸载/更改"
- **安装目录**：运行安装目录下的 `Uninstall Beehive Browser.exe`

---

### 方式二：MSI 安装包（适合企业部署）

#### 1. 下载安装包

从 [GitHub Releases](https://github.com/roymaste/beehive-releases/releases) 下载最新的 `.msi` 安装包。

#### 2. 命令行静默安装

```powershell
# 静默安装到默认位置
msiexec /i Beehive-Browser_x.x.x_x64.msi

# 指定安装位置
msiexec /i Beehive-Browser_x.x.x_x64.msi INSTALLDIR="D:\Beehive"
```

#### 3. 卸载

```powershell
msiexec /x Beehive-Browser_x.x.x_x64.msi
```

---

### 方式三：便携版（无需安装）

#### 1. 下载便携版

从 [GitHub Releases](https://github.com/roymaste/beehive-releases/releases) 下载最新的 `.zip 便携版。

#### 2. 解压

右键点击下载的 `.zip` 文件，选择 "全部解压缩"，选择目标文件夹。

#### 3. 运行

打开解压后的文件夹，双击 `Beehive Browser.exe` 即可运行。

> 💡 便携版配置存储在程序所在目录的 `data/` 文件夹中，方便随身携带。

---

### 方式四：使用 Docker 运行 Web 前端

如果您不想安装桌面客户端，也可以使用 Docker Desktop 运行 Web 版本：

#### 1. 安装 Docker Desktop

从 [Docker 官网](https://www.docker.com/products/docker-desktop) 下载并安装 Docker Desktop。

#### 2. 运行前端容器

打开 PowerShell，运行：

```powershell
docker run -d `
  --name beehive-frontend `
  -p 3000:80 `
  -e VITE_API_URL=http://YOUR_VPS_IP:8008 `
  ghcr.io/roymaste/beehive-frontend:latest
```

#### 3. 访问

打开浏览器访问 `http://localhost:3000`

#### 4. 停止和卸载

```powershell
docker stop beehive-frontend
docker rm beehive-frontend
```

---

## WebView2 运行时

蜂巢智能体桌面端基于 Tauri 框架，需要 WebView2 运行时支持。

### 检查是否已安装

1. 打开 **设置** → **应用** → **已安装的应用**
2. 搜索 "WebView2"

### 自动安装

- **Windows 11**：WebView2 通常随系统预装
- **Windows 10 (1809+)**：首次运行时会自动下载安装

### 手动安装

如果启动时提示 WebView2 缺失，请手动下载安装：

📥 [下载 Microsoft WebView2 运行时](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

选择 **Evergreen Bootstrapper** 或 **Evergreen Standalone Installer**。

---

## 配置

### 首次启动配置

1. 启动 Beehive Browser
2. 首次使用会显示设置向导
3. 配置 VPS 服务器地址：`http://YOUR_VPS_IP:8008`
4. 点击 "保存"

### 手动修改服务器地址

1. 点击右上角设置图标（或按 `Ctrl+,`）
2. 进入 **连接设置**
3. 修改 VPS 服务器地址
4. 保存并重启应用

### 配置文件位置

桌面端配置存储在用户数据目录：

```
%APPDATA%\com.beehive.browser\config.json
```

---

## 常见问题

### Q: 安装时提示 "Windows 已保护您的电脑"

**A:** 这是微软的 SmartScreen 保护。点击 "更多信息" → "仍要运行" 即可继续安装。

### Q: 启动时报错 "WebView2 is not installed"

**A:** 请手动下载安装 [WebView2 运行时](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)。

### Q: 界面显示不清晰或模糊

**A:** 这是 DPI 缩放问题。请尝试：

1. 右键点击 "Beehive Browser" 快捷方式
2. 选择 "属性" → "兼容性"
3. 勾选 "替代高 DPI 缩放行为"

### Q: 无法连接到服务器

**A:** 请检查：

1. VPS 服务器是否正常运行
2. 服务器地址和端口是否正确
3. 防火墙是否放行端口（默认 8008）
4. 网络代理设置是否正确

### Q: 杀毒软件报告病毒或拦截

**A:** 蜂巢智能体使用 Tauri 框架构建，部分杀毒软件可能误报。请添加白名单或联系技术支持。

---

## 从源码构建

### 环境准备

1. **安装 Rust**

```powershell
# 使用 rustup 安装
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

或者从 [Rust 官网](https://rustup.rs/) 下载安装。

2. **安装 Node.js**

从 [Node.js 官网](https://nodejs.org/) 下载并安装 Node.js 20+。

3. **安装 Visual Studio Build Tools**

下载并安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)，选择 "C++ 桌面开发" 工作负载。

### 构建桌面端

```powershell
cd desktop/beehive-browser
npm install
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/nsis/` 目录。

---

## 下一步

- [快速入门指南](getting-started.md)
- [Linux 安装指南](install-linux.md)
