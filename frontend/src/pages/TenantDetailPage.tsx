import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { tenantsAPI, Tenant } from '../api/client';
import toast from 'react-hot-toast';
import { RiArrowLeftLine, RiSaveLine } from 'react-icons/ri';

const TenantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', plan_type: '', status: '' });
  const [saving, setSaving] = useState(false);

  const fetchTenant = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await tenantsAPI.get(id);
      setTenant(res.data);
      setForm({
        name: res.data.name,
        email: res.data.email,
        plan_type: res.data.plan_type,
        status: res.data.status,
      });
    } catch {
      toast.error('获取住户详情失败');
      navigate('/tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenant();
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await tenantsAPI.update(id, form);
      setTenant(res.data);
      setEditing(false);
      toast.success('住户信息已更新');
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || '更新失败');
    } finally {
      setSaving(false);
    }
  };

  // Check which tab is active
  const isBase = location.pathname === `/tenants/${id}`;
  const isPlatforms = location.pathname.includes('/platforms');
  const isIPs = location.pathname.includes('/ips');
  const isAPIKeys = location.pathname.includes('/api-keys');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: '#78716c' }}>加载中...</p>
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <div>
      {/* Back + Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/tenants')} className="apple-btn flex items-center gap-1" style={{ padding: '6px 12px' }}>
          <RiArrowLeftLine size={14} />
        </button>
        <div>
          <h1 className="text-2xl font-bold m-0" style={{ color: '#1c1917', letterSpacing: '-0.3px' }}>
            {tenant.name}
          </h1>
          <p className="text-sm mt-1" style={{ color: '#78716c' }}>
            ID: {tenant.id} · 创建于 {new Date(tenant.created_at).toLocaleDateString('zh-CN')}
          </p>
        </div>
      </div>

      {/* Edit form (inline) */}
      <div className="apple-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold m-0" style={{ color: '#1c1917' }}>基本信息</h2>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="apple-btn" style={{ padding: '4px 14px', fontSize: '12px' }}>
              编辑
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setEditing(false); setForm({ name: tenant.name, email: tenant.email, plan_type: tenant.plan_type, status: tenant.status }); }} className="apple-btn" style={{ padding: '4px 14px', fontSize: '12px' }}>
                取消
              </button>
              <button onClick={handleSave} className="apple-btn flex items-center gap-1" style={{ padding: '4px 14px', fontSize: '12px' }} disabled={saving}>
                <RiSaveLine size={12} />
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs mb-1" style={{ color: '#1c1917' }}>名称</label>
            {editing ? (
              <input className="apple-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            ) : (
              <p className="text-sm" style={{ color: '#1c1917' }}>{tenant.name}</p>
            )}
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: '#1c1917' }}>邮箱</label>
            {editing ? (
              <input className="apple-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            ) : (
              <p className="text-sm" style={{ color: '#1c1917' }}>{tenant.email}</p>
            )}
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: '#1c1917' }}>套餐</label>
            {editing ? (
              <select className="apple-select w-full" value={form.plan_type} onChange={(e) => setForm({ ...form, plan_type: e.target.value })}>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            ) : (
              <span className={`apple-badge ${tenant.plan_type === 'enterprise' ? 'apple-badge-enterprise' : tenant.plan_type === 'pro' ? 'apple-badge-active' : 'apple-badge-free'}`}>
                {tenant.plan_type.toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: '#1c1917' }}>状态</label>
            {editing ? (
              <select className="apple-select w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            ) : (
              <span className={`apple-badge ${tenant.status === 'active' ? 'apple-badge-active' : 'apple-badge-suspended'}`}>
                {tenant.status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="apple-card">
        <div className="flex border-b" style={{ borderColor: '#e7e5e4' }}>
          {[
            { label: '平台账号', path: `/tenants/${id}/platforms`, active: isPlatforms },
            { label: 'IP 资产', path: `/tenants/${id}/ips`, active: isIPs },
            { label: 'API Keys', path: `/tenants/${id}/api-keys`, active: isAPIKeys },
          ].map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className={tab.active ? 'apple-tab apple-tab-active' : 'apple-tab'}
              style={{ textDecoration: 'none' }}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <div className="p-4">
          {isBase && (
            <div className="text-center py-8" style={{ color: '#78716c' }}>
              请点击上方标签管理子资源
            </div>
          )}
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default TenantDetailPage;
