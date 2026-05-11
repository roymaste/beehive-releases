import React, { useEffect, useState } from 'react';
import { RiFilterOffLine } from 'react-icons/ri';
import toast from 'react-hot-toast';

// Beehive Design System Colors
const C = {
  bg: '#121212',
  surface: '#1e1e1e',
  surfaceHover: '#2a2a2a',
  textPrimary: '#fafafa',
  textSecondary: '#9e9e9e',
  textTertiary: '#757575',
  accent: '#FFC107',
  accentHover: '#FFA000',
  secondary: '#1976D2',
  success: '#4CAF50',
  error: '#F44336',
  border: 'rgba(255,255,255,0.06)',
};

const RADIUS_CARD = 12;
const RADIUS_SM = 8;

const ACTION_MAP: Record<string, string> = {
  login: '登录',
  register: '注册',
  create: '创建',
  update: '更新',
  delete: '删除',
};

const ACTION_OPTIONS = [
  { value: '', label: '全部操作' },
  { value: 'login', label: '登录' },
  { value: 'register', label: '注册' },
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
];

const TARGET_TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'user', label: '用户' },
  { value: 'tenant', label: '租户' },
  { value: 'plan', label: '套餐' },
  { value: 'proxy', label: '代理' },
  { value: 'account', label: '账号' },
  { value: 'profile', label: '环境' },
];

interface LogEntry {
  id: number;
  created_at: string;
  user_id: number;
  username?: string;
  action: string;
  target_type: string;
  target_id: string;
  ip: string;
  detail: string;
}

// Format timestamp to friendly string
const formatTime = (isoString: string): string => {
  const now = Date.now();
  const date = new Date(isoString).getTime();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;

  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const AdminLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Filters
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [userId, setUserId] = useState('');

  const limit = 20;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const skip = (page - 1) * limit;
      const params = new URLSearchParams({
        skip: String(skip),
        limit: String(limit),
        ...(action && { action }),
        ...(targetType && { target_type: targetType }),
        ...(userId && { user_id: userId }),
      });

      const res = await fetch(`/api/v1/admin/operation-logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (data.code === 0) {
        setLogs(data.data.logs || []);
        setTotal(data.data.total || 0);
      } else {
        toast.error(data.message || '获取日志失败');
      }
    } catch (err) {
      toast.error('获取日志失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, action, targetType]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const handleClear = () => {
    setAction('');
    setTargetType('');
    setUserId('');
    setPage(1);
    setTimeout(fetchLogs, 0);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-2xl font-semibold text-foreground mb-6">
          操作日志
        </h1>
        <p style={{ fontSize: 14, color: C.textSecondary, margin: 0 }}>
          查看所有管理员操作记录
        </p>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: RADIUS_CARD,
          padding: '16px 20px',
          marginBottom: 16,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-end',
          flexWrap: 'wrap',
        }}
      >
        {/* Action type */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, color: C.textTertiary }}>操作类型</label>
          <select
            value={action}
            onChange={e => { setAction(e.target.value); setPage(1); }}
            style={{
              padding: '8px 12px',
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: RADIUS_SM,
              color: C.textPrimary,
              fontSize: 13,
              cursor: 'pointer',
              minWidth: 130,
            }}
          >
            {ACTION_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Target type */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, color: C.textTertiary }}>目标类型</label>
          <select
            value={targetType}
            onChange={e => { setTargetType(e.target.value); setPage(1); }}
            style={{
              padding: '8px 12px',
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: RADIUS_SM,
              color: C.textPrimary,
              fontSize: 13,
              cursor: 'pointer',
              minWidth: 130,
            }}
          >
            {TARGET_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* User ID */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, color: C.textTertiary }}>用户ID</label>
          <input
            type="text"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="输入用户ID"
            style={{
              padding: '8px 12px',
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: RADIUS_SM,
              color: C.textPrimary,
              fontSize: 13,
              minWidth: 150,
            }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSearch}
            style={{
              padding: '8px 16px',
              background: C.accent,
              color: C.bg,
              border: 'none',
              borderRadius: RADIUS_SM,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            搜索
          </button>
          <button
            onClick={handleClear}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '8px 12px',
              background: 'transparent',
              color: C.textSecondary,
              border: `1px solid ${C.border}`,
              borderRadius: RADIUS_SM,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <RiFilterOffLine size={14} />
            清除
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: RADIUS_CARD,
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['时间', '用户', '操作', '目标类型', '目标ID', 'IP', '详情'].map((col, i) => (
                  <th
                    key={col}
                    style={{
                      padding: '12px 16px',
                      textAlign: i >= 5 ? 'center' : 'left',
                      fontSize: 12,
                      fontWeight: 600,
                      color: C.textTertiary,
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0', color: C.textSecondary }}>
                    加载中...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0', color: C.textSecondary }}>
                    暂无日志数据
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <React.Fragment key={log.id}>
                    <tr
                      style={{
                        borderBottom: idx < logs.length - 1 ? `1px solid ${C.border}` : 'none',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = C.surfaceHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSecondary, whiteSpace: 'nowrap' }}>
                        {formatTime(log.created_at)}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: C.textPrimary }}>
                        {log.username || log.user_id || '-'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 500,
                            background:
                              log.action === 'login' || log.action === 'register'
                                ? 'rgba(25,118,210,0.12)'
                                : log.action === 'delete'
                                ? 'rgba(244,67,54,0.12)'
                                : 'rgba(76,175,80,0.12)',
                            color:
                              log.action === 'login' || log.action === 'register'
                                ? C.secondary
                                : log.action === 'delete'
                                ? C.error
                                : C.success,
                          }}
                        >
                          {ACTION_MAP[log.action] || log.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSecondary }}>
                        {log.target_type || '-'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSecondary, textAlign: 'center' }}>
                        {log.target_id || '-'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSecondary, textAlign: 'center', fontFamily: 'monospace' }}>
                        {log.ip || '-'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, textAlign: 'center' }}>
                        <button
                          onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: C.accent,
                            cursor: 'pointer',
                            fontSize: 12,
                            padding: '2px 6px',
                          }}
                        >
                          {expandedId === log.id ? '收起' : '查看'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                        <td colSpan={7} style={{ padding: '12px 16px', fontSize: 13, color: C.textSecondary }}>
                          <div style={{ marginBottom: 4, color: C.textTertiary, fontSize: 11 }}>详情</div>
                          <pre
                            style={{
                              margin: 0,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                              color: C.textPrimary,
                              fontFamily: 'monospace',
                              fontSize: 12,
                              background: C.bg,
                              padding: '8px 12px',
                              borderRadius: RADIUS_SM,
                            }}
                          >
                            {log.detail || '(无详情)'}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderTop: `1px solid ${C.border}`,
            }}
          >
            <span style={{ fontSize: 13, color: C.textSecondary }}>
              共 {total} 条记录，第 {page}/{totalPages} 页
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  color: page <= 1 ? C.textTertiary : C.textPrimary,
                  border: `1px solid ${C.border}`,
                  borderRadius: RADIUS_SM,
                  fontSize: 13,
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                上一页
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  color: page >= totalPages ? C.textTertiary : C.textPrimary,
                  border: `1px solid ${C.border}`,
                  borderRadius: RADIUS_SM,
                  fontSize: 13,
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogsPage;
