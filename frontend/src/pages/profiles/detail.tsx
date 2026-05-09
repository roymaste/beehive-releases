import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiArrowLeftLine,
  RiPlayLine,
  RiStopLine,
  RiEditLine,
  RiDeleteBinLine,
  RiComputerLine,
  RiFingerprintLine,
  RiPlugLine,
  RiUserLine,
  RiHistoryLine,
  RiLoader4Line,
  RiErrorWarningLine,
} from 'react-icons/ri';
import { profilesAPI, Profile, ProfileFingerprint } from '../../api/profiles';
import { isDesktopApp, launchLocalBeehiveBrowser, fingerprintToLauncherConfig } from '../../lib/desktop';

const TABS = [
  { key: 'overview', label: '概览', Icon: RiComputerLine },
  { key: 'fingerprint', label: '指纹配置', Icon: RiFingerprintLine },
  { key: 'proxy', label: '代理信息', Icon: RiPlugLine },
  { key: 'account', label: '账号信息', Icon: RiUserLine },
  { key: 'logs', label: '操作日志', Icon: RiHistoryLine },
];

// Field display names for fingerprint table
const FINGERPRINT_FIELD_LABELS: Record<string, string> = {
  platform: '平台',
  timezone: '时区',
  locale: '语言',
  screen_width: '屏幕宽度',
  screen_height: '屏幕高度',
  gpu_vendor: 'GPU 供应商',
  gpu_renderer: 'GPU 渲染器',
  fingerprint_seed: '指纹种子',
  humanize: '人类行为',
  headless: '无头模式',
};

const ProfileDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchProfile = useCallback(async () => {
    if (!id) return;
    try {
      const res = await profilesAPI.get(id);
      setProfile(res.data);
    } catch {
      toast.error('获取环境详情失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Auto-refresh status when running (desktop polls local BeehiveBrowser status)
  useEffect(() => {
    if (!profile) return;
    const isRunning = profile.status === 'running' || profile.status === 'active';
    if (!isRunning) return;

    const interval = setInterval(() => {
      fetchProfile();
    }, 10000);

    return () => clearInterval(interval);
  }, [profile, fetchProfile]);

  const handleStart = async () => {
    if (!id || !profile) return;
    setStarting(true);
    try {
      if (isDesktopApp()) {
        const fingerprint = profile.fingerprint || {};
        const proxyUrl = (profile as any).proxy_url;
        const config = fingerprintToLauncherConfig(
          profile.id,
          fingerprint,
          proxyUrl,
          'https://twitter.com'
        );
        const result = await launchLocalBeehiveBrowser(config);
        toast.success(`环境已本地启动 (PID: ${result.pid})`);
        setProfile((p) => p ? { ...p, status: 'running' } : null);
      } else {
        await profilesAPI.start(id);
        toast.success('环境已启动');
        setProfile((p) => p ? { ...p, status: 'running' } : null);
      }
    } catch (err) {
      toast.error('启动失败: ' + (err as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    if (!id) return;
    setStopping(true);
    try {
      if (isDesktopApp()) {
        const { stopLocalBeehiveBrowser } = await import('../../lib/desktop');
        await stopLocalBeehiveBrowser(id);
        toast.success('环境已关闭');
      } else {
        await profilesAPI.stop(id);
        toast.success('环境已关闭');
      }
      setProfile((p) => p ? { ...p, status: 'stopped' } : null);
    } catch (err) {
      toast.error('关闭失败: ' + (err as Error).message);
    } finally {
      setStopping(false);
    }
  };

  const handleDelete = () => {
    if (!id || !confirm('确定删除该环境？')) return;
    profilesAPI.delete(id).then(() => {
      toast.success('已删除');
      navigate('/profiles');
    }).catch(() => toast.error('删除失败'));
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#9e9e9e', background: '#121212', minHeight: '100vh' }}>加载中...</div>;
  }

  if (!profile) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#9e9e9e', background: '#121212', minHeight: '100vh' }}>环境不存在</div>;
  }

  const isRunning = profile.status === 'running' || profile.status === 'active';
  const fingerprint = profile.fingerprint;
  const hasProxy = !!(profile as any).proxy_id || !!(profile as any).proxy_info;

  const InfoCard: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div>
      <span style={{ fontSize: 12, color: '#9e9e9e', display: 'block', marginBottom: 4 }}>{label}</span>
      <span style={{ fontSize: 14, color: '#fafafa', fontWeight: 500 }}>{value}</span>
    </div>
  );

  // Render fingerprint field value with appropriate display
  const renderFingerprintValue = (key: string, value: unknown): React.ReactNode => {
    if (value === undefined || value === null) return '—';
    if (typeof value === 'boolean') {
      return value ? '是' : '否';
    }
    if (key === 'screen_width' || key === 'screen_height' || key === 'fingerprint_seed') {
      return String(value);
    }
    return String(value);
  };

  const cardStyle: React.CSSProperties = { background: '#1e1e1e', borderRadius: 12, padding: 24 };
  const sectionTitleStyle: React.CSSProperties = { fontSize: 15, fontWeight: 600, color: '#fafafa', margin: '0 0 16px' };

  const renderOverview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={cardStyle}>
        <h3 style={sectionTitleStyle}>基本信息</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px 24px' }}>
          <InfoCard label="状态" value={
            <span style={{
              fontSize: 11,
              padding: '4px 12px',
              borderRadius: 20,
              background: isRunning ? 'rgba(76,175,80,0.2)' : 'rgba(100,100,100,0.2)',
              color: isRunning ? '#4CAF50' : '#9e9e9e',
            }}>
              {isRunning ? '运行中' : '已停止'}
            </span>
          } />
          <InfoCard label="环境名称" value={profile.name} />
          <InfoCard label="环境 ID" value={profile.id.slice(0, 12) + '...'} />
          <InfoCard label="所属平台" value={profile.account_platform || '—'} />
          <InfoCard label="创建时间" value={new Date(profile.created_at).toLocaleString('zh-CN')} />
          <InfoCard label="最后启动" value={profile.last_launched_at ? new Date(profile.last_launched_at).toLocaleString('zh-CN') : '从未启动'} />
          <InfoCard label="更新时间" value={new Date(profile.updated_at).toLocaleString('zh-CN')} />
        </div>
      </div>

      {profile.notes && (
        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>备注</h3>
          <p style={{ fontSize: 14, color: '#fafafa', margin: 0, lineHeight: 1.6 }}>{profile.notes}</p>
        </div>
      )}

      {profile.tags && profile.tags.length > 0 && (
        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>标签</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {profile.tags.map((tag, i) => (
              <span key={i} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, background: 'rgba(100,100,100,0.2)', color: '#9e9e9e' }}>{tag}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderFingerprint = () => (
    <div style={cardStyle}>
      <h3 style={sectionTitleStyle}>浏览器指纹配置</h3>
      {fingerprint ? (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, color: '#9e9e9e', fontWeight: 500 }}>字段</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, color: '#9e9e9e', fontWeight: 500 }}>值</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(FINGERPRINT_FIELD_LABELS) as Array<keyof ProfileFingerprint>).map((key) => (
                <tr key={key} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: '#9e9e9e' }}>
                    {FINGERPRINT_FIELD_LABELS[key]}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 14, color: '#fafafa', fontWeight: 500 }}>
                    {renderFingerprintValue(String(key), fingerprint[key])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: '#9e9e9e', marginTop: 16 }}>
            指纹配置在环境创建时设定，运行中不可修改。修改需先停止环境。
          </p>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 32, color: '#9e9e9e' }}>
          <RiFingerprintLine size={32} style={{ color: '#555', marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 14 }}>暂无指纹配置信息</p>
        </div>
      )}
    </div>
  );

  const renderProxy = () => (
    <div>
      {/* 未绑定代理警告 */}
      {!hasProxy && (
        <div style={{
          background: '#F44336',
          borderRadius: 14,
          padding: '16px 20px',
          marginBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <RiErrorWarningLine size={20} color="#ffffff" />
            <p style={{ margin: 0, fontSize: 14, color: '#ffffff', fontWeight: 600 }}>
              未绑定干净代理IP可能导致账号被平台降权、限流甚至封禁。
            </p>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.85)', paddingLeft: 32 }}>
            强烈建议绑定专业住宅IP保障账号安全
          </p>
          <div style={{ display: 'flex', gap: 12, paddingLeft: 32, marginTop: 8 }}>
            <a
              href="/proxies/buy"
              style={{ display: 'inline-block', padding: '8px 20px', background: '#FFC107', color: '#121212', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: 13 }}
            >
              去购买IP
            </a>
            <a
              href="/proxies/add"
              style={{ display: 'inline-block', padding: '8px 20px', background: '#1976D2', color: '#ffffff', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: 13 }}
            >
              绑定自有IP
            </a>
            <a
              href="https://www.miyaip.com/?invitecode=5808117"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', padding: '8px 20px', background: 'transparent', color: '#1976D2', borderRadius: 8, fontWeight: 500, textDecoration: 'none', fontSize: 13, border: '1px solid #1976D2' }}
            >
              Miyaip购买
            </a>
          </div>
        </div>
      )}

      <div style={cardStyle}>
        <h3 style={sectionTitleStyle}>代理信息</h3>
        {profile.proxy_info ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px 24px' }}>
            <InfoCard label="代理地址" value={profile.proxy_info} />
            <InfoCard label="代理状态" value={
              <span style={{
                fontSize: 11,
                padding: '4px 12px',
                borderRadius: 20,
                background: 'rgba(76,175,80,0.2)',
                color: '#4CAF50',
              }}>
                已绑定
              </span>
            } />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 32, color: '#9e9e9e' }}>
            <RiPlugLine size={32} style={{ color: '#555', marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: 14 }}>当前使用直连，未绑定代理</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderAccount = () => (
    <div style={cardStyle}>
      <h3 style={sectionTitleStyle}>账号信息</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px 24px' }}>
        <InfoCard label="用户名" value={profile.account_username || '—'} />
        <InfoCard label="平台" value={profile.account_platform || '—'} />
      </div>
    </div>
  );

  const renderLogs = () => (
    <div style={cardStyle}>
      <h3 style={sectionTitleStyle}>操作日志</h3>
      <div style={{ textAlign: 'center', padding: 32, color: '#9e9e9e' }}>
        <RiHistoryLine size={32} style={{ color: '#555', marginBottom: 12 }} />
        <p style={{ margin: 0, fontSize: 14 }}>暂无操作记录</p>
        <p style={{ margin: '4px 0 0', fontSize: 12 }}>启动和停止环境的操作将在此处显示</p>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 900, background: '#121212', minHeight: '100vh', padding: 24 }}>
      <button
        onClick={() => navigate('/profiles')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F44336', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20, padding: 0 }}
      >
        <RiArrowLeftLine size={16} />
        返回环境列表
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fafafa', margin: 0, letterSpacing: '-0.3px' }}>
            {profile.name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span style={{
              fontSize: 12,
              padding: '4px 14px',
              borderRadius: 20,
              background: isRunning ? 'rgba(76,175,80,0.2)' : 'rgba(100,100,100,0.2)',
              color: isRunning ? '#4CAF50' : '#9e9e9e',
            }}>
              {isRunning ? '运行中' : '已停止'}
            </span>
            <span style={{ fontSize: 12, color: '#9e9e9e' }}>ID: {profile.id.slice(0, 8)}...</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleStart}
            disabled={starting || isRunning}
            style={{
              background: '#4CAF50',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 16px',
              cursor: starting || isRunning ? 'not-allowed' : 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: starting || isRunning ? 0.6 : 1,
            }}
          >
            {starting ? <RiLoader4Line size={16} className="spin" /> : <RiPlayLine size={16} />}
            启动
          </button>
          <button
            onClick={handleStop}
            disabled={stopping || !isRunning}
            style={{
              background: '#F44336',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 16px',
              cursor: stopping || !isRunning ? 'not-allowed' : 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: stopping || !isRunning ? 0.6 : 1,
            }}
          >
            {stopping ? <RiLoader4Line size={16} className="spin" /> : <RiStopLine size={16} />}
            停止
          </button>
          <button
            onClick={() => navigate(`/profiles/${id}/edit`)}
            style={{ background: '#333', color: '#fafafa', border: 'none', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RiEditLine size={16} />
            编辑
          </button>
          <button
            onClick={handleDelete}
            style={{ background: '#333', color: '#F44336', border: 'none', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RiDeleteBinLine size={16} />
            删除
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #333' }}>
        {TABS.map((tab) => {
          const Icon = tab.Icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 18px',
                fontSize: 14, fontWeight: activeTab === tab.key ? 600 : 400,
                color: activeTab === tab.key ? '#FFC107' : '#9e9e9e',
                borderBottom: activeTab === tab.key ? '2px solid #FFC107' : '2px solid transparent',
                background: 'transparent',
                borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'fingerprint' && renderFingerprint()}
        {activeTab === 'proxy' && renderProxy()}
        {activeTab === 'account' && renderAccount()}
        {activeTab === 'logs' && renderLogs()}
      </div>
    </div>
  );
};

export default ProfileDetailPage;
