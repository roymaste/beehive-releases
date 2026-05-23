/// BeehiveBrowser Launcher — 独立的 BeehiveBrowser 启动器
///
/// 用法：
///   cloak-launcher --config profile_config.json
///
/// config.json 格式：
/// {
///   "fingerprint_seed": 77777,
///   "platform": "windows",
///   "timezone": "Asia/Tokyo",
///   "locale": "ja-JP",
///   "user_agent": "...",
///   "screen_width": 1920,
///   "screen_height": 1080,
///   "gpu_vendor": "Google Inc. (NVIDIA)",
///   "gpu_renderer": "ANGLE (NVIDIA, NVIDIA GeForce RTX 3070...)",
///   "hardware_concurrency": 8,
///   "humanize": true,
///   "headless": false,
///   "proxy": "socks5://user:pass@host:1080",
///   "user_data_dir": "/path/to/profile/data",
///   "url": "https://twitter.com"
/// }
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};

#[derive(Debug, Deserialize, Serialize)]
struct CloakConfig {
    #[serde(default)]
    fingerprint_seed: Option<i32>,

    #[serde(default = "default_platform")]
    platform: String,

    #[serde(default)]
    timezone: Option<String>,

    #[serde(default)]
    locale: Option<String>,

    #[serde(default)]
    user_agent: Option<String>,

    #[serde(default = "default_width")]
    screen_width: i32,

    #[serde(default = "default_height")]
    screen_height: i32,

    #[serde(default)]
    gpu_vendor: Option<String>,

    #[serde(default)]
    gpu_renderer: Option<String>,

    #[serde(default = "default_cores")]
    hardware_concurrency: i32,

    #[serde(default)]
    humanize: bool,

    #[serde(default)]
    headless: bool,

    #[serde(default)]
    proxy: Option<String>,

    #[serde(default = "default_user_data_dir")]
    user_data_dir: String,

    #[serde(default)]
    url: Option<String>,
}

fn default_platform() -> String {
    "windows".to_string()
}
fn default_width() -> i32 {
    1920
}
fn default_height() -> i32 {
    1080
}
fn default_cores() -> i32 {
    8
}
fn default_user_data_dir() -> String {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    format!("{}/.beehive/profiles/default", home)
}

// ── BeehiveBrowser binary discovery ─────────────────────────────

fn find_cloak_binary() -> Result<PathBuf, String> {
    // 1. Check common install location (~/.beehivebrowser/)
    let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
    let cloak_dir = PathBuf::from(&home).join(".beehivebrowser");

    if cloak_dir.exists() {
        // Find the chromium-* directory
        let entries = fs::read_dir(&cloak_dir).map_err(|e| format!("Cannot read {}: {}", cloak_dir.display(), e))?;
        for entry in entries {
            let entry = entry.map_err(|e| format!("Read dir error: {}", e))?;
            let path = entry.path();
            if path.is_dir() && path.file_name().map_or(false, |n| n.to_string_lossy().starts_with("chromium-")) {
                let binary = path.join("chrome");
                if binary.exists() {
                    return Ok(binary);
                }
            }
        }
    }

    // 2. Check PATH
    if let Ok(output) = Command::new("which").arg("beehivebrowser-chrome").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            return Ok(PathBuf::from(path));
        }
    }

    Err(format!(
        "BeehiveBrowser binary not found at {}/.beehivebrowser/chromium-*/chrome\n\
         Install: pip install beehivebrowser && python3 -c \"from beehivebrowser import launch\"\n\
         Or download from: https://github.com/HiveAgent/BeehiveBrowser",
        home
    ))
}

// ── Launch BeehiveBrowser ─────────────────────────────────────

fn launch_cloak(config: &CloakConfig) -> Result<Child, String> {
    let binary = find_cloak_binary()?;
    let mut cmd = Command::new(&binary);

    // --- Essential Chrome flags ---
    cmd.arg(format!("--user-data-dir={}", config.user_data_dir));
    cmd.arg("--no-first-run");
    cmd.arg("--no-default-browser-check");
    cmd.arg("--disable-background-networking");
    cmd.arg("--disable-sync");
    cmd.arg("--disable-translate");
    cmd.arg("--disable-default-apps");
    cmd.arg("--mute-audio");

    // --- BeehiveBrowser fingerprint flags ---
    if let Some(seed) = config.fingerprint_seed {
        cmd.arg(format!("--fingerprint={}", seed));
    }

    cmd.arg(format!("--fingerprint-platform={}", config.platform));

    if let Some(ref tz) = config.timezone {
        cmd.arg(format!("--fingerprint-timezone={}", tz));
    }

    if let Some(ref locale) = config.locale {
        cmd.arg(format!("--lang={}", locale));
        cmd.arg(format!("--fingerprint-locale={}", locale));
    }

    if let Some(ref ua) = config.user_agent {
        cmd.arg(format!("--fingerprint-ua={}", ua));
    }

    cmd.arg(format!("--fingerprint-screen-width={}", config.screen_width));
    cmd.arg(format!("--fingerprint-screen-height={}", config.screen_height));

    if let Some(ref vendor) = config.gpu_vendor {
        cmd.arg(format!("--fingerprint-gpu-vendor={}", vendor));
    }

    if let Some(ref renderer) = config.gpu_renderer {
        cmd.arg(format!("--fingerprint-gpu-renderer={}", renderer));
    }

    cmd.arg(format!("--fingerprint-hardware-concurrency={}", config.hardware_concurrency));

    if config.humanize {
        cmd.arg("--fingerprint-humanize");
    }

    // --- Headless mode ---
    if config.headless {
        cmd.arg("--headless");
    }

    // --- Proxy ---
    if let Some(ref proxy) = config.proxy {
        cmd.arg(format!("--proxy-server={}", proxy));
        cmd.arg("--proxy-bypass-list=<-loopback>");
    }

    // --- GPU blocklist bypass (needed for headed mode in Docker/VMs) ---
    cmd.arg("--ignore-gpu-blocklist");
    cmd.arg("--disable-gpu-process-crash-limit");

    // --- URL (optional - opens this URL on launch) ---
    if let Some(ref url) = config.url {
        cmd.arg(url);
    }

    // --- Disable sandbox (needed on some Linux setups) ---
    // Only add this on Linux - macOS and Windows don't need it
    #[cfg(target_os = "linux")]
    cmd.arg("--no-sandbox");

    // --- Launch ---
    let child = cmd
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .stdin(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to launch BeehiveBrowser: {}\nBinary: {}", e, binary.display()))?;

    Ok(child)
}

// ── Main ────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct Args {
    config: Option<String>,
    seed: Option<i32>,
    platform: Option<String>,
    timezone: Option<String>,
    locale: Option<String>,
    proxy: Option<String>,
    url: Option<String>,
    user_data_dir: Option<String>,
    headless: bool,
    humanize: bool,
}

fn main() {
    let args: Vec<String> = std::env::args().collect();

    if args.len() < 2 {
        eprintln!("Usage:");
        eprintln!("  cloak-launcher --config <path-to-config.json>");
        eprintln!("  cloak-launcher --seed 77777 --platform windows --timezone Asia/Tokyo ...");
        std::process::exit(1);
    }

    let config = if args[1] == "--config" && args.len() >= 3 {
        // Load from JSON config file
        let config_path = &args[2];
        let config_str = fs::read_to_string(config_path)
            .expect(&format!("Cannot read config file: {}", config_path));
        serde_json::from_str::<CloakConfig>(&config_str)
            .expect("Invalid config file format")
    } else {
        // Parse individual args
        CloakConfig {
            fingerprint_seed: parse_opt_arg(&args, "--seed"),
            platform: parse_arg(&args, "--platform", "windows"),
            timezone: parse_opt_arg_str(&args, "--timezone"),
            locale: parse_opt_arg_str(&args, "--locale"),
            user_agent: None,
            screen_width: parse_arg_int(&args, "--screen-width", 1920),
            screen_height: parse_arg_int(&args, "--screen-height", 1080),
            gpu_vendor: parse_opt_arg_str(&args, "--gpu-vendor"),
            gpu_renderer: parse_opt_arg_str(&args, "--gpu-renderer"),
            hardware_concurrency: parse_arg_int(&args, "--hardware-concurrency", 8),
            humanize: args.contains(&"--humanize".to_string()),
            headless: args.contains(&"--headless".to_string()),
            proxy: parse_opt_arg_str(&args, "--proxy"),
            user_data_dir: parse_arg(&args, "--user-data-dir", &default_user_data_dir()),
            url: parse_opt_arg_str(&args, "--url"),
        }
    };

    match launch_cloak(&config) {
        Ok(child) => {
            println!("{}", child.id());
            // Keep running in background — the Tauri app will track the PID
            // and can kill it later
        }
        Err(e) => {
            eprintln!("Error: {}", e);
            std::process::exit(1);
        }
    }
}

fn parse_arg(args: &[String], name: &str, default: &str) -> String {
    parse_opt_arg_str(args, name).unwrap_or_else(|| default.to_string())
}

fn parse_arg_int(args: &[String], name: &str, default: i32) -> i32 {
    parse_opt_arg(args, name).unwrap_or(default)
}

fn parse_opt_arg(args: &[String], name: &str) -> Option<i32> {
    args.windows(2)
        .find(|w| w[0] == name)
        .and_then(|w| w[1].parse().ok())
}

fn parse_opt_arg_str<'a>(args: &'a [String], name: &str) -> Option<String> {
    args.windows(2)
        .find(|w| w[0] == name)
        .map(|w| w[1].clone())
}
