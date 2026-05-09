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
