import React, { useEffect, useState, useCallback } from 'react';
import {
  RiHeartPulseLine,
  RiRefreshLine,
  RiSearchLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiAlertLine,
  RiTimeLine,
  RiGlobalLine,
  RiCheckLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import { browserKernelsAPI, BrowserKernel } from '@/api/browserKernels';

// ── Palette ────────────────────────────────────────────────
const C = {
  gray: '#888',
  orange: '#FF9800',
  danger: '#F44336',
  dangerBg: 'rgba(244,67,54,0.10)',
};

const RADIUS_CARD = 12;
const RADIUS_SM = 8;

// ── Backend Types (from monitor router) ───────────────────
interface HealthRecord {
  id: string;
  account_id: string | null;
  platform: string | null;
  action: string;
  status: string;
  message: string | null;
  result: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
}

interface HealthHistoryResponse {
  status: string;
  tenant_id: string;
  days: number;
  total_records: number;
  records: HealthRecord[];
}

interface CheckAllResponse {
  status: string;
  total_accounts: number;
  healthy: number;
  warning: number;
  error: number;
  accounts: CheckResult[];
  checked_at: string;
}

interface CheckResult {
  account_id: string;
  platform: string;
  username: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
}

// ── Utility ────────────────────────────────────────────────
const formatTime = (timeStr: string | null | undefined): string => {
  if (!timeStr) return '—';
  try {
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return timeStr;
  }
};

const statusConfig = (status: string): { color: string; bg: string; label: string } => {
  switch (status) {
    case 'healthy':
    case 'completed':
    case 'ok':
      return { color: 'var(--success)', bg: 'var(--success-bg)', label: '正常' };
    case 'warning':
      return { color: 'var(--warning)', bg: 'var(--warning-bg)', label: '警告' };
    case 'error':
    case 'failed':
      return { color: C.danger, bg: C.dangerBg, label: '失败' };
    default:
      return { color: 'var(--text-tertiary)', bg: 'rgba(255,255,255,0.06)', label: status };
  }
};

// ── Status Badge ───────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = statusConfig(status);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        background: cfg.bg,
        color: cfg.color,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: cfg.color,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
};

// ── Summary Cards ──────────────────────────────────────────
const SummaryCard: React.FC<{
  label: string;
  value: number;
  total: number;
  color: string;
  bg: string;
  icon: React.ReactNode;
}> = ({ label, value, total, color, bg, icon }) => (
  <div
    style={{
      background: 'var(--card-bg)',
      borderRadius: RADIUS_CARD,
      border: `1px solid ${'var(--divider)'}`,
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
    }}
  >
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: RADIUS_SM,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
        {value}
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 400 }}> / {total}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{label}</div>
    </div>
  </div>
);

// ── CloakBrowser Status Section ────────────────────────────
const CloakBrowserStatus: React.FC<{ kernels: BrowserKernel[]; loading: boolean }> = ({ kernels, loading }) => {
  if (loading) {
    return (
      <div style={{ display: 'flex', gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 80,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: RADIUS_SM,
            }}
          />
        ))}
      </div>
    );
  }

  if (kernels.length === 0) {
    return (
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
          color: 'var(--text-tertiary)',
          fontSize: 13,
          background: 'var(--card-bg)',
          borderRadius: RADIUS_CARD,
          border: `1px solid ${'var(--divider)'}`,
        }}
      >
        暂未安装任何浏览器内核
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
      {kernels.map((kernel) => (
        <div
          key={kernel.id}
          style={{
            background: 'var(--card-bg)',
            borderRadius: RADIUS_CARD,
            border: `1px solid ${'var(--divider)'}`,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: RADIUS_SM,
              background: kernel.is_active ? 'var(--success-bg)' : 'rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: kernel.is_active ? 'var(--success)' : 'var(--text-tertiary)',
              flexShrink: 0,
            }}
          >
            <RiCheckboxCircleLine size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {kernel.display_name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
              v{kernel.version}
              {kernel.chromium_version && ` · Chromium ${kernel.chromium_version}`}
            </div>
            <div
              style={{
                fontSize: 10,
                color: kernel.is_active ? 'var(--success)' : 'var(--text-tertiary)',
                marginTop: 2,
              }}
            >
              {kernel.is_active ? '✓ 已激活' : '未激活'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Execution Log Section ──────────────────────────────────
const ExecutionLogSection: React.FC<{ records: HealthRecord[]; loading: boolean }> = ({ records, loading }) => {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 52,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: RADIUS_SM,
            }}
          />
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div
        style={{
          padding: '32px 20px',
          textAlign: 'center',
          color: 'var(--text-tertiary)',
          fontSize: 13,
        }}
      >
        暂无执行记录
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {records.map((record) => {
        const cfg = statusConfig(record.status);
        return (
          <div
            key={record.id}
            style={{
              background: 'var(--page-bg)',
              borderRadius: RADIUS_SM,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              border: `1px solid ${'var(--divider)'}`,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: RADIUS_SM,
                background: cfg.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: cfg.color,
                flexShrink: 0,
              }}
            >
              {record.status === 'completed' || record.status === 'healthy' || record.status === 'ok' ? (
                <RiCheckLine size={16} />
              ) : record.status === 'warning' ? (
                <RiAlertLine size={16} />
              ) : (
                <RiErrorWarningLine size={16} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                  {record.platform || '未知平台'}
                </span>
                <StatusBadge status={record.status} />
                {record.action && (
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{record.action}</span>
                )}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  marginTop: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {record.message || '—'}
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>
              {formatTime(record.created_at)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Error Alert Section ────────────────────────────────────
const ErrorAlertsSection: React.FC<{ records: HealthRecord[] }> = ({ records }) => {
  const errorRecords = records.filter(
    (r) => r.status === 'error' || r.status === 'failed' || r.status === 'warning'
  );

  if (errorRecords.length === 0) {
    return (
      <div
        style={{
          background: 'var(--success-bg)',
          border: `1px solid rgba(76,175,80,0.2)`,
          borderRadius: RADIUS_CARD,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <RiCheckboxCircleLine size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>系统运行正常</div>
          <div style={{ fontSize: 12, color: 'var(--success)', opacity: 0.8, marginTop: 2 }}>
            暂无错误或告警记录
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {errorRecords.slice(0, 5).map((record) => {
        const isError = record.status === 'error' || record.status === 'failed';
        const cfg = statusConfig(record.status);
        return (
          <div
            key={record.id}
            style={{
              background: cfg.bg,
              border: `1px solid ${cfg.color}30`,
              borderRadius: RADIUS_SM,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <div style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }}>
              {isError ? <RiErrorWarningLine size={16} /> : <RiAlertLine size={16} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: cfg.color }}>
                  {record.platform || '未知平台'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{record.account_id?.slice(0, 8) || '—'}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                {record.message || '未知错误'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                {formatTime(record.created_at)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Check Results Table ────────────────────────────────────
const CheckResultsTable: React.FC<{ results: CheckResult[] }> = ({ results }) => {
  if (results.length === 0) return null;

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        borderRadius: RADIUS_CARD,
        border: `1px solid ${'var(--divider)'}`,
        overflow: 'hidden',
        marginBottom: 16,
      }}
    >
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${'var(--divider)'}` }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          本次检查结果
        </h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${'var(--divider)'}` }}>
              {['账号', '平台', '用户名', '状态', '消息', '检查时间'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '9px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={`${r.account_id}-${i}`} style={{ borderBottom: `1px solid ${'var(--divider)'}` }}>
                <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--text-primary)' }}>
                  {r.account_id.slice(0, 8)}...
                </td>
                <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>{r.platform}</td>
                <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>@{r.username}</td>
                <td style={{ padding: '9px 14px', fontSize: 12 }}>
                  <StatusBadge status={r.status} />
                </td>
                <td
                  style={{
                    padding: '9px 14px',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    maxWidth: 240,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.message}
                </td>
                <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--text-tertiary)' }}>刚刚</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────
const MonitorPage: React.FC = () => {
  const [historyLoading, setHistoryLoading] = useState(true);
  const [kernelLoading, setKernelLoading] = useState(true);
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkingOne, setCheckingOne] = useState(false);
  const [checkAccountId, setCheckAccountId] = useState('');
  const [checkAllResults, setCheckAllResults] = useState<CheckResult[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [kernels, setKernels] = useState<BrowserKernel[]>([]);
  const [summary, setSummary] = useState({ total: 0, healthy: 0, warning: 0, error: 0 });

  const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await apiClient.get<HealthHistoryResponse>('/monitor/history', {
        params: { days: 7, limit: 100 },
        headers,
      });
      const records = res.data.records || [];
      setHealthRecords(records);

      // Derive summary from check-all or estimate from history
      const healthy = records.filter((r) => r.status === 'completed' || r.status === 'healthy').length;
      const warning = records.filter((r) => r.status === 'warning').length;
      const error = records.filter((r) => r.status === 'error' || r.status === 'failed').length;
      setSummary({ total: records.length, healthy, warning, error });
    } catch {
      toast.error('获取健康历史失败');
    } finally {
      setHistoryLoading(false);
    }
  }, [headers]);

  const fetchKernels = useCallback(async () => {
    setKernelLoading(true);
    try {
      const res = await browserKernelsAPI.list();
      setKernels(res.data.kernels || []);
    } catch {
      // CloakBrowser kernel list is non-critical — silently fail
      setKernels([]);
    } finally {
      setKernelLoading(false);
    }
  }, []);

  const handleCheckAll = async () => {
    setCheckingAll(true);
    setCheckAllResults([]);
    try {
      const res = await apiClient.post<CheckAllResponse>('/monitor/check-all', {}, { headers });
      const data = res.data;
      setCheckAllResults(data.accounts || []);
      setSummary({
        total: data.total_accounts,
        healthy: data.healthy,
        warning: data.warning,
        error: data.error,
      });
      toast.success(
        `检查完成：${data.healthy} 正常，${data.warning} 警告，${data.error} 失败`
      );
    } catch {
      toast.error('批量检查失败');
    } finally {
      setCheckingAll(false);
    }
  };

  const handleCheckOne = async () => {
    if (!checkAccountId.trim()) {
      toast.error('请输入账号ID');
      return;
    }
    setCheckingOne(true);
    try {
      const res = await apiClient.post(`/monitor/check/${checkAccountId}`, {}, { headers });
      const data = res.data;
      toast.success(
        `账号 ${data.username} (${data.platform}) 检查完成: ${statusConfig(data.status).label}`
      );
      fetchHistory();
      setCheckAccountId('');
    } catch {
      toast.error('检查失败');
    } finally {
      setCheckingOne(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchKernels();
  }, [fetchHistory, fetchKernels]);

  return (
    <div style={{ padding: '0 24px 40px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          paddingTop: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
            账号监控
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
            环境运行状态 · 执行日志 · 错误告警
          </p>
        </div>
        <button
          onClick={() => { fetchHistory(); fetchKernels(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            background: 'transparent',
            border: `1px solid ${'var(--divider)'}`,
            borderRadius: RADIUS_SM,
            color: 'var(--text-secondary)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <RiRefreshLine
            size={15}
            style={historyLoading || kernelLoading ? { animation: 'spin 1s linear infinite' } : {}}
          />
          刷新
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <SummaryCard
          label="已检查账号"
          value={summary.total}
          total={summary.total}
          color={'var(--hive-blue)'}
          bg="rgba(25,118,210,0.1)"
          icon={<RiGlobalLine size={20} />}
        />
        <SummaryCard
          label="正常运行"
          value={summary.healthy}
          total={summary.total}
          color={'var(--success)'}
          bg={'var(--success-bg)'}
          icon={<RiCheckboxCircleLine size={20} />}
        />
        <SummaryCard
          label="警告"
          value={summary.warning}
          total={summary.total}
          color={'var(--warning)'}
          bg={'var(--warning-bg)'}
          icon={<RiAlertLine size={20} />}
        />
        <SummaryCard
          label="异常"
          value={summary.error}
          total={summary.total}
          color={C.danger}
          bg={C.dangerBg}
          icon={<RiErrorWarningLine size={20} />}
        />
      </div>

      {/* Health Check Controls */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: `1px solid ${'var(--divider)'}`,
          borderRadius: RADIUS_CARD,
          padding: '18px 20px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={handleCheckAll}
          disabled={checkingAll}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 18px',
            background: checkingAll ? 'rgba(255,255,255,0.06)' : 'var(--hive-gold)',
            border: 'none',
            borderRadius: RADIUS_SM,
            color: checkingAll ? 'var(--text-tertiary)' : 'var(--page-bg)',
            fontSize: 13,
            fontWeight: 600,
            cursor: checkingAll ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <RiHeartPulseLine size={16} />
          {checkingAll ? '检查中...' : '检查所有账号'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            placeholder="输入账号ID"
            value={checkAccountId}
            onChange={(e) => setCheckAccountId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheckOne()}
            style={{
              padding: '8px 12px',
              background: 'var(--page-bg)',
              border: `1px solid ${'var(--divider)'}`,
              borderRadius: RADIUS_SM,
              color: 'var(--text-primary)',
              fontSize: 13,
              width: 200,
              outline: 'none',
            }}
          />
          <button
            onClick={handleCheckOne}
            disabled={checkingOne}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              background: checkingOne ? 'rgba(255,255,255,0.06)' : 'var(--hive-blue)',
              border: 'none',
              borderRadius: RADIUS_SM,
              color: checkingOne ? 'var(--text-tertiary)' : '#fff',
              fontSize: 13,
              cursor: checkingOne ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <RiSearchLine size={15} />
            {checkingOne ? '检查中...' : '检查'}
          </button>
        </div>
      </div>

      {/* Check All Results */}
      {checkAllResults.length > 0 && <CheckResultsTable results={checkAllResults} />}

      {/* CloakBrowser Status + Error Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* CloakBrowser Status */}
        <div
          style={{
            background: 'var(--card-bg)',
            borderRadius: RADIUS_CARD,
            border: `1px solid ${'var(--divider)'}`,
            padding: '18px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <RiGlobalLine size={18} style={{ color: 'var(--hive-gold)' }} />
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              CloakBrowser 状态
            </h3>
          </div>
          <CloakBrowserStatus kernels={kernels} loading={kernelLoading} />
        </div>

        {/* Error Alerts */}
        <div
          style={{
            background: 'var(--card-bg)',
            borderRadius: RADIUS_CARD,
            border: `1px solid ${'var(--divider)'}`,
            padding: '18px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <RiAlertLine size={18} style={{ color: C.danger }} />
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              错误与告警
            </h3>
          </div>
          <ErrorAlertsSection records={healthRecords} />
        </div>
      </div>

      {/* Recent Execution Logs */}
      <div
        style={{
          background: 'var(--card-bg)',
          borderRadius: RADIUS_CARD,
          border: `1px solid ${'var(--divider)'}`,
          padding: '18px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <RiTimeLine size={18} style={{ color: 'var(--hive-blue)' }} />
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            最近执行日志
          </h3>
        </div>
        <ExecutionLogSection records={healthRecords} loading={historyLoading} />
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MonitorPage;
