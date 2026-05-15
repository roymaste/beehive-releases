import React, { useEffect, useState } from 'react';
import {
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import apiClient from '../../api/client';

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

interface PlanFormData {
  name: string;
  type: 'basic' | 'premium';
  price_monthly: number;
  price_yearly: number;
  env_quota: number;
  api_call_quota: number;
  can_invite: boolean;
  features: string[];
  is_active: boolean;
}

const emptyForm: PlanFormData = {
  name: '',
  type: 'basic',
  price_monthly: 0,
  price_yearly: 0,
  env_quota: 10,
  api_call_quota: 100,
  can_invite: false,
  features: [],
  is_active: true,
};

// Format price from fen to yuan
const formatPrice = (cents: number): string => {
  if (cents === 0) return '免费';
  return `¥${(cents / 100).toFixed(2)}`;
};

const AdminBillingPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(emptyForm);
  const [featuresInput, setFeaturesInput] = useState('');
  const [saving, setSaving] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  // Fetch plans
  const fetchPlans = async () => {
    try {
      const res = await apiClient.get('/admin/plans');
      const data = res.data;
      if (data.code === 0) {
        setPlans(data.data.plans || []);
      } else {
        toast.error(data.message || '获取套餐列表失败');
      }
    } catch (err) {
      toast.error('获取套餐列表失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Open modal for create/edit
  const openModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        type: plan.type as 'basic' | 'premium',
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly,
        env_quota: plan.env_quota,
        api_call_quota: plan.api_call_quota,
        can_invite: plan.can_invite,
        features: plan.features || [],
        is_active: plan.is_active,
      });
      setFeaturesInput((plan.features || []).join('\n'));
    } else {
      setEditingPlan(null);
      setFormData(emptyForm);
      setFeaturesInput('');
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPlan(null);
    setFormData(emptyForm);
    setFeaturesInput('');
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const features = featuresInput
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    const payload = {
      ...formData,
      features,
    };

    try {
      const url = editingPlan
        ? `/admin/plans/${editingPlan.id}`
        : '/admin/plans';
      const method = editingPlan ? 'put' : 'post';

      const res = await apiClient.request({
        url,
        method,
        data: payload,
      });

      const data = res.data;
      if (data.code === 0) {
        toast.success(editingPlan ? '套餐已更新' : '套餐已创建');
        closeModal();
        fetchPlans();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch (err) {
      toast.error('操作失败');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Handle delete (soft delete)
  const handleDelete = async (plan: Plan) => {
    confirm({
      title: '下架确认',
      description: `确定要下架「${plan.name}」吗？`,
      onConfirm: async () => {
        try {
          const res = await apiClient.delete(`/admin/plans/${plan.id}`);
          const data = res.data;
          if (data.code === 0) {
            toast.success('套餐已下架');
            fetchPlans();
          } else {
            toast.error(data.message || '操作失败');
          }
        } catch (err) {
          toast.error('操作失败');
          console.error(err);
        }
      },
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-6">
            套餐管理
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
            配置和管理订阅套餐
          </p>
        </div>
        <button
          onClick={() => openModal()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 16px',
            background: 'var(--hive-gold)',
            color: 'var(--page-bg)',
            border: 'none',
            borderRadius: RADIUS_BTN,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <RiAddLine size={18} />
          新建套餐
        </button>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
          加载中...
        </div>
      ) : plans.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
          暂无套餐数据
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {plans.map(plan => (
            <div
              key={plan.id}
              style={{
                background: 'var(--card-bg)',
                border: `1px solid ${'var(--divider)'}`,
                borderRadius: RADIUS_CARD,
                padding: 20,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                opacity: plan.is_active ? 1 : 0.6,
              }}
            >
              {/* Plan header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {plan.name}
                  </h3>
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: 4,
                      padding: '2px 8px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 500,
                      background: plan.type === 'premium' ? 'rgba(255,193,7,0.12)' : 'rgba(25,118,210,0.12)',
                      color: plan.type === 'premium' ? 'var(--hive-gold)' : 'var(--hive-blue)',
                      border: `1px solid ${plan.type === 'premium' ? 'rgba(255,193,7,0.2)' : 'rgba(25,118,210,0.2)'}`,
                    }}
                  >
                    {plan.type === 'premium' ? '高级版' : '基础版'}
                  </span>
                </div>
                {!plan.is_active && (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 500,
                      background: 'rgba(244,67,54,0.12)',
                      color: 'var(--error)',
                      border: '1px solid rgba(244,67,54,0.2)',
                    }}
                  >
                    已下架
                  </span>
                )}
              </div>

              {/* Price */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>月付</span>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--hive-gold)' }}>
                      {formatPrice(plan.price_monthly)}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>年付</span>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--hive-gold)' }}>
                      {formatPrice(plan.price_yearly)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quotas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: RADIUS_SM }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>环境配额</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{plan.env_quota}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: RADIUS_SM }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>API调用/月</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{plan.api_call_quota.toLocaleString()}</div>
                </div>
              </div>

              {/* Features */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>功能</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {plan.can_invite && (
                    <span style={{ padding: '3px 8px', background: 'rgba(76,175,80,0.12)', color: 'var(--success)', borderRadius: 999, fontSize: 11 }}>
                      团队邀请
                    </span>
                  )}
                  {(plan.features || []).slice(0, 3).map((f, i) => (
                    <span key={i} style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', borderRadius: 999, fontSize: 11 }}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => openModal(plan)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '8px 12px',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    border: `1px solid ${'var(--divider)'}`,
                    borderRadius: RADIUS_BTN,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  <RiEditLine size={14} />
                  编辑
                </button>
                {plan.is_active ? (
                  <button
                    onClick={() => handleDelete(plan)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: '8px 12px',
                      background: 'transparent',
                      color: 'var(--error)',
                      border: `1px solid rgba(244,67,54,0.3)`,
                      borderRadius: RADIUS_BTN,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    <RiDeleteBinLine size={14} />
                    下架
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              borderRadius: RADIUS_CARD,
              padding: 24,
              width: '100%',
              maxWidth: 560,
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {editingPlan ? '编辑套餐' : '新建套餐'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <RiCloseLine size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Name */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>套餐名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--page-bg)',
                    border: `1px solid ${'var(--divider)'}`,
                    borderRadius: RADIUS_BTN,
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Type */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>套餐类型</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['basic', 'premium'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type as 'basic' | 'premium' })}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        background: formData.type === type ? 'var(--hive-gold)' : 'transparent',
                        color: formData.type === type ? 'var(--page-bg)' : 'var(--text-secondary)',
                        border: `1px solid ${formData.type === type ? 'var(--hive-gold)' : 'var(--divider)'}`,
                        borderRadius: RADIUS_BTN,
                        fontSize: 14,
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      {type === 'basic' ? '基础版' : '高级版'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prices */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>月付价格（分）</label>
                  <input
                    type="number"
                    value={formData.price_monthly}
                    onChange={e => setFormData({ ...formData, price_monthly: parseInt(e.target.value) || 0 })}
                    required
                    min={0}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--page-bg)',
                      border: `1px solid ${'var(--divider)'}`,
                      borderRadius: RADIUS_BTN,
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>年付价格（分）</label>
                  <input
                    type="number"
                    value={formData.price_yearly}
                    onChange={e => setFormData({ ...formData, price_yearly: parseInt(e.target.value) || 0 })}
                    required
                    min={0}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--page-bg)',
                      border: `1px solid ${'var(--divider)'}`,
                      borderRadius: RADIUS_BTN,
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Quotas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>环境配额</label>
                  <input
                    type="number"
                    value={formData.env_quota}
                    onChange={e => setFormData({ ...formData, env_quota: parseInt(e.target.value) || 0 })}
                    required
                    min={0}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--page-bg)',
                      border: `1px solid ${'var(--divider)'}`,
                      borderRadius: RADIUS_BTN,
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>API调用配额/月</label>
                  <input
                    type="number"
                    value={formData.api_call_quota}
                    onChange={e => setFormData({ ...formData, api_call_quota: parseInt(e.target.value) || 0 })}
                    required
                    min={0}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--page-bg)',
                      border: `1px solid ${'var(--divider)'}`,
                      borderRadius: RADIUS_BTN,
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Can Invite */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.can_invite}
                    onChange={e => setFormData({ ...formData, can_invite: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: 'var(--hive-gold)' }}
                  />
                  <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>支持团队邀请</span>
                </label>
              </div>

              {/* Is Active */}
              {editingPlan && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: 'var(--hive-gold)' }}
                    />
                    <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>上架销售</span>
                  </label>
                </div>
              )}

              {/* Features */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>功能列表（每行一个）</label>
                <textarea
                  value={featuresInput}
                  onChange={e => setFeaturesInput(e.target.value)}
                  rows={4}
                  placeholder="10个环境&#10;100次API调用&#10;免费体验"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--page-bg)',
                    border: `1px solid ${'var(--divider)'}`,
                    borderRadius: RADIUS_BTN,
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Submit */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    border: `1px solid ${'var(--divider)'}`,
                    borderRadius: RADIUS_BTN,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '12px',
                    background: 'var(--hive-gold)',
                    color: 'var(--page-bg)',
                    border: 'none',
                    borderRadius: RADIUS_BTN,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {dialog}
    </div>
  );
};

export default AdminBillingPage;
