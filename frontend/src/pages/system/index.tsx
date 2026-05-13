import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  RiRefreshLine,
  RiSaveLine,
  RiSettings3Line,
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
  const [form, setForm] = useState<SystemSettings>({
    max_profiles_per_tenant: 50,
    max_proxies_per_tenant: 50,
    session_timeout_minutes: 60,
    allow_registration: false,
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ settings: SystemSettings }>('/system/settings');
      const s = res.data.settings;
      setForm(s);
    } catch {
      toast.error('获取系统设置失败');
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
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
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
    </div>
  );
};

export default SystemPage;
