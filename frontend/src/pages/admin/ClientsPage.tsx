import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
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

  const { confirm, dialog } = useConfirmDialog();

  const handleToggleStatus = async (client: AdminClient) => {
    const action = client.is_active ? '禁用' : '启用';
    confirm({
      title: `${action}客户`,
      description: `确定${action}客户「${client.name}」？`,
      onConfirm: async () => {
        try {
          await adminAPI.updateClient(client.id, { is_active: !client.is_active });
          toast.success(`已${action}`);
          fetchClients();
        } catch {
          toast.error(`${action}失败`);
        }
      },
    });
  };

  const handleDelete = async (client: AdminClient) => {
    confirm({
      title: '删除客户',
      description: `确定删除客户「${client.name}」？此操作不可恢复。`,
      onConfirm: async () => {
        try {
          await adminAPI.deleteClient(client.id);
          toast.success('已删除');
          fetchClients();
        } catch {
          toast.error('删除失败');
        }
      },
    });
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
      return <span className="badge" style={{ background: 'rgba(255, 149, 0, 0.12)', color: '#ff9500' }}>待激活</span>;
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
            className="text-primary cursor-pointer font-medium"
            onClick={() => navigate(`/admin/clients/${row.id}`)}
          >
            {row.name}
          </div>
          <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>
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
        <span className="text-sm text-muted-foreground">{row.email}</span>
      ),
    },
    {
      key: 'company',
      title: '公司',
      sortable: true,
      width: '140px',
      render: (row) => (
        <span className="text-sm text-muted-foreground">{row.company || '—'}</span>
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
        <span className="text-sm font-medium text-foreground">{row.environment_count}</span>
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
        <span className="text-sm text-muted-foreground">
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
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'hsl(var(--primary))' }}
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
              color: row.is_active ? 'hsl(var(--warning))' : 'hsl(var(--success))',
            }}
            title={row.is_active ? '禁用' : '启用'}
          >
            {row.is_active ? <RiStopLine size={16} /> : <RiPlayLine size={16} />}
          </button>
          <button
            onClick={() => handleDelete(row)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'hsl(var(--muted-foreground))' }}
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
          <h1 className="text-2xl font-semibold text-foreground mb-6">
            客户管理
          </h1>
          <p className="text-sm text-muted-foreground" style={{ margin: '4px 0 0' }}>
            共 {clients.length} 个客户
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn"
            onClick={fetchClients}
            style={{ padding: '10px 16px', background: 'hsl(var(--secondary))', color: 'hsl(var(--secondary-foreground))' }}
          >
            <RiRefreshLine size={18} />
            刷新
          </button>
          <button
            className="btn"
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
            className="btn"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            style={{ padding: '6px 16px', fontSize: 13, background: page === 0 ? 'hsl(var(--muted))' : 'hsl(var(--primary))', color: page === 0 ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary-foreground))' }}
          >
            上一页
          </button>
          <span className="text-sm text-muted-foreground">
            第 {page + 1} / {totalPages} 页（共 {clients.length} 条）
          </span>
          <button
            className="btn"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            style={{ padding: '6px 16px', fontSize: 13, background: page >= totalPages - 1 ? 'hsl(var(--muted))' : 'hsl(var(--primary))', color: page >= totalPages - 1 ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary-foreground))' }}
          >
            下一页
          </button>
        </div>
      )}
      {dialog}
    </div>
  );
};

export default ClientsPage;
