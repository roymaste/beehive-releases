import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { tenantsAPI, Tenant } from '../api/client';
import toast from 'react-hot-toast';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { RiAddLine, RiDeleteBinLine, RiEditLine, RiRefreshLine } from 'react-icons/ri';

const TenantsPage: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', plan_type: 'free', status: 'active' });
  const [submitting, setSubmitting] = useState(false);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tenantsAPI.list(0, 200);
      setTenants(res.data.tenants);
      setTotal(res.data.total);
    } catch {
      toast.error('获取住户列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('请填写必填字段');
      return;
    }
    setSubmitting(true);
    try {
      await tenantsAPI.create(form);
      toast.success('住户创建成功！');
      setShowCreate(false);
      setForm({ name: '', email: '', plan_type: 'free', status: 'active' });
      fetchTenants();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const { confirm, dialog } = useConfirmDialog();

  const handleDelete = async (id: string, name: string) => {
    confirm({
      title: '删除住户',
      description: `确定要删除住户「${name}」吗？此操作将级联删除所有关联数据，不可恢复。`,
      onConfirm: async () => {
        try {
          await tenantsAPI.delete(id);
          toast.success('住户已删除');
          fetchTenants();
        } catch {
          toast.error('删除失败');
        }
      },
    });
  };

  const statusBadge = (status: string) => {
    const cls = status === 'active' ? 'apple-badge-active' : 'apple-badge-suspended';
    return <span className={`apple-badge ${cls}`}>{status}</span>;
  };

  const planBadge = (plan: string) => {
    const cls = plan === 'enterprise' ? 'apple-badge-enterprise' : plan === 'pro' ? 'apple-badge-active' : 'apple-badge-free';
    return <span className={`apple-badge ${cls}`}>{plan.toUpperCase()}</span>;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold m-0" style={{ color: '#1c1917', letterSpacing: '-0.3px' }}>
            住户管理
          </h1>
          <p className="text-sm mt-1" style={{ color: '#78716c' }}>
            共 {total} 个住户
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchTenants} className="apple-btn flex items-center gap-2" disabled={loading}>
            <RiRefreshLine size={16} />
            刷新
          </button>
          <button onClick={() => setShowCreate(true)} className="apple-btn flex items-center gap-2">
            <RiAddLine size={16} />
            创建住户
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="apple-card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>住户名称</th>
              <th>邮箱</th>
              <th>套餐</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8" style={{ color: '#78716c' }}>
                  加载中...
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8" style={{ color: '#78716c' }}>
                  暂无住户数据
                </td>
              </tr>
            ) : (
              tenants.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link to={`/tenants/${t.id}`} style={{ color: '#e11d48', textDecoration: 'none' }}>
                      {t.name}
                    </Link>
                  </td>
                  <td style={{ color: '#78716c' }}>{t.email}</td>
                  <td>{planBadge(t.plan_type)}</td>
                  <td>{statusBadge(t.status)}</td>
                  <td style={{ color: '#78716c', fontSize: '13px' }}>
                    {new Date(t.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Link
                        to={`/tenants/${t.id}`}
                        className="apple-btn flex items-center gap-1"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        <RiEditLine size={12} />
                        详情
                      </Link>
                      <button
                        onClick={() => handleDelete(t.id, t.name)}
                        className="apple-btn btn-danger flex items-center gap-1"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        <RiDeleteBinLine size={12} />
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
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="apple-modal relative" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#1c1917' }}>创建住户</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>住户名称 *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="输入住户名称"
                  required
               />
              </div>
              <div className="mb-4">
                <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>联系邮箱 *</label>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="admin@example.com"
                  required
               />
              </div>
              <div className="mb-4">
                <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>套餐类型</label>
                <select className="apple-select w-full" value={form.plan_type} onChange={(e) => setForm({ ...form, plan_type: e.target.value })}>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>状态</label>
                <select className="apple-select w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowCreate(false)} className="btn">取消</button>
                <button type="submit" className="btn" disabled={submitting}>
                  {submitting ? '创建中...' : '确认创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {dialog}
    </div>
  );
};

export default TenantsPage;
