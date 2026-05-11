import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {RiRefreshLine, RiTimeLine} from 'react-icons/ri';

// ── Types ──

interface Executor {
  id: string;
  tenant_id: string;
  name: string;
  executor_type: 'desktop' | 'vps' | 'mobile';
  runtime_status: string;
  cpu_cores: number | null;
  memory_gb: number | null;
  ip_address: string | null;
  ip_location: string | null;
  version: string | null;
  last_heartbeat: string | null;
  registered_at: string;
}

// ── Palette ──
const C = {
  bg: '#121212',
  surface: '#1e1e1e',
  surfaceHover: '#2a2a2a',
  card: '#1a1a1a',
  textPrimary: '#fafafa',
  textSecondary: '#9e9e9e',
  textTertiary: '#757575',
  accent: '#FFC107',
  accentHover: '#FFA000',
  accentSubtle: 'rgba(255,193,7,0.08)',
  secondary: '#1976D2',
  secondaryHover: '#1565C0',
  border: 'rgba(255,255,255,0.06)',
  green: '#4caf50',
  red: '#ef5350',
  orange: '#FF9800',
  gray: '#9e9e9e',
};

// ── Status config ──
const STATUS_COLORS: Record<string, string> = {
  online: C.green,
  offline: C.gray,
  busy: C.orange,
};

const STATUS_LABELS: Record<string, string> = {
  online: '在线',
  offline: '离线',
  busy: '忙碌',
};

const TYPE_EMOJI: Record<string, string> = {
  desktop: '🖥️',
  vps: '🗄️',
  mobile: '📱',
};

const TYPE_LABELS: Record<string, string> = {
  desktop: '桌面',
  vps: '服务器',
  mobile: '移动',
};

type StatusFilter = 'all' | 'online' | 'offline' | 'busy';

// ── Component ──

const ExecutorListPage: React.FC = () => {
  const [executors, setExecutors] = useState<Executor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedExecutor, setSelectedExecutor] = useState<string | null>(null);

  const fetchExecutors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ skip: '0', limit: '100' });
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      const res = await fetch(`/api/v1/executors?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setExecutors(Array.isArray(data) ? data : data.executors || []);
    } catch {
      toast.error('获取执行器列表失败');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchExecutors();
  }, [fetchExecutors]);

  const handleDetail = async (id: string) => {
    setSelectedExecutor(id === selectedExecutor ? null : id);
  };

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'online', label: '在线' },
    { key: 'offline', label: '离线' },
    { key: 'busy', label: '忙碌' },
  ];

  if (loading) {
    return (
      <div style={{ padding: 32, color: C.textSecondary }}>
        加载中...
      </div>
    );
  }

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-6">
            执行器管理
          </h1>
          <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 4 }}>
            管理所有已注册的执行器节点，查看运行状态和待办任务
          </p>
        </div>
        <button
          onClick={fetchExecutors}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            backgroundColor: 'transparent',
            color: C.textSecondary,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = C.surfaceHover;
            e.currentTarget.style.color = C.textPrimary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = C.textSecondary;
          }}
        >
          <RiRefreshLine size={16} />
          刷新
        </button>
      </div>

      {/* ── Status Filter ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              border: `1px solid ${statusFilter === f.key ? C.accent : C.border}`,
              backgroundColor: statusFilter === f.key ? C.accentSubtle : 'transparent',
              color: statusFilter === f.key ? C.accent : C.textSecondary,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* ── List ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {executors.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                color: C.textSecondary,
                backgroundColor: C.card,
                borderRadius: 12,
                border: `1px solid ${C.border}`,
              }}
            >
              <p style={{ fontSize: 14 }}>暂无执行器</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>
                执行器注册后将显示在此处
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {executors.map((ex) => {
                const isSelected = selectedExecutor === ex.id;
                const statusColor = STATUS_COLORS[ex.runtime_status] || C.gray;

                return (
                  <div
                    key={ex.id}
                    onClick={() => handleDetail(ex.id)}
                    style={{
                      backgroundColor: isSelected ? C.surfaceHover : C.card,
                      border: `1px solid ${isSelected ? C.accent : C.border}`,
                      borderRadius: 12,
                      padding: 16,
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Type Icon */}
                        <span style={{ fontSize: 24 }}>
                          {TYPE_EMOJI[ex.executor_type] || '🖥️'}
                        </span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: C.textPrimary }}>
                            {ex.name}
                          </div>
                          <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                            {TYPE_LABELS[ex.executor_type] || ex.executor_type}
                            {ex.version && ` · v${ex.version}`}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {/* Status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: statusColor,
                              display: 'inline-block',
                            }}
                          />
                          <span style={{ fontSize: 12, color: statusColor }}>
                            {STATUS_LABELS[ex.runtime_status] || ex.runtime_status}
                          </span>
                        </div>
                        {/* Detail Button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDetail(ex.id); }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            border: `1px solid ${C.border}`,
                            backgroundColor: isSelected ? C.secondary : 'transparent',
                            color: isSelected ? '#fff' : C.textSecondary,
                            fontSize: 12,
                            cursor: 'pointer',
                            transition: 'all 0.12s',
                          }}
                        >
                          {isSelected ? '收起' : '详情'}
                        </button>
                      </div>
                    </div>

                    {/* Quick info row */}
                    <div style={{ display: 'flex', gap: 24, marginTop: 10, fontSize: 12, color: C.textTertiary }}>
                      {ex.ip_address && (
                        <span>
                          IP: <span style={{ color: C.textSecondary }}>{ex.ip_address}</span>
                          {ex.ip_location && ` (${ex.ip_location})`}
                        </span>
                      )}
                      {ex.last_heartbeat && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <RiTimeLine size={12} />
                          心跳: {new Date(ex.last_heartbeat).toLocaleString('zh-CN')}
                        </span>
                      )}
                      <span>
                        注册: {new Date(ex.registered_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>

                    {/* Expanded Detail */}
                    {isSelected && (
                      <div
                        style={{
                          marginTop: 16,
                          padding: 16,
                          backgroundColor: C.surface,
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4 }}>执行器 ID</div>
                            <div style={{ fontSize: 12, color: C.textSecondary, wordBreak: 'break-all' }}>{ex.id}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4 }}>租户 ID</div>
                            <div style={{ fontSize: 12, color: C.textSecondary, wordBreak: 'break-all' }}>{ex.tenant_id}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4 }}>类型</div>
                            <div style={{ fontSize: 12, color: C.textSecondary }}>
                              {TYPE_EMOJI[ex.executor_type]} {TYPE_LABELS[ex.executor_type]}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4 }}>运行状态</div>
                            <div style={{ fontSize: 12, color: statusColor }}>
                              ● {STATUS_LABELS[ex.runtime_status] || ex.runtime_status}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4 }}>IP地址</div>
                            <div style={{ fontSize: 12, color: C.textSecondary }}>
                              {ex.ip_address || '未知'} {ex.ip_location && `(${ex.ip_location})`}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4 }}>版本</div>
                            <div style={{ fontSize: 12, color: C.textSecondary }}>{ex.version || '未知'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4 }}>CPU 核心</div>
                            <div style={{ fontSize: 12, color: C.textSecondary }}>{ex.cpu_cores ?? '未知'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4 }}>内存 (GB)</div>
                            <div style={{ fontSize: 12, color: C.textSecondary }}>{ex.memory_gb ?? '未知'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4 }}>最后心跳</div>
                            <div style={{ fontSize: 12, color: C.textSecondary }}>
                              {ex.last_heartbeat ? new Date(ex.last_heartbeat).toLocaleString('zh-CN') : '无'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4 }}>注册时间</div>
                            <div style={{ fontSize: 12, color: C.textSecondary }}>
                              {new Date(ex.registered_at).toLocaleString('zh-CN')}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExecutorListPage;
