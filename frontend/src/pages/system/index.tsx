import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  RiRefreshLine,
  RiSaveLine,
  RiSettings3Line,
  RiBugLine,
  RiErrorWarningLine,
} from 'react-icons/ri';
import apiClient from '../../api/client';

interface SystemSettings {
  max_profiles_per_tenant: number;
  max_proxies_per_tenant: number;
  session_timeout_minutes: number;
  allow_registration: boolean;
}

const SystemPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [diagnosticRunning, setDiagnosticRunning] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<Record<string, any> | null>(null);
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    // 检测是否在 Tauri 环境中
    setIsTauri(typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined);
  }, []);

  const [form, setForm] = useState<SystemSettings>({
    max_profiles_per_tenant: 50,
    max_proxies_per_tenant: 50,
    session_timeout_minutes: 60,
    allow_registration: false,
  });
  const [permissionDenied, setPermissionDenied] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setPermissionDenied(false);
    try {
      const res = await apiClient.get<{ settings: SystemSettings }>('/system/settings');
      const s = res.data.settings;
      setForm(s);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setPermissionDenied(true);
      } else {
        toast.error('获取系统设置失败');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/system/settings', form);
      toast.success('设置已保存');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setPermissionDenied(true);
      } else {
        toast.error('保存失败');
      }
    } finally {
      setSaving(false);
    }
  };

  const runDiagnostic = async () => {
    setDiagnosticRunning(true);
    setDiagnosticResult(null);
    try {
      const tauri = (window as any).__TAURI__;
      if (tauri) {
        const resultStr = await tauri.invoke<string>('run_diagnostic');
        const result = JSON.parse(resultStr);
        setDiagnosticResult(result);
      }
    } catch (e) {
      setDiagnosticResult({
        summary: { total: 0, passed: 0, failed: 0 },
        checks: {},
        error: String(e),
      });
    } finally {
      setDiagnosticRunning(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#78716c' }}>
        <RiSettings3Line size={32} style={{ color: '#d6d3d1', marginBottom: 12 }} />
        <p>加载系统设置...</p>
      </div>
    );
  }

  if (permissionDenied) {
    return (
      <div style={{ maxWidth: 720 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-6">系统设置</h1>
            <p className="text-sm mt-1" style={{ color: '#78716c' }}>管理平台全局配置</p>
          </div>
        </div>
        <div style={{
          padding: 32,
          borderRadius: 12,
          backgroundColor: 'rgba(255,193,7,0.08)',
          border: '1px solid rgba(255,193,7,0.2)',
          textAlign: 'center',
        }}>
          <RiErrorWarningLine size={36} style={{ color: '#FFC107', marginBottom: 12 }} />
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
            仅管理员可访问
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            系统设置仅管理员可访问，如需修改请联系管理员
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-6">
            系统设置
          </h1>
          <p className="text-sm mt-1" style={{ color: '#78716c' }}>
            管理平台全局配置
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* 语言选择器 */}
          <select
            className="apple-btn"
            value={i18n.language.startsWith('zh') ? 'zh' : 'en'}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            style={{ padding: '6px 12px', fontSize: 14, cursor: 'pointer' }}
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
          <button className="apple-btn flex items-center gap-2" onClick={fetchSettings} disabled={loading}>
            <RiRefreshLine size={16} />
            刷新
          </button>
          <button className="apple-btn flex items-center gap-2" onClick={handleSave} disabled={saving}>
            <RiSaveLine size={16} />
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>

      <div className="apple-card p-6">
        <h2 className="text-lg font-bold mb-4" style={{ color: '#1c1917' }}>平台限制</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>
              每住户最大环境数
            </label>
            <input
              className="input"
              type="number"
              value={form.max_profiles_per_tenant}
              onChange={(e) => setForm({ ...form, max_profiles_per_tenant: parseInt(e.target.value) || 0 })}
              min={1}
              max={1000}
            />
            <p className="text-xs mt-1" style={{ color: '#78716c' }}>
              单个住户可创建的最大浏览器环境数量（1-1000）
            </p>
          </div>

          <div>
            <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>
              每住户最大代理数
            </label>
            <input
              className="input"
              type="number"
              value={form.max_proxies_per_tenant}
              onChange={(e) => setForm({ ...form, max_proxies_per_tenant: parseInt(e.target.value) || 0 })}
              min={1}
              max={10000}
            />
            <p className="text-xs mt-1" style={{ color: '#78716c' }}>
              单个住户可添加的最大代理数量（1-10000）
            </p>
          </div>
        </div>

        <h2 className="text-lg font-bold mb-4 mt-8" style={{ color: '#1c1917' }}>会话设置</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>
              会话超时（分钟）
            </label>
            <input
              className="input"
              type="number"
              value={form.session_timeout_minutes}
              onChange={(e) => setForm({ ...form, session_timeout_minutes: parseInt(e.target.value) || 0 })}
              min={1}
              max={1440}
            />
            <p className="text-xs mt-1" style={{ color: '#78716c' }}>
              浏览器环境无操作自动关闭时间（1-1440分钟）
            </p>
          </div>
        </div>

        <h2 className="text-lg font-bold mb-4 mt-8" style={{ color: '#1c1917' }}>注册设置</h2>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="allow-reg"
            checked={form.allow_registration}
            onChange={(e) => setForm({ ...form, allow_registration: e.target.checked })}
            style={{ width: 18, height: 18, accentColor: '#e11d48' }}
          />
          <label htmlFor="allow-reg" style={{ fontSize: 14, color: '#1c1917', cursor: 'pointer' }}>
            允许新用户自助注册
          </label>
        </div>
        <p className="text-xs mt-1" style={{ color: '#78716c' }}>
          关闭后仅管理员可创建住户账号
        </p>
      </div>

      {/* ── 系统检测 ── */}
      <div className="apple-card p-6 mt-6">
        <h2 className="text-lg font-bold mb-4" style={{ color: '#1c1917' }}>系统检测</h2>
        <p className="text-sm mb-4" style={{ color: '#78716c' }}>
          检查 CloakBrowser、VPS 后端和前端页面的可用性
        </p>

        {!isTauri ? (
          <div className="p-4 rounded-lg" style={{ background: '#fef9ef', border: '1px solid #fde68a' }}>
            <div className="flex items-center gap-2">
              <RiErrorWarningLine size={20} style={{ color: '#d97706' }} />
              <span className="text-sm" style={{ color: '#92400e' }}>
                系统检测功能需要在桌面客户端中使用
              </span>
            </div>
            <p className="text-xs mt-2" style={{ color: '#a16207' }}>
              请下载并打开桌面客户端，进入设置页面使用此功能
            </p>
          </div>
        ) : (
          <div>
            <button
              className="apple-btn flex items-center gap-2"
              onClick={runDiagnostic}
              disabled={diagnosticRunning}
              style={{ padding: '8px 20px' }}
            >
              <RiBugLine size={16} />
              {diagnosticRunning ? '检测中...' : '开始检测'}
            </button>

            {diagnosticRunning && (
              <div className="mt-4 p-4 rounded-lg" style={{ background: '#f5f5f4' }}>
                <p className="text-sm" style={{ color: '#78716c' }}>正在检测各项服务...</p>
              </div>
            )}

            {diagnosticResult && !diagnosticRunning && (
              <div className="mt-4 space-y-3">
                {/* 汇总 */}
                <div className="flex gap-4 text-sm" style={{ color: '#44403c' }}>
                  <span>总检测: {diagnosticResult.summary?.total || 0}</span>
                  <span style={{ color: '#16a34a' }}>✅ 通过: {diagnosticResult.summary?.passed || 0}</span>
                  <span style={{ color: '#dc2626' }}>❌ 失败: {diagnosticResult.summary?.failed || 0}</span>
                </div>

                {/* 各检测项详情 */}
                {diagnosticResult.checks && Object.entries(diagnosticResult.checks).map(([key, check]: [string, any]) => {
                  const statusIcon = check.status === 'ok' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
                  const statusColor = check.status === 'ok' ? '#16a34a' : check.status === 'warn' ? '#d97706' : '#dc2626';
                  return (
                    <div key={key} className="p-4 rounded-lg border" style={{ borderColor: '#e7e5e4' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{statusIcon}</span>
                          <span className="font-medium text-sm" style={{ color: '#1c1917' }}>{check.name || key}</span>
                        </div>
                        {check.ping_ms && (
                          <span className="text-xs" style={{ color: '#78716c' }}>{check.ping_ms}ms</span>
                        )}
                      </div>
                      <p className="text-xs mt-1" style={{ color: '#78716c' }}>{check.detail || ''}</p>
                      {check.hint && (
                        <p className="text-xs mt-1" style={{ color: '#d97706' }}>💡 {check.hint}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemPage;
