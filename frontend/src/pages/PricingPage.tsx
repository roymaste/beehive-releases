import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiCheckLine, RiArrowRightSLine } from 'react-icons/ri';

// Beehive Design System Colors


const RADIUS_CARD = 16;
const RADIUS_SM = 10;
const RADIUS_BTN = 8;

interface Plan {
  id: number;
  name: string;
  type: string;
  price_monthly: number;
  price_yearly: number;
  env_quota: number;
  api_call_quota: number;
  can_invite: boolean;
  features: string[];
  is_active: boolean;
}

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Fetch plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch('/api/v1/billing/plans');
        const data = await res.json();
        if (data.code === 0) {
          setPlans(data.data.plans || []);
        }
      } catch (err) {
        console.error('Failed to fetch plans:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  // Check if user is logged in
  const isLoggedIn = !!localStorage.getItem('access_token');

  const handleSubscribe = (_planId: number) => {
    if (!isLoggedIn) {
      navigate('/register');
      return;
    }
    // Navigate to billing page for subscription
    navigate('/billing');
  };

  // Format price
  const formatPrice = (cents: number): string => {
    if (cents === 0) return '免费';
    return `¥${(cents / 100).toFixed(0)}`;
  };

  // Get yearly discount
  const getYearlyDiscount = (plan: Plan): string => {
    if (plan.price_monthly === 0) return '';
    const monthlyTotal = plan.price_monthly * 12;
    const savings = monthlyTotal - plan.price_yearly;
    const percent = Math.round((savings / monthlyTotal) * 100);
    return `省${percent}%`;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${'var(--page-bg)'} 0%, #0a0a0a 100%)`,
        padding: '80px 24px 120px',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto 60px' }}>
        <h1
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: 0,
            marginBottom: 16,
            letterSpacing: '-0.02em',
          }}
        >
          选择适合您的方案
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-secondary)', margin: 0 }}>
          释放社交媒体运营的无限可能，从蜂巢智能体开始
        </p>

        {/* Billing cycle toggle */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 32,
            padding: 4,
            background: 'var(--card-bg)',
            borderRadius: RADIUS_SM,
            border: `1px solid ${'var(--divider)'}`,
          }}
        >
          <button
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '8px 20px',
              background: billingCycle === 'monthly' ? 'var(--hive-gold)' : 'transparent',
              color: billingCycle === 'monthly' ? 'var(--page-bg)' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: RADIUS_BTN,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            月付
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            style={{
              padding: '8px 20px',
              background: billingCycle === 'yearly' ? 'var(--hive-gold)' : 'transparent',
              color: billingCycle === 'yearly' ? 'var(--page-bg)' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: RADIUS_BTN,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative',
            }}
          >
            年付
            <span
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                padding: '2px 6px',
                background: 'var(--success)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 600,
                borderRadius: 999,
              }}
            >
              推荐
            </span>
          </button>
        </div>
      </div>

      {/* Plans */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          加载中...
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
            maxWidth: 1000,
            margin: '0 auto',
          }}
        >
          {plans.map(plan => {
            const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
            const isFree = price === 0;
            const isPremium = plan.type === 'premium';

            return (
              <div
                key={plan.id}
                style={{
                  background: 'var(--card-bg)',
                  border: `1px solid ${isPremium ? 'var(--hive-gold)' : 'var(--divider)'}`,
                  borderRadius: RADIUS_CARD,
                  padding: 32,
                  position: 'relative',
                  boxShadow: isPremium ? `0 0 60px rgba(255,193,7,0.15)` : '0 8px 32px rgba(0,0,0,0.4)',
                  transform: isPremium ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {/* Popular badge */}
                {isPremium && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '4px 16px',
                      background: 'var(--hive-gold)',
                      color: 'var(--page-bg)',
                      fontSize: 12,
                      fontWeight: 700,
                      borderRadius: 999,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    最受欢迎
                  </div>
                )}

                {/* Plan name & type */}
                <div style={{ marginBottom: 24 }}>
                  <h3
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      margin: 0,
                      marginBottom: 8,
                    }}
                  >
                    {plan.name}
                  </h3>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                    {isFree ? '适合个人用户入门使用' : '适合团队和专业人士'}
                  </p>
                </div>

                {/* Price */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span
                      style={{
                        fontSize: 48,
                        fontWeight: 800,
                        color: isFree ? 'var(--success)' : 'var(--hive-gold)',
                      }}
                    >
                      {formatPrice(price)}
                    </span>
                    {!isFree && (
                      <span style={{ fontSize: 16, color: 'var(--text-tertiary)' }}>
                        /{billingCycle === 'monthly' ? '月' : '年'}
                      </span>
                    )}
                  </div>
                  {billingCycle === 'yearly' && plan.price_yearly > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          background: 'rgba(76,175,80,0.12)',
                          color: 'var(--success)',
                          fontSize: 12,
                          fontWeight: 600,
                          borderRadius: 999,
                        }}
                      >
                        {getYearlyDiscount(plan)}
                      </span>
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '14px 24px',
                    background: isPremium ? 'var(--hive-gold)' : 'transparent',
                    color: isPremium ? 'var(--page-bg)' : 'var(--hive-gold)',
                    border: `1px solid ${'var(--hive-gold)'}`,
                    borderRadius: RADIUS_BTN,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginBottom: 32,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isPremium ? 'var(--hive-gold-hover)' : 'rgba(255,193,7,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isPremium ? 'var(--hive-gold)' : 'transparent';
                  }}
                >
                  {isLoggedIn ? '立即订阅' : '免费开始'}
                  <RiArrowRightSLine size={20} />
                </button>

                {/* Features */}
                <div style={{ borderTop: `1px solid ${'var(--divider)'}`, paddingTop: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    功能权益
                  </div>
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <li style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: 'var(--success)' }}>
                        <RiCheckLine size={18} />
                      </span>
                      <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                        <strong>{plan.env_quota}</strong> 个浏览器环境
                      </span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: 'var(--success)' }}>
                        <RiCheckLine size={18} />
                      </span>
                      <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                        <strong>{plan.api_call_quota.toLocaleString()}</strong> 次 API 调用/{billingCycle === 'monthly' ? '月' : '年'}
                      </span>
                    </li>
                    {plan.can_invite && (
                      <li style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ color: 'var(--success)' }}>
                          <RiCheckLine size={18} />
                        </span>
                        <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                          团队协作 & 邀请成员
                        </span>
                      </li>
                    )}
                    {(plan.features || []).map((feature, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ color: 'var(--success)' }}>
                          <RiCheckLine size={18} />
                        </span>
                        <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comparison table */}
      <div style={{ maxWidth: 1000, margin: '80px auto 0' }}>
        <h2
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: 'var(--text-primary)',
            textAlign: 'center',
            marginBottom: 40,
          }}
        >
          功能对比
        </h2>
        <div
          style={{
            background: 'var(--card-bg)',
            border: `1px solid ${'var(--divider)'}`,
            borderRadius: RADIUS_CARD,
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>
                  功能
                </th>
                {plans.map(plan => (
                  <th
                    key={plan.id}
                    style={{
                      padding: '16px 24px',
                      textAlign: 'center',
                      fontSize: 16,
                      color: plan.type === 'premium' ? 'var(--hive-gold)' : 'var(--text-primary)',
                      fontWeight: 700,
                    }}
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '14px 24px', fontSize: 14, color: 'var(--text-secondary)', borderTop: `1px solid ${'var(--divider)'}` }}>
                  环境配额
                </td>
                {plans.map(plan => (
                  <td
                    key={plan.id}
                    style={{ padding: '14px 24px', textAlign: 'center', fontSize: 14, color: 'var(--text-primary)', borderTop: `1px solid ${'var(--divider)'}` }}
                  >
                    {plan.env_quota}
                  </td>
                ))}
              </tr>
              <tr style={{ background: 'rgba(255,255,255,0.01)' }}>
                <td style={{ padding: '14px 24px', fontSize: 14, color: 'var(--text-secondary)', borderTop: `1px solid ${'var(--divider)'}` }}>
                  API调用配额/月
                </td>
                {plans.map(plan => (
                  <td
                    key={plan.id}
                    style={{ padding: '14px 24px', textAlign: 'center', fontSize: 14, color: 'var(--text-primary)', borderTop: `1px solid ${'var(--divider)'}` }}
                  >
                    {plan.api_call_quota.toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ padding: '14px 24px', fontSize: 14, color: 'var(--text-secondary)', borderTop: `1px solid ${'var(--divider)'}` }}>
                  团队邀请
                </td>
                {plans.map(plan => (
                  <td
                    key={plan.id}
                    style={{ padding: '14px 24px', textAlign: 'center', fontSize: 14, color: plan.can_invite ? 'var(--success)' : 'var(--text-tertiary)', borderTop: `1px solid ${'var(--divider)'}` }}
                  >
                    {plan.can_invite ? <RiCheckLine size={18} /> : '—'}
                  </td>
                ))}
              </tr>
              <tr style={{ background: 'rgba(255,255,255,0.01)' }}>
                <td style={{ padding: '14px 24px', fontSize: 14, color: 'var(--text-secondary)', borderTop: `1px solid ${'var(--divider)'}` }}>
                  月付价格
                </td>
                {plans.map(plan => (
                  <td
                    key={plan.id}
                    style={{ padding: '14px 24px', textAlign: 'center', fontSize: 14, color: plan.price_monthly === 0 ? 'var(--success)' : 'var(--hive-gold)', fontWeight: 600, borderTop: `1px solid ${'var(--divider)'}` }}
                  >
                    {formatPrice(plan.price_monthly)}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ padding: '14px 24px', fontSize: 14, color: 'var(--text-secondary)', borderTop: `1px solid ${'var(--divider)'}` }}>
                  年付价格
                </td>
                {plans.map(plan => (
                  <td
                    key={plan.id}
                    style={{ padding: '14px 24px', textAlign: 'center', fontSize: 14, color: plan.price_yearly === 0 ? 'var(--success)' : 'var(--hive-gold)', fontWeight: 600, borderTop: `1px solid ${'var(--divider)'}` }}
                  >
                    {formatPrice(plan.price_yearly)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ placeholder */}
      <div style={{ maxWidth: 800, margin: '80px auto 0', textAlign: 'center' }}>
        <h2 style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>
          常见问题
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, textAlign: 'left' }}>
          {[
            { q: '如何升级套餐？', a: '您可以随时在账户设置中升级或降级您的订阅计划。' },
            { q: '配额用完怎么办？', a: '您可以购买额外的API配额包，或者等待下个计费周期配额重置。' },
            { q: '年付可以退款吗？', a: '年付订阅在开通7天内可申请全额退款，之后不予退款。' },
            { q: '如何邀请团队成员？', a: '高级版用户可以在团队设置中生成邀请链接。' },
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--card-bg)',
                border: `1px solid ${'var(--divider)'}`,
                borderRadius: RADIUS_SM,
                padding: 20,
              }}
            >
              <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                {item.q}
              </h4>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
