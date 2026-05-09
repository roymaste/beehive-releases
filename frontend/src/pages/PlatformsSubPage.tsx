import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { platformsAPI, PlatformAccount } from '../api/client';
import toast from 'react-hot-toast';
import { RiAddLine, RiDeleteBinLine, RiEyeLine, RiEyeOffLine, RiRefreshLine } from 'react-icons/ri';

const PlatformsSubPage: React.FC = () => {
  const { id: tenantId } = useParams<{ id: string }>();
  const [platforms, setPlatforms] = useState<PlatformAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    platform: 'weibo',
    account_username: '',
    account_password: '',
    account_email: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchPlatforms = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await platformsAPI.list(tenantId, 0, 200);
      setPlatforms(res.data.platforms);
      setTotal(res.data.total);
    } catch {
      toast.error('获取平台账号失败');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.account_username.trim() || !form.account_password.trim()) {
      toast.error('请填写必填字段');
      return;
    }
    if (!tenantId) return;
    setSubmitting(true);
    try {
      await platformsAPI.create(tenantId, {
        platform: form.platform,
        account_username: form.account_username,
        account_password: form.account_password,
        account_email: form.account_email || undefined,
        notes: form.notes || undefined,
      });
      toast.success('平台账号创建成功！');
      setShowCreate(false);
      setForm({ platform: 'weibo', account_username: '', account_password: '', account_email: '', notes: '' });
      fetchPlatforms();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (platformId: string, username: string) => {
    if (!tenantId) return;
    if (!confirm(`确定要删除平台账号「${username}」吗？`)) return;
    try {
      await platformsAPI.delete(tenantId, platformId);
      toast.success('已删除');
      fetchPlatforms();
    } catch {
      toast.error('删除失败');
    }
  };

  const togglePassword = (id: string) => {
    setShowPassword((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const platformOptions = ['weibo', 'xiaohongshu', 'douyin', 'bilibili', 'zhihu', 'twitter', 'facebook', 'instagram'];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm m-0" style={{ color: '#78716c' }}>
          共 {total} 个平台账号
        </p>
        <div className="flex gap-2">
          <button onClick={fetchPlatforms} className="apple-btn flex items-center gap-1" style={{ padding: '4px 12px', fontSize: '12px' }} disabled={loading}>
            <RiRefreshLine size={14} />
            刷新
          </button>
          <button onClick={() => setShowCreate(true)} className="apple-btn flex items-center gap-1" style={{ padding: '4px 12px', fontSize: '12px' }}>
            <RiAddLine size={14} />
            添加账号
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="apple-card overflow-x-auto">
        <table className="apple-table">
          <thead>
            <tr>
              <th>平台</th>
              <th>用户名</th>
              <th>邮箱</th>
              <th>状态</th>
              <th>备注</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8" style={{ color: '#78716c' }}>加载中...</td>
              </tr>
            ) : platforms.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8" style={{ color: '#78716c' }}>暂无平台账号</td>
              </tr>
            ) : (
              platforms.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="apple-badge apple-badge-active">{p.platform}</span>
                  </td>
                  <td style={{ color: '#1c1917' }}>{p.account_username}</td>
                  <td style={{ color: '#78716c' }}>{p.account_email || '—'}</td>
                  <td>
                    <span className={`apple-badge ${p.status === 'active' ? 'apple-badge-active' : 'apple-badge-suspended'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ color: '#78716c', fontSize: '12px', maxWidth: '150px' }} className="truncate">
                    {p.notes || '—'}
                  </td>
                  <td style={{ color: '#78716c', fontSize: '13px' }}>
                    {new Date(p.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(p.id, p.account_username)}
                        className="apple-btn apple-btn-danger flex items-center gap-1"
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                      >
                        <RiDeleteBinLine size={11} />
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="apple-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="apple-modal relative" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#1c1917' }}>添加平台账号</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>平台 *</label>
                <select
                  className="apple-select w-full"
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}
                >
                  {platformOptions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>账号用户名 *</label>
                <input
                  className="apple-input"
                  value={form.account_username}
                  onChange={(e) => setForm({ ...form, account_username: e.target.value })}
                  placeholder="输入平台账号用户名"
                  required
               />
              </div>
              <div className="mb-4">
                <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>账号密码 *</label>
                <input
                  className="apple-input"
                  type="password"
                  value={form.account_password}
                  onChange={(e) => setForm({ ...form, account_password: e.target.value })}
                  placeholder="输入平台账号密码"
                  required
               />
              </div>
              <div className="mb-4">
                <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>关联邮箱</label>
                <input
                  className="apple-input"
                  type="email"
                  value={form.account_email}
                  onChange={(e) => setForm({ ...form, account_email: e.target.value })}
                  placeholder="可选"
               />
              </div>
              <div className="mb-6">
                <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>备注</label>
                <input
                  className="apple-input"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="可选备注"
               />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowCreate(false)} className="apple-btn">取消</button>
                <button type="submit" className="apple-btn" disabled={submitting}>
                  {submitting ? '创建中...' : '确认添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformsSubPage;
