import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  RiWindowLine,
  RiGlobalLine,
  RiUserStarLine,
  RiRobot2Line,
  RiGroupLine,
  RiSettings3Line,
  RiQuestionLine,
  RiDashboardLine,
  RiTeamLine,
  RiLogoutBoxLine,
  RiLinksLine,
  RiHardDriveLine,
  RiMoneyDollarCircleLine,
  RiFoldersLine,
  RiBarChart2Line,
  RiHeartPulseLine,
} from 'react-icons/ri';

// ── Beehive Design System Dark Palette ──
const C = {
  bg: '#121212',
  surface: '#1e1e1e',
  surfaceHover: '#2a2a2a',
  textPrimary: '#fafafa',
  textSecondary: '#9e9e9e',
  textTertiary: '#757575',
  accent: '#FFC107',
  accentHover: '#FFA000',
  accentSubtle: 'rgba(255,193,7,0.08)',
  secondary: '#1976D2',
  border: 'rgba(255,255,255,0.06)',
};

const menuItems = [
  { to: '/profiles', label: '环境管理', Icon: RiWindowLine },
  { to: '/groups', label: '环境分组', Icon: RiFoldersLine },
  { to: '/proxies', label: '代理管理', Icon: RiGlobalLine },
  { to: '/accounts', label: '账号管理', Icon: RiUserStarLine },
  { to: '/automations', label: '自动化', Icon: RiRobot2Line },
  { to: '/analytics', label: '数据分析', Icon: RiBarChart2Line },
  { to: '/monitor', label: '账号监控', Icon: RiHeartPulseLine },
  { to: '/team', label: '团队管理', Icon: RiGroupLine },
  { to: '/billing', label: '计费管理', Icon: RiMoneyDollarCircleLine },
  { to: '/referrals', label: '推广返利', Icon: RiMoneyDollarCircleLine },
];

const sidebarBottom = [
  { to: '/webhooks', label: 'Webhook', Icon: RiLinksLine },
  { to: '/system', label: '设置', Icon: RiSettings3Line },
  { to: '/help', label: '帮助中心', Icon: RiQuestionLine },
];

// ── Hover-aware nav item wrapper ──
const NavItem: React.FC<{
  to: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  active: boolean;
}> = ({ to, label, Icon, active }) => {
  const [hover, setHover] = useState(false);

  return (
    <NavLink
      to={to}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 6,
        marginBottom: 2,
        textDecoration: 'none',
        fontSize: 13,
        color: active ? C.accent : C.textSecondary,
        backgroundColor: active ? C.secondary : hover ? C.surfaceHover : 'transparent',
        fontWeight: active ? 500 : 400,
        transition: 'all 0.12s',
      }}
    >
      <Icon size={18} style={{ color: active ? C.accent : C.textSecondary }} />
      <span>{label}</span>
    </NavLink>
  );
};

// ── Hover-aware bottom nav item (no active highlight) ──
const BottomNavItem: React.FC<{
  to: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}> = ({ to, label, Icon }) => {
  const [hover, setHover] = useState(false);

  return (
    <NavLink
      to={to}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 6,
        marginBottom: 2,
        textDecoration: 'none',
        fontSize: 13,
        color: hover ? C.textPrimary : C.textSecondary,
        backgroundColor: hover ? C.surfaceHover : 'transparent',
        transition: 'all 0.12s',
      }}
    >
      <Icon size={18} style={{ color: hover ? C.textPrimary : C.textSecondary }} />
      <span>{label}</span>
    </NavLink>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: C.bg }}>
      {/* ── 左侧导航栏 ── */}
      <aside
        style={{
          width: 232,
          backgroundColor: C.surface,
          borderRight: `1px solid ${C.border}`,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* ── Logo ── */}
        <div
          style={{
            padding: '20px 16px',
            borderBottom: `1px solid ${C.border}`,
            fontSize: 15,
            fontWeight: 700,
            color: C.textPrimary,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            letterSpacing: '-0.3px',
          }}
        >
          <img
            src="/assets/logo-icon.svg"
            alt="HiveAgent"
            style={{ width: 22, height: 22, flexShrink: 0 }}
          />
          蜂巢智能体
        </div>

        {/* ── 新建按钮 ── */}
        <div style={{ padding: '12px 12px 10px' }}>
          <button
            onClick={() => navigate('/profiles/create')}
            style={{
              width: '100%',
              padding: '9px 0',
              borderRadius: 8,
              border: 'none',
              backgroundColor: C.accent,
              color: '#121212',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.accentHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.accent)}
          >
            + 新建环境
          </button>
        </div>

        {/* ── 导航菜单 ── */}
        <nav style={{ flex: 1, padding: '4px 8px', overflowY: 'auto' }}>
          {menuItems.map((item) => {
            const isActive =
              location.pathname.startsWith(item.to) ||
              (item.to === '/profiles' && location.pathname === '/');
            return (
              <NavItem
                key={item.to}
                to={item.to}
                label={item.label}
                Icon={item.Icon}
                active={isActive}
              />
            );
          })}

          {/* ── 管理员分区 ── */}
          {isAdmin && (
            <>
              <div
                style={{
                  padding: '14px 10px 5px',
                  marginTop: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  color: C.textTertiary,
                  letterSpacing: '0.6px',
                }}
              >
                管理员
              </div>
              <NavItem
                to="/admin"
                label="仪表盘"
                Icon={RiDashboardLine}
                active={location.pathname === '/admin'}
              />
              <NavItem
                to="/admin/executors"
                label="执行器管理"
                Icon={RiHardDriveLine}
                active={location.pathname.startsWith('/admin/executors')}
              />
              <NavItem
                to="/admin/clients"
                label="客户管理"
                Icon={RiTeamLine}
                active={location.pathname.startsWith('/admin/clients')}
              />
            </>
          )}
        </nav>

        {/* ── 底部 ── */}
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '8px' }}>
          {sidebarBottom.map((item) => (
            <BottomNavItem
              key={item.to}
              to={item.to}
              label={item.label}
              Icon={item.Icon}
            />
          ))}
          {/* ── 退出登录 ── */}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 6,
              marginBottom: 2,
              textDecoration: 'none',
              fontSize: 13,
              color: C.textSecondary,
              backgroundColor: 'transparent',
              border: 'none',
              width: '100%',
              cursor: 'pointer',
              transition: 'all 0.12s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = C.secondary;
              e.currentTarget.style.backgroundColor = C.surfaceHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = C.textSecondary;
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <RiLogoutBoxLine size={18} style={{ color: C.textSecondary }} />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      {/* ── 主内容区 ── */}
      <main className="page-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, padding: 24 }}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
