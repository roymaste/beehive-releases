import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  RiAddLine,
  RiRefreshLine,
  RiEditLine,
  RiDeleteBinLine,
  RiSpeedLine,
} from 'react-icons/ri';
import { proxiesAPI, Proxy } from '../../api/proxies';
import DataTable, { Column } from '../../components/DataTable';

const ProxyListPage: React.FC = () => {
  const navigate = useNavigate();
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [latencies, setLatencies] = useState<Record<string, number | null>>({});
  const [fetchError, setFetchError] = useState(false);

  const fetchProxies = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await proxiesAPI.list({ limit: 200 });
      setProxies(res.data.proxies || []);
    } catch {
      toast.error('获取代理列表失败');
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProxies();
  }, [fetchProxies]);

  const handleCheck = async (id: string) => {
    try {
      toast.loading('正在测速...', { id: `check-${id}` });
      const res = await proxiesAPI.check(id);
      const latency = res.data.latency_ms ?? null;
      setLatencies((prev) => ({ ...prev, [id]: latency }));
      toast.success(
        latency !== null ? `延迟: ${latency}ms` : '代理不可达',
        { id: `check-${id}` },
      );
    } catch {
      toast.error('测速失败', { id: `check-${id}` });
    }
  };

  const { confirm, dialog } = useConfirmDialog();

  const handleDelete = async (id: string) => {
    confirm({
      title: '删除代理',
      description: '确定删除该代理？',
      onConfirm: async () => {
        try {
          await proxiesAPI.delete(id);
          toast.success('已删除');
          fetchProxies();
        } catch {
          toast.error('删除失败');
        }
      },
    });
  };

  const formatLatency = (id: string) => {
    const l = latencies[id];
    if (l === undefined) return <span style={{ color: '#d6d3d1' }}>—</span>;
    if (l === null) return <span className="apple-badge apple-badge-suspended" style={{ fontSize: 11 }}>超时</span>;
    if (l < 200) return <span style={{ color: '#16a34a', fontWeight: 500 }}>{l}ms</span>;
    if (l < 500) return <span style={{ color: '#ff9500', fontWeight: 500 }}>{l}ms</span>;
    return <span style={{ color: '#e11d48', fontWeight: 500 }}>{l}ms</span>;
  };

  const columns: Column<Proxy>[] = [
    { key: 'notes', title: '代理名称', width: '180px',
      render: (row) => (
        <span style={{ fontWeight: 500, color: '#fafafa' }}>
          {row.notes || `${row.server}:${row.port}`}
        </span>
      ),
    },
    { key: 'protocol', title: '类型', width: '100px',
      render: (row) => (
        <span
          className="badge"
          style={{
            backgroundColor: row.protocol === 'SOCKS5' ? 'rgba(0,113,227,0.1)' : row.protocol === 'HTTPS' ? 'rgba(52,199,89,0.1)' : 'rgba(134,134,139,0.1)',
            color: row.protocol === 'SOCKS5' ? '#e11d48' : row.protocol === 'HTTPS' ? '#16a34a' : '#78716c',
            fontSize: 11,
          }}
        >
          {row.protocol || row.type || 'HTTP'}
        </span>
      ),
    },
    { key: 'server', title: '地址:端口', width: '200px',
      render: (row) => (
        <code style={{ fontSize: 13, background: '#fafaf9', padding: '2px 8px', borderRadius: 4 }}>
          {row.server}:{row.port}
        </code>
      ),
    },
    { key: 'status', title: '状态', width: '80px',
      render: (row) => (
        <span className={`apple-badge ${row.status === 'active' ? 'apple-badge-active' : 'apple-badge-suspended'}`}>
          {row.status === 'active' ? '正常' : '异常'}
        </span>
      ),
    },
    { key: 'latency', title: '延迟', width: '90px',
      render: (row) => formatLatency(row.id),
    },
    { key: 'updated_at', title: '最后检测', width: '140px',
      render: (row) => (
        <span style={{ fontSize: 13, color: '#78716c' }}>
          {new Date(row.updated_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    { key: 'actions', title: '操作', width: '160px',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => handleCheck(row.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#e11d48' }}
            title="测速"
          >
            <RiSpeedLine size={17} />
          </button>
          <button
            onClick={() => navigate(`/proxies/${row.id}/edit`)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#78716c' }}
            title="编辑"
          >
            <RiEditLine size={16} />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#e11d48' }}
            title="删除"
          >
            <RiDeleteBinLine size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-6">
            代理管理
          </h1>
          <p style={{ fontSize: 13, color: '#78716c', margin: '4px 0 0' }}>
            共 {proxies.length} 个代理
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn"
            onClick={fetchProxies}
            style={{ background: '#fafaf9', color: '#1c1917' }}
          >
            <RiRefreshLine size={16} />
            刷新
          </button>
          <button
            className="btn"
            onClick={() => navigate('/proxies/add')}
          >
            <RiAddLine size={18} />
            添加代理
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <DataTable
          columns={columns}
          data={proxies}
          rowKey={(r) => r.id}
          loading={loading}
          error={fetchError}
          onRetry={fetchProxies}
          emptyText="暂无代理，点击「添加代理」开始"
        />
      </div>
      {dialog}
    </div>
  );
};

export default ProxyListPage;
