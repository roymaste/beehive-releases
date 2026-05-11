import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  RiLinksLine,
  RiUserLine,
  RiMoneyDollarCircleLine,
  RiFileCopyLine,
  RiCheckLine,
} from 'react-icons/ri';

// ── Palette ──
const C = {
  bg: '#121212',
  surface: '#1e1e1e',
  surfaceHover: '#2a2a2a',
  card: '#1a1a1a',
  textPrimary: '#fafafa',
  textSecondary: '#9e9e9e',
  textTertiary: '#757575',
  accent: '#FFC107',
  accentHover: '#FFA000',
  accentSubtle: 'rgba(255,193,7,0.08)',
  secondary: '#1976D2',
  secondaryHover: '#1565C0',
  border: 'rgba(255,255,255,0.06)',
  green: '#4caf50',
  orange: '#ff9800',
  red: '#ef5350',
};

// ── Types ──
interface ReferralLink {
  id: string;
  tenant_id: string;
  code: string;
  click_count: number;
  register_count: number;
  created_at: string;
}

interface ReferralStats {
  total_rewards: number;
  pending_rewards: number;
  paid_rewards: number;
  total_referrals: number;
  tier1_referrals: number;
  tier2_referrals: number;
  tier3_referrals: number;
}

interface ReferralRelation {
  id: string;
  referrer_id: string;
  referee_id: string;
  referee_name: string;
  referee_email: string;
  tier: number;
  created_at: string;
}

interface RewardRecord {
  id: string;
  referrer_id: string;
  referee_id: string;
  referee_name: string;
  amount: number;
  tier: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

// ── API helper ──
const getToken = () => localStorage.getItem('access_token');

const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = getToken();
  const res = await fetch(`/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// ── Tab definition ──
type Tab = 'links' | 'relations' | 'records';

const TABS: { key: Tab; label: string }[] = [
  { key: 'links', label: '推广链接' },
  { key: 'relations', label: '推荐关系' },
  { key: 'records', label: '返利记录' },
];

// ── Component ──
const ReferralPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('links');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [links, setLinks] = useState<ReferralLink[]>([]);
  const [relations, setRelations] = useState<ReferralRelation[]>([]);
  const [records, setRecords] = useState<RewardRecord[]>([]);
  const [totalRelations, setTotalRelations] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [recordStatus, setRecordStatus] = useState<string>('');
  const [relationTier, setRelationTier] = useState<number>(1);
  const [skip, setSkip] = useState(0);
  const limit = 20;

  // Withdraw
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  // Copy feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Fetch helpers
  const fetchStats = useCallback(async () => {
    try {
      const data = await apiFetch('/referrals/stats');
      setStats(data);
    } catch {
      toast.error('获取返利统计失败');
    }
  }, []);

  const fetchLinks = useCallback(async () => {
    try {
      const data = await apiFetch('/referrals/links');
      setLinks(data.links || []);
    } catch {
      toast.error('获取推广链接失败');
    }
  }, []);

  const createLink = useCallback(async () => {
    try {
      await apiFetch('/referrals/link', { method: 'POST' });
      toast.success('推广链接已生成');
      fetchLinks();
      fetchStats();
    } catch {
      toast.error('生成推广链接失败');
    }
  }, [fetchLinks, fetchStats]);

  const fetchRelations = useCallback(async (tier: number, s: number) => {
    try {
      const data = await apiFetch(`/referrals/relations?tier=${tier}&skip=${s}&limit=${limit}`);
      setRelations(data.relations || []);
      setTotalRelations(data.total || 0);
    } catch {
      toast.error('获取推荐关系失败');
    }
  }, []);

  const fetchRecords = useCallback(async (status: string, s: number) => {
    try {
      const query = status ? `status=${status}&` : '';
      const data = await apiFetch(`/referrals/records?${query}skip=${s}&limit=${limit}`);
      setRecords(data.records || []);
      setTotalRecords(data.total || 0);
    } catch {
      toast.error('获取返利记录失败');
    }
  }, []);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('请输入有效的提现金额');
      return;
    }
    setWithdrawing(true);
    try {
      const data = await apiFetch('/referrals/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
      if (data.success) {
        toast.success(`提现申请已提交：¥${amount.toFixed(2)}`);
        setWithdrawAmount('');
        fetchStats();
        fetchRecords(recordStatus, 0);
      } else {
        toast.error(data.message || '提现失败');
      }
    } catch {
      toast.error('提现申请失败');
    } finally {
      setWithdrawing(false);
    }
  };

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchLinks()]);
      setLoading(false);
    };
    init();
  }, [fetchStats, fetchLinks]);

  // Tab content load - intentionally triggers data fetch on tab/filter changes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (activeTab === 'relations') {
      fetchRelations(relationTier, 0);
    } else if (activeTab === 'records') {
      fetchRecords(recordStatus, 0);
    }
  }, [activeTab, relationTier, recordStatus, fetchRelations, fetchRecords]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleCopyCode = (code: string) => {
    const link = `${window.location.origin}/register?ref=${code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedCode(code);
      toast.success('链接已复制');
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const handleTierChange = (tier: number) => {
    setRelationTier(tier);
    setSkip(0);
    fetchRelations(tier, 0);
  };

  const handleRecordStatusChange = (status: string) => {
    setRecordStatus(status);
    setSkip(0);
    fetchRecords(status, 0);
  };

  const paginate = (direction: 'prev' | 'next') => {
    const newSkip = direction === 'next' ? skip + limit : skip - limit;
    if (newSkip < 0) return;
    setSkip(newSkip);
    if (activeTab === 'relations') {
      fetchRelations(relationTier, newSkip);
    } else if (activeTab === 'records') {
      fetchRecords(recordStatus, newSkip);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      pending: { bg: 'rgba(255,152,0,0.15)', color: C.orange, label: '待发放' },
      paid: { bg: 'rgba(76,175,80,0.15)', color: C.green, label: '已发放' },
      cancelled: { bg: 'rgba(239,83,80,0.15)', color: C.red, label: '已取消' },
    };
    const s = map[status] || { bg: 'rgba(158,158,158,0.15)', color: C.textSecondary, label: status };
    return (
      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, backgroundColor: s.bg, color: s.color }}>
        {s.label}
      </span>
    );
  };

  const tierBadge = (tier: number) => {
    const colors = ['', C.green, C.secondary, C.orange];
    const labels = ['', '一级', '二级', '三级'];
    return (
      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, backgroundColor: `${colors[tier]}22`, color: colors[tier] || C.textSecondary }}>
        {labels[tier] || `T${tier}`}
      </span>
    );
  };

  if (loading) {
    return <div style={{ padding: 32, color: C.textSecondary }}>加载中...</div>;
  }

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-6">
            推广返利
          </h1>
          <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 4 }}>
            分享你的推广链接，成功邀请用户可获得返利奖励
          </p>
        </div>
        <button
          onClick={createLink}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: C.accent,
            color: '#121212',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.accentHover)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.accent)}
        >
          <RiLinksLine size={16} />
          生成推广链接
        </button>
      </div>

      {/* ── Stats Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard icon={<RiMoneyDollarCircleLine size={20} />} label="累计返利" value={`¥${(stats?.total_rewards || 0).toFixed(2)}`} color={C.accent} />
        <StatCard icon={<RiUserLine size={20} />} label="待提现" value={`¥${(stats?.pending_rewards || 0).toFixed(2)}`} color={C.orange} />
        <StatCard icon={<RiCheckLine size={20} />} label="已提现" value={`¥${(stats?.paid_rewards || 0).toFixed(2)}`} color={C.green} />
        <StatCard icon={<RiUserLine size={20} />} label="推荐人数" value={stats?.total_referrals || 0} color={C.secondary} />
      </div>

      {/* ── Withdraw Section ── */}
      <div style={{
        backgroundColor: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary, marginBottom: 4 }}>提现申请</div>
          <div style={{ fontSize: 12, color: C.textSecondary }}>当前可提现余额：<span style={{ color: C.accent, fontWeight: 600 }}>¥{(stats?.pending_rewards || 0).toFixed(2)}</span></div>
        </div>
        <input
          type="number"
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
          placeholder="输入金额"
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            backgroundColor: C.surface,
            color: C.textPrimary,
            fontSize: 13,
            width: 140,
            outline: 'none',
          }}
        />
        <button
          onClick={handleWithdraw}
          disabled={withdrawing}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: withdrawing ? C.textTertiary : C.secondary,
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: withdrawing ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { if (!withdrawing) e.currentTarget.style.backgroundColor = C.secondaryHover; }}
          onMouseLeave={(e) => { if (!withdrawing) e.currentTarget.style.backgroundColor = C.secondary; }}
        >
          {withdrawing ? '提交中...' : '申请提现'}
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === tab.key ? C.accent : C.textSecondary,
              fontSize: 13,
              fontWeight: activeTab === tab.key ? 600 : 400,
              cursor: 'pointer',
              borderBottom: activeTab === tab.key ? `2px solid ${C.accent}` : '2px solid transparent',
              transition: 'all 0.12s',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Links ── */}
      {activeTab === 'links' && (
        <div>
          {links.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
              color: C.textSecondary,
              backgroundColor: C.card,
              borderRadius: 12,
              border: `1px solid ${C.border}`,
            }}>
              <RiLinksLine size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
              <p style={{ fontSize: 14 }}>暂无推广链接</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>点击上方按钮生成你的第一个推广链接</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {links.map((link) => (
                <div
                  key={link.id}
                  style={{
                    backgroundColor: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <code style={{ fontSize: 14, fontWeight: 600, color: C.accent, backgroundColor: C.accentSubtle, padding: '2px 8px', borderRadius: 4 }}>
                        {link.code}
                      </code>
                      <span style={{ fontSize: 12, color: C.textTertiary }}>
                        {formatDate(link.created_at)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: C.textSecondary }}>
                      <span>点击 <strong style={{ color: C.textPrimary }}>{link.click_count}</strong> 次</span>
                      <span>注册 <strong style={{ color: C.textPrimary }}>{link.register_count}</strong> 人</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopyCode(link.code)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: `1px solid ${C.border}`,
                      backgroundColor: 'transparent',
                      color: copiedCode === link.code ? C.green : C.textSecondary,
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.12s',
                    }}
                  >
                    {copiedCode === link.code ? <RiCheckLine size={14} /> : <RiFileCopyLine size={14} />}
                    {copiedCode === link.code ? '已复制' : '复制链接'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Relations ── */}
      {activeTab === 'relations' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[1, 2, 3].map((tier) => (
              <button
                key={tier}
                onClick={() => handleTierChange(tier)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: `1px solid ${relationTier === tier ? C.accent : C.border}`,
                  backgroundColor: relationTier === tier ? C.accentSubtle : 'transparent',
                  color: relationTier === tier ? C.accent : C.textSecondary,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                {tier === 1 ? '一级' : tier === 2 ? '二级' : '三级'}（{(stats && stats[`tier${tier}_referrals` as keyof ReferralStats]) || 0}人）
              </button>
            ))}
          </div>

          <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: C.textSecondary }}>用户</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: C.textSecondary }}>层级</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: C.textSecondary }}>推荐时间</th>
                </tr>
              </thead>
              <tbody>
                {relations.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: '40px 16px', textAlign: 'center', color: C.textSecondary, fontSize: 13 }}>
                      暂无推荐关系
                    </td>
                  </tr>
                ) : (
                  relations.map((r) => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: C.textPrimary }}>{r.referee_name || '—'}</div>
                        <div style={{ fontSize: 12, color: C.textSecondary }}>{r.referee_id}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>{tierBadge(r.tier)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: C.textSecondary }}>{formatDate(r.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <span style={{ fontSize: 12, color: C.textSecondary }}>共 {totalRelations} 条</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => paginate('prev')}
                disabled={skip === 0}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: `1px solid ${C.border}`,
                  backgroundColor: 'transparent',
                  color: skip === 0 ? C.textTertiary : C.textSecondary,
                  fontSize: 12,
                  cursor: skip === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                上一页
              </button>
              <button
                onClick={() => paginate('next')}
                disabled={relations.length < limit}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: `1px solid ${C.border}`,
                  backgroundColor: 'transparent',
                  color: relations.length < limit ? C.textTertiary : C.textSecondary,
                  fontSize: 12,
                  cursor: relations.length < limit ? 'not-allowed' : 'pointer',
                }}
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Records ── */}
      {activeTab === 'records' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['', 'pending', 'paid', 'cancelled'].map((s) => (
              <button
                key={s}
                onClick={() => handleRecordStatusChange(s)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: `1px solid ${recordStatus === s ? C.accent : C.border}`,
                  backgroundColor: recordStatus === s ? C.accentSubtle : 'transparent',
                  color: recordStatus === s ? C.accent : C.textSecondary,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                {s === '' ? '全部' : s === 'pending' ? '待发放' : s === 'paid' ? '已发放' : '已取消'}
              </button>
            ))}
          </div>

          <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: C.textSecondary }}>用户</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: C.textSecondary }}>金额</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: C.textSecondary }}>层级</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: C.textSecondary }}>状态</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: C.textSecondary }}>时间</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: C.textSecondary, fontSize: 13 }}>
                      暂无返利记录
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: C.textPrimary }}>{r.referee_name || '—'}</div>
                        <div style={{ fontSize: 12, color: C.textSecondary }}>{r.referee_id}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: C.accent }}>¥{r.amount.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px' }}>{tierBadge(r.tier)}</td>
                      <td style={{ padding: '12px 16px' }}>{statusBadge(r.status)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: C.textSecondary }}>
                        {formatDate(r.created_at)}
                        {r.paid_at && <div style={{ fontSize: 11, color: C.textTertiary }}>发放: {formatDate(r.paid_at)}</div>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <span style={{ fontSize: 12, color: C.textSecondary }}>共 {totalRecords} 条</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => paginate('prev')}
                disabled={skip === 0}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: `1px solid ${C.border}`,
                  backgroundColor: 'transparent',
                  color: skip === 0 ? C.textTertiary : C.textSecondary,
                  fontSize: 12,
                  cursor: skip === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                上一页
              </button>
              <button
                onClick={() => paginate('next')}
                disabled={records.length < limit}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: `1px solid ${C.border}`,
                  backgroundColor: 'transparent',
                  color: records.length < limit ? C.textTertiary : C.textSecondary,
                  fontSize: 12,
                  cursor: records.length < limit ? 'not-allowed' : 'pointer',
                }}
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Stat Card ──
const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
  <div style={{
    backgroundColor: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  }}>
    <div style={{
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: `${color}18`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color,
      flexShrink: 0,
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary }}>{value}</div>
    </div>
  </div>
);

export default ReferralPage;
