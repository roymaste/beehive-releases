import React, { useEffect, useState, useCallback } from 'react';
import {
  RiHeartPulseLine,
  RiRefreshLine,
  RiCheckLine,
  RiCloseLine,
  RiSearchLine,
} from 'react-icons/ri';
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

const RADIUS_CARD = 16;
const RADIUS_SM = 10;
const RADIUS_BTN = 8;
const SHADOW = '0 8px 32px rgba(0,0,0,0.4)';

// API response types
interface HealthRecord {
  id: string;
  account_id: string;
  platform: string;
  status: 'ok' | 'failed';
  message: string;
  checked_at: string;
}

interface CheckResult {
  account_id: string;
  platform: string;
  status: 'ok' | 'failed';
  message: string;
  checked_at: string;
}

// Status dot component
const StatusDot: React.FC<{ status: 'ok' | 'failed' }> = ({ status }) => (
  <span
    style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: status === 'ok' ? C.success : C.error,
      marginRight: 6,
      boxShadow: status === 'ok' ? `0 0 6px ${C.success}` : `0 0 6px ${C.error}`,
    }}
  />
);

const MonitorPage: React.FC = () => {
  const [healthHistory, setHealthHistory] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checkAllLoading, setCheckAllLoading] = useState(false);
  const [checkAccountId, setCheckAccountId] = useState('');
  const [lastCheckResults, setLastCheckResults] = useState<CheckResult[]>([]);

  const token = localStorage.getItem('access_token');
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const fetchHealthHistory = useCallback(async (accountId?: string) => {
    setLoading(true);
    try {
      const url = accountId
        ? `/api/v1/monitor/health-history?account_id=${accountId}&limit=50`
        : '/api/v1/monitor/health-history?limit=50';
      const res = await fetch(url, { headers });
      const data = await res.json();
      setHealthHistory(data.records || []);
    } catch {
      toast.error('获取健康历史失败');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  const handleCheckAll = async () => {
    setCheckAllLoading(true);
    try {
      const res = await fetch('/api/v1/monitor/check-all', {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      setLastCheckResults(Array.isArray(data) ? data : []);
      toast.success('批量检查完成');
      fetchHealthHistory();
    } catch {
      toast.error('批量检查失败');
    } finally {
      setCheckAllLoading(false);
    }
  };

  const handleCheckOne = async () => {
    if (!checkAccountId.trim()) {
      toast.error('请输入账号ID');
      return;
    }
    setChecking(true);
    try {
      const res = await fetch(`/api/v1/monitor/check/${checkAccountId}`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      toast.success(`账号 ${checkAccountId} 检查完成: ${data.status}`);
      fetchHealthHistory(checkAccountId);
      setCheckAccountId('');
    } catch {
      toast.error('检查失败');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchHealthHistory();
  }, [fetchHealthHistory]);

  const formatTime = (timeStr: string): string => {
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

  // Combine check results and history for display
  const displayResults = [
    ...lastCheckResults.map((r) => ({
      id: r.account_id,
      account_id: r.account_id,
      platform: r.platform,
      status: r.status,
      message: r.message,
      checked_at: r.checked_at,
      isNew: true,
    })),
    ...healthHistory.slice(0, 50).map((r) => ({ ...r, isNew: false })),
  ];

  return (
    <div style={{ padding: '0 24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingTop: 24 }}>
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: C.textPrimary,
              fontFamily: "'Poppins', sans-serif",
              letterSpacing: '-0.3px',
              margin: 0,
            }}
          >
            账号监控
          </h1>
          <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 4 }}>
            健康检查与状态监控
          </p>
        </div>
        <button
          onClick={() => fetchHealthHistory()}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            background: 'transparent',
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS_BTN,
            color: C.textSecondary,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = C.surfaceHover;
            e.currentTarget.style.color = C.textPrimary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = C.textSecondary;
          }}
        >
          <RiRefreshLine size={15} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          刷新
        </button>
      </div>

      {/* Health check controls */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: RADIUS_CARD,
          padding: '20px',
          boxShadow: SHADOW,
          marginBottom: 20,
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary, margin: '0 0 16px' }}>
          健康检查入口
        </h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {/* Check all button */}
          <button
            onClick={handleCheckAll}
            disabled={checkAllLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              background: C.accent,
              border: 'none',
              borderRadius: RADIUS_BTN,
              color: C.bg,
              fontSize: 13,
              fontWeight: 600,
              cursor: checkAllLoading ? 'not-allowed' : 'pointer',
              opacity: checkAllLoading ? 0.7 : 1,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!checkAllLoading) e.currentTarget.style.background = C.accentHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = C.accent;
            }}
          >
            <RiHeartPulseLine size={16} />
            {checkAllLoading ? '检查中...' : '检查所有账号'}
          </button>

          {/* Single account check */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              placeholder="输入账号ID"
              value={checkAccountId}
              onChange={(e) => setCheckAccountId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCheckOne()}
              style={{
                padding: '10px 14px',
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: RADIUS_BTN,
                color: C.textPrimary,
                fontSize: 13,
                width: 200,
                outline: 'none',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = C.secondary)}
              onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
            />
            <button
              onClick={handleCheckOne}
              disabled={checking}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                background: C.secondary,
                border: 'none',
                borderRadius: RADIUS_BTN,
                color: '#fff',
                fontSize: 13,
                fontWeight: 500,
                cursor: checking ? 'not-allowed' : 'pointer',
                opacity: checking ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!checking) e.currentTarget.style.background = '#1565C0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = C.secondary;
              }}
            >
              <RiSearchLine size={15} />
              {checking ? '检查中...' : '检查指定账号'}
            </button>
          </div>
        </div>
      </div>

      {/* Check results */}
      {displayResults.length > 0 && (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS_CARD,
            padding: '20px',
            boxShadow: SHADOW,
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary, margin: '0 0 16px' }}>
            检查结果
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: C.textTertiary }}>账号ID</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: C.textTertiary }}>平台</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: C.textTertiary }}>状态</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: C.textTertiary }}>消息</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: C.textTertiary }}>检查时间</th>
                </tr>
              </thead>
              <tbody>
                {displayResults.map((record, idx) => (
                  <tr
                    key={`${record.id}-${idx}`}
                    style={{
                      borderBottom: `1px solid ${C.border}`,
                      background: record.isNew ? 'rgba(25,118,210,0.08)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '10px 12px', fontSize: 13, color: C.textPrimary }}>
                      {record.account_id}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: C.textSecondary }}>
                      {record.platform || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        <StatusDot status={record.status} />
                        <span style={{ color: record.status === 'ok' ? C.success : C.error }}>
                          {record.status === 'ok' ? '正常' : '失败'}
                        </span>
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: C.textSecondary, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {record.message || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: C.textTertiary }}>
                      {formatTime(record.checked_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Health history */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: RADIUS_CARD,
          padding: '20px',
          boxShadow: SHADOW,
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary, margin: '0 0 16px' }}>
          健康历史记录
        </h2>
        {loading ? (
          <div style={{ color: C.textSecondary, fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
            加载中...
          </div>
        ) : healthHistory.length === 0 ? (
          <div style={{ color: C.textSecondary, fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
            暂无历史记录
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: C.textTertiary }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: C.textTertiary }}>账号ID</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: C.textTertiary }}>平台</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: C.textTertiary }}>状态</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: C.textTertiary }}>消息</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: C.textTertiary }}>检查时间</th>
                </tr>
              </thead>
              <tbody>
                {healthHistory.map((record) => (
                  <tr key={record.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: C.textTertiary }}>{record.id.slice(0, 8)}...</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: C.textPrimary }}>{record.account_id}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: C.textSecondary }}>{record.platform || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        <StatusDot status={record.status} />
                        <span style={{ color: record.status === 'ok' ? C.success : C.error }}>
                          {record.status === 'ok' ? '正常' : '失败'}
                        </span>
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: C.textSecondary, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {record.message || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: C.textTertiary }}>
                      {formatTime(record.checked_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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