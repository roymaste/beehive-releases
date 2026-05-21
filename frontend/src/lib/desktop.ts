/**
 * 蜂巢浏览器 — Tauri 本地命令桥接
 *
 * 当前端运行在 beehiive-browser Tauri 桌面端中时，
 * 通过 window.__TAURI__.invoke() 调用本地 BeehiveBrowser 启动/停止。
 * 如果不在 Tauri 环境中（普通浏览器），则走原来的 API 调用。
 */

declare global {
  interface Window {
    __TAURI__?: {
      invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
    };
  }
}

/** 检测是否在 Tauri 桌面端中运行 */
export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/** Tauri invoke 包装 */
async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isDesktopApp()) {
    throw new Error('Not running in desktop app');
  }
  try {
    // Tauri v2 的 invoke 方式
    const { invoke } = window.__TAURI__ as any;
    const result = await invoke(cmd, args);
    return JSON.parse(result) as T;
  } catch (e) {
    console.error(`Tauri command "${cmd}" failed:`, e);
    throw e;
  }
}

/** 启动配置 */
export interface LauncherConfig {
  profile_id: string;
  fingerprint_seed?: number;
  platform?: string;
  timezone?: string;
  locale?: string;
  screen_width?: number;
  screen_height?: number;
  gpu_vendor?: string;
  gpu_renderer?: string;
  hardware_concurrency?: number;
  proxy?: string;
  user_data_dir?: string;
  url?: string;
  headless?: boolean;
  humanize?: boolean;
}

/** 本地启动结果 */
export interface LaunchResult {
  status: string;
  pid: number;
  profile_id: string;
  user_data_dir: string;
  cdp_port: number;
}

/** 在 Tauri 桌面端本地启动 BeehiveBrowser */
export async function launchLocalBeehiveBrowser(config: LauncherConfig): Promise<LaunchResult> {
  return tauriInvoke<LaunchResult>('launch_cloak', { config });
}

/** 在 Tauri 桌面端停止本地 BeehiveBrowser */
export async function stopLocalBeehiveBrowser(profileId: string): Promise<{ status: string; profile_id: string }> {
  return tauriInvoke<{ status: string; profile_id: string }>('stop_cloak', { profileId });
}

/** 获取本地运行中的所有实例 */
export async function listLocalRunningCloaks(): Promise<Record<string, number>> {
  return tauriInvoke<Record<string, number>>('list_running_cloaks');
}

/** 将蜂巢 API 的 fingerprint 配置转换为 Tauri 启动配置 */
export function fingerprintToLauncherConfig(
  profileId: string,
  fingerprint: Record<string, any>,
  proxyUrl?: string,
  url?: string
): LauncherConfig {
  return {
    profile_id: profileId,
    fingerprint_seed: fingerprint.fingerprint_seed,
    platform: fingerprint.platform,
    timezone: fingerprint.timezone,
    locale: fingerprint.locale,
    screen_width: fingerprint.screen_width,
    screen_height: fingerprint.screen_height,
    gpu_vendor: fingerprint.gpu_vendor,
    gpu_renderer: fingerprint.gpu_renderer,
    hardware_concurrency: fingerprint.hardware_concurrency,
    proxy: proxyUrl,
    url,
    humanize: fingerprint.humanize,
    headless: fingerprint.headless,
  };
}

/** 内核版本信息 */
export interface CoreVersions {
  chromium: string;
  playwright: string;
}

/** 内核检查结果 */
export interface CoreCheckResult {
  installed: boolean;
  versions?: CoreVersions;
  message?: string;
}

/** 下载进度事件 */
export interface DownloadProgressEvent {
  downloaded: number;
  total: number;
  percentage: number;
}

/** 下载结果 */
export interface DownloadResult {
  status: string;
  path: string;
}

/** 解压结果 */
export interface ExtractResult {
  status: string;
  path: string;
}

// ── CDP 脚本执行器类型 ──────────────────────────────────────

/** 单步脚本定义 */
export interface ScriptStep {
  action: string;
  target?: string;
  value?: string;
  wait_ms?: number;
  humanize?: boolean;
  optional?: boolean;
}

/** 单步执行结果 */
export interface StepResult {
  action: string;
  success: boolean;
  message: string;
  elapsed_ms: number;
}

/** 脚本执行总结果 */
export interface ScriptExecutionResult {
  success: boolean;
  steps: StepResult[];
  message: string;
}

/** 执行 CDP 脚本步骤（Tauri 桌面端） */
export async function executeScriptSteps(
  cdpPort: number,
  steps: ScriptStep[]
): Promise<ScriptExecutionResult> {
  return tauriInvoke<ScriptExecutionResult>('execute_script_steps_command', {
    cdpPort,
    steps,
  });
}

/** 检查内核是否已安装 */
export async function checkCoreInstalled(): Promise<CoreCheckResult> {
  return tauriInvoke<CoreCheckResult>('check_core_installed');
}

/** 获取已安装内核版本 */
export async function getCoreVersions(): Promise<CoreVersions> {
  return tauriInvoke<CoreVersions>('get_core_versions');
}

/** 下载内核，支持进度回调 */
export async function downloadCore(
  url: string,
  onProgress?: (event: DownloadProgressEvent) => void
): Promise<DownloadResult> {
  if (!isDesktopApp()) {
    throw new Error('Not running in desktop app');
  }

  const { invoke, listen } = window.__TAURI__ as any;

  // 监听下载进度事件
  let unlisten: (() => void) | undefined;
  if (onProgress && typeof listen === 'function') {
    unlisten = await listen('download-progress', (event: { payload: DownloadProgressEvent }) => {
      onProgress(event.payload);
    });
  }

  try {
    const result = await invoke('download_core', { url });
    return JSON.parse(result) as DownloadResult;
  } catch (e) {
    console.error('Tauri command "download_core" failed:', e);
    throw e;
  } finally {
    if (unlisten) {
      unlisten();
    }
  }
}

/** 解压内核 */
export async function extractCore(zipPath: string): Promise<ExtractResult> {
  return tauriInvoke<ExtractResult>('extract_core', { zipPath });
}

/** 安装内核（下载 + 解压） */
export async function installCore(
  url: string,
  onProgress?: (event: DownloadProgressEvent) => void
): Promise<ExtractResult> {
  const download = await downloadCore(url, onProgress);
  return extractCore(download.path);
}

/** 更新内核（同 installCore） */
export async function updateCore(
  url: string,
  onProgress?: (event: DownloadProgressEvent) => void
): Promise<ExtractResult> {
  return installCore(url, onProgress);
}

/** 监听内核下载进度 */
/** 根据当前平台获取 CloakBrowser 内核下载 URL */
export function getCoreDownloadUrl(): string {
  const base = 'https://github.com/CloakHQ/CloakBrowser/releases/download/chromium-v146.0.7680.177.4/cloakbrowser-';
  const platform = navigator.platform.toLowerCase();
  if (platform.includes('win')) return base + 'windows-x64.zip';
  if (platform.includes('mac') || platform.includes('darwin')) return base + 'darwin-x64.tar.gz';
  return base + 'linux-x64.tar.gz';
}

export async function onCoreProgress(
  callback: (event: DownloadProgressEvent) => void
): Promise<() => void> {
  if (!isDesktopApp()) {
    throw new Error('Not running in desktop app');
  }
  const { listen } = window.__TAURI__ as any;
  if (typeof listen !== 'function') {
    throw new Error('Tauri listen not available');
  }
  return listen('download-progress', (event: { payload: DownloadProgressEvent }) => {
    callback(event.payload);
  });
}
