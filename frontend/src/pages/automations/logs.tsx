import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RiRefreshLine, RiFilterLine } from 'react-icons/ri';
import { automationsAPI, AutomationLog } from '../../api/automations';

const LOG_LEVELS = ['all', 'info', 'warn', 'error'];

const LogListPage: React.FC = () => {
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('all');
  const [fetchError, setFetchError] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const params: { limit?: number; level?: string } = { limit: 200 };
      if (levelFilter !== 'all') params.level = levelFilter;
      const res = await automationsAPI.listLogs(params);
      setLogs(res.data.logs || []);
    } catch {
      toast.error('获取日志失败');
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [levelFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const levelBadge = (level: string) => {
    const color =
      level === 'error' ? '#e11d48'
        : level === 'warn' ? '#ff9500'
        : level === 'info' ? '#0071e3'
        : '#78716c';
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 600,
          color,
          background: `${color}15`,
          textTransform: 'uppercase',
        }}
      >
        {level}
      </span>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1c1917', margin: 0, letterSpacing: '-0.3px' }}>
            执行日志
          </h1>
          <p style={{ fontSize: 13, color: '#78716c', margin: '4px 0 0' }}>
            共 {logs.length} 条日志
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <RiFilterLine size={16} style={{ color: '#78716c' }} />
          <select
            className="apple-select"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            style={{ width: 100, fontSize: 12, padding: '4px 8px' }}
          >
            {LOG_LEVELS.map((l) => (
              <option key={l} value={l}>{l === 'all' ? '全部' : l}</option>
            ))}
          </select>
          <button className="apple-btn" onClick={fetchLogs} style={{ padding: '6px 14px', fontSize: 12 }}>
            <RiRefreshLine size={14} />
            刷新
          </button>
        </div>
      </div>

      <div className="apple-card" style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#78716c' }}>加载中...</div>
        ) : fetchError ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#e11d48' }}>
            <p style={{ margin: '0 0 16px', fontSize: 14 }}>加载失败，请稍后重试</p>
            <button
              onClick={fetchLogs}
              style={{
                padding: '8px 20px',
                background: '#e11d48',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              重试
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#78716c' }}>
            <p style={{ margin: 0, fontSize: 14 }}>暂无日志记录</p>
            <p style={{ margin: '4px 0 0', fontSize: 12 }}>执行任务后日志将在此处显示</p>
          </div>
        ) : (
          <table className="apple-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>级别</th>
                <th style={{ width: 180 }}>时间</th>
                <th>消息</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{levelBadge(log.level)}</td>
                  <td style={{ fontSize: 13, color: '#78716c' }}>
                    {new Date(log.timestamp).toLocaleString('zh-CN')}
                  </td>
                  <td style={{ fontSize: 13, color: '#1c1917' }}>{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LogListPage;
