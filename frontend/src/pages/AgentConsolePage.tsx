import React, { useEffect, useState } from 'react';
import { agentsAPI, AgentStatus, AgentAccount, AgentIPBrief } from '../api/client';
import toast from 'react-hot-toast';
import {
  RiRobot2Line,
  RiRefreshLine,
  RiLinksLine,
  RiGlobalLine,
  RiUserStarLine,
} from 'react-icons/ri';

const AgentConsolePage: React.FC = () => {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [accounts, setAccounts] = useState<AgentAccount[]>([]);
  const [ips, setIps] = useState<AgentIPBrief[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statusRes, accountsRes, ipsRes] = await Promise.allSettled([
        agentsAPI.status(),
        agentsAPI.accounts(),
        agentsAPI.ips(),
      ]);

      if (statusRes.status === 'fulfilled') {
        setStatus(statusRes.value.data);
      }
      if (accountsRes.status === 'fulfilled') {
        setAccounts(accountsRes.value.data.accounts);
      }
      if (ipsRes.status === 'fulfilled') {
        setIps(ipsRes.value.data.ips);
      }
    } catch {
      toast.error('获取Agent数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const ServiceCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    value: string;
    subtitle?: string;
    color?: string;
  }> = ({ icon, title, value, subtitle, color = '#e11d48' }) => (
    <div className="apple-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs tracking-wide font-normal" style={{ color: '#78716c' }}>
          {title}
        </span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color }}>
        {loading ? '—' : value}
      </div>
      {subtitle && (
        <div className="text-xs mt-1" style={{ color: '#78716c' }}>
          {subtitle}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold m-0" style={{ color: '#1c1917', letterSpacing: '-0.3px' }}>
            Agent 控制台
          </h1>
          <p className="text-sm mt-1" style={{ color: '#78716c' }}>
            AI 智能体运行状态与账号管理
          </p>
        </div>
        <button onClick={fetchData} className="apple-btn flex items-center gap-2" disabled={loading}>
          <RiRefreshLine size={16} />
          刷新
        </button>
      </div>

      {/* Status overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <ServiceCard
          icon={<RiRobot2Line size={28} />}
          title="Agent 状态"
          value={status ? `${status.service} ${status.version}` : '—'}
          color="#0071e3"
       />
        <ServiceCard
          icon={<RiLinksLine size={28} />}
          title="API 版本"
          value={status?.api_version || '—'}
          color="#86868b"
       />
        <ServiceCard
          icon={<RiUserStarLine size={28} />}
          title="管理账号"
          value={String(accounts.length)}
          subtitle="平台账号总数"
          color="#0071e3"
       />
        <ServiceCard
          icon={<RiGlobalLine size={28} />}
          title="IP 代理"
          value={String(ips.length)}
          subtitle="IP 资产总数"
          color="#ff3b30"
       />
      </div>

      {/* Agent Info */}
      {status && (
        <div className="apple-card p-6 mb-6">
          <h2 className="text-lg font-bold mb-4" style={{ color: '#1c1917' }}>
            服务详情
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-xs" style={{ color: '#78716c' }}>服务名</span>
              <p className="text-sm mt-1" style={{ color: '#1c1917' }}>{status.service}</p>
            </div>
            <div>
              <span className="text-xs" style={{ color: '#78716c' }}>版本号</span>
              <p className="text-sm mt-1" style={{ color: '#1c1917' }}>{status.version}</p>
            </div>
            {status.tenant_id && (
              <div>
                <span className="text-xs" style={{ color: '#78716c' }}>当前住户</span>
                <p className="text-sm mt-1" style={{ color: '#1c1917' }}>
                  {status.tenant_name} <span className="apple-badge apple-badge-active ml-2">{status.tenant_plan}</span>
                </p>
              </div>
            )}
            {status.endpoints && Object.keys(status.endpoints).length > 0 && (
              <div>
                <span className="text-xs" style={{ color: '#78716c' }}>API 端点</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(status.endpoints).map(([key, url]) => (
                    <code
                      key={key}
                      className="text-xs px-2 py-1 rounded"
                      style={{ background: '#fafaf9', border: '1px solid #d2d2d7', color: '#0077ed' }}
                    >
                      {key}: {url}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Accounts table */}
      <div className="apple-card overflow-x-auto mb-6">
        <div className="p-4 border-b" style={{ borderColor: '#e7e5e4' }}>
          <h2 className="text-lg font-bold m-0 flex items-center gap-2" style={{ color: '#1c1917' }}>
            <RiUserStarLine size={20} />
            平台账号列表
          </h2>
        </div>
        <table className="apple-table">
          <thead>
            <tr>
              <th>平台</th>
              <th>用户名</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="text-center py-8" style={{ color: '#78716c' }}>加载中...</td>
              </tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-8" style={{ color: '#78716c' }}>暂无账号数据</td>
              </tr>
            ) : (
              accounts.map((acc) => (
                <tr key={acc.id}>
                  <td>
                    <span className="apple-badge apple-badge-active">{acc.platform}</span>
                  </td>
                  <td style={{ color: '#1c1917' }}>{acc.username}</td>
                  <td>
                    <span className={`apple-badge ${acc.status === 'active' ? 'apple-badge-active' : 'apple-badge-suspended'}`}>
                      {acc.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* IPs table */}
      <div className="apple-card overflow-x-auto">
        <div className="p-4 border-b" style={{ borderColor: '#e7e5e4' }}>
          <h2 className="text-lg font-bold m-0 flex items-center gap-2" style={{ color: '#1c1917' }}>
            <RiGlobalLine size={20} />
            IP 代理资产
          </h2>
        </div>
        <table className="apple-table">
          <thead>
            <tr>
              <th>类型</th>
              <th>协议</th>
              <th>服务器</th>
              <th>端口</th>
              <th>地区</th>
              <th>状态</th>
              <th>绑定到</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8" style={{ color: '#78716c' }}>加载中...</td>
              </tr>
            ) : ips.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8" style={{ color: '#78716c' }}>暂无IP数据</td>
              </tr>
            ) : (
              ips.map((ip) => (
                <tr key={ip.id}>
                  <td>
                    <span className="apple-badge apple-badge-active">{ip.type}</span>
                  </td>
                  <td style={{ color: '#78716c' }}>{ip.protocol}</td>
                  <td style={{ color: '#1c1917', fontFamily: 'monospace' }}>{ip.server}</td>
                  <td style={{ color: '#e11d48', fontFamily: 'monospace' }}>{ip.port}</td>
                  <td style={{ color: '#78716c' }}>{ip.location || '—'}</td>
                  <td>
                    <span className={`apple-badge ${ip.status === 'active' ? 'apple-badge-active' : 'apple-badge-suspended'}`}>
                      {ip.status}
                    </span>
                  </td>
                  <td style={{ color: '#78716c', fontSize: '13px' }}>{ip.bound_to || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AgentConsolePage;
