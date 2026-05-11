import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  RiRefreshLine,
  RiDeleteBinLine,
  RiStopLine,
  RiAddLine,
  RiEditLine,
  RiHistoryLine,
} from 'react-icons/ri';
import { automationsAPI, AutomationTask } from '../../api/automations';
import DataTable, { Column } from '../../components/DataTable';

const TaskListPage: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<AutomationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await automationsAPI.listTasks({ limit: 100 });
      setTasks(res.data.tasks || []);
    } catch {
      toast.error('获取任务列表失败');
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const { confirm, dialog } = useConfirmDialog();

  const handleCancel = async (id: string, name: string) => {
    confirm({
      title: '取消任务',
      description: `确定取消任务「${name}」？`,
      onConfirm: async () => {
        try {
          await automationsAPI.cancelTask(id);
          toast.success('任务已取消');
          fetchTasks();
        } catch {
          toast.error('取消失败');
        }
      },
    });
  };

  const handleDelete = async (id: string, name: string) => {
    confirm({
      title: '删除任务',
      description: `确定删除任务「${name}」？`,
      onConfirm: async () => {
        try {
          await automationsAPI.deleteTask(id);
          toast.success('任务已删除');
          fetchTasks();
        } catch {
          toast.error('删除失败');
        }
      },
    });
  };

  const statusBadge = (status: string) => {
    const cls =
      status === 'completed' || status === 'success'
        ? 'apple-badge-active'
        : status === 'running' || status === 'pending'
        ? 'apple-badge-enterprise'
        : status === 'cancelled' || status === 'failed'
        ? 'apple-badge-suspended'
        : status === 'scheduled'
        ? 'apple-badge-free'
        : 'apple-badge-free';
    return <span className={`apple-badge ${cls}`}>{status}</span>;
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  const columns: Column<AutomationTask>[] = [
    {
      key: 'name',
      title: '任务名称',
      width: '180px',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 500, color: '#1c1917' }}>{row.name}</span>
          {row.schedule && (
            <div style={{ fontSize: 10, color: '#a1a1aa', marginTop: 2 }}>
              <span style={{ fontFamily: 'monospace' }}>{row.schedule}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      title: '操作类型',
      width: '100px',
      render: (row) => (
        <span className="apple-badge apple-badge-free">{row.action}</span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      width: '100px',
      render: (row) => statusBadge(row.status),
    },
    {
      key: 'next_run_at',
      title: '下次执行',
      width: '130px',
      render: (row) => (
        <span style={{ fontSize: 12, color: '#78716c' }}>
          {row.status === 'scheduled' ? formatDateTime(row.next_run_at) : '—'}
        </span>
      ),
    },
    {
      key: 'last_run_at',
      title: '上次执行',
      width: '130px',
      render: (row) => (
        <span style={{ fontSize: 12, color: '#78716c' }}>
          {formatDateTime(row.last_run_at)}
        </span>
      ),
    },
    {
      key: 'run_count',
      title: '累计',
      width: '60px',
      render: (row) => (
        <span style={{ fontSize: 12, color: '#78716c' }}>
          {row.run_count ?? 0}
        </span>
      ),
    },
    {
      key: 'created_at',
      title: '创建时间',
      width: '130px',
      render: (row) => (
        <span style={{ fontSize: 12, color: '#78716c' }}>
          {formatDateTime(row.created_at)}
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
            onClick={() => navigate(`/automations/editor/${row.id}`)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#22c55e' }}
            title="编辑"
          >
            <RiEditLine size={16} />
          </button>
          <button
            onClick={() => navigate(`/automations/logs?task_id=${row.id}`)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#71717a' }}
            title="执行历史"
          >
            <RiHistoryLine size={16} />
          </button>
          {(row.status === 'pending' || row.status === 'running' || row.status === 'scheduled') && (
            <button
              onClick={() => handleCancel(row.id, row.name)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#ff9500' }}
              title="取消"
            >
              <RiStopLine size={16} />
            </button>
          )}
          <button
            onClick={() => handleDelete(row.id, row.name)}
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
            自动化任务
          </h1>
          <p style={{ fontSize: 13, color: '#78716c', margin: '4px 0 0' }}>
            共 {tasks.length} 个任务
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn"
            onClick={fetchTasks}
            style={{ background: '#fafaf9', color: '#1c1917' }}
          >
            <RiRefreshLine size={16} />
            刷新
          </button>
          <button
            className="btn"
            onClick={() => navigate('/automations/editor')}
            style={{ background: '#22c55e', color: '#fff' }}
          >
            <RiAddLine size={16} />
            新建RPA脚本
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <DataTable
          columns={columns}
          data={tasks}
          rowKey={(r) => r.id}
          loading={loading}
          error={fetchError}
          onRetry={fetchTasks}
          emptyText="暂无自动化任务，可通过 agent API 提交任务"
        />
      </div>
      {dialog}
    </div>
  );
};

export default TaskListPage;
