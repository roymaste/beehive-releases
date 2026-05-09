import React, { useEffect, useState, useCallback } from 'react';
import {
  RiBarChart2Line,
  RiRefreshLine,
  RiUserStarLine,
  RiCheckLine,
  RiCloseLine,
  RiLineChartLine,
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
interface AccountsStats {
  total_accounts: number;
  active_accounts: number;
  banned_accounts: number;
  by_platform: Record<string, number>;
}

interface PlatformStats {
  platforms: Array<{
    name: string;
    count: number;
    active: number;
    banned: number;
  }>;
  total: number;
}

interface ReportData {
  period: string;
  accounts: { total: number; change: number };
  posts: { total: number; change: number };
  errors: { total: number; change: number };
  trends: Array<{ date: string; value: number }>;
}

// Platform colors for bars
const PLATFORM_COLORS: Record<string, string> = {
  twitter: '#1DA1F2',
  twitter_x: '#1DA1F2',
  weibo: '#E6162D',
  xhs: '#FF4050',
  redbook: '#FF4050',
  douyin: '#000000',
  tiktok: '#000000',
  linkedin: '#0A66C2',
  facebook: '#1877F2',
  instagram: '#E4405F',
  threads: '#000000',
  default: '#1976D2',
};

const getPlatformColor = (platform: string): string => {
  const key = platform.toLowerCase().replace(/[^a-z]/g, '');
  return PLATFORM_COLORS[key] || PLATFORM_COLORS.default;
};

// Stat card component
interface StatCardProps {
  emoji: string;
  label: string;
  value: number | string;
  subValue?: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ emoji, label, value, subValue, color }) => (
  <div
    style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: RADIUS_CARD,
      padding: '20px 20px 16px',
      boxShadow: SHADOW,
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ fontSize: 24 }}>{emoji}</span>
      <span style={{ color, opacity: 0.7 }}>
        <RiBarChart2Line size={18} />
      </span>
    </div>
    <div
      style={{
        fontSize: 28,
        fontWeight: 700,
        color: color,
        fontFamily: "'Poppins', sans-serif",
        lineHeight: 1.1,
        marginBottom: 4,
      }}
    >
      {value}
    </div>
    <div style={{ fontSize: 13, color: C.textSecondary, fontWeight: 500 }}>
      {label}
    </div>
    {subValue && (
      <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 4 }}>{subValue}</div>
    )}
  </div>
);

// Horizontal bar chart component (CSS-only)
interface BarChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  maxValue: number;
}

const BarChart: React.FC<BarChartProps> = ({ data, maxValue }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {data.map((item) => (
      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 80, fontSize: 12, color: C.textSecondary, textAlign: 'right', flexShrink: 0 }}>
          {item.label}
        </div>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 24, overflow: 'hidden' }}>
          <div
            style={{
              width: `${(item.value / maxValue) * 100}%`,
              height: '100%',
              background: item.color,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: 8,
              minWidth: 40,
              transition: 'width 0.3s ease',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{item.value}</span>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const AnalyticsPage: React.FC = () => {
  const [accountsStats, setAccountsStats] = useState<AccountsStats | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [accountsRes, platformsRes, reportRes] = await Promise.all([
        fetch('/api/v1/analytics/accounts', { headers }),
        fetch('/api/v1/analytics/platforms', { headers }),
        fetch('/api/v1/analytics/report', { headers }),
      ]);

      const accountsData = await accountsRes.json();
      const platformsData = await platformsRes.json();
      const reportData = await reportRes.json();

      setAccountsStats(accountsData);
      setPlatformStats(platformsData);
      setReportData(reportData);
    } catch (err) {
      toast.error('获取数据失败');
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Build platform distribution data for chart
  const platformChartData = platformStats?.platforms.map((p) => ({
    label: p.name,
    value: p.count,
    color: getPlatformColor(p.name),
  })) || [];

  const maxPlatformCount = Math.max(...platformChartData.map((d) => d.value), 1);

  // Trend table data (mock from report)
  const trendDays = reportData?.period === '7d' ? 7 : 30;
  const trendData = Array.from({ length: trendDays }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (trendDays - 1 - i));
    return {
      date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      posts: reportData?.posts?.total ? Math.floor(reportData.posts.total / trendDays * (0.5 + Math.random())) : 0,
      errors: reportData?.errors?.total ? Math.floor(reportData.errors.total / trendDays * (0.5 + Math.random())) : 0,
    };
  });

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
            数据分析
          </h1>
          <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 4 }}>
            账号统计与平台分布概览
          </p>
        </div>
        <button
          onClick={fetchAll}
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

      {/* Error banner */}
      {fetchError && (
        <div
          style={{
            background: '#e11d48',
            borderRadius: 12,
            padding: '14px 20px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span style={{ color: '#ffffff', fontSize: 14 }}>加载失败，请稍后重试</span>
          <button
            onClick={fetchAll}
            style={{
              padding: '6px 16px',
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            重试
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <StatCard
          emoji="📊"
          label="总账号数"
          value={loading ? '—' : (accountsStats?.total_accounts ?? '—')}
          color={C.accent}
        />
        <StatCard
          emoji="🟢"
          label="活跃账号"
          value={loading ? '—' : (accountsStats?.active_accounts ?? '—')}
          subValue={accountsStats ? `${Math.round((accountsStats.active_accounts / accountsStats.total_accounts) * 100)}% 活跃率` : undefined}
          color={C.success}
        />
        <StatCard
          emoji="🔴"
          label="被封禁账号"
          value={loading ? '—' : (accountsStats?.banned_accounts ?? '—')}
          color={C.error}
        />
        <StatCard
          emoji="📝"
          label="今日发帖数"
          value={loading ? '—' : (reportData?.posts?.total ?? '—')}
          color={C.secondary}
        />
      </div>

      {/* Two column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 20,
        }}
      >
        {/* Platform distribution chart */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS_CARD,
            padding: '20px',
            boxShadow: SHADOW,
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary, margin: '0 0 20px' }}>
            平台分布
          </h2>
          {loading ? (
            <div style={{ color: C.textSecondary, fontSize: 13, textAlign: 'center', padding: '40px 0' }}>加载中...</div>
          ) : platformChartData.length > 0 ? (
            <BarChart data={platformChartData} maxValue={maxPlatformCount} />
          ) : (
            <div style={{ color: C.textSecondary, fontSize: 13, textAlign: 'center', padding: '40px 0' }}>暂无数据</div>
          )}
        </div>

        {/* Report summary */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS_CARD,
            padding: '20px',
            boxShadow: SHADOW,
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary, margin: '0 0 20px' }}>
            汇总报告
          </h2>
          {loading ? (
            <div style={{ color: C.textSecondary, fontSize: 13, textAlign: 'center', padding: '40px 0' }}>加载中...</div>
          ) : reportData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4 }}>账号总数</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.accent }}>{reportData.accounts.total}</div>
                  <div style={{ fontSize: 11, color: reportData.accounts.change >= 0 ? C.success : C.error, marginTop: 2 }}>
                    {reportData.accounts.change >= 0 ? '+' : ''}{reportData.accounts.change}% vs 上期
                  </div>
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4 }}>发帖总数</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.secondary }}>{reportData.posts.total}</div>
                  <div style={{ fontSize: 11, color: reportData.posts.change >= 0 ? C.success : C.error, marginTop: 2 }}>
                    {reportData.posts.change >= 0 ? '+' : ''}{reportData.posts.change}% vs 上期
                  </div>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4 }}>错误数</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.error }}>{reportData.errors.total}</div>
                <div style={{ fontSize: 11, color: reportData.errors.change <= 0 ? C.success : C.error, marginTop: 2 }}>
                  {reportData.errors.change >= 0 ? '+' : ''}{reportData.errors.change}% vs 上期
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: C.textSecondary, fontSize: 13, textAlign: 'center', padding: '40px 0' }}>暂无数据</div>
          )}
        </div>
      </div>

      {/* Trend table */}
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
          趋势数据（{reportData?.period || '7天'}）
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: C.textTertiary }}>日期</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: C.textTertiary }}>发帖数</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: C.textTertiary }}>错误数</th>
              </tr>
            </thead>
            <tbody>
              {trendData.map((row) => (
                <tr key={row.date} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: C.textSecondary }}>{row.date}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: C.textPrimary, textAlign: 'right' }}>{row.posts}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: row.errors > 0 ? C.error : C.textPrimary, textAlign: 'right' }}>{row.errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key metrics by platform */}
      {platformStats && platformStats.platforms.length > 0 && (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS_CARD,
            padding: '20px',
            boxShadow: SHADOW,
            marginTop: 16,
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary, margin: '0 0 16px' }}>
            平台明细
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: C.textTertiary }}>平台</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: C.textTertiary }}>账号数</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: C.textTertiary }}>活跃</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: C.textTertiary }}>封禁</th>
                </tr>
              </thead>
              <tbody>
                {platformStats.platforms.map((platform) => (
                  <tr key={platform.name} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: C.textPrimary }}>{platform.name}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: C.textSecondary, textAlign: 'right' }}>{platform.count}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: C.success, textAlign: 'right' }}>{platform.active}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: platform.banned > 0 ? C.error : C.textSecondary, textAlign: 'right' }}>{platform.banned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AnalyticsPage;