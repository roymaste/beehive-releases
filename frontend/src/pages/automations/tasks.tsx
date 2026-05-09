import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  RiRefreshLine,
  RiDeleteBinLine,
  RiStopLine,
  RiAddLine,
  RiEditLine,
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

  const handleCancel = async (id: string, name: string) => {
    if (!confirm(`确定取消任务「${name}」？`)) return;
    try {
      await automationsAPI.cancelTask(id);
      toast.success('任务已取消');
      fetchTasks();
    } catch {
      toast.error('取消失败');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除任务「${name}」？`)) return;
    try {
      await automationsAPI.deleteTask(id);
      toast.success('任务已删除');
      fetchTasks();
    } catch {
      toast.error('删除失败');
    }
  };

  const statusBadge = (status: string) => {
    const cls =
      status === 'completed' || status === 'success'
        ? 'apple-badge-active'
        : status === 'running' || status === 'pending'
        ? 'apple-badge-enterprise'
        : status === 'cancelled' || status === 'failed'
        ? 'apple-badge-suspended'
        : 'apple-badge-free';
    return <span className={`apple-badge ${cls}`}>{status}</span>;
  };

  const columns: Column<AutomationTask>[] = [
    { key: 'name', title: '任务名称', width: '200px',
      render: (row) => (
        <span style={{ fontWeight: 500, color: '#1c1917' }}>{row.name}</span>
      ),
    },
    { key: 'action', title: '操作类型', width: '120px',
      render: (row) => (
        <span className="apple-badge apple-badge-free">{row.action}</span>
      ),
    },
    { key: 'status', title: '状态', width: '100px',
      render: (row) => statusBadge(row.status),
    },
    { key: 'created_at', title: '创建时间', width: '160px',
      render: (row) => (
        <span style={{ fontSize: 13, color: '#78716c' }}>
          {new Date(row.created_at).toLocaleString('zh-CN')}
        </span>
      ),
    },
    { key: 'actions', title: '操作', width: '140px',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => navigate(`/automations/editor/${row.id}`)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#22c55e' }}
            title="编辑"
          >
            <RiEditLine size={16} />
          </button>
          {(row.status === 'pending' || row.status === 'running') && (
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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1c1917', margin: 0, letterSpacing: '-0.3px' }}>
            自动化任务
          </h1>
          <p style={{ fontSize: 13, color: '#78716c', margin: '4px 0 0' }}>
            共 {tasks.length} 个任务
          </p>
        </div>
        <button
          className="apple-btn"
          onClick={fetchTasks}
          style={{ background: '#fafaf9', color: '#1c1917' }}
        >
          <RiRefreshLine size={16} />
          刷新
        </button>
        <button
          className="apple-btn"
          onClick={() => navigate('/automations/editor')}
          style={{ background: '#22c55e', color: '#fff' }}
        >
          <RiAddLine size={16} />
          新建RPA脚本
        </button>
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
    </div>
  );
};

export default TaskListPage;
