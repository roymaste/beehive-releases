import React, { useEffect, useState } from 'react';
import {
  RiGroupLine,
  RiUserStarLine,
  RiWindowLine,
  RiPlayLine,
  RiGlobalLine,
  RiRobot2Line,
  RiRefreshLine,
} from 'react-icons/ri';
import { adminAPI, DashboardStats } from '../../api/admin';

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}> = ({ label, value, icon, color, bgColor }) => (
  <div
    className="apple-card"
    style={{
      padding: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}
  >
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        fontSize: 22,
      }}
    >
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 13, color: '#78716c', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#fafafa', letterSpacing: '-0.5px' }}>
        {value}
      </div>
    </div>
  </div>
);

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getDashboard();
      setStats(res.data);
    } catch {
      // silently handle - stats stay null
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const cards = stats
    ? [
        {
          label: '总客户数',
          value: stats.total_clients,
          icon: <RiGroupLine size={24} />,
          color: '#e11d48',
          bgColor: 'rgba(0, 113, 227, 0.10)',
        },
        {
          label: '活跃客户',
          value: stats.active_clients,
          icon: <RiUserStarLine size={24} />,
          color: '#16a34a',
          bgColor: 'rgba(52, 199, 89, 0.10)',
        },
        {
          label: '总环境数',
          value: stats.total_environments,
          icon: <RiWindowLine size={24} />,
          color: '#ff9500',
          bgColor: 'rgba(255, 149, 0, 0.10)',
        },
        {
          label: '运行中',
          value: stats.running_environments,
          icon: <RiPlayLine size={24} />,
          color: '#af52de',
          bgColor: 'rgba(175, 82, 222, 0.10)',
        },
      ]
    : [];

  const extraCards = stats
    ? [
        {
          label: '代理总数',
          value: stats.total_proxies,
          icon: <RiGlobalLine size={24} />,
          color: '#e11d48',
          bgColor: 'rgba(255, 59, 48, 0.10)',
        },
        {
          label: '自动化任务',
          value: stats.total_automations,
          icon: <RiRobot2Line size={24} />,
          color: '#e11d48',
          bgColor: 'rgba(0, 113, 227, 0.10)',
        },
      ]
    : [];

  return (
    <div style={{ padding: '24px 32px', height: '100%' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1c1917', margin: 0, letterSpacing: '-0.3px' }}>
            管理仪表盘
          </h1>
          <p style={{ fontSize: 13, color: '#78716c', margin: '4px 0 0' }}>
            蜂巢智能体平台总览
          </p>
        </div>
        <button
          className="apple-btn"
          onClick={fetchStats}
          style={{ padding: '10px 22px', background: loading ? '#27272a' : undefined, color: loading ? '#52525b' : undefined }}
          disabled={loading}
        >
          <RiRefreshLine size={18} />
          刷新
        </button>
      </div>

      {loading && !stats ? (
        <div className="apple-card" style={{ padding: '60px 0', textAlign: 'center', color: '#78716c' }}>
          加载中...
        </div>
      ) : (
        <>
          {/* Primary stat cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 16,
              marginBottom: 24,
            }}
          >
            {cards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>

          {/* Secondary stat cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 16,
            }}
          >
            {extraCards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
