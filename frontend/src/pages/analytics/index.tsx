import React, { useEffect, useState, useCallback } from 'react';
import {
  RiBarChart2Line,
  RiRefreshLine,
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
  border: 'rgba(255,255,255,0.06)',
  danger: '#e11d48',
  success: '#22c55e',
};

const RADIUS_LG = 12;
const RADIUS_MD = 8;
const RADIUS_SM = 6;

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, changeType, icon, loading }) => (
  <div
    style={{
      background: C.surface,
      borderRadius: RADIUS_LG,
      padding: '20px 24px',
      border: `1px solid ${C.border}`,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 16,
    }}
  >
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: RADIUS_MD,
        background: 'rgba(255,193,7,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: C.accent,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, color: C.textTertiary, marginBottom: 6 }}>{title}</div>
      {loading ? (
        <div style={{ width: 60, height: 24, background: C.surfaceHover, borderRadius: RADIUS_SM }} />
      ) : (
        <div style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary, lineHeight: 1.2 }}>{value}</div>
      )}
      {change && !loading && (
        <div
          style={{
            fontSize: 12,
            marginTop: 4,
            color: changeType === 'up' ? C.success : changeType === 'down' ? C.danger : C.textTertiary,
          }}
        >
          {change}
        </div>
      )}
    </div>
  </div>
);

// --- Top Profiles Table ---
interface ProfileStat {
  id: string;
  name: string;
  platform: string;
  posts: number;
  engagement: number;
  growth: number;
}

const TopProfilesTable: React.FC<{ data: ProfileStat[]; loading: boolean }> = ({ data, loading }) => {
  const headers = ['环境', '平台', '发帖数', '互动率', '增长率'];
  return (
    <div style={{ background: C.surface, borderRadius: RADIUS_LG, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary, margin: 0 }}>Top 环境</h3>
      </div>
      <div>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ padding: '12px 20px', display: 'flex', gap: 16 }}>
              <div style={{ width: 120, height: 16, background: C.surfaceHover, borderRadius: RADIUS_SM }} />
              <div style={{ width: 80, height: 16, background: C.surfaceHover, borderRadius: RADIUS_SM }} />
              <div style={{ width: 60, height: 16, background: C.surfaceHover, borderRadius: RADIUS_SM }} />
            </div>
          ))
        ) : data.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: C.textTertiary, fontSize: 13 }}>
            暂无数据
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 20px',
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: 500,
                      color: C.textTertiary,
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '12px 20px', fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{row.name}</td>
                  <td style={{ padding: '12px 20px', fontSize: 13, color: C.textSecondary }}>{row.platform}</td>
                  <td style={{ padding: '12px 20px', fontSize: 13, color: C.textSecondary }}>{row.posts}</td>
                  <td style={{ padding: '12px 20px', fontSize: 13, color: C.textSecondary }}>{row.engagement}%</td>
                  <td style={{ padding: '12px 20px', fontSize: 13, color: row.growth >= 0 ? C.success : C.danger }}>
                    {row.growth >= 0 ? '+' : ''}{row.growth}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// --- Platform Distribution ---
const PlatformDistribution: React.FC<{ data: { name: string; value: number; color: string }[]; loading: boolean }> = ({
  data,
  loading,
}) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div style={{ background: C.surface, borderRadius: RADIUS_LG, border: `1px solid ${C.border}`, padding: '20px 24px' }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary, margin: '0 0 20px' }}>平台分布</h3>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: C.surfaceHover }} />
              <div style={{ width: 80, height: 14, background: C.surfaceHover, borderRadius: RADIUS_SM }} />
              <div style={{ flex: 1, height: 8, background: C.surfaceHover, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {data.map((item) => {
            const pct = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: C.textSecondary, width: 80 }}>{item.name}</span>
                <div style={{ flex: 1, height: 6, background: C.bg, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: item.color, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 12, color: C.textTertiary, width: 40, textAlign: 'right' }}>{pct.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- Activity Chart (simple bar chart) ---
const ActivityChart: React.FC<{ data: { date: string; posts: number; engagement: number }[]; loading: boolean }> = ({
  data,
  loading,
}) => {
  const maxVal = Math.max(...data.map((d) => Math.max(d.posts, d.engagement)), 1);
  return (
    <div style={{ background: C.surface, borderRadius: RADIUS_LG, border: `1px solid ${C.border}`, padding: '20px 24px' }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary, margin: '0 0 20px' }}>活跃度趋势</h3>
      {loading ? (
        <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: 8, padding: '0 8px' }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: `${30 + Math.random() * 50}%`, background: C.surfaceHover, borderRadius: '4px 4px 0 0' }} />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textTertiary, fontSize: 13 }}>
          暂无数据
        </div>
      ) : (
        <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: 8, padding: '0 8px' }}>
          {data.map((d) => (
            <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 150, width: '100%' }}>
                <div
                  style={{
                    flex: 1,
                    height: `${(d.posts / maxVal) * 140}px`,
                    background: C.accent,
                    borderRadius: '4px 4px 0 0',
                    minHeight: 4,
                  }}
                  title={`发帖: ${d.posts}`}
                />
                <div
                  style={{
                    flex: 1,
                    height: `${(d.engagement / maxVal) * 140}px`,
                    background: C.secondary,
                    borderRadius: '4px 4px 0 0',
                    minHeight: 4,
                  }}
                  title={`互动: ${d.engagement}`}
                />
              </div>
              <span style={{ fontSize: 10, color: C.textTertiary }}>{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main Page ---
const AnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProfiles: 0,
    totalPosts: 0,
    totalEngagement: 0,
    activeToday: 0,
    profileChange: '+0',
    postChange: '+0',
    engagementChange: '+0',
    activeChange: '+0',
  });
  const [topProfiles, setTopProfiles] = useState<ProfileStat[]>([]);
  const [platformData, setPlatformData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [activityData, setActivityData] = useState<{ date: string; posts: number; engagement: number }[]>([]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      // Mock data for now - replace with actual API calls
      await new Promise((resolve) => setTimeout(resolve, 800));
      setStats({
        totalProfiles: 128,
        totalPosts: 3420,
        totalEngagement: 85.2,
        activeToday: 45,
        profileChange: '+12',
        postChange: '+156',
        engagementChange: '+2.3',
        activeChange: '+8',
      });
      setTopProfiles([
        { id: '1', name: '主账号', platform: 'Twitter', posts: 234, engagement: 8.5, growth: 12.3 },
        { id: '2', name: '营销号A', platform: 'Instagram', posts: 189, engagement: 6.2, growth: 8.7 },
        { id: '3', name: '品牌号', platform: 'LinkedIn', posts: 156, engagement: 4.8, growth: -2.1 },
        { id: '4', name: '测试号', platform: 'Facebook', posts: 98, engagement: 3.1, growth: 5.4 },
        { id: '5', name: '备用号', platform: 'Twitter', posts: 67, engagement: 2.8, growth: 1.2 },
      ]);
      setPlatformData([
        { name: 'Twitter', value: 45, color: '#1DA1F2' },
        { name: 'Instagram', value: 32, color: '#E4405F' },
        { name: 'LinkedIn', value: 28, color: '#0A66C2' },
        { name: 'Facebook', value: 23, color: '#1877F2' },
      ]);
      setActivityData([
        { date: '2024-01-15', posts: 45, engagement: 320 },
        { date: '2024-01-16', posts: 52, engagement: 380 },
        { date: '2024-01-17', posts: 38, engagement: 290 },
        { date: '2024-01-18', posts: 61, engagement: 420 },
        { date: '2024-01-19', posts: 55, engagement: 390 },
        { date: '2024-01-20', posts: 48, engagement: 350 },
        { date: '2024-01-21', posts: 42, engagement: 310 },
      ]);
    } catch {
      toast.error('获取分析数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, margin: '0 0 4px' }}>数据分析</h1>
          <p style={{ fontSize: 13, color: C.textTertiary, margin: 0 }}>实时监控您的社交媒体表现</p>
        </div>
        <button
          onClick={fetchAnalytics}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS_MD,
            padding: '8px 16px',
            color: C.textSecondary,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RiRefreshLine size={16} />
          刷新
        </button>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard
          title="总环境数"
          value={stats.totalProfiles}
          change={stats.profileChange}
          changeType="up"
          icon={<RiBarChart2Line size={22} />}
          loading={loading}
        />
        <StatCard
          title="总发帖数"
          value={stats.totalPosts.toLocaleString()}
          change={stats.postChange}
          changeType="up"
          icon={<RiBarChart2Line size={22} />}
          loading={loading}
        />
        <StatCard
          title="平均互动率"
          value={`${stats.totalEngagement}%`}
          change={stats.engagementChange}
          changeType="up"
          icon={<RiBarChart2Line size={22} />}
          loading={loading}
        />
        <StatCard
          title="今日活跃"
          value={stats.activeToday}
          change={stats.activeChange}
          changeType="up"
          icon={<RiBarChart2Line size={22} />}
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <ActivityChart data={activityData} loading={loading} />
        <PlatformDistribution data={platformData} loading={loading} />
      </div>

      {/* Top Profiles */}
      <TopProfilesTable data={topProfiles} loading={loading} />
    </div>
  );
};

export default AnalyticsPage;
