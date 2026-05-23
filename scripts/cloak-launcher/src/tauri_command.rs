/// BeehiveBrowser 启动器 Tauri 命令
///
/// 提供 `launch_cloak` Tauri 命令，供前端调用。
/// 当用户在前端点击「启动」时，调用此命令启动本地 BeehiveBrowser。
use serde::Deserialize;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use tauri::State;
use std::sync::Mutex;
use std::collections::HashMap;

/// 跟踪正在运行的 BeehiveBrowser 实例
pub struct CloakInstances(pub Mutex<HashMap<String, u32>>);

/// 前端传来的启动参数
#[derive(Debug, Deserialize)]
pub struct LaunchConfig {
    /// 数据库中的 profile ID（用于跟踪）
    pub profile_id: String,
    /// 指纹种子
    pub fingerprint_seed: Option<i32>,
    /// 操作系统平台
    pub platform: Option<String>,
    /// IANA 时区
    pub timezone: Option<String>,
    /// BCP 47 语言
    pub locale: Option<String>,
    /// 屏幕宽度
    pub screen_width: Option<i32>,
    /// 屏幕高度
    pub screen_height: Option<i32>,
    /// GPU 供应商
    pub gpu_vendor: Option<String>,
    /// GPU 渲染器
    pub gpu_renderer: Option<String>,
    /// CPU 核数
    pub hardware_concurrency: Option<i32>,
    /// 代理 URL (socks5://user:pass@host:port)
    pub proxy: Option<String>,
    /// User Data 目录（留空则自动创建）
    pub user_data_dir: Option<String>,
    /// 启动后打开的 URL
    pub url: Option<String>,
    /// 是否无头模式
    pub headless: Option<bool>,
    /// 是否启用行为模拟
    pub humanize: Option<bool>,
}

/// 查找 BeehiveBrowser 二进制
fn find_cloak_binary() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "HOME 环境变量未设置".to_string())?;
    let cloak_dir = PathBuf::from(&home).join(".beehivebrowser");

    if cloak_dir.exists() {
        let entries = std::fs::read_dir(&cloak_dir)
            .map_err(|e| format!("无法读取 BeehiveBrowser 目录: {}", e))?;
        for entry in entries {
            let entry = entry.map_err(|e| format!("读取目录错误: {}", e))?;
            let path = entry.path();
            if path.is_dir() && path.file_name().map_or(false, |n| {
                n.to_string_lossy().starts_with("chromium-")
            }) {
                let binary = path.join("chrome");
                if binary.exists() {
                    return Ok(binary);
                }
            }
        }
    }

    Err(format!(
        "未找到 BeehiveBrowser 二进制文件。请先安装：pip install beehivebrowser"
    ))
}

/// 自动生成 user_data_dir
fn generate_data_dir(profile_id: &str) -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    PathBuf::from(&home).join(".beehive").join("profiles").join(profile_id)
}

/// 启动 BeehiveBrowser（Tauri 命令）
#[tauri::command]
pub fn launch_cloak(
    config: LaunchConfig,
    instances: State<'_, CloakInstances>,
) -> Result<String, String> {
    let binary = find_cloak_binary()?;
    let mut cmd = Command::new(&binary);

    // --- 基础 Chrome 标志 ---
    let data_dir = config.user_data_dir
        .map(PathBuf::from)
        .unwrap_or_else(|| generate_data_dir(&config.profile_id));

    // 确保目录存在
    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("无法创建 profile 数据目录: {}", e))?;

    cmd.arg(format!("--user-data-dir={}", data_dir.display()));
    cmd.arg("--no-first-run");
    cmd.arg("--no-default-browser-check");
    cmd.arg("--disable-background-networking");
    cmd.arg("--disable-sync");
    cmd.arg("--disable-translate");
    cmd.arg("--disable-default-apps");
    cmd.arg("--mute-audio");

    // --- BeehiveBrowser 指纹标志 ---
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

    // --- 行为模拟 ---
    if config.humanize.unwrap_or(false) {
        cmd.arg("--fingerprint-humanize");
    }

    // --- 无头模式 ---
    if config.headless.unwrap_or(false) {
        cmd.arg("--headless");
    }

    // --- 代理 ---
    if let Some(ref proxy) = config.proxy {
        cmd.arg(format!("--proxy-server={}", proxy));
        cmd.arg("--proxy-bypass-list=<-loopback>");
    }

    // --- GPU 绕过 ---
    cmd.arg("--ignore-gpu-blocklist");
    cmd.arg("--disable-gpu-process-crash-limit");

    // --- Linux sandbox ---
    #[cfg(target_os = "linux")]
    cmd.arg("--no-sandbox");

    // --- URL ---
    if let Some(ref url) = config.url {
        cmd.arg(url);
    }

    // --- 启动 ---
    let child = cmd
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .stdin(Stdio::null())
        .spawn()
        .map_err(|e| format!("启动 BeehiveBrowser 失败: {}\n路径: {}", e, binary.display()))?;

    let pid = child.id();
    let mut map = instances.0.lock().map_err(|e| format!("锁错误: {}", e))?;
    map.insert(config.profile_id.clone(), pid);

    Ok(serde_json::json!({
        "status": "running",
        "pid": pid,
        "profile_id": config.profile_id,
        "user_data_dir": data_dir.to_string_lossy(),
    }).to_string())
}

/// 停止 BeehiveBrowser 实例
#[tauri::command]
pub fn stop_cloak(
    profile_id: String,
    instances: State<'_, CloakInstances>,
) -> Result<String, String> {
    let mut map = instances.0.lock().map_err(|e| format!("锁错误: {}", e))?;

    if let Some(&pid) = map.get(&profile_id) {
        // 发送 SIGTERM（优雅关闭）
        #[cfg(unix)]
        {
            use std::os::unix::process::CommandExt;
            unsafe {
                libc::kill(pid as i32, libc::SIGTERM);
            }
        }

        map.remove(&profile_id);
        Ok(serde_json::json!({"status": "stopped", "profile_id": profile_id}).to_string())
    } else {
        Err(format!("未找到运行中的实例: {}", profile_id))
    }
}

/// 获取运行中的实例列表
#[tauri::command]
pub fn list_running_cloaks(
    instances: State<'_, CloakInstances>,
) -> Result<String, String> {
    let map = instances.0.lock().map_err(|e| format!("锁错误: {}", e))?;
    Ok(serde_json::to_string(&*map).map_err(|e| format!("序列化错误: {}", e))?)
}
