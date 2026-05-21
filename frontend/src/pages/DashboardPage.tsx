import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  dashboardAPI,
  adminAPI,
  DashboardStats,
  AdminClientResponse,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

import {
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
  RiGlobalLine,
  RiServerLine,
  RiShieldCheckLine,
  RiPulseLine,
  RiLinkM,
  RiSendPlaneLine,
  RiSettings3Line,
  RiRobot2Line,
  RiHomeSmileLine,
} from 'react-icons/ri';
import { EmptyState } from '@/components/ui/empty-state'

/* ═══════════════════════════════════════════
   HiveAgent Dashboard — 暗色科技风重设计
   ═══════════════════════════════════════════ */

// ── 设计系统 Token ──


const RADIUS = {
  card: 16,
  sm: 12,
  btn: 10,
  badge: 999,
};

const SHADOW = {
  card: '0 4px 24px rgba(0,0,0,0.4)',
  cardHover: '0 8px 32px rgba(0,0,0,0.5)',
  glow: (color: string) => `0 0 20px ${color}`,
};

// ── 平台 emoji 映射 ──
const platformEmoji: Record<string, string> = {
  twitter: '🐦', twitter_x: '🐦', weibo: '📮', xhs: '📕',
  redbook: '📕', douyin: '🎵', tiktok: '🎵', linkedin: '💼',
  facebook: '📘', instagram: '📷', threads: '🧵',
};
const getPlatformEmoji = (p?: string) =>
  p ? (platformEmoji[p.toLowerCase().replace(/[^a-z]/g, '')] || platformEmoji[p.toLowerCase()] || '🌐') : '🌐';

// ── 时间格式化 ──
const formatRelativeTime = (dateStr?: string): string => {
  if (!dateStr) return '—';
  try {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
    return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  } catch { return '—'; }
};

// ═══════════════════════════════════════════
//  子组件
// ═══════════════════════════════════════════

/** 状态徽标 */
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const ok = ['success', 'published', 'completed', 'active', 'running'].includes(status);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border"
      style={{
        background: ok ? 'rgba(76,175,80,0.20)' : 'rgba(244,67,54,0.20)',
        color: ok ? 'var(--success)' : 'var(--error)',
        borderColor: ok ? 'rgba(76,175,80,0.2)' : 'rgba(244,67,54,0.2)',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: ok ? 'var(--success)' : 'var(--error)',
          boxShadow: ok ? `0 0 6px ${'var(--success)'}` : `0 0 6px ${'var(--error)'}`,
        }}
      />
      {ok ? '成功' : '失败'}
    </span>
  );
};

/** 套餐徽标 */
const PlanBadge: React.FC<{ plan: string }> = ({ plan }) => {
  const colors: Record<string, string> = {
    free: '#9E9E9E', basic: '#2196F3', pro: '#9C27B0', enterprise: '#FF9800',
  };
  const color = colors[plan.toLowerCase()] || '#9E9E9E';
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border capitalize"
      style={{ background: `${color}18`, color, borderColor: `${color}30` }}
    >
      {plan}
    </span>
  );
};


interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subLabel?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subLabel, onClick }) => (
  <div
    onClick={onClick}
    className="flex flex-col items-center justify-center p-5 rounded-xl cursor-pointer transition-all duration-200"
    style={{
      background: 'var(--card-bg-subtle)',
      border: '1px solid var(--divider)',
      borderRadius: 'var(--radius-card)',
      boxShadow: `0 0 0 1px rgba(255,193,7,0)`,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'var(--card-bg-hover)';
      e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,193,7,0.15), 0 0 20px rgba(255,193,7,0.06)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'var(--card-bg-subtle)';
      e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,193,7,0)';
    }}
  >
    <div
      className="flex items-center justify-center w-10 h-10 rounded-lg mb-3"
      style={{
        background: 'var(--hive-gold-bg)',
        color: 'var(--hive-gold)',
      }}
    >
      {icon}
    </div>
    <span className="text-2xl font-bold" style={{ color: 'var(--hive-gold)' }}>
      {value}
    </span>
    <span className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
      {label}
    </span>
    {subLabel && (
      <span className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
        {subLabel}
      </span>
    )}
  </div>
);

/** 迷你环形图 — 成功率 */
const SuccessRing: React.FC<{ rate: number; size?: number }> = ({ rate, size = 120 }) => {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(rate, 100) / 100) * circ;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={'var(--divider)'} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={rate >= 80 ? 'var(--success)' : rate >= 50 ? 'var(--hive-gold)' : 'var(--error)'}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Poppins', sans-serif" }}>
          {Math.round(rate)}%
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>成功率</span>
      </div>
    </div>
  );
};

/** 快捷操作按钮 */
interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  desc: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, desc, onClick, variant = 'ghost' }) => {
  const [hover, setHover] = useState(false);
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';

  const bg = isPrimary ? 'var(--hive-gold)' : isSecondary ? 'var(--hive-blue)' : 'var(--card-bg)';
  const bgHover = isPrimary ? 'var(--hive-gold-hover)' : isSecondary ? '#1565C0' : 'rgba(255,255,255,0.06)';
  const text = isPrimary ? 'var(--page-bg)' : isSecondary ? '#fff' : 'var(--text-primary)';
  const iconColor = isPrimary ? 'var(--page-bg)' : isSecondary ? '#fff' : 'var(--hive-gold)';
  const border = isPrimary ? 'var(--hive-gold)' : isSecondary ? 'var(--hive-blue)' : 'var(--divider)';

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl cursor-pointer text-center w-full"
      style={{
        background: hover ? bgHover : bg,
        border: `1px solid ${hover ? (isPrimary ? 'var(--hive-gold)' : isSecondary ? '#1565C0' : 'var(--divider)') : border}`,
        transition: 'all 0.2s ease',
        color: text,
      }}
    >
      <span style={{ color: iconColor }}>{icon}</span>
      <span className="text-[13px] font-semibold">{label}</span>
      <span className="text-[11px] leading-tight" style={{ color: isPrimary || isSecondary ? 'rgba(255,255,255,0.6)' : 'var(--text-tertiary)' }}>
        {desc}
      </span>
    </button>
  );
};

/** 最近记录行 */
interface RecordRowProps {
  platform?: string;
  name: string;
  content: string;
  status: string;
  time?: string;
  onClick?: () => void;
}

const RecordRow: React.FC<RecordRowProps> = ({ platform, name, content, status, time, onClick }) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer"
      style={{
        background: hover ? 'rgba(255,255,255,0.06)' : 'transparent',
        transition: 'background 0.15s',
        borderLeft: hover ? `2px solid ${'var(--hive-gold)'}` : '2px solid transparent',
      }}
    >
      <span className="text-lg flex-shrink-0">{getPlatformEmoji(platform)}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {name}
        </div>
        <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {content || '无内容预览'}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <StatusBadge status={status} />
        {time && (
          <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
            <RiTimeLine size={10} /> {time}
          </span>
        )}
      </div>
    </div>
  );
};

/** 小型趋势条 */
const MiniBar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-1.5 rounded-full overflow-hidden flex-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: color, transition: 'width 0.8s ease-out' }}
      />
    </div>
  );
};

// ═══════════════════════════════════════════
//  租户仪表盘
// ═══════════════════════════════════════════

const TenantDashboard: React.FC<{ stats: DashboardStats; loading: boolean }> = ({ stats, loading }) => {
  const navigate = useNavigate();

  const statCards: StatCardProps[] = useMemo(() => [
    {
      icon: <RiHomeSmileLine size={20} />,
      label: '账号数',
      value: loading ? '—' : (stats as any).total_accounts ?? '—',
      subLabel: `已绑定 ${(stats as any).bound_accounts ?? '—'}`,
      onClick: () => navigate('/accounts'),
    },
    {
      icon: <RiSendPlaneLine size={20} />,
      label: '今日发帖',
      value: loading ? '—' : stats.today_posts ?? '—',
      onClick: () => navigate('/ai-workflow'),
    },
    {
      icon: <RiTimeLine size={20} />,
      label: '待发布',
      value: loading ? '—' : (stats as any).pending_posts ?? '—',
      onClick: () => navigate('/automations'),
    },
    {
      icon: <RiPulseLine size={20} />,
      label: '互动消息',
      value: loading ? '—' : (stats as any).interactions ?? '—',
      onClick: () => navigate('/agent/auto-reply'),
    },
  ], [stats, loading, navigate]);

  const quickActions = [
    { icon: <RiAddLine size={22} />, label: '绑定账号', desc: '添加社媒账号', href: '/accounts', variant: 'primary' as const },
    { icon: <RiEditLine size={22} />, label: 'AI发帖', desc: 'AI生成并发布', href: '/ai-workflow', variant: 'primary' as const },
    { icon: <RiRobot2Line size={22} />, label: '自动运营', desc: '设置智能互动', href: '/agent/auto-reply', variant: 'ghost' as const },
  ];

  const recentRecords = stats.recent_profiles.slice(0, 5);

  // 判断是否为全新用户（所有核心数据为 0）
  const isNewUser = !loading &&
    (stats.total_envs ?? 0) === 0 &&
    (stats.total_proxies ?? 0) === 0;

  return (
    <div className="space-y-5">
      {/* ── 全新用户空状态引导 ── */}
      {isNewUser && (
        <EmptyState
          data-testid="welcome-empty-state"
          icon={<RiHomeSmileLine size={64} />}
          title="欢迎来到蜂巢智能体"
          description="开始使用只需三步：1. 创建环境 → 2. 绑定代理 → 3. 添加账号开始运营"
          actionLabel="开始创建环境"
          actionUrl="/profiles"
        />
      )}

      {/* ── 数据卡片行 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* ── 中部双栏：快捷操作 + 运营动态 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 快捷操作 */}
        <div
          className="lg:col-span-1 p-5"
          style={{ background: 'var(--card-bg)', border: `1px solid ${'var(--divider)'}`, borderRadius: RADIUS.card, boxShadow: SHADOW.card }}
        >
          <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            快捷操作
          </h3>
          <div className="flex flex-col gap-3">
            {quickActions.map((a) => (
              <QuickAction key={a.label} {...a} onClick={() => navigate(a.href)} />
            ))}
          </div>
        </div>

        {/* 运营动态 */}
        <div
          className="lg:col-span-2 p-5"
          style={{ background: 'var(--card-bg)', border: `1px solid ${'var(--divider)'}`, borderRadius: RADIUS.card, boxShadow: SHADOW.card }}
        >
          <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            运营动态
          </h3>
          {loading ? (
            <div className="text-center py-8 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>加载中...</div>
          ) : recentRecords.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-[13px] mb-2" style={{ color: 'var(--text-tertiary)' }}>还没有运营记录</div>
              <div className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                点击上方「绑定账号」开始使用，或让AI帮你操作
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {recentRecords.map((r) => (
                <RecordRow
                  key={r.id}
                  platform={r.platform}
                  name={r.name}
                  content={r.group || '无内容预览'}
                  status={r.runtime_status === 'running' ? 'success' : 'failed'}
                  time={formatRelativeTime(r.updated_at)}
                  onClick={() => navigate(`/profiles/${r.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 最近运营动态 ── */}
      <div
        className="p-5"
        style={{ background: 'var(--card-bg)', border: `1px solid ${'var(--divider)'}`, borderRadius: RADIUS.card, boxShadow: SHADOW.card }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            最近运营动态
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-8 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>加载中...</div>
        ) : recentRecords.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-[13px] mb-2" style={{ color: 'var(--text-tertiary)' }}>
              还没有运营记录
            </div>
            <div className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              绑定你的第一个社媒账号，开始运营
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {recentRecords.map((r) => (
              <RecordRow
                key={r.id}
                platform={r.platform}
                name={r.name}
                content={r.group || '无内容预览'}
                status={r.runtime_status === 'running' ? 'success' : 'failed'}
                time={formatRelativeTime(r.updated_at)}
                onClick={() => navigate(`/profiles/${r.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
//  管理员仪表盘
// ═══════════════════════════════════════════

const AdminDashboard: React.FC<{ stats: DashboardStats; loading: boolean }> = ({ stats, loading }) => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<AdminClientResponse[]>([]);
  const [clientsTotal, setClientsTotal] = useState(0);
  const [clientsPage, setClientsPage] = useState(0);
  const [clientsLoading, setClientsLoading] = useState(false);
  const LIMIT = 10;

  const adminStatCards: StatCardProps[] = useMemo(() => [
    {
      icon: <RiUserLine size={20} />, label: '客户总数', value: loading ? '—' : stats.tenant_count,
      color: 'var(--hive-gold)', glowColor: 'rgba(255,193,7,0.20)',
    },
    {
      icon: <RiPulseLine size={20} />, label: '活跃客户', value: loading ? '—' : stats.active_tasks,
      color: 'var(--success)', glowColor: 'rgba(76,175,80,0.20)',
    },
    {
      icon: <RiServerLine size={20} />, label: '环境总数', value: loading ? '—' : stats.total_envs,
      color: 'var(--hive-blue)', glowColor: 'rgba(25,118,210,0.20)',
    },
    {
      icon: <RiRobot2Line size={20} />, label: '运行中环境', value: loading ? '—' : stats.running_envs,
      color: 'var(--success)', glowColor: 'rgba(76,175,80,0.20)',
    },
    {
      icon: <RiGlobalLine size={20} />, label: '代理总数', value: loading ? '—' : stats.total_proxies,
      color: '#9C27B0', glowColor: 'rgba(156,39,176,0.15)',
    },
    {
      icon: <RiSettings3Line size={20} />, label: '自动化任务', value: loading ? '—' : stats.active_tasks,
      color: '#FF9800', glowColor: 'rgba(255,152,0,0.15)',
    },
  ], [stats, loading]);

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
    <div className="space-y-5">
      {/* ── 6 张数据卡片 (3x2) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminStatCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* ── 环境状态分布 ── */}
      <div
        className="p-5"
        style={{ background: 'var(--card-bg)', border: `1px solid ${'var(--divider)'}`, borderRadius: RADIUS.card, boxShadow: SHADOW.card }}
      >
        <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          环境状态分布
        </h3>
        <div className="flex items-center gap-6">
          <SuccessRing
            rate={stats.total_envs > 0 ? (stats.running_envs / stats.total_envs) * 100 : 0}
            size={100}
          />
          <div className="flex-1 space-y-3">
            {[
              { label: '运行中', value: stats.running_envs, max: stats.total_envs, color: 'var(--success)' },
              { label: '已停止', value: stats.stopped_envs, max: stats.total_envs, color: 'var(--error)' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-[12px] w-12" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                <MiniBar value={item.value} max={item.max} color={item.color} />
                <span className="text-[12px] font-semibold w-8 text-right" style={{ color: 'var(--text-primary)' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 客户列表 ── */}
      <div
        className="p-5"
        style={{ background: 'var(--card-bg)', border: `1px solid ${'var(--divider)'}`, borderRadius: RADIUS.card, boxShadow: SHADOW.card }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>客户列表</h3>
          <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>共 {clientsTotal} 位客户</span>
        </div>

        {/* 表头 */}
        <div
          className="grid gap-3 px-3 py-2 rounded-lg mb-2"
          style={{
            gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1.5fr',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          {['客户名称', '邮箱', '套餐', '状态', '环境数', '注册时间'].map((h) => (
            <span key={h} className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              {h}
            </span>
          ))}
        </div>

        {/* 表体 */}
        {clientsLoading ? (
          <div className="text-center py-8 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>加载中...</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-8 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>暂无客户数据</div>
        ) : (
          clients.map((client) => (
            <div
              key={client.id}
              onClick={() => navigate(`/admin/clients/${client.id}`)}
              className="grid gap-3 px-3 py-2.5 rounded-lg cursor-pointer items-center"
              style={{
                gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1.5fr',
                transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="flex items-center gap-2">
                <RiUserLine size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                <span className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{client.name}</span>
              </div>
              <span className="text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>{client.email}</span>
              <PlanBadge plan={client.plan_type || 'free'} />
              <span className="text-[12px] font-medium" style={{ color: client.status === 'active' ? 'var(--success)' : 'var(--text-tertiary)' }}>
                {client.status === 'active' ? '活跃' : client.status}
              </span>
              <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{client.environment_count}</span>
              <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                {new Date(client.created_at).toLocaleDateString('zh-CN')}
              </span>
            </div>
          ))
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-5">
            <button
              onClick={() => { const p = clientsPage - 1; setClientsPage(p); fetchClients(p); }}
              disabled={clientsPage === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] cursor-pointer"
              style={{
                background: 'transparent', border: `1px solid ${'var(--divider)'}`,
                color: clientsPage === 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                cursor: clientsPage === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <RiArrowLeftSLine size={14} /> 上一页
            </button>
            <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              第 {clientsPage + 1} / {totalPages} 页
            </span>
            <button
              onClick={() => { const p = clientsPage + 1; setClientsPage(p); fetchClients(p); }}
              disabled={clientsPage >= totalPages - 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] cursor-pointer"
              style={{
                background: 'transparent', border: `1px solid ${'var(--divider)'}`,
                color: clientsPage >= totalPages - 1 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                cursor: clientsPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
              }}
            >
              下一页 <RiArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
//  主页面
// ═══════════════════════════════════════════

const DashboardPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    total_envs: 0, running_envs: 0, stopped_envs: 0,
    total_proxies: 0, bound_proxies: 0,
    today_posts: 0, success_rate: 0,
    recent_profiles: [],
    tenant_count: 0, platform_count: 0, ip_count: 0, active_tasks: 0,
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
    <div className="px-6 pb-8" style={{ background: 'var(--page-bg)', minHeight: '100vh' }}>
      {/* ── 页面头部 ── */}
      <div className="flex items-center justify-between pt-6 pb-6">
        <div>
          <h1
            className="text-[26px] font-bold tracking-tight m-0"
            style={{ color: 'var(--text-primary)', fontFamily: "'Poppins', sans-serif" }}
          >
            {isAdmin ? '管理概览' : '运营概览'}
          </h1>

        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer"
          style={{
            background: 'transparent', border: `1px solid ${'var(--divider)'}`,
            color: 'var(--text-secondary)', transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <RiRefreshLine size={15} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>

      {/* ── 角色内容 ── */}
      {isAdmin ? (
        <AdminDashboard stats={stats} loading={loading} />
      ) : (
        <TenantDashboard stats={stats} loading={loading} />
      )}
    </div>
  );
};

export default DashboardPage;
