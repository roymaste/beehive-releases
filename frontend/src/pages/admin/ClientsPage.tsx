import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiAddLine,
  RiRefreshLine,
  RiEditLine,
  RiDeleteBinLine,
  RiStopLine,
  RiPlayLine,
} from 'react-icons/ri';
import { adminAPI, AdminClient } from '../../api/admin';
import DataTable, { Column } from '../../components/DataTable';

const PAGE_SIZE = 20;

const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.listClients();
      let data = res.data.clients;

      // Client-side sort
      if (sortKey && data.length > 0) {
        data = [...data].sort((a, b) => {
          const aVal = (a as unknown as Record<string, unknown>)[sortKey];
          const bVal = (b as unknown as Record<string, unknown>)[sortKey];
          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          if (typeof aVal === 'string' && typeof bVal === 'string') {
            return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
          }
          const aNum = Number(aVal);
          const bNum = Number(bVal);
          return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
        });
      }

      setClients(data);
    } catch {
      toast.error('获取客户列表失败');
    } finally {
      setLoading(false);
    }
  }, [sortKey, sortDir]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleToggleStatus = async (client: AdminClient) => {
    const action = client.is_active ? '禁用' : '启用';
    if (!confirm(`确定${action}客户「${client.name}」？`)) return;
    try {
      await adminAPI.updateClient(client.id, { is_active: !client.is_active });
      toast.success(`已${action}`);
      fetchClients();
    } catch {
      toast.error(`${action}失败`);
    }
  };

  const handleDelete = async (client: AdminClient) => {
    if (!confirm(`确定删除客户「${client.name}」？此操作不可恢复。`)) return;
    try {
      await adminAPI.deleteClient(client.id);
      toast.success('已删除');
      fetchClients();
    } catch {
      toast.error('删除失败');
    }
  };

  const paginatedClients = clients.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(clients.length / PAGE_SIZE);

  const statusBadge = (client: AdminClient) => {
    if (client.status === 'active') {
      return <span className="apple-badge apple-badge-active">活跃</span>;
    }
    if (client.status === 'suspended') {
      return <span className="apple-badge apple-badge-suspended">已停用</span>;
    }
    if (client.status === 'pending') {
      return <span className="apple-badge" style={{ background: 'rgba(255, 149, 0, 0.12)', color: '#ff9500' }}>待激活</span>;
    }
    return <span className="apple-badge apple-badge-free">{client.status}</span>;
  };

  const planBadge = (plan: string) => {
    const map: Record<string, { className: string; label: string }> = {
      free: { className: 'apple-badge-free', label: '免费版' },
      pro: { className: 'apple-badge-enterprise', label: '专业版' },
      enterprise: { className: 'apple-badge-enterprise', label: '企业版' },
    };
    const info = map[plan] || { className: 'apple-badge-free', label: plan };
    return <span className={`apple-badge ${info.className}`}>{info.label}</span>;
  };

  const columns: Column<AdminClient>[] = [
    {
      key: 'name',
      title: '客户名',
      sortable: true,
      width: '160px',
      render: (row) => (
        <div>
          <div
            style={{ color: '#e11d48', fontWeight: 500, cursor: 'pointer' }}
            onClick={() => navigate(`/admin/clients/${row.id}`)}
          >
            {row.name}
          </div>
          <div style={{ fontSize: 12, color: '#78716c', marginTop: 2 }}>
            ID: {row.id.slice(0, 8)}...
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      title: '邮箱',
      sortable: true,
      width: '180px',
      render: (row) => (
        <span style={{ fontSize: 13, color: '#78716c' }}>{row.email}</span>
      ),
    },
    {
      key: 'company',
      title: '公司',
      sortable: true,
      width: '140px',
      render: (row) => (
        <span style={{ fontSize: 13, color: '#78716c' }}>{row.company || '—'}</span>
      ),
    },
    {
      key: 'plan_type',
      title: '套餐',
      width: '100px',
      render: (row) => planBadge(row.plan_type),
    },
    {
      key: 'environment_count',
      title: '环境数',
      sortable: true,
      width: '80px',
      render: (row) => (
        <span style={{ fontSize: 14, fontWeight: 500, color: '#fafafa' }}>{row.environment_count}</span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      width: '90px',
      render: (row) => statusBadge(row),
    },
    {
      key: 'created_at',
      title: '创建时间',
      sortable: true,
      width: '120px',
      render: (row) => (
        <span style={{ fontSize: 13, color: '#78716c' }}>
          {new Date(row.created_at).toLocaleDateString('zh-CN')}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      width: '160px',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => navigate(`/admin/clients/${row.id}`)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#e11d48' }}
            title="编辑"
          >
            <RiEditLine size={16} />
          </button>
          <button
            onClick={() => handleToggleStatus(row)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: row.is_active ? '#ff9500' : '#16a34a',
            }}
            title={row.is_active ? '禁用' : '启用'}
          >
            {row.is_active ? <RiStopLine size={16} /> : <RiPlayLine size={16} />}
          </button>
          <button
            onClick={() => handleDelete(row)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#a1a1aa' }}
            title="删除"
          >
            <RiDeleteBinLine size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px 32px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fafafa', margin: 0, letterSpacing: '-0.3px' }}>
            客户管理
          </h1>
          <p style={{ fontSize: 13, color: '#a1a1aa', margin: '4px 0 0' }}>
            共 {clients.length} 个客户
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="apple-btn"
            onClick={fetchClients}
            style={{ padding: '10px 16px', background: '#3f3f46', color: '#fafafa' }}
          >
            <RiRefreshLine size={18} />
            刷新
          </button>
          <button
            className="apple-btn"
            onClick={() => navigate('/admin/clients/create')}
            style={{ padding: '10px 22px' }}
          >
            <RiAddLine size={18} />
            新建客户
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataTable
          columns={columns}
          data={paginatedClients}
          rowKey={(r) => r.id}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          loading={loading}
          emptyText="暂无客户数据"
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 0' }}>
          <button
            className="apple-btn"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            style={{ padding: '6px 16px', fontSize: 13, background: page === 0 ? '#27272a' : '#e11d48', color: page === 0 ? '#52525b' : '#fff' }}
          >
            上一页
          </button>
          <span style={{ fontSize: 13, color: '#a1a1aa' }}>
            第 {page + 1} / {totalPages} 页（共 {clients.length} 条）
          </span>
          <button
            className="apple-btn"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            style={{ padding: '6px 16px', fontSize: 13, background: page >= totalPages - 1 ? '#27272a' : '#e11d48', color: page >= totalPages - 1 ? '#52525b' : '#fff' }}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;
