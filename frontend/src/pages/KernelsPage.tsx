import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RiChromeLine, RiDownloadLine, RiCheckLine, RiRefreshLine } from 'react-icons/ri';
import { EmptyState } from '@/components/ui/empty-state';
import {
  checkCoreInstalled,
  getCoreVersions,
  downloadCore,
  extractCore,
  isDesktopApp,
  type CoreVersions,
  type CoreCheckResult,
  type DownloadProgressEvent,
} from '@/lib/desktop';

// ── Palette ──
const C = {
  bg: '#121212',
  surface: '#1e1e1e',
  surfaceHover: '#2a2a2a',
  card: '#1a1a1a',
  textPrimary: '#fafafa',
  textSecondary: '#9e9e9e',
  textTertiary: '#757575',
  accent: '#FFC107',
  accentHover: '#FFA000',
  accentSubtle: 'rgba(255,193,7,0.08)',
  secondary: '#1976D2',
  secondaryHover: '#1565C0',
  border: 'rgba(255,255,255,0.06)',
  green: '#4caf50',
  gray: '#9e9e9e',
};

interface KernelVersion {
  name: string;
  version: string;
  installed: boolean;
  downloading?: boolean;
  progress?: number;
}

const KernelsPage: React.FC = () => {
  const [kernels, setKernels] = useState<KernelVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const check: CoreCheckResult = await checkCoreInstalled();
      if (check.installed && check.versions) {
        setKernels([
          {
            name: 'Chromium',
            version: check.versions.chromium,
            installed: true,
          },
          {
            name: 'Playwright',
            version: check.versions.playwright,
            installed: true,
          },
        ]);
      } else {
        // Fallback: try getCoreVersions directly
        try {
          const versions: CoreVersions = await getCoreVersions();
          setKernels([
            {
              name: 'Chromium',
              version: versions.chromium,
              installed: true,
            },
            {
              name: 'Playwright',
              version: versions.playwright,
              installed: true,
            },
          ]);
        } catch {
          setKernels([]);
        }
      }
    } catch {
      toast.error('获取内核版本失败');
      setKernels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsDesktop(isDesktopApp());
    if (isDesktopApp()) {
      fetchVersions();
    } else {
      setLoading(false);
    }
  }, [fetchVersions]);

  const handleDownload = async (kernelName: string) => {
    if (!isDesktop) {
      toast.error('请在桌面端应用中下载内核');
      return;
    }

    setKernels((prev) =>
      prev.map((k) =>
        k.name === kernelName ? { ...k, downloading: true, progress: 0 } : k
      )
    );

    try {
      // Use a default download URL based on kernel name
      const url =
        kernelName === 'Chromium'
          ? 'https://playwright.azureedge.net/builds/chromium/1091/chromium-win64.zip'
          : 'https://playwright.azureedge.net/builds/playwright/1.40.0/playwright-win64.zip';

      const result = await downloadCore(url, (event: DownloadProgressEvent) => {
        setKernels((prev) =>
          prev.map((k) =>
            k.name === kernelName
              ? { ...k, progress: Math.round(event.percentage) }
              : k
          )
        );
      });

      if (result.status === 'ok') {
        // Auto extract after download
        await extractCore(result.path);
        toast.success(`${kernelName} 下载并安装成功`);
        await fetchVersions();
      } else {
        throw new Error('Download failed');
      }
    } catch (err) {
      toast.error(`${kernelName} 下载失败`);
      setKernels((prev) =>
        prev.map((k) =>
          k.name === kernelName ? { ...k, downloading: false, progress: undefined } : k
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
        <div style={{ color: C.textSecondary }}>加载中...</div>
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
          <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 4 }}>
            管理本地浏览器内核版本，下载和更新 Chromium / Playwright 内核
          </p>
        </div>
        <button
          onClick={fetchVersions}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            backgroundColor: 'transparent',
            color: C.textSecondary,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = C.surfaceHover;
            e.currentTarget.style.color = C.textPrimary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = C.textSecondary;
          }}
        >
          <RiRefreshLine size={16} />
          刷新
        </button>
      </div>

      {/* ── Kernel List ── */}
      {kernels.length === 0 ? (
        <EmptyState
          icon={<RiChromeLine size={32} className="text-muted-foreground" />}
          title="暂无内核"
          description="尚未检测到已安装的浏览器内核。点击下方按钮下载安装。"
          action={{
            label: '下载 Chromium',
            onClick: () => handleDownload('Chromium'),
          }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {kernels.map((kernel) => (
            <div
              key={kernel.name}
              style={{
                backgroundColor: C.card,
                border: `1px solid ${C.border}`,
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
                    backgroundColor: C.surface,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <RiChromeLine size={22} style={{ color: C.accent }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: C.textPrimary,
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
                          color: C.green,
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
                  </div>
                  <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 4 }}>
                    版本: {kernel.version}
                  </div>

                  {/* Progress bar */}
                  {kernel.downloading && (
                    <div style={{ marginTop: 10 }}>
                      <div
                        style={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: C.surface,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${kernel.progress ?? 0}%`,
                            backgroundColor: C.accent,
                            borderRadius: 3,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: C.textTertiary,
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
                onClick={() => handleDownload(kernel.name)}
                disabled={kernel.downloading}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: kernel.downloading ? C.surfaceHover : C.secondary,
                  color: kernel.downloading ? C.textTertiary : '#fff',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: kernel.downloading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!kernel.downloading) {
                    e.currentTarget.style.backgroundColor = C.secondaryHover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!kernel.downloading) {
                    e.currentTarget.style.backgroundColor = C.secondary;
                  }
                }}
              >
                <RiDownloadLine size={16} />
                {kernel.downloading ? '下载中' : '重新下载'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KernelsPage;
