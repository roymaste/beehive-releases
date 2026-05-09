# Linux 安装教程

本指南详细介绍在 Linux 系统上安装蜂巢智能体桌面端的方法。

---

## 系统要求

| 项目 | 最低要求 | 推荐配置 |
|------|----------|----------|
| 操作系统 | Ubuntu 20.04+ / Debian 11+ / Fedora 36+ | Ubuntu 22.04 LTS |
| 处理器 | x86_64 架构 | x86_64 架构 |
| 内存 | 4 GB RAM | 8 GB RAM |
| 磁盘空间 | 500 MB 可用空间 | 1 GB 可用空间 |
| 依赖 | GTK 3.x, WebKitGTK 4.1+ | GTK 4.x, WebKitGTK 6.0+ |

---

## 安装方式

### 方式一：DEB 安装包（推荐）

#### 1. 下载安装包

从 [GitHub Releases](https://github.com/roymaste/beehive-releases/releases) 下载最新的 `.deb` 安装包：

```bash
# 使用 wget 下载（请替换为实际版本号）
wget https://github.com/roymaste/beehive-releases/releases/download/v0.1.0/beehive-browser_0.1.0_amd64.deb
```

#### 2. 安装依赖

```bash
sudo apt update
sudo apt install -f ./beehive-browser_0.1.0_amd64.deb
```

> 注意：如果直接运行 `dpkg -i` 失败，请先运行 `sudo apt install -f` 修复依赖关系。

#### 3. 验证安装

```bash
beehive-browser --version
```

#### 4. 卸载

```bash
sudo apt remove beehive-browser
```

---

### 方式二：AppImage 便携版

#### 1. 下载 AppImage

```bash
wget https://github.com/roymaste/beehive-releases/releases/download/v0.1.0/Beehive-Browser_0.1.0_amd64.AppImage
```

#### 2. 添加执行权限

```bash
chmod +x Beehive-Browser_0.1.0_amd64.AppImage
```

#### 3. 运行

```bash
./Beehive-Browser_0.1.0_amd64.AppImage
```

#### 4. （可选）创建桌面快捷方式

```bash
# 创建 desktop 文件
sudo tee /usr/share/applications/beehive-browser.desktop << 'EOF'
[Desktop Entry]
Name=Beehive Browser
Comment=蜂巢智能体 - 多账号社媒运营平台
Exec=/path/to/Beehive-Browser_0.1.0_amd64.AppImage
Icon=/usr/share/icons/hicolor/128x128/apps/beehive-browser.png
Terminal=false
Type=Application
Categories=Network;WebBrowser;
EOF
```

---

### 方式三：使用 Docker 运行 Web 前端

如果您不想安装桌面客户端，也可以使用 Docker 运行 Web 版本：

#### 1. 安装 Docker

```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
```

#### 2. 运行前端容器

```bash
docker run -d \
  --name beehive-frontend \
  -p 3000:80 \
  -e VITE_API_URL=http://YOUR_VPS_IP:8008 \
  ghcr.io/roymaste/beehive-frontend:latest
```

#### 3. 访问

打开浏览器访问 `http://localhost:3000`

#### 4. 停止和卸载

```bash
docker stop beehive-frontend
docker rm beehive-frontend
```

---

## 依赖问题排查

### WebKitGTK 缺失

如果启动时报错缺少 WebKitGTK，请安装：

**Ubuntu/Debian:**
```bash
sudo apt install libwebkit2gtk-4.1-0
```

**Fedora:**
```bash
sudo dnf install webkit2gtk4.1
```

### GTK 缺失

```bash
sudo apt install libgtk-3-0
```

### 32 位库缺失（部分系统）

```bash
sudo dpkg --add-architecture i386
sudo apt update
sudo apt install libc6:i386 libwebkit2gtk-4.1-0:i386
```

---

## 配置

### 首次启动配置

1. 启动 Beehive Browser
2. 进入 **设置** 页面
3. 配置 VPS 服务器地址：`http://YOUR_VPS_IP:8008`
4. 保存设置

### 更新服务器地址

桌面端配置存储在 `~/.config/com.beehive.browser/` 目录：

```bash
# 编辑配置文件
nano ~/.config/com.beehive.browser/config.json
```

---

## 从源码构建

### 环境准备

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs

# 安装构建依赖
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev
```

### 构建桌面端

```bash
cd desktop/beehive-browser
npm install
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/` 目录。

---

## 常见问题

### Q: 启动时报错 "WebKitWebProcess not found"

**A:** 这是 WebKitGTK 库未正确安装。请运行：

```bash
sudo apt install libwebkit2gtk-4.1-0
```

### Q: 窗口无法显示或显示空白

**A:** 可能是显卡驱动问题。请尝试：

```bash
# 使用软件渲染模式启动
WEBKIT_DISABLE_COMPOSITING_MODE=1 beehive-browser
```

### Q: 国际化语言显示乱码

**A:** 请确保系统已安装中文语言包：

```bash
sudo apt install language-pack-zh-hans
sudo locale-gen zh_CN.UTF-8
```

---

## 下一步

- [快速入门指南](getting-started.md)
- [Windows 安装指南](install-windows.md)
