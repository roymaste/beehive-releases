import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiArrowLeftLine,
  RiEditLine,
  RiDeleteBinLine,
  RiStopLine,
  RiPlayLine,
  RiGroupLine,
  RiWindowLine,
  RiGlobalLine,
  RiVipCrownLine,
  RiRefreshLine,
} from 'react-icons/ri';
import { adminAPI, AdminClient } from '../../api/admin';
import { useConfirmDialog } from '../../components/ui/confirm-dialog';

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #27272a' }}>
    <span style={{ fontSize: 13, color: '#a1a1aa' }}>{label}</span>
    <span style={{ fontSize: 14, color: '#fafafa', fontWeight: 500 }}>{value}</span>
  </div>
);

const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<AdminClient | null>(null);
  const [loading, setLoading] = useState(true);
  const { confirm, dialog } = useConfirmDialog();

  const fetchClient = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await adminAPI.getClient(id);
      setClient(res.data);
    } catch {
      toast.error('获取客户信息失败');
      navigate('/admin/clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClient();
  }, [id]);

  const handleToggleStatus = async () => {
    if (!client) return;
    const action = client.is_active ? '禁用' : '启用';
    confirm({
      title: `${action}确认`,
      description: `确定${action}客户「${client.name}」？`,
      onConfirm: async () => {
        try {
          const res = await adminAPI.updateClient(client.id, { is_active: !client.is_active });
          setClient(res.data);
          toast.success(`已${action}`);
        } catch {
          toast.error(`${action}失败`);
        }
      },
    });
  };

  const handleDelete = async () => {
    if (!client) return;
    confirm({
      title: '删除确认',
      description: `确定删除客户「${client.name}」？此操作不可恢复。`,
      onConfirm: async () => {
        try {
          await adminAPI.deleteClient(client.id);
          toast.success('已删除');
          navigate('/admin/clients');
        } catch {
          toast.error('删除失败');
        }
      },
    });
  };

  const planLabel = (plan: string) => {
    const map: Record<string, string> = {
      free: '免费版',
      pro: '专业版',
      enterprise: '企业版',
    };
    return map[plan] || plan;
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      active: '活跃',
      suspended: '已停用',
      pending: '待激活',
    };
    return map[status] || status;
  };

  if (loading) {
    return (
      <div style={{ padding: '24px 32px' }}>
        <div className="card" style={{ padding: '60px 0', textAlign: 'center', color: '#78716c' }}>
          加载中...
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ padding: '24px 32px' }}>
        <div className="card" style={{ padding: '60px 0', textAlign: 'center', color: '#78716c' }}>
          客户不存在
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', height: '100%' }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/admin/clients')}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '6px 0',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: '#e11d48',
          fontWeight: 500,
        }}
      >
        <RiArrowLeftLine size={16} />
        返回客户列表
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-6">
            {client.name}
          </h1>
          <p style={{ fontSize: 13, color: '#78716c', margin: '4px 0 0' }}>
            ID: {client.id}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn"
            onClick={fetchClient}
            style={{ padding: '10px 16px', background: '#e7e5e4', color: '#1c1917' }}
          >
            <RiRefreshLine size={16} />
            刷新
          </button>
          <button
            className="btn"
            onClick={() => navigate(`/admin/clients/${client.id}/edit`)}
            style={{ padding: '10px 22px' }}
          >
            <RiEditLine size={16} />
            编辑
          </button>
          <button
            className="btn"
            onClick={handleToggleStatus}
            style={{
              padding: '10px 22px',
              background: client.is_active ? '#ff9500' : '#16a34a',
            }}
          >
            {client.is_active ? <RiStopLine size={16} /> : <RiPlayLine size={16} />}
            {client.is_active ? '禁用' : '启用'}
          </button>
          <button
            className="apple-btn btn-danger"
            onClick={handleDelete}
            style={{ padding: '10px 22px' }}
          >
            <RiDeleteBinLine size={16} />
            删除
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
        {/* Basic Info Card */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1c1917', margin: '0 0 16px' }}>
            基本信息
          </h3>
          <InfoRow label="客户名" value={client.name} />
          <InfoRow label="邮箱" value={client.email} />
          <InfoRow label="公司" value={client.company || '—'} />
          <InfoRow
            label="状态"
            value={
              <span
                className={`apple-badge ${
                  client.status === 'active'
                    ? 'apple-badge-active'
                    : client.status === 'suspended'
                    ? 'apple-badge-suspended'
                    : 'apple-badge-free'
                }`}
              >
                {statusLabel(client.status)}
              </span>
            }
          />
          <InfoRow
            label="套餐"
            value={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <RiVipCrownLine size={14} style={{ color: '#e11d48' }} />
                {planLabel(client.plan_type)}
              </span>
            }
          />
          <InfoRow
            label="创建时间"
            value={new Date(client.created_at).toLocaleString('zh-CN')}
          />
        </div>

        {/* Quota & Usage Card */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1c1917', margin: '0 0 16px' }}>
            配额与用量
          </h3>
          <InfoRow
            label="环境配额"
            value={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <RiWindowLine size={14} style={{ color: '#e11d48' }} />
                {client.quota_environments}
              </span>
            }
          />
          <InfoRow
            label="成员配额"
            value={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <RiGroupLine size={14} style={{ color: '#16a34a' }} />
                {client.quota_members}
              </span>
            }
          />
          <InfoRow
            label="当前环境数"
            value={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <RiGlobalLine size={14} style={{ color: '#ff9500' }} />
                {client.environment_count}
              </span>
            }
          />
        </div>
      </div>
      {dialog}
    </div>
  );
};

export default ClientDetailPage;
