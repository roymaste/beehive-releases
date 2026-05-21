import React, { useEffect, useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { RiChromeLine, RiDownloadLine, RiCheckLine, RiRefreshLine, RiCloudLine } from 'react-icons/ri';
import { EmptyState } from '@/components/ui/empty-state';
import {
  checkCoreInstalled,
  downloadCore,
  extractCore,
  isDesktopApp,
  type CoreCheckResult,
  type DownloadProgressEvent,
} from '@/lib/desktop';
import { browserKernelsAPI, type BrowserKernel } from '@/api/browserKernels';

// ── Types ──

interface KernelItem {
  id: string;
  name: string;
  version: string;
  installed: boolean;
  downloadUrl: string;
  downloading?: boolean;
  progress?: number;
}

const KernelsPage: React.FC = () => {
  const [kernels, setKernels] = useState<KernelItem[]>([]);
  const [loading, setLoading] = useState(() => !isDesktopApp());
  const isDesktop = useMemo(() => isDesktopApp(), []);
  const [syncing, setSyncing] = useState(false);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      // 1. 获取远程可用内核列表
      const { data: listData } = await browserKernelsAPI.list();
      const remoteKernels: BrowserKernel[] = listData.kernels || [];

      // 2. 获取本地已安装内核版本
      let installedVersion = '';
      try {
        const check: CoreCheckResult = await checkCoreInstalled();
        if (check.installed && check.versions) {
          installedVersion = check.versions.chromium;
        }
      } catch {
        // 本地未安装或检查失败，installedVersion 保持为空
      }

      // 3. 合并展示
      const merged: KernelItem[] = remoteKernels.map((rk) => ({
        id: rk.id,
        name: rk.display_name || rk.version,
        version: rk.version,
        installed: rk.version === installedVersion,
        downloadUrl: rk.download_url,
      }));

      setKernels(merged);
    } catch {
      toast.error('获取内核列表失败');
      setKernels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    // 延迟到下一帧执行数据获取，避免在 effect 中同步 setState
    const timer = setTimeout(() => {
      fetchVersions();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchVersions, isDesktop]);

  const handleSync = async () => {
    if (!isDesktop) {
      toast.error('请在桌面端应用中同步内核');
      return;
    }
    setSyncing(true);
    try {
      const { data } = await browserKernelsAPI.sync();
      if (data.success) {
        toast.success(data.message || '同步成功');
        await fetchVersions();
      } else {
        toast.error(data.message || '同步失败');
      }
    } catch {
      toast.error('同步远程内核失败');
    } finally {
      setSyncing(false);
    }
  };

  const handleDownload = async (kernel: KernelItem) => {
    if (!isDesktop) {
      toast.error('请在桌面端应用中下载内核');
      return;
    }

    setKernels((prev) =>
      prev.map((k) =>
        k.id === kernel.id ? { ...k, downloading: true, progress: 0 } : k
      )
    );

    try {
      const url = kernel.downloadUrl;
      if (!url) {
        throw new Error('未找到下载地址');
      }

      const result = await downloadCore(url, (event: DownloadProgressEvent) => {
        setKernels((prev) =>
          prev.map((k) =>
            k.id === kernel.id
              ? { ...k, progress: Math.round(event.percentage) }
              : k
          )
        );
      });

      if (result.status === 'ok') {
        // 下载成功后自动解压
        await extractCore(result.path);
        toast.success(`${kernel.name} 下载并安装成功`);

        // 向后端汇报安装状态
        try {
          await browserKernelsAPI.reportInstall(kernel.version);
        } catch {
          // 汇报失败不影响本地流程
        }

        await fetchVersions();
      } else {
        throw new Error('Download failed');
      }
    } catch {
      toast.error(`${kernel.name} 下载失败`);
      setKernels((prev) =>
        prev.map((k) =>
          k.id === kernel.id ? { ...k, downloading: false, progress: undefined } : k
        )
      );
    }
  };

  if (!isDesktop) {
    return (
      <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
        <h1 className="text-2xl font-semibold text-foreground mb-6">浏览器内核</h1>
        <EmptyState
          icon={<RiChromeLine size={32} className="text-muted-foreground" />}
          title="桌面端功能"
          description="浏览器内核管理仅在桌面端应用中可用。请下载并安装蜂巢桌面客户端以使用此功能。"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
        <h1 className="text-2xl font-semibold text-foreground mb-6">浏览器内核</h1>
        <div style={{ color: 'var(--text-secondary)' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-6">浏览器内核</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            管理本地浏览器内核版本，下载和更新 Chromium / Playwright 内核
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: `1px solid ${'var(--divider)'}`,
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 13,
              cursor: syncing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!syncing) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <RiCloudLine size={16} />
            {syncing ? '同步中' : '同步远程'}
          </button>
          <button
            onClick={fetchVersions}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: `1px solid ${'var(--divider)'}`,
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <RiRefreshLine size={16} />
            刷新
          </button>
        </div>
      </div>

      {/* ── Kernel List ── */}
      {kernels.length === 0 ? (
        <EmptyState
          icon={<RiChromeLine size={32} className="text-muted-foreground" />}
          title="暂无内核"
          description="尚未检测到可用内核。点击「同步远程」获取最新内核列表。"
          action={{
            label: '同步远程',
            onClick: handleSync,
          }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {kernels.map((kernel) => (
            <div
              key={kernel.id}
              style={{
                backgroundColor: 'var(--card-bg)',
                border: `1px solid ${'var(--divider)'}`,
                borderRadius: 12,
                padding: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: 'var(--card-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <RiChromeLine size={22} style={{ color: 'var(--hive-gold)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {kernel.name}
                    {kernel.installed && (
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--success)',
                          backgroundColor: 'rgba(76,175,80,0.12)',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <RiCheckLine size={12} />
                        已安装
                      </span>
                    )}
                    {!kernel.installed && (
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--text-tertiary)',
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontWeight: 500,
                        }}
                      >
                        未安装
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    版本: {kernel.version}
                  </div>

                  {/* Progress bar */}
                  {kernel.downloading && (
                    <div style={{ marginTop: 10 }}>
                      <div
                        style={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: 'var(--card-bg)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${kernel.progress ?? 0}%`,
                            backgroundColor: 'var(--hive-gold)',
                            borderRadius: 3,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--text-tertiary)',
                          marginTop: 4,
                        }}
                      >
                        下载中… {kernel.progress ?? 0}%
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleDownload(kernel)}
                disabled={kernel.downloading || kernel.installed}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: kernel.downloading
                    ? 'rgba(255,255,255,0.06)'
                    : kernel.installed
                    ? 'rgba(76,175,80,0.15)'
                    : 'var(--hive-blue)',
                  color: kernel.downloading
                    ? 'var(--text-tertiary)'
                    : kernel.installed
                    ? 'var(--success)'
                    : '#fff',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: kernel.downloading || kernel.installed ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!kernel.downloading && !kernel.installed) {
                    e.currentTarget.style.backgroundColor = 'var(--hive-blue-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!kernel.downloading && !kernel.installed) {
                    e.currentTarget.style.backgroundColor = 'var(--hive-blue)';
                  }
                }}
              >
                <RiDownloadLine size={16} />
                {kernel.downloading ? '下载中' : kernel.installed ? '已安装' : '下载'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KernelsPage;
