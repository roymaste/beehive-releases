import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, adminAPI, DashboardStats, AdminClientResponse } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  RiBarChart2Line,
  RiCheckLine,
  RiUserLine,
  RiAddLine,
  RiEditLine,
  RiFileChartLine,
  RiArrowRightSLine,
  RiRefreshLine,
  RiTimeLine,
  RiArrowLeftSLine,
  RiArrowRightSLine as RiArrowRight,
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

// Radius tokens
const RADIUS_CARD = 16;
const RADIUS_SM = 10;
const RADIUS_BTN = 8;

// Shadow
const SHADOW = '0 8px 32px rgba(0,0,0,0.4)';

// Platform emoji mapping
const platformEmoji: Record<string, string> = {
  twitter: '🐦',
  twitter_x: '🐦',
  weibo: '📮',
  xhs: '📕',
  redbook: '📕',
  douyin: '🎵',
  tiktok: '🎵',
  linkedin: '💼',
  facebook: '📘',
  instagram: '📷',
  threads: '🧵',
};

const getPlatformEmoji = (platform?: string): string => {
  if (!platform) return '🌐';
  const key = platform.toLowerCase().replace(/[^a-z]/g, '');
  return platformEmoji[key] || platformEmoji[platform.toLowerCase()] || '🌐';
};

// Format relative time
const formatRelativeTime = (dateStr?: string): string => {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
};

// Status badge component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const isSuccess = status === 'success' || status === 'published' || status === 'completed' || status === 'active';
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
        background: isSuccess ? 'rgba(76,175,80,0.12)' : 'rgba(244,67,54,0.12)',
        color: isSuccess ? C.success : C.error,
        border: `1px solid ${isSuccess ? 'rgba(76,175,80,0.2)' : 'rgba(244,67,54,0.2)'}`,
      }}
    >
      {isSuccess ? '成功' : '失败'}
    </span>
  );
};

// Plan type badge
const PlanBadge: React.FC<{ plan: string }> = ({ plan }) => {
  const colors: Record<string, string> = {
    free: '#9e9e9e',
    basic: '#2196F3',
    pro: '#9C27B0',
    enterprise: '#FF9800',
  };
  const color = colors[plan.toLowerCase()] || '#9e9e9e';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        background: `${color}18`,
        color: color,
        border: `1px solid ${color}30`,
        textTransform: 'capitalize',
      }}
    >
      {plan}
    </span>
  );
};

// Stat card component
interface StatCardProps {
  emoji: string;
  label: string;
  value: number | string;
  subValue?: string;
  color: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ emoji, label, value, subValue, color, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: RADIUS_CARD,
      padding: '20px 20px 16px',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.15s ease',
      boxShadow: SHADOW,
      position: 'relative',
      overflow: 'hidden',
    }}
    onMouseEnter={(e) => {
      if (onClick) e.currentTarget.style.background = C.surfaceHover;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = C.surface;
    }}
  >
    {/* Top row: emoji + icon */}
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ fontSize: 24 }}>{emoji}</span>
      <span style={{ color, opacity: 0.7 }}>
        <RiBarChart2Line size={18} />
      </span>
    </div>
    {/* Value */}
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
    {/* Label */}
    <div
      style={{
        fontSize: 13,
        color: C.textSecondary,
        fontWeight: 500,
      }}
    >
      {label}
    </div>
    {/* Sub value */}
    {subValue && (
      <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 4 }}>{subValue}</div>
    )}
  </div>
);

// Quick action button component
interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  desc: string;
  onClick?: () => void;
  accent?: boolean;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, desc, onClick, accent }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: '16px 12px',
      background: accent ? C.accent : C.surface,
      border: `1px solid ${accent ? C.accent : C.border}`,
      borderRadius: RADIUS_SM,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      color: accent ? C.bg : C.textPrimary,
      minWidth: 0,
    }}
    onMouseEnter={(e) => {
      if (accent) {
        e.currentTarget.style.background = C.accentHover;
        e.currentTarget.style.borderColor = C.accentHover;
      } else {
        e.currentTarget.style.background = C.surfaceHover;
      }
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = accent ? C.accent : C.surface;
      e.currentTarget.style.borderColor = accent ? C.accent : C.border;
    }}
  >
    <span style={{ color: accent ? C.bg : C.accent }}>{icon}</span>
    <span style={{ fontSize: 12, fontWeight: 600, color: 'inherit' }}>{label}</span>
    <span style={{ fontSize: 10, color: accent ? 'rgba(18,18,18,0.6)' : C.textTertiary, textAlign: 'center', lineHeight: 1.3 }}>
      {desc}
    </span>
  </button>
);

// Recent record row component
interface RecordRowProps {
  platform?: string;
  name: string;
  content: string;
  status: string;
  time?: string;
  onClick?: () => void;
}

const RecordRow: React.FC<RecordRowProps> = ({ platform, name, content, status, time, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 12px',
      borderRadius: RADIUS_BTN,
      cursor: 'pointer',
      transition: 'background 0.12s',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceHover)}
    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
  >
    {/* Platform emoji */}
    <span style={{ fontSize: 18, flexShrink: 0 }}>{getPlatformEmoji(platform)}</span>
    {/* Content */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          color: C.textPrimary,
          fontSize: 13,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {name}
      </div>
      <div
        style={{
          color: C.textTertiary,
          fontSize: 11,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginTop: 2,
        }}
      >
        {content || '无内容预览'}
      </div>
    </div>
    {/* Status + time */}
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
      <StatusBadge status={status} />
      {time && (
        <span style={{ fontSize: 10, color: C.textTertiary, display: 'flex', alignItems: 'center', gap: 2 }}>
          <RiTimeLine size={10} /> {time}
        </span>
      )}
    </div>
  </div>
);

// =====================
// Tenant View (default)
// =====================
const TenantDashboard: React.FC<{
  stats: DashboardStats;
  loading: boolean;
}> = ({ stats, loading }) => {
  const navigate = useNavigate();

  const statCards = [
    {
      emoji: '📊',
      label: '今日发帖',
      value: loading ? '—' : stats.today_posts,
      color: C.accent,
      href: '/profiles',
    },
    {
      emoji: '✅',
      label: '成功发布',
      value: loading ? '—' : `${Math.round(stats.success_rate)}%`,
      color: C.success,
      href: '/profiles',
    },
    {
      emoji: '🟢',
      label: '活跃账号',
      value: loading ? '—' : stats.running_envs,
      color: C.success,
      href: '/profiles?status=running',
    },
    {
      emoji: '📈',
      label: '账号总数',
      value: loading ? '—' : (stats.platform_count || stats.total_envs),
      color: C.secondary,
      href: '/profiles',
    },
  ];

  const quickActions = [
    {
      icon: <RiAddLine size={20} />,
      label: '新建环境',
      desc: '创建浏览器环境',
      href: '/profiles/create',
    },
    {
      icon: <RiEditLine size={20} />,
      label: '发帖',
      desc: '快速发布内容',
      href: '/posts/new',
    },
    {
      icon: <RiCheckLine size={20} />,
      label: '检查账号',
      desc: '验证账号状态',
      href: '/accounts',
    },
    {
      icon: <RiFileChartLine size={20} />,
      label: '数据报告',
      desc: '查看运营报表',
      href: '/reports',
    },
  ];

  const recentRecords = stats.recent_profiles.slice(0, 10);

  return (
    <>
      {/* Stat cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 20,
        }}
      >
        {statCards.map((card) => (
          <StatCard
            key={card.label}
            emoji={card.emoji}
            label={card.label}
            value={card.value}
            color={card.color}
            onClick={() => navigate(card.href)}
          />
        ))}
      </div>

      {/* Two column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}
      >
        {/* Recent records */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS_CARD,
            padding: '20px',
            boxShadow: SHADOW,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <h2 style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary, margin: 0 }}>
              最近发布记录
            </h2>
            <a
              href="/profiles"
              style={{
                color: C.accent,
                fontSize: 12,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                fontWeight: 500,
              }}
            >
              查看全部 <RiArrowRightSLine size={14} />
            </a>
          </div>

          {loading ? (
            <div style={{ color: C.textTertiary, textAlign: 'center', padding: '24px 0', fontSize: 13 }}>
              加载中...
            </div>
          ) : recentRecords.length === 0 ? (
            <div style={{ color: C.textTertiary, textAlign: 'center', padding: '24px 0', fontSize: 13 }}>
              暂无发布记录
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recentRecords.map((record) => (
                <RecordRow
                  key={record.id}
                  platform={record.platform}
                  name={record.name}
                  content={record.group || '无内容预览'}
                  status={record.runtime_status === 'running' ? 'success' : 'failed'}
                  time={formatRelativeTime(record.updated_at)}
                  onClick={() => navigate(`/profiles/${record.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS_CARD,
            padding: '20px',
            boxShadow: SHADOW,
          }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: C.textPrimary,
              margin: '0 0 16px',
            }}
          >
            快捷功能
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
            }}
          >
            {quickActions.slice(0, 2).map((action) => (
              <QuickAction
                key={action.label}
                icon={action.icon}
                label={action.label}
                desc={action.desc}
                accent
                onClick={() => navigate(action.href)}
              />
            ))}
            {quickActions.slice(2).map((action) => (
              <QuickAction
                key={action.label}
                icon={action.icon}
                label={action.label}
                desc={action.desc}
                onClick={() => navigate(action.href)}
              />
            ))}
          </div>

          {/* Bottom stats summary */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: `1px solid ${C.border}`,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 8,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, fontFamily: "'Poppins', sans-serif" }}>
                {loading ? '—' : stats.tenant_count}
              </div>
              <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }}>租户数</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, fontFamily: "'Poppins', sans-serif" }}>
                {loading ? '—' : stats.ip_count}
              </div>
              <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }}>IP资产</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, fontFamily: "'Poppins', sans-serif" }}>
                {loading ? '—' : stats.active_tasks}
              </div>
              <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }}>活跃任务</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// =====================
// Admin View
// =====================
const AdminDashboard: React.FC<{
  stats: DashboardStats;
  loading: boolean;
}> = ({ stats, loading }) => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<AdminClientResponse[]>([]);
  const [clientsTotal, setClientsTotal] = useState(0);
  const [clientsPage, setClientsPage] = useState(0);
  const [clientsLoading, setClientsLoading] = useState(false);
  const LIMIT = 10;

  const adminStatCards = [
    { emoji: '👥', label: '客户总数', value: loading ? '—' : stats.tenant_count, color: '#FFC107' },
    { emoji: '✅', label: '活跃客户', value: loading ? '—' : stats.active_tasks, color: '#4CAF50' },
    { emoji: '📊', label: '环境总数', value: loading ? '—' : stats.total_envs, color: '#1976D2' },
    { emoji: '🟢', label: '运行中环境', value: loading ? '—' : stats.running_envs, color: '#4CAF50' },
    { emoji: '🌐', label: '代理总数', value: loading ? '—' : stats.total_proxies, color: '#9C27B0' },
    { emoji: '🤖', label: '自动化任务', value: loading ? '—' : stats.active_tasks, color: '#FF9800' },
  ];

  const fetchClients = async (page: number) => {
    setClientsLoading(true);
    try {
      const res = await adminAPI.listClients(page * LIMIT, LIMIT);
      setClients(res.data.clients);
      setClientsTotal(res.data.total);
    } catch {
      toast.error('获取客户列表失败');
    } finally {
      setClientsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients(0);
    setClientsPage(0);
  }, []);

  const totalPages = Math.ceil(clientsTotal / LIMIT);

  return (
    <>
      {/* Admin stat cards — 6 in a grid (3 + 3) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginBottom: 20,
        }}
      >
        {adminStatCards.map((card) => (
          <StatCard
            key={card.label}
            emoji={card.emoji}
            label={card.label}
            value={card.value}
            color={card.color}
          />
        ))}
      </div>

      {/* Client list */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: RADIUS_CARD,
          padding: '20px',
          boxShadow: SHADOW,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary, margin: 0 }}>
            客户列表
          </h2>
          <span style={{ fontSize: 12, color: C.textTertiary }}>
            共 {clientsTotal} 位客户
          </span>
        </div>

        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1.5fr',
            gap: 12,
            padding: '8px 12px',
            borderRadius: RADIUS_BTN,
            background: 'rgba(255,255,255,0.03)',
            marginBottom: 8,
          }}
        >
          {['客户名称', '邮箱', '套餐', '状态', '环境数', '注册时间'].map((h) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 600, color: C.textTertiary, textTransform: 'uppercase' }}>
              {h}
            </span>
          ))}
        </div>

        {/* Table rows */}
        {clientsLoading ? (
          <div style={{ color: C.textTertiary, textAlign: 'center', padding: '32px 0', fontSize: 13 }}>
            加载中...
          </div>
        ) : clients.length === 0 ? (
          <div style={{ color: C.textTertiary, textAlign: 'center', padding: '32px 0', fontSize: 13 }}>
            暂无客户数据
          </div>
        ) : (
          clients.map((client) => (
            <div
              key={client.id}
              onClick={() => navigate(`/admin/clients/${client.id}`)}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1.5fr',
                gap: 12,
                padding: '10px 12px',
                borderRadius: RADIUS_BTN,
                cursor: 'pointer',
                transition: 'background 0.12s',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RiUserLine size={14} style={{ color: C.textTertiary, flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: C.textPrimary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {client.name}
                </span>
              </div>
              {/* Email */}
              <span
                style={{
                  fontSize: 12,
                  color: C.textSecondary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {client.email}
              </span>
              {/* Plan */}
              <PlanBadge plan={client.plan_type || 'free'} />
              {/* Status */}
              <span
                style={{
                  fontSize: 12,
                  color: client.status === 'active' ? C.success : C.textTertiary,
                  fontWeight: 500,
                }}
              >
                {client.status === 'active' ? '活跃' : client.status}
              </span>
              {/* Env count */}
              <span style={{ fontSize: 13, color: C.textSecondary }}>
                {client.environment_count}
              </span>
              {/* Created at */}
              <span style={{ fontSize: 12, color: C.textTertiary }}>
                {new Date(client.created_at).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                })}
              </span>
            </div>
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 20,
            }}
          >
            <button
              onClick={() => {
                const prev = clientsPage - 1;
                setClientsPage(prev);
                fetchClients(prev);
              }}
              disabled={clientsPage === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                background: 'transparent',
                border: `1px solid ${C.border}`,
                borderRadius: RADIUS_BTN,
                color: clientsPage === 0 ? C.textTertiary : C.textSecondary,
                fontSize: 12,
                cursor: clientsPage === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <RiArrowLeftSLine size={14} /> 上一页
            </button>
            <span style={{ fontSize: 12, color: C.textTertiary }}>
              第 {clientsPage + 1} / {totalPages} 页
            </span>
            <button
              onClick={() => {
                const next = clientsPage + 1;
                setClientsPage(next);
                fetchClients(next);
              }}
              disabled={clientsPage >= totalPages - 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                background: 'transparent',
                border: `1px solid ${C.border}`,
                borderRadius: RADIUS_BTN,
                color: clientsPage >= totalPages - 1 ? C.textTertiary : C.textSecondary,
                fontSize: 12,
                cursor: clientsPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              下一页 <RiArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

// =====================
// Main DashboardPage
// =====================
const DashboardPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    total_envs: 0,
    running_envs: 0,
    stopped_envs: 0,
    total_proxies: 0,
    bound_proxies: 0,
    today_posts: 0,
    success_rate: 0,
    recent_profiles: [],
    tenant_count: 0,
    platform_count: 0,
    ip_count: 0,
    active_tasks: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await dashboardAPI.getStats();
      setStats(data);
    } catch {
      toast.error('获取运营数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

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
            {isAdmin ? '管理概览' : '运营概览'}
          </h1>
          <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 4 }}>
            {isAdmin ? '全局运营数据' : '蜂巢智能体 · 实时运营数据'}
          </p>
        </div>
        <button
          onClick={fetchStats}
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

      {/* Role-specific content */}
      {isAdmin ? (
        <AdminDashboard stats={stats} loading={loading} />
      ) : (
        <TenantDashboard stats={stats} loading={loading} />
      )}
    </div>
  );
};

export default DashboardPage;
