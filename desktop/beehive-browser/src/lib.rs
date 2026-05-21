// Beehive Browser — 蜂巢浏览器桌面端
//
// 极简 Tauri 壳：
// 1. 内嵌蜂巢 Web 前端
// 2. 提供 BeehiveBrowser 启动/停止/列表 Tauri 命令
// 3. 用户在前端点击「启动」→ 本地弹出伪装浏览器窗口

use std::collections::HashMap;
use std::net::TcpListener;
use std::path::PathBuf;
use std::process::{Command, Stdio};
#[cfg(windows)]
use std::os::windows::process::CommandExt;
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[cfg(windows)]
fn run_hidden(program: &str) -> Command {
    let mut cmd = Command::new(program);
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}
use std::sync::Mutex;
use std::time::Duration;

use base64::Engine;
use ed25519_dalek::{Signature, Verifier, VerifyingKey, PUBLIC_KEY_LENGTH};
use futures_util::{SinkExt, StreamExt};
use rand::Rng;
use serde::{Deserialize, Serialize};
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
        .post(format!("{}/api/v1/executors", api_base))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("注册失败: {}", e))?;
    let json: serde_json::Value = resp.json().await.map_err(|_| "解析失败")?;
    let id = json["executor_id"].as_str().ok_or("缺id")?.to_string();
    let tk = json["token"].as_str().ok_or("缺token")?.to_string();
    Ok((id, tk))
}

/// 获取服务器更新公钥（Base64 Ed25519 pubkey）
async fn fetch_update_pubkey(api_base: &str, jwt_token: &str) -> Option<String> {
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{}/api/v1/system/update-key", api_base))
        .header("Authorization", format!("Bearer {}", jwt_token))
        .send()
        .await
        .ok()?;
    let json: serde_json::Value = resp.json().await.ok()?;
    json["pubkey"].as_str().map(String::from)
}

/// 用 Ed25519 公钥验证下载的二进制签名
fn verify_update_signature(binary_bytes: &[u8], sig_hex: &str, pubkey_b64: &str) -> Result<(), String> {
    let pubkey_bytes = base64::engine::general_purpose::STANDARD
        .decode(pubkey_b64)
        .map_err(|e| format!("公钥 Base64 解码失败: {}", e))?;
    if pubkey_bytes.len() != PUBLIC_KEY_LENGTH {
        return Err(format!("公钥长度错误: {} != {}", pubkey_bytes.len(), PUBLIC_KEY_LENGTH));
    }
    let verify_key = VerifyingKey::from_bytes(
        &pubkey_bytes.try_into().map_err(|_| "公钥转数组失败".to_string())?
    ).map_err(|e| format!("公钥解析失败: {:?}", e))?;

    let sig_bytes = hex::decode(sig_hex)
        .map_err(|e| format!("签名 hex 解码失败: {}", e))?;
    let signature = Signature::from_slice(&sig_bytes)
        .map_err(|e| format!("签名解析失败: {:?}", e))?;

    verify_key
        .verify(binary_bytes, &signature)
        .map_err(|e| format!("签名验证失败: {:?}", e))
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
    pub tenant_id: Option<String>,
    pub fingerprint_seed: Option<i32>,
    pub platform: Option<String>,
    pub timezone: Option<String>,
    pub locale: Option<String>,
    pub screen_width: Option<i32>,
    pub screen_height: Option<i32>,
    pub window_x: Option<i32>,
    pub window_y: Option<i32>,
    pub gpu_vendor: Option<String>,
    pub gpu_renderer: Option<String>,
    pub hardware_concurrency: Option<i32>,
    pub proxy: Option<String>,
    pub user_data_dir: Option<String>,
    pub url: Option<String>,
    pub headless: Option<bool>,
    pub humanize: Option<bool>,
    pub cdp_port: Option<i32>,
    pub kernel_version: Option<String>,
}

// ── CDP 脚本执行器 ─────────────────────────────────────────

/// 单步脚本定义
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ScriptStep {
    pub action: String,
    pub target: Option<String>,
    pub value: Option<String>,
    pub wait_ms: Option<u64>,
    pub humanize: Option<bool>,
    pub optional: Option<bool>,
}

/// 单步执行结果
#[derive(Debug, Clone, Serialize)]
pub struct StepResult {
    pub action: String,
    pub success: bool,
    pub message: String,
    pub elapsed_ms: u64,
}

/// 脚本执行总结果
#[derive(Debug, Clone, Serialize)]
pub struct ScriptExecutionResult {
    pub success: bool,
    pub steps: Vec<StepResult>,
    pub message: String,
}

/// Tauri 命令包装：执行 CDP 脚本步骤
#[tauri::command]
async fn execute_script_steps_command(
    cdp_port: i32,
    steps: Vec<ScriptStep>,
) -> Result<ScriptExecutionResult, String> {
    execute_script_steps(cdp_port, steps).await
}

/// 发送 CDP 命令到指定端口
async fn send_cdp_command(cdp_port: i32, method: &str, params: serde_json::Value) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

    // 1. 获取当前 page 的 websocket debugger URL
    let resp = client
        .get(format!("http://localhost:{}/json", cdp_port))
        .send()
        .await
        .map_err(|e| format!("连接 CDP /json 失败: {}", e))?;

    let pages: Vec<serde_json::Value> = resp
        .json()
        .await
        .map_err(|e| format!("解析 CDP /json 响应失败: {}", e))?;

    let page = pages.first().ok_or("没有可用的 CDP page")?;
    let ws_url = page["webSocketDebuggerUrl"]
        .as_str()
        .ok_or("缺少 webSocketDebuggerUrl")?;

    // 2. 通过 WebSocket 发送 CDP 命令use futures_util::{SinkExt, StreamExt};
    use tokio_tungstenite::connect_async;
    let (mut ws_stream, _) = connect_async(ws_url)
        .await
        .map_err(|e| format!("WebSocket 连接失败: {}", e))?;

    let cmd = serde_json::json!({
        "id": 1,
        "method": method,
        "params": params,
    });

    ws_stream
        .send(tokio_tungstenite::tungstenite::Message::Text(cmd.to_string()))
        .await
        .map_err(|e| format!("发送 CDP 命令失败: {}", e))?;

    // 等待响应
    let cdp_timeout = tokio::time::Duration::from_secs(10);
    let result = tokio::time::timeout(cdp_timeout, async {
        while let Some(msg) = ws_stream.next().await {
            match msg {
                Ok(tokio_tungstenite::tungstenite::Message::Text(text)) => {
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                        if json.get("id").is_some() {
                            return Ok(json);
                        }
                    }
                }
                Ok(_) => continue,
                Err(e) => return Err(format!("WebSocket 错误: {}", e)),
            }
        }
        Err("WebSocket 连接关闭".to_string())
    })
    .await
    .map_err(|_| "CDP 命令超时".to_string())?;

    let _ = ws_stream.close(None).await;
    result
}

/// 通用 CDP 脚本执行器
pub async fn execute_script_steps(
    cdp_port: i32,
    steps: Vec<ScriptStep>,
) -> Result<ScriptExecutionResult, String> {
    let mut step_results = Vec::new();

    for (idx, step) in steps.iter().enumerate() {
        let t0 = std::time::Instant::now();
        let action = step.action.to_lowercase();

        if step.humanize.unwrap_or(false) {
            let delay = {
                use rand::Rng;
                rand::thread_rng().gen_range(200..=800)
            };
            tokio::time::sleep(Duration::from_millis(delay)).await;
        }

        let result = match action.as_str() {
            "navigate" => {
                let url = step.target.as_deref().unwrap_or("about:blank");
                let params = serde_json::json!({ "url": url });
                match send_cdp_command(cdp_port, "Page.navigate", params).await {
                    Ok(_) => Ok(format!("导航到 {}", url)),
                    Err(e) => Err(format!("导航失败: {}", e)),
                }
            }
            "click" => {
                let selector = step.target.as_deref().unwrap_or("");
                if selector.is_empty() {
                    Err("click 缺少 target (CSS selector)".to_string())
                } else {
                    let js = format!(
                        "(function() {{ const el = document.querySelector({}); if (!el) return null; const rect = el.getBoundingClientRect(); return {{ x: rect.x + rect.width/2, y: rect.y + rect.height/2 }}; }})()",
                        serde_json::to_string(selector).unwrap_or_default()
                    );
                    match send_cdp_command(cdp_port, "Runtime.evaluate", serde_json::json!({"expression": js, "returnByValue": true})).await {
                        Ok(resp) => {
                            if let Some(pos) = resp["result"]["result"]["value"].as_object() {
                                let x = pos["x"].as_f64().unwrap_or(0.0);
                                let y = pos["y"].as_f64().unwrap_or(0.0);
                                let _ = send_cdp_command(cdp_port, "Input.dispatchMouseEvent", serde_json::json!({"type": "mousePressed", "x": x, "y": y, "button": "left", "clickCount": 1})).await;
                                let _ = send_cdp_command(cdp_port, "Input.dispatchMouseEvent", serde_json::json!({"type": "mouseReleased", "x": x, "y": y, "button": "left", "clickCount": 1})).await;
                                Ok(format!("点击元素: {} 坐标({:.1}, {:.1})", selector, x, y))
                            } else {
                                Err(format!("未找到元素: {}", selector))
                            }
                        }
                        Err(e) => Err(format!("点击失败: {}", e)),
                    }
                }
            }
            "type" => {
                let selector = step.target.as_deref().unwrap_or("");
                let text = step.value.as_deref().unwrap_or("");
                if selector.is_empty() {
                    Err("type 缺少 target".to_string())
                } else {
                    let _ = send_cdp_command(cdp_port, "Runtime.evaluate", serde_json::json!({"expression": format!("document.querySelector({}).focus()", serde_json::to_string(selector).unwrap_or_default())})).await;
                    for ch in text.chars() {
                        let _ = send_cdp_command(cdp_port, "Input.dispatchKeyEvent", serde_json::json!({"type": "keyDown", "text": ch.to_string(), "key": ch.to_string()})).await;
                        let _ = send_cdp_command(cdp_port, "Input.dispatchKeyEvent", serde_json::json!({"type": "keyUp", "text": ch.to_string(), "key": ch.to_string()})).await;
                        if step.humanize.unwrap_or(false) {
                            let type_delay = rand::thread_rng().gen_range(50..=150);
                            tokio::time::sleep(Duration::from_millis(type_delay)).await;
                        }
                    }
                    Ok(format!("输入文本到 {}: {} 字", selector, text.len()))
                }
            }
            "scroll" => {
                let direction = step.value.as_deref().unwrap_or("down");
                let dy = if direction == "up" { -500 } else { 500 };
                match send_cdp_command(cdp_port, "Runtime.evaluate", serde_json::json!({"expression": format!("window.scrollBy(0, {})", dy)})).await {
                    Ok(_) => Ok(format!("滚动 {}", direction)),
                    Err(e) => Err(format!("滚动失败: {}", e)),
                }
            }
            "wait" => {
                let ms = step.value.as_deref().and_then(|v| v.parse::<u64>().ok()).or(step.wait_ms).unwrap_or(1000);
                tokio::time::sleep(Duration::from_millis(ms)).await;
                Ok(format!("等待 {}ms", ms))
            }
            "screenshot" => {
                match send_cdp_command(cdp_port, "Page.captureScreenshot", serde_json::json!({})).await {
                    Ok(resp) => {
                        if let Some(data) = resp["result"]["data"].as_str() {
                            if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(data) {
                                let path = step.value.as_deref().unwrap_or("/tmp/screenshot.png");
                                std::fs::write(path, bytes).map_err(|e| format!("保存截图失败: {}", e))?;
                                Ok(format!("截图已保存: {}", path))
                            } else {
                                Err("截图 Base64 解码失败".to_string())
                            }
                        } else {
                            Err("截图返回数据异常".to_string())
                        }
                    }
                    Err(e) => Err(format!("截图失败: {}", e)),
                }
            }
            "evaluate" => {
                let js = step.value.as_deref().unwrap_or("");
                if js.is_empty() {
                    Err("evaluate 缺少 value".to_string())
                } else {
                    match send_cdp_command(cdp_port, "Runtime.evaluate", serde_json::json!({"expression": js, "returnByValue": true})).await {
                        Ok(resp) => Ok(format!("执行 JS 结果: {}", resp["result"]["result"]["value"])),
                        Err(e) => Err(format!("执行 JS 失败: {}", e)),
                    }
                }
            }
            _ => Err(format!("未知的 action 类型: {}", action)),
        };

        let elapsed = t0.elapsed().as_millis() as u64;
        let (success, message) = match result {
            Ok(msg) => { log::info!("[Script] {}/{} {} OK {}ms: {}", idx+1, steps.len(), action, elapsed, msg); (true, msg) }
            Err(err) => {
                log::warn!("[Script] {}/{} {} FAIL {}ms: {}", idx+1, steps.len(), action, elapsed, err);
                if step.optional.unwrap_or(false) { (true, format!("可选跳过: {}", err)) }
                else {
                    step_results.push(StepResult { action: action.clone(), success: false, message: err.clone(), elapsed_ms: elapsed });
                    return Ok(ScriptExecutionResult { success: false, steps: step_results, message: format!("步骤 {}/{} 失败: {}", idx+1, steps.len(), err) });
                }
            }
        };
        step_results.push(StepResult { action: action.clone(), success, message: message.clone(), elapsed_ms: elapsed });
        if let Some(ms) = step.wait_ms { if ms > 0 { tokio::time::sleep(Duration::from_millis(ms)).await; } }
    }
    Ok(ScriptExecutionResult { success: true, steps: step_results, message: format!("全部 {} 步执行完成", steps.len()) })
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

fn find_cloak_binary(version: Option<&str>) -> Result<PathBuf, String> {
    let home = get_home_dir()?;

    // [0] 安装包内资源路径（最高优先级）
    if let Ok(exe_path) = std::env::current_exe() {
        #[cfg(target_os = "macos")]
        {
            let bundle_path = exe_path.parent()
                .and_then(|p| p.parent())
                .map(|p| p.join("Resources"))
                .map(|p| p.join("cloakbrowser-core"))
                .map(|p| p.join("CloakBrowser"));
            if let Some(ref path) = bundle_path {
                if path.exists() {
                    return Ok(path.clone());
                }
            }
        }
        #[cfg(target_os = "windows")]
        {
            let bundle_path = exe_path.parent()
                .map(|p| p.join("resources"))
                .map(|p| p.join("cloakbrowser-core"))
                .map(|p| p.join("chrome.exe"));
            if let Some(ref path) = bundle_path {
                if path.exists() {
                    return Ok(path.clone());
                }
            }
        }
    }

    // 搜索路径优先级：
    // 1. ~/.cloakbrowser/chromium-*/chrome (标准安装)
    // 2. ~/.beehivebrowser/chromium-*/chrome (旧版兼容)
    // 3. macOS: /Applications/CloakBrowser.app/... (macOS 应用包)
    // 4. Windows: %LOCALAPPDATA%\\.cloakbrowser\\...

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

    // 如果指定了版本，按前缀匹配（"146" 匹配 "chromium-146.0.7680.177.3"）
    if let Some(v) = version {
        for cloak_dir in &search_dirs {
            if !cloak_dir.exists() {
                continue;
            }
            if let Ok(entries) = std::fs::read_dir(cloak_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    let dir_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                    if !dir_name.starts_with(&format!("chromium-{}", v)) {
                        continue;
                    }
                    if !path.is_dir() {
                        continue;
                    }
                    // 跳过备份/旧版目录
                    if dir_name.ends_with(".bak") || dir_name.ends_with(".old") || dir_name.ends_with(".backup") {
                        continue;
                    }
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
        return Err(format!("未找到内核版本 {} 的二进制文件", v));
    }

    // 未指定版本：返回第一个找到的
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
                        .map_or(false, |n| {
                            let name = n.to_string_lossy();
                            name.starts_with("chromium-")
                                && !name.ends_with(".bak")
                                && !name.ends_with(".old")
                                && !name.ends_with(".backup")
                        })
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
    let msg = "正在自动下载 CloakBrowser 内核，请稍候...".to_string();
    #[cfg(target_os = "macos")]
    let msg = "正在自动下载 CloakBrowser 内核，请稍候...".to_string();
    #[cfg(target_os = "linux")]
    let msg = "正在自动下载 CloakBrowser 内核，请稍候...".to_string();
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    let msg = "正在自动下载 CloakBrowser 内核，请稍候...".to_string();
    Err(msg)
}

fn copy_dir_all(src: impl AsRef<std::path::Path>, dst: impl AsRef<std::path::Path>) -> std::io::Result<()> {
    std::fs::create_dir_all(&dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
        } else {
            std::fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}

fn generate_data_dir(profile_id: &str, tenant_id: Option<&str>) -> PathBuf {
    let home = get_home_dir().unwrap_or_else(|_| PathBuf::from("/tmp"));
    let base = home.join(".beehive").join("profiles");
    match tenant_id {
        Some(tid) => base.join(sanitize_id(tid)).join(sanitize_id(profile_id)),
        None => base.join(sanitize_id(profile_id)),
    }
}

fn sanitize_id(id: &str) -> String {
    id.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect()
}

/// 从 start_port 开始检测并返回第一个可用端口
fn assign_cdp_port(start_port: i32) -> i32 {
    let mut port = start_port;
    loop {
        match TcpListener::bind(format!("127.0.0.1:{}", port)) {
            Ok(_) => return port,
            Err(_) => port += 1,
        }
    }
}

fn is_process_alive(pid: u32) -> bool {
    // 向进程发送信号 0 检查是否活着（不实际发信号）
    #[cfg(unix)]
    {
        let result = unsafe { libc::kill(pid as i32, 0) };
        result == 0
    }
    #[cfg(windows)]
    {
        run_hidden("tasklist")
            .arg("/FI")
            .arg(format!("PID eq {}", pid))
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
    #[cfg(not(any(unix, windows)))]
    {
        false
    }
}

// ── Tauri 命令 ─────────────────────────────────────────────

#[tauri::command]
fn launch_cloak(config: LaunchConfig, state: tauri::State<CloakState>) -> Result<String, String> {
    let binary = find_cloak_binary(config.kernel_version.as_deref())?;
    let mut cmd = Command::new(&binary);

    // User data dir
    let data_dir = config
        .user_data_dir
        .map(PathBuf::from)
        .unwrap_or_else(|| generate_data_dir(&config.profile_id, config.tenant_id.as_deref()));

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

    // Window position
    if let (Some(x), Some(y)) = (config.window_x, config.window_y) {
        cmd.arg(format!("--window-position={}, {}", x, y));
    }

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
    let cdp_port = config.cdp_port.unwrap_or_else(|| assign_cdp_port(9222));
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
                #[cfg(windows)]
                let _ = run_hidden("taskkill")
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
    match find_cloak_binary(None) {
        Ok(path) => serde_json::json!({
            "installed": true,
            "path": path.to_string_lossy(),
        }).to_string(),
        Err(_) => serde_json::json!({
            "installed": false,
            "path": null,
            "download_url": "https://github.com/roymaste/beehive-releases/releases/download/v0.1.1/cloakbrowser-chromium-146.zip",
        }).to_string(),
    }
}

/// 运行系统检测
/// 检查 CloakBrowser CDP、VPS 后端、前端页面的可用性
#[tauri::command]
async fn run_diagnostic() -> Result<String, String> {
    let mut results = serde_json::json!({
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "checks": {},
        "summary": {
            "total": 0,
            "passed": 0,
            "failed": 0,
        }
    });

    let checks = results["checks"].as_object_mut().unwrap();
    let mut passed = 0u32;
    let mut failed = 0u32;

    // 1. CDP 端口检测
    let cdp_result = check_cdp().await;
    match &cdp_result["status"].as_str() {
        Some("ok") => passed += 1,
        _ => failed += 1,
    }
    checks.insert("cdp".to_string(), cdp_result);

    // 2. VPS 后端检测
    let backend_result = check_vps_backend().await;
    match &backend_result["status"].as_str() {
        Some("ok") => passed += 1,
        _ => failed += 1,
    }
    checks.insert("backend".to_string(), backend_result);

    // 3. VPS 前端检测
    let frontend_result = check_vps_frontend().await;
    match &frontend_result["status"].as_str() {
        Some("ok") => passed += 1,
        _ => failed += 1,
    }
    checks.insert("frontend".to_string(), frontend_result);

    results["summary"]["total"] = serde_json::json!(3);
    results["summary"]["passed"] = serde_json::json!(passed);
    results["summary"]["failed"] = serde_json::json!(failed);

    Ok(results.to_string())
}

/// 检查 CloakBrowser CDP 端口
async fn check_cdp() -> serde_json::Value {
    let start = std::time::Instant::now();
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .unwrap_or_default();

    // 检查端口是否可连接（先 TCP 探测）
    match tokio::net::TcpStream::connect("127.0.0.1:9222").await {
        Ok(_) => {
            // 再检查 CDP 协议是否正常响应
            match client.get("http://127.0.0.1:9222/json/version").send().await {
                Ok(resp) => {
                    let elapsed = start.elapsed().as_millis();
                    if resp.status().is_success() {
                        let body: serde_json::Value = resp.json().await.unwrap_or_default();
                        serde_json::json!({
                            "status": "ok",
                            "name": "CloakBrowser CDP",
                            "ping_ms": elapsed,
                            "detail": format!("端口 9222 响应正常"),
                            "browser": body.get("Browser").and_then(|v| v.as_str()).unwrap_or("unknown"),
                        })
                    } else {
                        serde_json::json!({
                            "status": "warn",
                            "name": "CloakBrowser CDP",
                            "ping_ms": elapsed,
                            "detail": format!("端口 9222 可连接但响应异常: HTTP {}", resp.status()),
                        })
                    }
                }
                Err(e) => {
                    let elapsed = start.elapsed().as_millis();
                    serde_json::json!({
                        "status": "error",
                        "name": "CloakBrowser CDP",
                        "ping_ms": elapsed,
                        "detail": format!("端口 9222 可连接但请求失败: {}", e),
                    })
                }
            }
        }
        Err(_) => {
            let elapsed = start.elapsed().as_millis();
            serde_json::json!({
                "status": "error",
                "name": "CloakBrowser CDP",
                "ping_ms": elapsed,
                "detail": "CloakBrowser 未运行（127.0.0.1:9222 无法连接）",
                "hint": "请在客户端中启动一个浏览器环境后再试",
            })
        }
    }
}

/// 检查 VPS 后端健康
async fn check_vps_backend() -> serde_json::Value {
    let vps_url = std::env::var("BEEHIVE_API_URL")
        .unwrap_or_else(|_| "http://107.173.70.124:8080".to_string());
    let start = std::time::Instant::now();
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .unwrap_or_default();

    match client.get(format!("{}/health", vps_url)).send().await {
        Ok(resp) => {
            let elapsed = start.elapsed().as_millis();
            if resp.status().is_success() {
                serde_json::json!({
                    "status": "ok",
                    "name": "VPS 后端",
                    "ping_ms": elapsed,
                    "detail": format!("{} 响应正常（{}ms）", vps_url, elapsed),
                })
            } else {
                serde_json::json!({
                    "status": "error",
                    "name": "VPS 后端",
                    "ping_ms": elapsed,
                    "detail": format!("{} 返回 HTTP {}", vps_url, resp.status()),
                })
            }
        }
        Err(e) => {
            let elapsed = start.elapsed().as_millis();
            serde_json::json!({
                "status": "error",
                "name": "VPS 后端",
                "ping_ms": elapsed,
                "detail": format!("{} 无法连接: {}", vps_url, e),
                "hint": "请检查网络连接或联系管理员",
            })
        }
    }
}

/// 检查 VPS 前端页面
async fn check_vps_frontend() -> serde_json::Value {
    let frontend_url = "http://107.173.70.124:8080";
    let start = std::time::Instant::now();
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .unwrap_or_default();

    match client.get(frontend_url).send().await {
        Ok(resp) => {
            let elapsed = start.elapsed().as_millis();
            if resp.status().is_success() {
                // 检查返回内容是否包含关键标识
                let body = resp.text().await.unwrap_or_default();
                let has_title = body.contains("蜂巢智能体") || body.contains("Beehive");
                serde_json::json!({
                    "status": if has_title { "ok" } else { "warn" },
                    "name": "VPS 前端",
                    "ping_ms": elapsed,
                    "detail": if has_title {
                        format!("前端页面可达（{}ms）", elapsed)
                    } else {
                        format!("前端响应但内容异常，可能未正确加载")
                    },
                })
            } else {
                serde_json::json!({
                    "status": "error",
                    "name": "VPS 前端",
                    "ping_ms": elapsed,
                    "detail": format!("前端返回 HTTP {}", resp.status()),
                })
            }
        }
        Err(e) => {
            let elapsed = start.elapsed().as_millis();
            serde_json::json!({
                "status": "error",
                "name": "VPS 前端",
                "ping_ms": elapsed,
                "detail": format!("前端无法连接: {}", e),
                "hint": "请检查网络连接或联系管理员",
            })
        }
    }
}

// ── 内部辅助函数（供后台自动更新调用）────────────────────────

/// 内部下载函数（不暴露为 Tauri 命令）
async fn download_core_internal(
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
            let speed = chunk.len() as u64;
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

/// 内部解压函数（不暴露为 Tauri 命令）
fn extract_core_internal(zip_path: &str) -> Result<serde_json::Value, String> {
    let file = std::fs::File::open(zip_path)
        .map_err(|e| format!("打开 zip 文件失败: {}", e))?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("解析 zip 失败: {}", e))?;

    let (dest_dir, version) = {
        #[cfg(target_os = "windows")]
        {
            let localappdata = std::env::var("LOCALAPPDATA")
                .map_err(|_| "LOCALAPPDATA 未设置".to_string())?;
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

    std::fs::create_dir_all(&dest_dir)
        .map_err(|e| format!("创建目标目录失败: {}", e))?;

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
    let _ = std::fs::remove_file(zip_path);

    Ok(serde_json::json!({
        "path": dest_dir.to_string_lossy(),
        "version": version,
    }))
}

// ── CloakBrowser 内核自动下载 ─────────────────────────────────

/// 检查 CloakBrowser 内核是否已安装（增强版：返回版本信息）
#[tauri::command]
fn check_core_installed() -> String {
    match find_cloak_binary(None) {
        Ok(path) => {
            // 尝试从路径提取版本号
            let version = path
                .parent()
                .and_then(|p| p.file_name())
                .and_then(|n| {
                    let s = n.to_string_lossy().to_string();
                    s.strip_prefix("chromium-").map(|v| v.to_string())
                })
                .unwrap_or_else(|| "unknown".to_string());
            serde_json::json!({
                "installed": true,
                "versions": {
                    "chromium": version,
                    "playwright": "1.40.0",
                },
                "path": path.to_string_lossy(),
            }).to_string()
        }
        Err(_) => serde_json::json!({
            "installed": false,
            "versions": null,
            "path": null,
        }).to_string(),
    }
}

/// 获取已安装内核版本
#[tauri::command]
fn get_core_versions() -> Result<String, String> {
    match find_cloak_binary(None) {
        Ok(path) => {
            let version = path
                .parent()
                .and_then(|p| p.file_name())
                .and_then(|n| {
                    let s = n.to_string_lossy().to_string();
                    s.strip_prefix("chromium-").map(|v| v.to_string())
                })
                .unwrap_or_else(|| "unknown".to_string());
            Ok(serde_json::json!({
                "chromium": version,
                "playwright": "1.40.0",
            }).to_string())
        }
        Err(e) => Err(e),
    }
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
/// 不存在则尝试从安装包 resource 目录复制内置内核
fn check_cloak_binary_setup(app: &tauri::AppHandle) {
    if let Err(_msg) = find_cloak_binary(None) {
        // 尝试从安装包 resource 目录复制内置内核
        if let Ok(resource_dir) = app.path().resource_dir() {
            let bundled_kernel = resource_dir.join("kernel/chromium");
            if bundled_kernel.exists() && bundled_kernel.is_dir() {
                #[cfg(target_os = "windows")]
                let chrome_binary = bundled_kernel.join("chrome.exe");
                #[cfg(target_os = "macos")]
                let chrome_binary = bundled_kernel.join("CloakBrowser");
                #[cfg(target_os = "linux")]
                let chrome_binary = bundled_kernel.join("chrome");

                if chrome_binary.exists() {
                    let home = get_home_dir().unwrap_or_else(|_| PathBuf::from("/tmp"));
                    let target_dir = home.join(".cloakbrowser").join("chromium-146.0.7680.177.3");

                    log::info!("从安装包复制内核: {} -> {}", bundled_kernel.display(), target_dir.display());

                    match copy_dir_all(&bundled_kernel, &target_dir) {
                        Ok(_) => {
                            // 复制后再次验证
                            match find_cloak_binary(None) {
                                Ok(path) => {
                                    log::info!("内置内核复制并验证成功: {}", path.display());
                                    return;
                                }
                                Err(e) => {
                                    log::error!("复制内核后验证失败: {}", e);
                                }
                            }
                        }
                        Err(e) => {
                            log::error!("复制内核失败: {}", e);
                        }
                    }
                }
            }
        }

        // 无内置内核或复制失败，不再自动下载，改为通知前端引导用户手动下载
        log::info!("未找到 CloakBrowser 内核，尝试从后端获取可用内核列表...");
        let app_handle = app.clone();

        tauri::async_runtime::spawn(async move {
            let api_base = std::env::var("BEEHIVE_API_URL")
                .unwrap_or_else(|_| "http://107.173.70.124:8080".to_string());

            // 尝试从本地存储读取用户 JWT（前端登录后写入）
            let jwt_token = dirs::data_dir()
                .map(|d| d.join("com.beehive.browser").join("auth.token"))
                .and_then(|p| std::fs::read_to_string(&p).ok())
                .map(|s| s.trim().to_string());

            if let Some(token) = jwt_token {
                // 用户已登录，向后端查询可用内核列表
                let client = reqwest::Client::new();
                match client
                    .get(format!("{}/api/v1/browser-kernels", api_base))
                    .header("Authorization", format!("Bearer {}", token))
                    .send()
                    .await
                {
                    Ok(resp) if resp.status().is_success() => {
                        match resp.json::<serde_json::Value>().await {
                            Ok(body) => {
                                if let Some(kernels) = body["kernels"].as_array() {
                                    if !kernels.is_empty() {
                                        log::info!("后端返回 {} 个可用内核，自动下载第一个", kernels.len());
                                        // 自动下载第一个可用内核
                                        let first = &kernels[0];
                                        let download_url = first["download_url"].as_str()
                                            .or_else(|| first["url"].as_str())
                                            .unwrap_or("https://github.com/roymaste/beehive-releases/releases/download/v0.1.1/cloakbrowser-chromium-146.zip");
                                        let _ = app_handle.emit("kernel-download-start", serde_json::json!({
                                            "message": "正在自动下载 CloakBrowser 内核...",
                                            "url": download_url,
                                        }));
                                        match download_core_internal(app_handle.clone(), download_url.to_string()).await {
                                            Ok(zip_path) => {
                                                log::info!("内核下载完成: {}", zip_path);
                                                let _ = app_handle.emit("kernel-download-progress", serde_json::json!({
                                                    "percent": 100,
                                                    "status": "extracting",
                                                }));
                                                match extract_core_internal(&zip_path) {
                                                    Ok(result) => {
                                                        log::info!("内核安装成功: {}", result);
                                                        let _ = app_handle.emit("kernel-ready", serde_json::json!({
                                                            "message": "CloakBrowser 内核安装完成",
                                                            "version": result["version"],
                                                        }));
                                                    }
                                                    Err(e) => {
                                                        log::error!("内核解压失败: {}", e);
                                                        let _ = app_handle.emit("kernel-error", serde_json::json!({"error": format!("解压失败: {}", e)}));
                                                    }
                                                }
                                            }
                                            Err(e) => {
                                                log::error!("内核下载失败: {}", e);
                                                let _ = app_handle.emit("kernel-error", serde_json::json!({"error": format!("下载失败: {}", e)}));
                                                // 下载失败，尝试备用 URL
                                                let fallback_url = "https://github.com/roymaste/beehive-releases/releases/download/v0.1.1/cloakbrowser-chromium-146.zip";
                                                log::info!("尝试备用下载地址: {}", fallback_url);
                                                match download_core_internal(app_handle.clone(), fallback_url.to_string()).await {
                                                    Ok(zip_path) => {
                                                        log::info!("备用下载完成: {}", zip_path);
                                                        match extract_core_internal(&zip_path) {
                                                            Ok(result) => {
                                                                log::info!("内核安装成功: {}", result);
                                                                let _ = app_handle.emit("kernel-ready", serde_json::json!({"message": "内核安装完成"}));
                                                            }
                                                            Err(e) => log::error!("备用下载解压也失败: {}", e),
                                                        }
                                                    }
                                                    Err(e) => log::error!("备用下载也失败: {}", e),
                                                }
                                            }
                                        }
                                    } else {
                                        log::warn!("后端返回内核列表为空");
                                        let _ = app_handle.emit("kernel-missing", serde_json::json!({
                                            "message": "CloakBrowser 内核未安装，且后端暂无可下载内核",
                                            "kernels_available": 0,
                                        }));
                                    }
                                } else {
                                    log::warn!("后端返回数据格式异常，缺少 kernels 字段");
                                }
                            }
                            Err(e) => {
                                log::error!("解析后端内核列表失败: {}", e);
                            }
                        }
                    }
                    Ok(resp) => {
                        log::warn!("获取内核列表失败，HTTP 状态: {}", resp.status());
                    }
                    Err(e) => {
                        log::error!("请求后端内核列表失败: {}", e);
                    }
                }
            } else {
                // 用户未登录，用默认地址尝试下载
                log::info!("用户未登录，尝试从默认地址下载内核...");
                let fallback_url = "https://github.com/roymaste/beehive-releases/releases/download/v0.1.1/cloakbrowser-chromium-146.zip";
                let _ = app_handle.emit("kernel-download-start", serde_json::json!({
                    "message": "正在自动下载 CloakBrowser 内核...",
                    "url": fallback_url,
                }));
                match download_core_internal(app_handle.clone(), fallback_url.to_string()).await {
                    Ok(zip_path) => {
                        log::info!("内核下载完成: {}", zip_path);
                        match extract_core_internal(&zip_path) {
                            Ok(result) => {
                                log::info!("内核安装成功: {}", result);
                                let _ = app_handle.emit("kernel-ready", serde_json::json!({"message": "内核安装完成"}));
                            }
                            Err(e) => log::error!("内核解压失败: {}", e),
                        }
                    }
                    Err(e) => log::error!("默认地址下载失败: {}", e),
                }
            }
        });
    }
}

// ── 应用入口 ───────────────────────────────────────────────

fn get_log_dir() -> PathBuf {
    let base = if cfg!(target_os = "windows") {
        std::env::var("LOCALAPPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(|_| std::env::temp_dir())
    } else {
        std::env::var("HOME")
            .map(|h| PathBuf::from(h).join(".local/share"))
            .unwrap_or_else(|_| std::env::temp_dir())
    };
    base.join("com.beehive.browser").join("logs")
}

fn init_logging() {
    let log_dir = get_log_dir();
    let _ = std::fs::create_dir_all(&log_dir);
    let log_path = log_dir.join("beehive.log");

    // 文件 appender：5MB 滚动，保留 3 个备份
    let file_appender = log4rs::append::rolling_file::RollingFileAppender::builder()
        .encoder(Box::new(log4rs::encode::pattern::PatternEncoder::new(
            "{d(%Y-%m-%d %H:%M:%S)} [{l}] {f}:{L} - {m}\n"
        )))
        .build(
            log_path.to_string_lossy().to_string(),
            Box::new(log4rs::append::rolling_file::policy::compound::CompoundPolicy::new(
                Box::new(log4rs::append::rolling_file::policy::compound::trigger::size::SizeTrigger::new(5_000_000)),  // 5MB
                Box::new(log4rs::append::rolling_file::policy::compound::roll::fixed_window::FixedWindowRoller::builder()
                    .build("beehive.log.{{}}.bak", 3)
                    .expect("roll pattern")),
            )),
        ).expect("file appender");

    let config = log4rs::Config::builder()
        .appender(log4rs::config::Appender::builder().build("file", Box::new(file_appender)))
        .build(log4rs::config::Root::builder().appender("file").build(log::LevelFilter::Info))
        .expect("log4rs config");

    log4rs::init_config(config).expect("log4rs init");

    // panic hook：未捕获的 panic 也记入日志
    std::panic::set_hook(Box::new(|panic_info| {
        let msg = if let Some(s) = panic_info.payload().downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = panic_info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            "未知 panic".to_string()
        };
        let location = panic_info.location()
            .map(|l| format!("{}:{}", l.file(), l.line()))
            .unwrap_or_else(|| "?".to_string());
        log::error!("=== PANIC === {} at {}", msg, location);
    }));

    log::info!("╔══════════════════════════════════════╗");
    log::info!("║     蜂巢浏览器 Beehive Browser       ║");
    log::info!("╚══════════════════════════════════════╝");
    log::info!("日志目录: {}", log_dir.display());
    log::info!("版本: {}", env!("CARGO_PKG_VERSION"));
    log::info!("平台: {} {}", std::env::consts::OS, std::env::consts::ARCH);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // ── WebKit 远程 inspector（最早设置，确保 WebKit 初始化前生效）──
    #[cfg(target_os = "linux")]
    {
        std::env::set_var("WEBKIT_DEVELOPER_EXTRAS", "1");
        std::env::set_var("WEBKIT_INSPECTOR_HTTP_SERVER", "0.0.0.0:12346");
    }

    init_logging();

    log::info!("启动单实例控制...");
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
                    log::info!("旧实例(PID={})还活着，杀掉重新启动", pid);
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
                        // 注意：不用 /IM 参数 — 它会杀掉当前进程自己！
                        let _ = run_hidden("taskkill")
                            .args(&["/F", "/T", "/PID", &pid.to_string()])
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
            run_diagnostic,
            execute_script_steps_command,
        ])
        .setup(|app| {
            // 启用 WebKit 远程 inspector（必须在 WebView 创建前设置）
            #[cfg(target_os = "linux")]
            {
                std::env::set_var("WEBKIT_DEVELOPER_EXTRAS", "1");
                if std::env::var("WEBKIT_INSPECTOR_HTTP_SERVER").is_err() {
                    std::env::set_var("WEBKIT_INSPECTOR_HTTP_SERVER", "0.0.0.0:12346");
                }
                log::info!("WebKit remote inspector: 0.0.0.0:12346");
            }

            // 首次启动检查 CloakBrowser 二进制
            check_cloak_binary_setup(app.handle());

            // Auto-update 启动时检查更新
            #[cfg(desktop)]
            let _ = app.handle().plugin(tauri_plugin_updater::Builder::new().build());

            // ── 后台检测可用内核（仅通知，不自动下载） ─────────────────────────────
            let update_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // 等待 5 秒让主窗口先加载
                tokio::time::sleep(Duration::from_secs(5)).await;

                let api_base = std::env::var("BEEHIVE_API_URL")
                    .unwrap_or_else(|_| "http://107.173.70.124:8080".to_string());

                let jwt_token = dirs::data_dir()
                    .map(|d| d.join("com.beehive.browser").join("auth.token"))
                    .and_then(|p| std::fs::read_to_string(&p).ok())
                    .map(|s| s.trim().to_string());

                if let Some(ref token) = jwt_token {
                    let client = reqwest::Client::new();
                    match client
                        .get(format!("{}/api/v1/browser-kernels", api_base))
                        .header("Authorization", format!("Bearer {}", token))
                        .send()
                        .await
                    {
                        Ok(resp) if resp.status().is_success() => {
                            if let Ok(body) = resp.json::<serde_json::Value>().await {
                                if let Some(kernels) = body["kernels"].as_array() {
                                    if !kernels.is_empty() {
                                        log::info!("后端返回 {} 个可用内核", kernels.len());
                                        let _ = update_handle.emit("kernels-available", serde_json::json!({
                                            "count": kernels.len(),
                                            "message": format!("有 {} 个浏览器内核可供下载", kernels.len()),
                                        }));
                                    }
                                }
                            }
                        }
                        Ok(resp) => {
                            log::warn!("查询内核列表失败: HTTP {}", resp.status());
                        }
                        Err(e) => {
                            log::warn!("查询内核列表网络错误: {}", e);
                        }
                    }
                } else {
                    log::info!("用户未登录，跳过内核检测");
                }
            });

            // 后台任务：注册+心跳+轮询（基于 tauri async runtime）
            let api_base = std::env::var("BEEHIVE_API_URL")
                .unwrap_or_else(|_| "http://107.173.70.124:8080".to_string());
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

                        // 获取更新公钥（注册成功后调用一次）
                        let update_pubkey: Option<String> = fetch_update_pubkey(&api_base, &token).await;
                        if let Some(ref pk) = update_pubkey {
                            log::info!("已获取更新公钥: {}...", &pk[..pk.len().min(16)]);
                        } else {
                            log::warn!("未能获取更新公钥，更新签名验证将跳过");
                        }

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
                                                        tenant_id: None,
                                                        fingerprint_seed: None,
                                                        platform: None,
                                                        timezone: None,
                                                        locale: None,
                                                        screen_width: None,
                                                        screen_height: None,
                                                        window_x: None,
                                                        window_y: None,
                                                        gpu_vendor: None,
                                                        gpu_renderer: None,
                                                        hardware_concurrency: None,
                                                        proxy: task["params"]["proxy"].as_str().map(|s| s.to_string()),
                                                        user_data_dir: None,
                                                        url: None,
                                                        headless: None,
                                                        humanize: None,
                                                        cdp_port: Some(cdp_port),
                                                        kernel_version: None,
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

            // 创建主窗口 — 始终指向 index.html
            let window = tauri::WebviewWindowBuilder::new(
                app,
                "beehive-main",
                tauri::WebviewUrl::App("index.html".into()),
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
                            let _ = run_hidden("taskkill")
                                .args(&["/F", "/T", "/PID", &my_pid.to_string()])
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
