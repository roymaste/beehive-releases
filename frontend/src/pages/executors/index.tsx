import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {RiRefreshLine, RiTimeLine, RiServerLine} from 'react-icons/ri';
import { EmptyState } from '@/components/ui/empty-state'
import apiClient from '../../api/client';

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
  gray: '#888',
  orange: '#FF9800',
  danger: '#F44336',
  dangerBg: 'rgba(244,67,54,0.10)',
};

// ── Status config ──
const STATUS_COLORS: Record<string, string> = {
  online: 'var(--success)',
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
      const params: Record<string, string> = { skip: '0', limit: '100' };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const res = await apiClient.get('/executors', { params });
      const data = res.data;
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
      <div style={{ padding: 32, color: 'var(--text-secondary)' }}>
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
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            管理所有已注册的执行器节点，查看运行状态和待办任务
          </p>
        </div>
        <button
          onClick={fetchExecutors}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: `1px solid ${'var(--divider)'}`,
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
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
              border: `1px solid ${statusFilter === f.key ? 'var(--hive-gold)' : 'var(--divider)'}`,
              backgroundColor: statusFilter === f.key ? 'rgba(255,193,7,0.10)' : 'transparent',
              color: statusFilter === f.key ? 'var(--hive-gold)' : 'var(--text-secondary)',
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
            <EmptyState
              icon={<RiServerLine size={48} />}
              title="暂无执行器"
              description="执行器是运行环境的核心节点。安装桌面客户端并注册后，执行器将显示在此处。"
            />
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
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.06)' : 'var(--card-bg)',
                      border: `1px solid ${isSelected ? 'var(--hive-gold)' : 'var(--divider)'}`,
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
                          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                            {ex.name}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {TYPE_LABELS[ex.executor_type] || ex.executor_type}
                            {ex.version && ' · v' + ex.version}
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
                            border: `1px solid ${'var(--divider)'}`,
                            backgroundColor: isSelected ? 'var(--hive-blue)' : 'transparent',
                            color: isSelected ? '#fff' : 'var(--text-secondary)',
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
                    <div style={{ display: 'flex', gap: 24, marginTop: 10, fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {ex.ip_address && (
                        <span>
                          IP: <span style={{ color: 'var(--text-secondary)' }}>{ex.ip_address}</span>
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
                          backgroundColor: 'var(--card-bg)',
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>执行器 ID</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{ex.id}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>租户 ID</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{ex.tenant_id}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>类型</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              {TYPE_EMOJI[ex.executor_type]} {TYPE_LABELS[ex.executor_type]}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>运行状态</div>
                            <div style={{ fontSize: 12, color: statusColor }}>
                              ● {STATUS_LABELS[ex.runtime_status] || ex.runtime_status}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>IP地址</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              {ex.ip_address || '未知'} {ex.ip_location && `(${ex.ip_location})`}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>版本</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ex.version || '未知'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>CPU 核心</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ex.cpu_cores ?? '未知'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>内存 (GB)</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ex.memory_gb ?? '未知'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>最后心跳</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              {ex.last_heartbeat ? new Date(ex.last_heartbeat).toLocaleString('zh-CN') : '无'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>注册时间</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
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
