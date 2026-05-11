import React, { useState, useEffect, useCallback } from 'react';
import {apiKeysAPI} from '../../api/client';
import toast from 'react-hot-toast';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { RiKey2Line, RiAddLine, RiFileCopyLine, RiDeleteBinLine, RiCheckLine, RiCloseLine } from 'react-icons/ri';

// 可用的权限范围
const AVAILABLE_SCOPES = [
  { value: 'publish', label: '发布内容', desc: '在社交平台发布内容' },
  { value: 'check_accounts', label: '查看账号', desc: '查看已绑定的社交账号' },
  { value: 'get_stats', label: '获取统计', desc: '查看运营统计数据' },
  { value: 'manage_ips', label: '管理IP', desc: '管理代理IP资产' },
  { value: 'manage_profiles', label: '管理环境', desc: '管理浏览器环境' },
  { value: 'run_automation', label: '运行自动化', desc: '执行自动化任务' },
];

// API Key 接口类型
interface TenantAPIKeyInfo {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit: number;
  daily_quota: number;
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
}

const APIKeysPage: React.FC = () => {
  const [keys, setKeys] = useState<TenantAPIKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdKey, setCreatedKey] = useState<{ key: string; name: string; prefix: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 创建表单状态
  const [form, setForm] = useState({
    name: '',
    scopes: [] as string[],
    rate_limit: 60,
    daily_quota: 1000,
  });
  const [creating, setCreating] = useState(false);

  // 加载 API Keys
  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiKeysAPI.list();
      setKeys(res.data.keys.map((k: TenantAPIKeyInfo) => ({
        id: k.id,
        name: k.name,
        key_prefix: k.key_prefix,
        scopes: k.scopes || [],
        rate_limit: k.rate_limit || 60,
        daily_quota: k.daily_quota || 1000,
        is_active: k.is_active !== false,
        created_at: k.created_at,
        last_used_at: k.last_used_at,
      })));
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, []);

  // 复制到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('已复制到剪贴板');
    } catch {
      toast.error('复制失败');
    }
  };

  // 创建 API Key
  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('请输入 Key 名称');
      return;
    }

    setCreating(true);
    try {
      const res = await apiKeysAPI.create({name: form.name.trim(), scopes: form.scopes, rate_limit: form.rate_limit, daily_quota: form.daily_quota});

      const newKey: TenantAPIKeyInfo = {
        id: res.data.id,
        name: res.data.name,
        key_prefix: res.data.key_prefix,
        scopes: res.data.scopes || [],
        rate_limit: res.data.rate_limit || 60,
        daily_quota: res.data.daily_quota || 1000,
        is_active: res.data.is_active !== false,
        created_at: res.data.created_at,
      };

      setKeys(prev => [newKey, ...prev]);
      setCreatedKey({
        key: res.data.api_key,
        name: res.data.name,
        prefix: res.data.key_prefix,
      });
      setShowCreateModal(false);
      toast.success('API Key 已生成！');
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const { confirm, dialog } = useConfirmDialog();

  // 删除 API Key
  const handleDelete = async (keyId: string) => {
    confirm({
      title: '停用 API Key',
      description: '确定要停用该 API Key 吗？此操作不可恢复。',
      onConfirm: async () => {
        try {
          await apiKeysAPI.delete(keyId);
          setKeys(prev => prev.filter(k => k.id !== keyId));
          toast.success('Key 已停用');
        } catch (err: unknown) {
          const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
          toast.error(detail || '删除失败');
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  // 切换 scope 选择
  const toggleScope = (scope: string) => {
    setForm(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter(s => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  // 全选/取消全选 scopes
  const toggleAllScopes = () => {
    if (form.scopes.length === AVAILABLE_SCOPES.length) {
      setForm(prev => ({ ...prev, scopes: [] }));
    } else {
      setForm(prev => ({ ...prev, scopes: AVAILABLE_SCOPES.map(s => s.value) }));
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-6">
            API 密钥
          </h1>
          <p className="text-sm mt-1" style={{ color: '#78716c' }}>
            管理用于程序化访问的 API Keys
          </p>
        </div>
        <button
          onClick={() => {
            setForm({ name: 'default', scopes: [], rate_limit: 60, daily_quota: 1000 });
            setShowCreateModal(true);
          }}
          className="apple-btn flex items-center gap-2"
        >
          <RiAddLine size={16} />
          新建 Key
        </button>
      </div>

      {/* Keys List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <p style={{ color: '#78716c' }}>加载中...</p>
        </div>
      ) : keys.length === 0 ? (
        <div className="apple-card p-8 text-center">
          <RiKey2Line size={48} style={{ color: '#d2d2d7', margin: '0 auto 16px' }} />
          <p className="text-base mb-2" style={{ color: '#1c1917' }}>暂无 API Key</p>
          <p className="text-sm mb-4" style={{ color: '#78716c' }}>点击上方按钮创建第一个 API Key</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="apple-btn flex items-center gap-2 mx-auto"
          >
            <RiAddLine size={16} />
            创建 Key
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <div key={key.id} className="apple-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg" style={{ background: 'rgba(234, 179, 8, 0.1)' }}>
                    <RiKey2Line size={24} style={{ color: '#eab308' }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-semibold m-0" style={{ color: '#1c1917' }}>
                        {key.name}
                      </h3>
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          background: key.is_active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: key.is_active ? '#16a34a' : '#dc2626',
                        }}
                      >
                        {key.is_active ? '启用' : '停用'}
                      </span>
                    </div>
                    <p className="text-sm m-0 font-mono" style={{ color: '#78716c' }}>
                      {key.key_prefix}...
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {deletingId === key.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(key.id)}
                        className="apple-btn flex items-center gap-1"
                        style={{ padding: '6px 12px', background: '#dc2626', color: '#fff' }}
                      >
                        <RiCheckLine size={14} />
                        确认
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="btn"
                        style={{ padding: '6px 12px' }}
                      >
                        <RiCloseLine size={14} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeletingId(key.id)}
                      className="apple-btn flex items-center gap-1"
                      style={{ padding: '6px 12px', color: '#dc2626' }}
                    >
                      <RiDeleteBinLine size={14} />
                      删除
                    </button>
                  )}
                </div>
              </div>

              {/* Key Details */}
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid #e7e5e4' }}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: '#78716c' }}>每分钟限制</label>
                    <p className="text-sm font-medium m-0" style={{ color: '#1c1917' }}>{key.rate_limit} 次</p>
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: '#78716c' }}>每日配额</label>
                    <p className="text-sm font-medium m-0" style={{ color: '#1c1917' }}>{key.daily_quota} 次</p>
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: '#78716c' }}>创建时间</label>
                    <p className="text-sm font-medium m-0" style={{ color: '#1c1917' }}>
                      {new Date(key.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: '#78716c' }}>最后使用</label>
                    <p className="text-sm font-medium m-0" style={{ color: '#1c1917' }}>
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleString('zh-CN') : '从未使用'}
                    </p>
                  </div>
                </div>

                {/* Scopes */}
                <div className="mt-4">
                  <label className="block text-xs mb-2" style={{ color: '#78716c' }}>权限范围</label>
                  <div className="flex flex-wrap gap-2">
                    {key.scopes.length === 0 ? (
                      <span className="text-sm px-3 py-1 rounded-full" style={{ background: '#f5f5f5', color: '#78716c' }}>
                        全部权限
                      </span>
                    ) : (
                      key.scopes.map((scope) => {
                        const scopeInfo = AVAILABLE_SCOPES.find(s => s.value === scope);
                        return (
                          <span
                            key={scope}
                            className="text-sm px-3 py-1 rounded-full"
                            style={{ background: 'rgba(25, 118, 210, 0.1)', color: '#1976d2' }}
                            title={scopeInfo?.desc}
                          >
                            {scopeInfo?.label || scope}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="apple-card p-6 w-full max-w-lg mx-4" style={{ maxHeight: '90vh', overflow: 'auto' }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#1c1917' }}>创建 API Key</h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1c1917' }}>Key 名称</label>
                <input
                  className="apple-input w-full"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="如：default、production"
                />
              </div>

              {/* Scopes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium" style={{ color: '#1c1917' }}>权限范围</label>
                  <button
                    onClick={toggleAllScopes}
                    className="text-sm"
                    style={{ color: '#1976d2' }}
                  >
                    {form.scopes.length === AVAILABLE_SCOPES.length ? '取消全选' : '全选'}
                  </button>
                </div>
                <div className="space-y-2">
                  {AVAILABLE_SCOPES.map((scope) => (
                    <label
                      key={scope.value}
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer"
                      style={{
                        background: form.scopes.includes(scope.value) ? 'rgba(25, 118, 210, 0.05)' : '#fafaf9',
                        border: form.scopes.includes(scope.value) ? '1px solid #1976d2' : '1px solid #e7e5e4',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.scopes.includes(scope.value)}
                        onChange={() => toggleScope(scope.value)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium" style={{ color: '#1c1917' }}>{scope.label}</span>
                        <span className="text-xs ml-2" style={{ color: '#78716c' }}>{scope.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs mt-2" style={{ color: '#78716c' }}>
                  不选择则拥有全部权限
                </p>
              </div>

              {/* Rate Limit */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1c1917' }}>
                  每分钟请求限制：{form.rate_limit} 次
                </label>
                <input
                  type="range"
                  min="1"
                  max="600"
                  step="1"
                  value={form.rate_limit}
                  onChange={(e) => setForm({ ...form, rate_limit: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs" style={{ color: '#78716c' }}>
                  <span>1</span>
                  <span>600</span>
                </div>
              </div>

              {/* Daily Quota */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1c1917' }}>
                  每日请求配额：{form.daily_quota} 次
                </label>
                <input
                  type="range"
                  min="100"
                  max="100000"
                  step="100"
                  value={form.daily_quota}
                  onChange={(e) => setForm({ ...form, daily_quota: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs" style={{ color: '#78716c' }}>
                  <span>100</span>
                  <span>100,000</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                className="btn"
                disabled={creating}
                style={{ background: '#1976d2', color: '#fff' }}
              >
                {creating ? '创建中...' : '创建 Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Created Key Modal */}
      {createdKey && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="apple-card p-6 w-full max-w-lg mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                <RiKey2Line size={32} style={{ color: '#22c55e' }} />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: '#1c1917' }}>API Key 已生成！</h2>
              <p className="text-sm" style={{ color: '#78716c' }}>
                请立即复制并妥善保管，关闭后将无法再次查看
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-xs mb-1" style={{ color: '#1c1917' }}>Key 名称</label>
              <p className="text-sm m-0" style={{ color: '#1c1917' }}>{createdKey.name}</p>
            </div>

            <div className="mb-4">
              <label className="block text-xs mb-1" style={{ color: '#1c1917' }}>API Key（仅显示一次）</label>
              <div className="flex items-center gap-2">
                <code
                  className="flex-1 p-3 rounded text-sm break-all"
                  style={{
                    background: '#fafaf9',
                    border: '1px solid #d2d2d7',
                    color: '#0077ed',
                    fontFamily: 'monospace',
                  }}
                >
                  {createdKey.key}
                </code>
                <button
                  onClick={() => copyToClipboard(createdKey.key)}
                  className="apple-btn flex items-center gap-1"
                  style={{ padding: '8px 12px' }}
                >
                  <RiFileCopyLine size={16} />
                </button>
              </div>
            </div>

            <div className="p-3 rounded" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #d2d2d7' }}>
              <p className="text-xs m-0" style={{ color: '#dc2626' }}>
                ⚠️ 此 Key 仅在本次会话中显示。请立即复制并妥善保管，刷新或离开页面后将无法再次查看。
              </p>
            </div>

            <div className="flex justify-center mt-6">
              <button
                onClick={() => setCreatedKey(null)}
                className="btn"
                style={{ background: '#1976d2', color: '#fff' }}
              >
                我已保存
              </button>
            </div>
          </div>
        </div>
      )}
      {dialog}
    </div>
  );
};

export default APIKeysPage;
