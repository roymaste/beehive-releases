// Beehive Browser — 蜂巢浏览器桌面端
//
// 极简 Tauri 壳：
// 1. 内嵌蜂巢 Web 前端
// 2. 提供 BeehiveBrowser 启动/停止/列表 Tauri 命令
// 3. 用户在前端点击「启动」→ 本地弹出伪装浏览器窗口

use std::collections::HashMap;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

use serde::Deserialize;
use tauri::{Emitter, Manager};

#[cfg(unix)]
use nix::libc;

// ── 执行器注册与心跳 ──────────────────────────────────

/// 注册到后端，返回 executor_id + token
async fn register_executor(api_base: &str) -> Result<(String, String), String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "name": hostname(),
        "executor_type": "desktop",
        "cpu_cores": num_cpus(),
    });
    let resp = client
        .post(format!("{}/api/v1/executors/register", api_base))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("注册失败: {}", e))?;
    let json: serde_json::Value = resp.json().await.map_err(|_| "解析失败")?;
    let id = json["executor_id"].as_str().ok_or("缺id")?.to_string();
    let tk = json["token"].as_str().ok_or("缺token")?.to_string();
    Ok((id, tk))
}

fn hostname() -> String {
    std::env::var("HOSTNAME")
        .or_else(|_| std::env::var("COMPUTERNAME"))
        .unwrap_or_else(|_| "beehive-desktop".to_string())
}

fn num_cpus() -> i32 {
    std::thread::available_parallelism()
        .map(|n| n.get() as i32)
        .unwrap_or(4)
}

// ── 状态管理 ───────────────────────────────────────────────

/// 跟踪所有运行中的 BeehiveBrowser 实例
struct CloakState {
    instances: Mutex<HashMap<String, u32>>,
}

impl CloakState {
    fn new() -> Self {
        Self {
            instances: Mutex::new(HashMap::new()),
        }
    }
}

// ── 启动配置 ───────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct LaunchConfig {
    pub profile_id: String,
    pub fingerprint_seed: Option<i32>,
    pub platform: Option<String>,
    pub timezone: Option<String>,
    pub locale: Option<String>,
    pub screen_width: Option<i32>,
    pub screen_height: Option<i32>,
    pub gpu_vendor: Option<String>,
    pub gpu_renderer: Option<String>,
    pub hardware_concurrency: Option<i32>,
    pub proxy: Option<String>,
    pub user_data_dir: Option<String>,
    pub url: Option<String>,
    pub headless: Option<bool>,
    pub humanize: Option<bool>,
    pub cdp_port: Option<i32>,
}

// ── 工具函数 ───────────────────────────────────────────────

fn get_home_dir() -> Result<PathBuf, String> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("USERPROFILE")
            .map(PathBuf::from)
            .map_err(|_| "USERPROFILE 未设置".to_string())
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("HOME")
            .map(PathBuf::from)
            .map_err(|_| "HOME 未设置".to_string())
    }
}

fn find_cloak_binary() -> Result<PathBuf, String> {
    let home = get_home_dir()?;

    // 搜索路径优先级：
    // 1. ~/.cloakbrowser/chromium-*/chrome (标准安装)
    // 2. ~/.beehivebrowser/chromium-*/chrome (旧版兼容)
    // 3. macOS: /Applications/CloakBrowser.app/... (macOS 应用包)
    // 4. Windows: %LOCALAPPDATA%\.cloakbrowser\...

    let search_dirs: Vec<PathBuf> = vec![
        home.join(".cloakbrowser"),
        home.join(".beehivebrowser"),
    ];

    #[cfg(target_os = "macos")]
    let search_dirs = {
        let mut dirs = search_dirs;
        dirs.push(PathBuf::from("/Applications/CloakBrowser.app/Contents/MacOS"));
        dirs
    };

    #[cfg(target_os = "windows")]
    let search_dirs = {
        let mut dirs = search_dirs;
        if let Ok(localappdata) = std::env::var("LOCALAPPDATA") {
            dirs.push(PathBuf::from(localappdata).join(".cloakbrowser"));
        }
        dirs
    };

    for cloak_dir in search_dirs {
        if !cloak_dir.exists() {
            continue;
        }

        if let Ok(entries) = std::fs::read_dir(&cloak_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir()
                    && path
                        .file_name()
                        .map_or(false, |n| n.to_string_lossy().starts_with("chromium-"))
                {
                    #[cfg(target_os = "windows")]
                    let binary = path.join("chrome.exe");
                    #[cfg(target_os = "macos")]
                    let binary = path.join("CloakBrowser");
                    #[cfg(target_os = "linux")]
                    let binary = path.join("chrome");

                    if binary.exists() {
                        return Ok(binary);
                    }
                }
            }
        }
    }

    // macOS 应用包检测
    #[cfg(target_os = "macos")]
    {
        let app_path = PathBuf::from("/Applications/CloakBrowser.app/Contents/MacOS/CloakBrowser");
        if app_path.exists() {
            return Ok(app_path);
        }
    }

    #[cfg(target_os = "windows")]
    let msg = format!(
        "请下载 CloakBrowser 并解压到以下目录：\nC:\\Users\\{}\\AppData\\Local\\.cloakbrowser\\\n或访问 https://cloakbrowser.com/download",
        std::env::var("USERNAME").unwrap_or_else(|_| "你的用户名".to_string())
    );
    #[cfg(target_os = "macos")]
    let msg = "请下载 CloakBrowser 并解压到以下目录：\n~/.cloakbrowser/\n或访问 https://cloakbrowser.com/download".to_string();
    #[cfg(target_os = "linux")]
    let msg = "请下载 CloakBrowser 并解压到以下目录：\n~/.cloakbrowser/\n或访问 https://cloakbrowser.com/download".to_string();
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    let msg = "请下载 CloakBrowser 并解压到 ~/.cloakbrowser/ 目录下".to_string();
    Err(msg)
}

fn generate_data_dir(profile_id: &str) -> PathBuf {
    let home = get_home_dir().unwrap_or_else(|_| PathBuf::from("/tmp"));
    home.join(".beehive")
        .join("profiles")
        .join(sanitize_id(profile_id))
}

fn sanitize_id(id: &str) -> String {
    id.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect()
}

// ── 运行中的进程检查 ───────────────────────────────────────

fn is_process_alive(pid: u32) -> bool {
    // 向进程发送信号 0 检查是否活着（不实际发信号）
    #[cfg(unix)]
    {
        let result = unsafe { libc::kill(pid as i32, 0) };
        result == 0
    }
    #[cfg(not(unix))]
    {
        std::process::Command::new("tasklist")
            .arg("/FI")
            .arg(format!("PID eq {}", pid))
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
}

// ── Tauri 命令 ─────────────────────────────────────────────

#[tauri::command]
fn launch_cloak(config: LaunchConfig, state: tauri::State<CloakState>) -> Result<String, String> {
    let binary = find_cloak_binary()?;
    let mut cmd = Command::new(&binary);

    // User data dir
    let data_dir = config
        .user_data_dir
        .map(PathBuf::from)
        .unwrap_or_else(|| generate_data_dir(&config.profile_id));

    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("创建数据目录失败: {}", e))?;

    cmd.arg(format!("--user-data-dir={}", data_dir.display()));
    cmd.arg("--no-first-run");
    cmd.arg("--no-default-browser-check");
    cmd.arg("--disable-background-networking");
    cmd.arg("--disable-sync");
    cmd.arg("--disable-translate");
    cmd.arg("--disable-default-apps");
    cmd.arg("--mute-audio");

    // Fingerprint flags
    if let Some(seed) = config.fingerprint_seed {
        cmd.arg(format!("--fingerprint={}", seed));
    }
    if let Some(ref plat) = config.platform {
        cmd.arg(format!("--fingerprint-platform={}", plat));
    }
    if let Some(ref tz) = config.timezone {
        cmd.arg(format!("--fingerprint-timezone={}", tz));
    }
    if let Some(ref loc) = config.locale {
        cmd.arg(format!("--lang={}", loc));
        cmd.arg(format!("--fingerprint-locale={}", loc));
    }
    if let Some(w) = config.screen_width {
        cmd.arg(format!("--fingerprint-screen-width={}", w));
    }
    if let Some(h) = config.screen_height {
        cmd.arg(format!("--fingerprint-screen-height={}", h));
    }
    if let Some(ref vendor) = config.gpu_vendor {
        cmd.arg(format!("--fingerprint-gpu-vendor={}", vendor));
    }
    if let Some(ref renderer) = config.gpu_renderer {
        cmd.arg(format!("--fingerprint-gpu-renderer={}", renderer));
    }
    if let Some(c) = config.hardware_concurrency {
        cmd.arg(format!("--fingerprint-hardware-concurrency={}", c));
    }

    // Humanize
    if config.humanize.unwrap_or(false) {
        cmd.arg("--fingerprint-humanize");
    }

    // Headless
    if config.headless.unwrap_or(false) {
        cmd.arg("--headless");
    }

    // Proxy
    if let Some(ref proxy) = config.proxy {
        cmd.arg(format!("--proxy-server={}", proxy));
        cmd.arg("--proxy-bypass-list=<-loopback>");
    }

    // CDP debug port
    let cdp_port = config.cdp_port.unwrap_or(9222);
    cmd.arg(format!("--remote-debugging-port={}", cdp_port));

    // GPU
    cmd.arg("--ignore-gpu-blocklist");
    cmd.arg("--disable-gpu-process-crash-limit");

    // Linux
    #[cfg(target_os = "linux")]
    cmd.arg("--no-sandbox");

    // URL
    if let Some(ref url) = config.url {
        cmd.arg(url);
    }

    // Launch
    let child = cmd
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .stdin(Stdio::null())
        .spawn()
        .map_err(|e| format!("启动 BeehiveBrowser 失败: {}", e))?;

    let pid = child.id();
    state
        .instances
        .lock()
        .map_err(|e| format!("锁错误: {}", e))?
        .insert(config.profile_id.clone(), pid);

    Ok(serde_json::json!({
        "status": "running",
        "pid": pid,
        "profile_id": config.profile_id,
        "user_data_dir": data_dir.to_string_lossy(),
        "cdp_port": cdp_port,
    })
    .to_string())
}

#[tauri::command]
fn stop_cloak(profile_id: String, state: tauri::State<CloakState>) -> Result<String, String> {
    let mut map = state.instances.lock().map_err(|e| format!("锁错误: {}", e))?;

    match map.remove(&profile_id) {
        Some(pid) => {
            // 先检查进程是否还活着
            if is_process_alive(pid) {
                #[cfg(unix)]
                unsafe {
                    libc::kill(pid as i32, libc::SIGTERM);
                }
                #[cfg(not(unix))]
                let _ = Command::new("taskkill")
                    .args(&["/PID", &pid.to_string(), "/F"])
                    .output();
            }
            Ok(serde_json::json!({"status": "stopped", "profile_id": profile_id}).to_string())
        }
        None => Ok(serde_json::json!({"status": "not_found", "profile_id": profile_id}).to_string()),
    }
}

#[tauri::command]
fn list_running_cloaks(state: tauri::State<CloakState>) -> Result<String, String> {
    let map = state.instances.lock().map_err(|e| format!("锁错误: {}", e))?;
    // 过滤掉已退出的进程
    let live: HashMap<String, u32> = map
        .iter()
        .filter(|(_, &pid)| is_process_alive(pid))
        .map(|(k, &v)| (k.clone(), v))
        .collect();
    Ok(serde_json::to_string(&live).map_err(|e| format!("序列化错误: {}", e))?)
}

#[tauri::command]
fn check_cloakbrowser_installed() -> String {
    match find_cloak_binary() {
        Ok(path) => serde_json::json!({
            "installed": true,
            "path": path.to_string_lossy(),
        }).to_string(),
        Err(_) => serde_json::json!({
            "installed": false,
            "path": null,
            "download_url": "https://cloakbrowser.com/download",
        }).to_string(),
    }
}

// ── CloakBrowser 内核自动下载 ─────────────────────────────────

/// 检查 CloakBrowser 内核是否已安装（增强版：返回版本信息）
#[tauri::command]
fn check_core_installed() -> String {
    match find_cloak_binary() {
        Ok(path) => {
            // 尝试从路径提取版本号
            let version = path
                .parent()
                .and_then(|p| p.file_name())
                .and_then(|n| {
                    let s = n.to_string_lossy().to_string();
                    s.strip_prefix("chromium-").map(|v| v.to_string())
                });
            serde_json::json!({
                "installed": true,
                "version": version,
                "path": path.to_string_lossy(),
            }).to_string()
        }
        Err(_) => serde_json::json!({
            "installed": false,
            "version": null,
            "path": null,
        }).to_string(),
    }
}

/// 获取可用内核版本列表
#[tauri::command]
fn get_core_versions() -> String {
    // 硬编码最新版本，后续可从 GitHub API 动态获取
    let versions = serde_json::json!([
        {
            "version": "146.0.7680.177.4",
            "platform": "windows-x64",
            "url": "https://github.com/CloakHQ/CloakBrowser/releases/download/chromium-v146.0.7680.177.4/cloakbrowser-windows-x64.zip",
            "size": 210000000,
            "checksum": "sha256:abc123...",
        },
        {
            "version": "146.0.7680.177.4",
            "platform": "linux-x64",
            "url": "https://github.com/CloakHQ/CloakBrowser/releases/download/chromium-v146.0.7680.177.4/cloakbrowser-linux-x64.zip",
            "size": 180000000,
            "checksum": "sha256:def456...",
        },
        {
            "version": "146.0.7680.177.4",
            "platform": "macos-x64",
            "url": "https://github.com/CloakHQ/CloakBrowser/releases/download/chromium-v146.0.7680.177.4/cloakbrowser-macos-x64.zip",
            "size": 190000000,
            "checksum": "sha256:ghi789...",
        },
    ]);
    versions.to_string()
}

/// 下载 CloakBrowser 内核（流式下载 + 进度事件）
#[tauri::command]
async fn download_core(
    app: tauri::AppHandle,
    url: String,
) -> Result<String, String> {
    use futures_util::StreamExt;
    use std::io::Write;

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("下载请求失败: {}", e))?;

    let total_size = response.content_length().unwrap_or(0);
    let file_name = url
        .split('/')
        .last()
        .unwrap_or("cloakbrowser.zip")
        .to_string();

    // 临时文件路径
    let temp_dir = std::env::temp_dir();
    let temp_path = temp_dir.join(&file_name);

    let mut file = std::fs::File::create(&temp_path)
        .map_err(|e| format!("创建临时文件失败: {}", e))?;
    let mut downloaded: u64 = 0;
    let mut chunk_idx = 0;

    let mut stream = response.bytes_stream();
    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("下载流读取失败: {}", e))?;
        file.write_all(&chunk)
            .map_err(|e| format!("写入文件失败: {}", e))?;
        downloaded += chunk.len() as u64;
        chunk_idx += 1;

        // 每 1MB 或最后一块发送一次进度事件
        if chunk_idx % 100 == 0 || downloaded >= total_size {
            let percent = if total_size > 0 {
                (downloaded as f64 / total_size as f64 * 100.0).round()
            } else {
                0.0
            };
            let speed = chunk.len() as u64; // 简化计算
            let _ = app.emit(
                "download-progress",
                serde_json::json!({
                    "downloaded": downloaded,
                    "total": total_size,
                    "percent": percent,
                    "speed": speed,
                }),
            );
        }
    }

    Ok(temp_path.to_string_lossy().to_string())
}

/// 解压内核到目标目录
#[tauri::command]
fn extract_core(zip_path: String) -> Result<String, String> {
    let file = std::fs::File::open(&zip_path)
        .map_err(|e| format!("打开 zip 文件失败: {}", e))?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("解析 zip 失败: {}", e))?;

    // 目标目录：Windows: %LOCALAPPDATA%\.cloakbrowser\chromium-{version}\
    let (dest_dir, version) = {
        #[cfg(target_os = "windows")]
        {
            let localappdata = std::env::var("LOCALAPPDATA")
                .map_err(|_| "LOCALAPPDATA 未设置".to_string())?;
            // 从 zip 内部路径提取版本号（第一个目录名）
            let version = archive.file_names()
                .filter(|n| n.ends_with('/'))
                .filter_map(|n| n.strip_prefix("cloakbrowser-chromium-"))
                .filter_map(|n| n.strip_suffix('/'))
                .next()
                .unwrap_or("146.0.7680.177.4")
                .to_string();
            let dest = PathBuf::from(localappdata)
                .join(".cloakbrowser")
                .join(format!("chromium-{}", version));
            (dest, version)
        }
        #[cfg(not(target_os = "windows"))]
        {
            let home = get_home_dir()?;
            let version = archive.file_names()
                .filter(|n| n.ends_with('/'))
                .filter_map(|n| n.strip_prefix("cloakbrowser-chromium-"))
                .filter_map(|n| n.strip_suffix('/'))
                .next()
                .unwrap_or("146.0.7680.177.4")
                .to_string();
            let dest = home
                .join(".cloakbrowser")
                .join(format!("chromium-{}", version));
            (dest, version)
        }
    };

    // 创建目标目录
    std::fs::create_dir_all(&dest_dir)
        .map_err(|e| format!("创建目标目录失败: {}", e))?;

    // 解压所有文件
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| format!("读取 zip 条目失败: {}", e))?;
        let outpath = match file.enclosed_name() {
            Some(path) => dest_dir.join(path),
            None => continue,
        };

        if file.name().ends_with('/') {
            std::fs::create_dir_all(&outpath)
                .map_err(|e| format!("创建目录失败: {}", e))?;
        } else {
            if let Some(parent) = outpath.parent() {
                if !parent.exists() {
                    std::fs::create_dir_all(parent)
                        .map_err(|e| format!("创建父目录失败: {}", e))?;
                }
            }
            let mut outfile = std::fs::File::create(&outpath)
                .map_err(|e| format!("创建文件失败: {}", e))?;
            std::io::copy(&mut file, &mut outfile)
                .map_err(|e| format!("复制文件失败: {}", e))?;
        }
    }

    // 删除临时 zip 文件
    let _ = std::fs::remove_file(&zip_path);

    Ok(serde_json::json!({
        "path": dest_dir.to_string_lossy(),
        "version": version,
    }).to_string())
}

// ── 启动检查 ───────────────────────────────────────────────

/// 首次启动时检查 BeehiveBrowser 二进制是否存在
/// 不存在则弹窗提示用户安装
fn check_cloak_binary_setup(app: &tauri::AppHandle) {
    if let Err(msg) = find_cloak_binary() {
        // 用 dialog 弹窗提示
        #[cfg(target_os = "windows")]
        let install_hint = "请从 CloakBrowser 官网下载并解压到以下目录：\nC:\\Users\\你的用户名\\AppData\\Local\\.cloakbrowser\\";
        #[cfg(target_os = "macos")]
        let install_hint = "请从 CloakBrowser 官网下载并解压到以下目录：\n~/.cloakbrowser/\n或访问 https://cloakbrowser.com/download";
        #[cfg(target_os = "linux")]
        let install_hint = "请从 CloakBrowser 官网下载并解压到以下目录：\n~/.cloakbrowser/\n或访问 https://cloakbrowser.com/download";
        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        let install_hint = "请从 CloakBrowser 官网下载并解压到 ~/.cloakbrowser/ 目录";
        let _ = tauri_plugin_dialog::DialogExt::dialog(app)
            .message(format!("未找到 CloakBrowser。\n\n{}\n\n{}", msg, install_hint))
            .title("蜂巢浏览器 — 缺少 CloakBrowser")
            .kind(tauri_plugin_dialog::MessageDialogKind::Warning)
            .blocking_show();
    }
}

// ── 应用入口 ───────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // ── 单实例控制：旧进程直接kill掉 ──────────────────────
    let lock_path = {
        let base = dirs::runtime_dir()
            .unwrap_or_else(std::env::temp_dir);
        base.join("beehive-browser.pid")
    };

    if lock_path.exists() {
        if let Ok(pid_str) = std::fs::read_to_string(&lock_path) {
            if let Ok(pid) = pid_str.trim().parse::<i32>() {
                if is_process_alive(pid as u32) {
                    eprintln!("蜂巢浏览器旧实例(PID={})还活着，杀掉重新启动", pid);
                    #[cfg(unix)]
                    {
                        // Unix (Linux/macOS)
                        // 1) 先杀所有子进程（WebKit NetworkProcess / WebProcess）
                        let _ = std::process::Command::new("pkill")
                            .args(["-9", "-P", &pid.to_string()])
                            .output();
                        std::thread::sleep(std::time::Duration::from_millis(200));
                        // 2) 再杀主进程本身
                        let _ = std::process::Command::new("kill")
                            .args(["-9", &pid.to_string()])
                            .output();
                        // 3) 补刀：同一会话中残留的任何 beehive-browser 进程
                        let _ = std::process::Command::new("pkill")
                            .args(["-9", "-s", &pid.to_string()])
                            .output();
                    }
                    #[cfg(windows)]
                    {
                        // Windows：/T = 杀进程树（含所有子进程）
                        let _ = std::process::Command::new("taskkill")
                            .args(&["/F", "/T", "/PID", &pid.to_string()])
                            .output();
                        // 补刀：杀所有同名进程（排除自己）
                        let _ = std::process::Command::new("taskkill")
                            .args(&["/F", "/IM", "beehive-browser.exe"])
                            .output();
                    }
                    std::thread::sleep(std::time::Duration::from_millis(500));
                }
            }
        }
        // 清理旧锁文件
        let _ = std::fs::remove_file(&lock_path);
    }

    // 写入当前 PID
    if let Ok(mut f) = std::fs::File::create(&lock_path) {
        use std::io::Write;
        let _ = write!(f, "{}", std::process::id());
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(CloakState::new())
        .invoke_handler(tauri::generate_handler![
            launch_cloak,
            stop_cloak,
            list_running_cloaks,
            check_cloakbrowser_installed,
            check_core_installed,
            get_core_versions,
            download_core,
            extract_core,
        ])
        .setup(|app| {
            // TODO: re-enable after fixing updater endpoint (needs https + valid sig)
            // #[cfg(desktop)]
            // app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;

            // 后台任务：注册+心跳+轮询（基于 tauri async runtime）
            let api_base = std::env::var("BEEHIVE_API_URL")
                .unwrap_or_else(|_| "http://localhost:8002".to_string());
            let handle = app.handle().clone();

            tauri::async_runtime::spawn(async move {
                // 注册
                match register_executor(&api_base).await {
                    Ok((id, token)) => {
                        log::info!("执行器注册成功: {} 于 {}", id, api_base);
                        let executor_id = id.clone();
                        let executor_token = token.clone();
                        let api_base_clone = api_base.clone();
                        let executor_id_clone = executor_id.clone();

                        // 心跳并发运行（独立的 tokio::spawn）
                        tokio::spawn(async move {
                            loop {
                                tokio::time::sleep(Duration::from_secs(30)).await;
                                let client = reqwest::Client::new();
                                let _ = client
                                    .post(format!(
                                        "{}/api/v1/executors/{}/heartbeat",
                                        api_base_clone, executor_id_clone
                                    ))
                                    .header("Authorization", format!("Bearer {}", executor_token))
                                    .send()
                                    .await;
                            }
                        });

                        // 任务轮询（每5秒）
                        loop {
                            tokio::time::sleep(Duration::from_secs(5)).await;
                            let client = reqwest::Client::new();
                            let resp = client
                                .get(format!(
                                    "{}/api/v1/executors/{}/pending-tasks",
                                    api_base, executor_id
                                ))
                                .header("Authorization", format!("Bearer {}", token))
                                .send()
                                .await;

                            if let Ok(r) = resp {
                                if let Ok(body) = r.json::<serde_json::Value>().await {
                                    if let Some(tasks) = body["tasks"].as_array() {
                                        for task in tasks {
                                            if let Some(task_id) = task["id"].as_str() {
                                                log::info!("收到任务: {}", task_id);

                                                let action = task["action"].as_str().unwrap_or("");

                                                if action == "post_tweet" {
                                                    // 从 task params 提取必要字段
                                                    let username = task["params"]["username"].as_str().unwrap_or("");
                                                    let password = task["params"]["password"].as_str().unwrap_or("");
                                                    let tweet = task["params"]["tweet"].as_str().unwrap_or("");
                                                    let profile_id = task["profile_id"].as_str().unwrap_or("default");
                                                    let account_id = task["account_id"].as_str().unwrap_or(username);
                                                    let cdp_port = task["params"]["cdp_port"].as_i64().unwrap_or(9222) as i32;

                                                    // 获取 CloakState
                                                    let cloak_state = handle.state::<CloakState>();

                                                    // a) 调用 launch_cloak 启动 CloakBrowser
                                                    let launch_config = LaunchConfig {
                                                        profile_id: profile_id.to_string(),
                                                        fingerprint_seed: None,
                                                        platform: None,
                                                        timezone: None,
                                                        locale: None,
                                                        screen_width: None,
                                                        screen_height: None,
                                                        gpu_vendor: None,
                                                        gpu_renderer: None,
                                                        hardware_concurrency: None,
                                                        proxy: task["params"]["proxy"].as_str().map(|s| s.to_string()),
                                                        user_data_dir: None,
                                                        url: None,
                                                        headless: None,
                                                        humanize: None,
                                                        cdp_port: Some(cdp_port),
                                                    };

                                                    let launch_result = launch_cloak(launch_config, cloak_state);

                                                    let (status_str, result_json, log_str) = match launch_result {
                                                        Ok(launch_resp_str) => {
                                                            // 解析 launch_resp_str 获取 cdp_port
                                                            let cdp_port_used = if let Ok(launch_resp) = serde_json::from_str::<serde_json::Value>(&launch_resp_str) {
                                                                launch_resp["cdp_port"].as_i64().unwrap_or(cdp_port as i64) as i32
                                                            } else {
                                                                cdp_port
                                                            };

                                                            // b) 调用 RPA 脚本，传入 cdp_port 和 account_id
                                                            let exe_path = std::env::current_exe()
                                                                .unwrap_or_default();
                                                            let script_path = exe_path
                                                                .parent()
                                                                .map(|p| p.join("scripts/rpa/rpa_twitter.py"))
                                                                .unwrap_or_else(|| PathBuf::from("scripts/rpa/rpa_twitter.py"));

                                                            let output = Command::new("python3")
                                                                .args([
                                                                    script_path.to_str().unwrap_or("scripts/rpa/rpa_twitter.py"),
                                                                    "--action", "post_tweet",
                                                                    "--username", username,
                                                                    "--password", password,
                                                                    "--tweet", tweet,
                                                                    "--cdp-port", &cdp_port_used.to_string(),
                                                                    "--account-id", account_id,
                                                                ])
                                                                .stdout(Stdio::piped())
                                                                .stderr(Stdio::piped())
                                                                .output();

                                                            // d) RPA 执行完毕后，调用 stop_cloak 关掉 CloakBrowser
                                                            let stop_result = stop_cloak(profile_id.to_string(), handle.state::<CloakState>());
                                                            log::info!("stop_cloak result: {:?}", stop_result);

                                                            // 处理 RPA 执行结果
                                                            match output {
                                                                Ok(out) => {
                                                                    let exit_code = out.status.code().unwrap_or(-1);
                                                                    let stdout = String::from_utf8_lossy(&out.stdout);
                                                                    let stderr = String::from_utf8_lossy(&out.stderr);
                                                                    let log_all = format!("stdout:{}\nstderr:{}", stdout, stderr);
                                                                    if out.status.success() {
                                                                        ("completed",
                                                                         serde_json::json!({"message": "执行成功", "stdout": stdout.to_string()}),
                                                                         log_all)
                                                                    } else {
                                                                        ("failed",
                                                                         serde_json::json!({"message": "执行失败", "exit_code": exit_code, "stdout": stdout.to_string()}),
                                                                         log_all)
                                                                    }
                                                                }
                                                                Err(e) => {
                                                                    ("failed",
                                                                     serde_json::json!({"message": format!("脚本执行异常: {}", e)}),
                                                                     format!("spawn error: {}", e))
                                                                }
                                                            }
                                                        }
                                                        // e) launch_cloak 失败，直接回调 failed
                                                        Err(e) => {
                                                            ("failed",
                                                             serde_json::json!({"message": format!("启动 CloakBrowser 失败: {}", e)}),
                                                             format!("launch_cloak error: {}", e))
                                                        }
                                                    };

                                                    let _ = client
                                                        .post(format!(
                                                            "{}/api/v1/executors/{}/tasks/{}/result",
                                                            api_base, executor_id, task_id
                                                        ))
                                                        .header("Authorization", format!("Bearer {}", token))
                                                        .json(&serde_json::json!({
                                                            "status": status_str,
                                                            "result": result_json,
                                                            "log": log_str
                                                        }))
                                                        .send()
                                                        .await;
                                                } else {
                                                    // Fallback: 其他 action 保留 mock 逻辑
                                                    let _ = client
                                                        .post(format!(
                                                            "{}/api/v1/executors/{}/tasks/{}/result",
                                                            api_base, executor_id, task_id
                                                        ))
                                                        .header("Authorization", format!("Bearer {}", token))
                                                        .json(&serde_json::json!({
                                                            "status": "completed",
                                                            "result": {"message": "任务执行成功（模拟）"},
                                                            "log": "mock execution"
                                                        }))
                                                        .send()
                                                        .await;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => log::error!("注册失败: {}", e),
                }
            });

            // 创建主窗口，根据 CloakBrowser 安装状态加载不同页面
            let start_url = match find_cloak_binary() {
                Ok(_) => "index.html",
                Err(_) => "onboarding.html",
            };
            let window = tauri::WebviewWindowBuilder::new(
                app,
                "beehive-main",
                tauri::WebviewUrl::App(start_url.into()),
            )
            .title("蜂巢智能体")
            .inner_size(1280.0, 800.0)
            .min_inner_size(900.0, 600.0)
            .build()
            .expect("创建主窗口失败");

            // ── 退出清理：杀光所有关联子进程 + PID 文件 ──────────
            window.on_window_event(move |event| {
                match event {
                    tauri::WindowEvent::CloseRequested { .. }
                    | tauri::WindowEvent::Destroyed => {
                        let my_pid = std::process::id();
                        #[cfg(unix)]
                        {
                            // 1) 强杀所有子进程（WebKitNetworkProcess, WebKitWebProcess）
                            let _ = std::process::Command::new("pkill")
                                .args(["-9", "-P", &my_pid.to_string()])
                                .output();
                            std::thread::sleep(std::time::Duration::from_millis(100));
                            // 2) 补刀：同一进程组的残留进程
                            let _ = std::process::Command::new("pkill")
                                .args(["-9", "-s", &my_pid.to_string()])
                                .output();
                        }
                        #[cfg(windows)]
                        {
                            // Windows：/T 杀进程树（所有子进程）
                            let _ = std::process::Command::new("taskkill")
                                .args(&["/F", "/T", "/PID", &my_pid.to_string()])
                                .output();
                            // 补刀：所有 beehive-browser.exe 实例
                            let _ = std::process::Command::new("taskkill")
                                .args(&["/F", "/IM", "beehive-browser.exe"])
                                .output();
                        }
                        // 3) 删除锁文件
                        let _ = std::fs::remove_file(&lock_path);
                        log::info!("蜂巢浏览器已退出，所有子进程已清理");
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("蜂巢浏览器启动失败");
}
