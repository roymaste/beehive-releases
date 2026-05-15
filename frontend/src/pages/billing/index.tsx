import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  RiCheckLine,
  RiCloseLine,
  RiArrowRightLine,
  RiRefundLine,
} from 'react-icons/ri';
import apiClient from '../../api/client';

// ── Palette ──
const C = {
  orange: '#FF9800',
};// ── Types ──
interface Plan {
  id: string;
  name: string;
  type: 'free' | 'premium';
  price_monthly: number;
  price_yearly: number;
  env_quota: number;
  api_call_quota: number;
  can_invite: boolean;
  features: string[];
  sort_order?: number;
}

interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string | null;
  plan: Plan | null;
  billing_cycle: string;
  status: string;
  start_date: string;
  end_date: string | null;
  auto_renew: boolean;
}

interface Invoice {
  id: string;
  tenant_id: string;
  subscription_id: string | null;
  amount: number;
  status: string;
  billing_period_start: string | null;
  billing_period_end: string | null;
  paid_at: string | null;
  created_at: string;
}

// ── API helper ──
const apiFetch = async (path: string, options: { method?: string; body?: string } = {}) => {
  const res = await apiClient.request({
    url: path,
    method: options.method || 'GET',
    data: options.body ? JSON.parse(options.body) : undefined,
  });
  return res.data;
};

// ── Feature labels ──
const ALL_FEATURES = ['基础指纹环境', '基础代理支持', '团队协作', '优先支持'];

const PLAN_ORDER = ['free', 'premium'];

const BillingPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'plans' | 'invoices'>('plans');

  // Fetch data
  const fetchPlans = useCallback(async () => {
    const data = await apiFetch('/billing/plans');
    return data.plans as Plan[];
  }, []);

  const fetchSubscription = useCallback(async () => {
    try {
      return await apiFetch('/billing/subscription') as Subscription | null;
    } catch {
      return null;
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    const data = await apiFetch('/billing/invoices?limit=50');
    return (data.invoices || []) as Invoice[];
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [plansData, subData, invoicesData] = await Promise.all([
          fetchPlans(),
          fetchSubscription(),
          fetchInvoices(),
        ]);
        setPlans(plansData.sort((a, b) => a.sort_order - b.sort_order));
        setSubscription(subData);
        setInvoices(invoicesData);
      } catch (e: any) {
        toast.error(e.message || '获取数据失败');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchPlans, fetchSubscription, fetchInvoices]);

  // Get current plan code
  const currentPlanCode = subscription?.plan?.type || 'free';

    // Handle upgrade/subscribe
  const handleSubscribe = async (planCode: string, billingCycle: string = 'monthly') => {
    setUpgrading(planCode);
    try {
      const sub = await apiFetch('/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({ plan_code: planCode, billing_cycle: billingCycle }),
      });
      setSubscription(sub);
      toast.success('订阅成功！');
    } catch (e: any) {
      toast.error(e.message || '订阅失败');
    } finally {
      setUpgrading(null);
    }
  };

  const { confirm, dialog } = useConfirmDialog();

  // Handle cancel
  const handleCancel = async () => {
    confirm({
      title: '取消订阅',
      description: '确定要取消订阅吗？取消后将降级为免费套餐。',
      onConfirm: async () => {
        try {
          await apiFetch('/billing/subscription', { method: 'DELETE' });
          setSubscription(null);
          toast.success('订阅已取消');
          // Refresh to get updated data
          const plansData = await fetchPlans();
          setPlans(plansData);
        } catch (e: any) {
          toast.error(e.message || '取消失败');
        }
      },
    });
  };

  // Format price
  const formatPrice = (price: number) => {
    if (price === 0) return '免费';
    return `¥${price}`;
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // Status badge
  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      pending: { bg: 'rgba(255,152,0,0.15)', color: C.orange, label: '待支付' },
      paid: { bg: 'rgba(76,175,80,0.15)', color: 'var(--success)', label: '已支付' },
      failed: { bg: 'rgba(239,83,80,0.15)', color: 'var(--error)', label: '失败' },
      canceled: { bg: 'rgba(158,158,158,0.15)', color: 'var(--text-secondary)', label: '已取消' },
    };
    const s = map[status] || { bg: 'rgba(158,158,158,0.15)', color: 'var(--text-secondary)', label: status };
    return (
      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, backgroundColor: s.bg, color: s.color }}>
        {s.label}
      </span>
    );
  };

  if (loading) {
    return <div style={{ padding: 32, color: 'var(--text-secondary)' }}>加载中...</div>;
  }

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="text-2xl font-semibold text-foreground mb-6">
          计费管理
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          管理和升级您的订阅套餐
        </p>
      </div>

      {/* ── Current Plan Card ── */}
      {subscription && (
        <div style={{
          backgroundColor: 'var(--card-bg)',
          border: `1px solid ${'var(--divider)'}`,
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>当前套餐</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--hive-gold)' }}>
                {subscription.plan?.name || 'Free'}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {subscription.billing_cycle === 'monthly' ? '月付' : '年付'}
              </span>
              <span style={{
                fontSize: 12,
                padding: '2px 8px',
                borderRadius: 4,
                backgroundColor: subscription.status === 'active' ? 'rgba(76,175,80,0.15)' : 'rgba(255,152,0,0.15)',
                color: subscription.status === 'active' ? 'var(--success)' : C.orange,
              }}>
                {subscription.status === 'active' ? '有效' : subscription.status}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
              到期时间：{formatDate(subscription.end_date)}
              {subscription.auto_renew && <span style={{ marginLeft: 12 }}>• 自动续费</span>}
            </div>
          </div>
          {currentPlanCode === 'premium' && (
            <button
              onClick={handleCancel}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: `1px solid ${'var(--divider)'}`,
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              取消订阅
            </button>
          )}
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${'var(--divider)'}`, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('plans')}
          style={{
            padding: '8px 16px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'plans' ? 'var(--hive-gold)' : 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: activeTab === 'plans' ? 600 : 400,
            cursor: 'pointer',
            borderBottom: activeTab === 'plans' ? `2px solid ${'var(--hive-gold)'}` : '2px solid transparent',
            marginBottom: -1,
          }}
        >
          套餐对比
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          style={{
            padding: '8px 16px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'invoices' ? 'var(--hive-gold)' : 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: activeTab === 'invoices' ? 600 : 400,
            cursor: 'pointer',
            borderBottom: activeTab === 'invoices' ? `2px solid ${'var(--hive-gold)'}` : '2px solid transparent',
            marginBottom: -1,
          }}
        >
          账单历史
        </button>
      </div>

      {/* ── Plans Comparison ── */}
      {activeTab === 'plans' && (
        <div>
          {/* Price display toggle could go here */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(plans.length, 4)}, 1fr)`, gap: 16, marginBottom: 32 }}>
            {plans.map((plan) => {
              const isCurrent = plan.type === currentPlanCode;
              const isUpgrade = PLAN_ORDER.indexOf(plan.type) > PLAN_ORDER.indexOf(currentPlanCode);

              return (
                <div
                  key={plan.id}
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    border: `1px solid ${isCurrent ? 'var(--hive-gold)' : 'var(--divider)'}`,
                    borderRadius: 12,
                    padding: 20,
                    position: 'relative',
                    ...(plan.type === 'premium' ? { borderColor: 'var(--hive-blue)' } : {}),
                  }}
                >
                  {plan.type === 'premium' && (
                    <div style={{
                      position: 'absolute',
                      top: -10,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'var(--hive-blue)',
                      color: '#fff',
                      fontSize: 11,
                      padding: '2px 12px',
                      borderRadius: 10,
                      fontWeight: 600,
                    }}>
                      推荐
                    </div>
                  )}

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {plan.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {plan.type === 'premium' ? '适合专业用户和团队' : '基础功能免费使用'}
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--hive-gold)' }}>
                      {formatPrice(plan.price_monthly)}
                    </span>
                    {plan.price_monthly > 0 && (
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>/月</span>
                    )}
                  </div>

                  {/* Features */}
                  <div style={{ marginBottom: 20 }}>
                    {ALL_FEATURES.map((label) => {
                      const hasFeature = plan.features.includes(label);
                      return (
                        <div key={label} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginBottom: 6,
                          fontSize: 12,
                          color: hasFeature ? 'var(--text-primary)' : 'var(--text-tertiary)',
                        }}>
                          {hasFeature ? (
                            <RiCheckLine size={14} style={{ color: 'var(--success)' }} />
                          ) : (
                            <RiCloseLine size={14} style={{ color: 'var(--text-tertiary)' }} />
                          )}
                          <span>{label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Limits */}
                  <div style={{
                    padding: '12px',
                    backgroundColor: 'var(--card-bg)',
                    borderRadius: 8,
                    marginBottom: 20,
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                  }}>
                    <div style={{ marginBottom: 4 }}>额度限制</div>
                    <div>环境数：{plan.env_quota === 99999 ? '无限制' : plan.env_quota}</div>
                    <div>API日限额：{plan.api_call_quota === 99999 ? '无限制' : plan.api_call_quota}</div>
                    <div>邀请成员：{plan.can_invite ? '是' : '否'}</div>
                  </div>

                  {/* Action button */}
                  {isCurrent ? (
                    <button
                      disabled
                      style={{
                        width: '100%',
                        padding: '9px 0',
                        borderRadius: 8,
                        border: 'none',
                        backgroundColor: 'rgba(255,193,7,0.10)',
                        color: 'var(--hive-gold)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'not-allowed',
                      }}
                    >
                      当前套餐
                    </button>
                  ) : isUpgrade ? (
                    <button
                      onClick={() => handleSubscribe(plan.type)}
                      disabled={upgrading === plan.type}
                      style={{
                        width: '100%',
                        padding: '9px 0',
                        borderRadius: 8,
                        border: 'none',
                        backgroundColor: upgrading === plan.type ? 'var(--text-tertiary)' : 'var(--hive-gold)',
                        color: '#121212',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: upgrading === plan.type ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                      onMouseEnter={(e) => { if (upgrading !== plan.type) e.currentTarget.style.backgroundColor = 'var(--hive-gold-hover)'; }}
                      onMouseLeave={(e) => { if (upgrading !== plan.type) e.currentTarget.style.backgroundColor = 'var(--hive-gold)'; }}
                    >
                      {upgrading === plan.type ? '处理中...' : (
                        <>
                          升级到{plan.name} <RiArrowRightLine size={14} />
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      disabled
                      style={{
                        width: '100%',
                        padding: '9px 0',
                        borderRadius: 8,
                        border: `1px solid ${'var(--divider)'}`,
                        backgroundColor: 'transparent',
                        color: 'var(--text-tertiary)',
                        fontSize: 13,
                        cursor: 'not-allowed',
                      }}
                    >
                      降级
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Invoice History ── */}
      {activeTab === 'invoices' && (
        <div>
          {invoices.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--card-bg)',
              borderRadius: 12,
              border: `1px solid ${'var(--divider)'}`,
            }}>
              <RiRefundLine size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
              <p style={{ fontSize: 14 }}>暂无账单记录</p>
            </div>
          ) : (
            <div style={{ backgroundColor: 'var(--card-bg)', border: `1px solid ${'var(--divider)'}`, borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--card-bg)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', borderBottom: `1px solid ${'var(--divider)'}` }}>
                      账单金额
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', borderBottom: `1px solid ${'var(--divider)'}` }}>
                      状态
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', borderBottom: `1px solid ${'var(--divider)'}` }}>
                      计费周期
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', borderBottom: `1px solid ${'var(--divider)'}` }}>
                      创建时间
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', borderBottom: `1px solid ${'var(--divider)'}` }}>
                      支付时间
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice, idx) => (
                    <tr key={invoice.id} style={{ backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--card-bg)' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)', borderBottom: `1px solid ${'var(--divider)'}` }}>
                        <span style={{ fontWeight: 600, color: invoice.amount > 0 ? 'var(--hive-gold)' : 'var(--text-secondary)' }}>
                          {invoice.amount > 0 ? `¥${invoice.amount.toFixed(2)}` : '免费'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${'var(--divider)'}` }}>
                        {statusBadge(invoice.status)}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)', borderBottom: `1px solid ${'var(--divider)'}` }}>
                        {invoice.billing_period_start && invoice.billing_period_end
                          ? `${formatDate(invoice.billing_period_start)} ~ ${formatDate(invoice.billing_period_end)}`
                          : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)', borderBottom: `1px solid ${'var(--divider)'}` }}>
                        {formatDate(invoice.created_at)}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)', borderBottom: `1px solid ${'var(--divider)'}` }}>
                        {formatDate(invoice.paid_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {dialog}
    </div>
  );
};

export default BillingPage;
