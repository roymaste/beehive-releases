import React, { useEffect, useState } from 'react';
import {
  RiShieldLine,
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiRefreshLine,
  RiCloseLine,
  RiCheckLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import { useConfirmDialog } from '../../components/ui/confirm-dialog';
import { contentPolicyAPI, ContentRule } from '../../api/admin';

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

const RADIUS_CARD = 16;
const RADIUS_SM = 10;
const RADIUS_BTN = 8;

const RULE_TYPE_LABELS: Record<string, string> = {
  input_ban: '输入过滤',
  output_ban: '输出过滤',
  injection_keyword: '注入防护',
};

const RULE_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  input_ban: { bg: 'rgba(244,67,54,0.12)', color: '#F44336' },
  output_ban: { bg: 'rgba(76,175,80,0.12)', color: '#4CAF50' },
  injection_keyword: { bg: 'rgba(255,193,7,0.12)', color: '#FFC107' },
};

const emptyRuleForm: Omit<ContentRule, 'id' | 'created_at' | 'updated_at'> = {
  rule_type: 'input_ban',
  pattern: '',
  is_regex: false,
  enabled: true,
  description: '',
};

const ContentPolicyPage: React.FC = () => {
  // ── Rules state ──
  const [rules, setRules] = useState<ContentRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<ContentRule | null>(null);
  const [ruleForm, setRuleForm] = useState(emptyRuleForm);
  const [savingRule, setSavingRule] = useState(false);

  // ── System prompt state ──
  const [systemPrompt, setSystemPrompt] = useState('');
  const [forbiddenBehaviors, setForbiddenBehaviors] = useState<string[]>([]);
  const [newBehavior, setNewBehavior] = useState('');
  const [promptLoading, setPromptLoading] = useState(true);
  const [savingPrompt, setSavingPrompt] = useState(false);

  const { confirm, dialog } = useConfirmDialog();

  // ── Fetch rules ──
  const fetchRules = async () => {
    setRulesLoading(true);
    try {
      const res = await contentPolicyAPI.listRules();
      setRules(res.data.rules || []);
    } catch {
      toast.error('获取内容规则失败');
    } finally {
      setRulesLoading(false);
    }
  };

  // ── Fetch system prompt ──
  const fetchSystemPrompt = async () => {
    setPromptLoading(true);
    try {
      const res = await contentPolicyAPI.getSystemPrompt();
      setSystemPrompt(res.data.base_prompt || '');
      setForbiddenBehaviors(res.data.prohibited_behaviors || []);
    } catch {
      toast.error('获取系统 Prompt 配置失败');
    } finally {
      setPromptLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
    fetchSystemPrompt();
  }, []);

  // ── Rule modal ──
  const openRuleModal = (rule?: ContentRule) => {
    if (rule) {
      setEditingRule(rule);
      setRuleForm({
        rule_type: rule.rule_type,
        pattern: rule.pattern,
        is_regex: rule.is_regex,
        enabled: rule.enabled,
        description: rule.description || '',
      });
    } else {
      setEditingRule(null);
      setRuleForm(emptyRuleForm);
    }
    setShowRuleModal(true);
  };

  const closeRuleModal = () => {
    setShowRuleModal(false);
    setEditingRule(null);
    setRuleForm(emptyRuleForm);
  };

  // ── Save rule ──
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRule(true);
    try {
      if (editingRule) {
        await contentPolicyAPI.updateRule(editingRule.id, ruleForm);
        toast.success('规则已更新');
      } else {
        await contentPolicyAPI.createRule(ruleForm);
        toast.success('规则已创建');
      }
      closeRuleModal();
      fetchRules();
    } catch {
      toast.error(editingRule ? '更新规则失败' : '创建规则失败');
    } finally {
      setSavingRule(false);
    }
  };

  // ── Delete rule ──
  const handleDeleteRule = (rule: ContentRule) => {
    confirm({
      title: '删除规则',
      description: `确定删除规则「${rule.pattern}」？此操作不可恢复。`,
      onConfirm: async () => {
        try {
          await contentPolicyAPI.deleteRule(rule.id);
          toast.success('规则已删除');
          fetchRules();
        } catch {
          toast.error('删除规则失败');
        }
      },
    });
  };

  // ── Toggle rule enabled ──
  const handleToggleRule = async (rule: ContentRule) => {
    try {
      await contentPolicyAPI.updateRule(rule.id, { enabled: !rule.enabled });
      toast.success(rule.enabled ? '规则已禁用' : '规则已启用');
      fetchRules();
    } catch {
      toast.error('操作失败');
    }
  };

  // ── Save system prompt ──
  const handleSavePrompt = async () => {
    setSavingPrompt(true);
    try {
      await contentPolicyAPI.updateSystemPrompt({
        base_prompt: systemPrompt,
        prohibited_behaviors: forbiddenBehaviors.filter((b) => b.trim().length > 0),
      });
      toast.success('系统 Prompt 已保存');
    } catch {
      toast.error('保存失败');
    } finally {
      setSavingPrompt(false);
    }
  };

  // ── Add forbidden behavior ──
  const handleAddBehavior = () => {
    const trimmed = newBehavior.trim();
    if (!trimmed) return;
    if (forbiddenBehaviors.includes(trimmed)) {
      toast.error('该行为已存在');
      return;
    }
    setForbiddenBehaviors([...forbiddenBehaviors, trimmed]);
    setNewBehavior('');
  };

  // ── Remove forbidden behavior ──
  const handleRemoveBehavior = (index: number) => {
    setForbiddenBehaviors(forbiddenBehaviors.filter((_, i) => i !== index));
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-2xl font-semibold text-foreground mb-6">
          内容安全管理
        </h1>
        <p style={{ fontSize: 14, color: C.textSecondary, margin: 0 }}>
          配置内容审核规则与系统 Prompt 安全策略
        </p>
      </div>

      {/* ── Section 1: Rules Table ── */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: RADIUS_CARD,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RiShieldLine size={20} color={C.accent} />
            <h2 style={{ fontSize: 16, fontWeight: 600, color: C.textPrimary, margin: 0 }}>
              内容规则
            </h2>
            <span
              style={{
                fontSize: 12,
                color: C.textTertiary,
                background: 'rgba(255,255,255,0.04)',
                padding: '2px 8px',
                borderRadius: 999,
              }}
            >
              {rules.length}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={fetchRules}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '8px 14px',
                background: 'transparent',
                color: C.textSecondary,
                border: `1px solid ${C.border}`,
                borderRadius: RADIUS_BTN,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <RiRefreshLine size={14} />
              刷新
            </button>
            <button
              onClick={() => openRuleModal()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '8px 14px',
                background: C.accent,
                color: C.bg,
                border: 'none',
                borderRadius: RADIUS_BTN,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RiAddLine size={16} />
              新增规则
            </button>
          </div>
        </div>

        {/* Rules table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['类型', '模式', '正则', '状态', '描述', '操作'].map((col) => (
                  <th
                    key={col}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: 600,
                      color: C.textTertiary,
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rulesLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: C.textSecondary }}>
                    加载中...
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: C.textSecondary }}>
                    暂无规则
                  </td>
                </tr>
              ) : (
                rules.map((rule, idx) => {
                  const typeStyle = RULE_TYPE_COLORS[rule.rule_type] || RULE_TYPE_COLORS.keyword;
                  return (
                    <tr
                      key={rule.id}
                      style={{
                        borderBottom: idx < rules.length - 1 ? `1px solid ${C.border}` : 'none',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 500,
                            background: typeStyle.bg,
                            color: typeStyle.color,
                          }}
                        >
                          {RULE_TYPE_LABELS[rule.rule_type] || rule.rule_type}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          fontSize: 13,
                          color: C.textPrimary,
                          fontFamily: rule.is_regex ? 'monospace' : 'inherit',
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={rule.pattern}
                      >
                        {rule.pattern}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: 12,
                            color: rule.is_regex ? C.accent : C.textTertiary,
                          }}
                        >
                          {rule.is_regex ? '是' : '否'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => handleToggleRule(rule)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 10px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 500,
                            border: 'none',
                            cursor: 'pointer',
                            background: rule.enabled
                              ? 'rgba(76,175,80,0.12)'
                              : 'rgba(255,255,255,0.04)',
                            color: rule.enabled ? C.success : C.textTertiary,
                          }}
                        >
                          {rule.enabled ? (
                            <>
                              <RiCheckLine size={12} />
                              启用
                            </>
                          ) : (
                            '禁用'
                          )}
                        </button>
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          fontSize: 13,
                          color: C.textSecondary,
                          maxWidth: 240,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={rule.description || ''}
                      >
                        {rule.description || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => openRuleModal(rule)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 4,
                              color: C.textSecondary,
                            }}
                            title="编辑"
                          >
                            <RiEditLine size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 4,
                              color: C.error,
                            }}
                            title="删除"
                          >
                            <RiDeleteBinLine size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 2: System Prompt Config ── */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: RADIUS_CARD,
          padding: 24,
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: C.textPrimary, margin: 0 }}>
            系统 Prompt 配置
          </h2>
          <p style={{ fontSize: 13, color: C.textSecondary, margin: '6px 0 0' }}>
            定义 AI 系统级行为约束与禁止行为清单
          </p>
        </div>

        {promptLoading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: C.textSecondary }}>
            加载中...
          </div>
        ) : (
          <>
            {/* System prompt textarea */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  color: C.textSecondary,
                  marginBottom: 8,
                  fontWeight: 500,
                }}
              >
                系统 Prompt
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={6}
                placeholder="输入系统级 Prompt，用于约束 AI 行为..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: RADIUS_SM,
                  color: C.textPrimary,
                  fontSize: 14,
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  lineHeight: 1.6,
                }}
              />
            </div>

            {/* Forbidden behaviors */}
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  color: C.textSecondary,
                  marginBottom: 8,
                  fontWeight: 500,
                }}
              >
                禁止行为清单
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  value={newBehavior}
                  onChange={(e) => setNewBehavior(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddBehavior()}
                  placeholder="输入禁止行为，按回车添加"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: RADIUS_BTN,
                    color: C.textPrimary,
                    fontSize: 14,
                  }}
                />
                <button
                  onClick={handleAddBehavior}
                  style={{
                    padding: '10px 16px',
                    background: C.secondary,
                    color: '#fff',
                    border: 'none',
                    borderRadius: RADIUS_BTN,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <RiAddLine size={16} />
                  添加
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {forbiddenBehaviors.length === 0 && (
                  <span style={{ fontSize: 13, color: C.textTertiary }}>
                    暂无禁止行为
                  </span>
                )}
                {forbiddenBehaviors.map((behavior, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      background: 'rgba(244,67,54,0.08)',
                      border: '1px solid rgba(244,67,54,0.2)',
                      borderRadius: RADIUS_BTN,
                      fontSize: 13,
                      color: C.error,
                    }}
                  >
                    {behavior}
                    <button
                      onClick={() => handleRemoveBehavior(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        color: C.error,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="移除"
                    >
                      <RiCloseLine size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Save button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleSavePrompt}
                disabled={savingPrompt}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 24px',
                  background: C.accent,
                  color: C.bg,
                  border: 'none',
                  borderRadius: RADIUS_BTN,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: savingPrompt ? 'not-allowed' : 'pointer',
                  opacity: savingPrompt ? 0.6 : 1,
                }}
              >
                {savingPrompt ? '保存中...' : '保存配置'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Rule Modal ── */}
      {showRuleModal && (
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
          onClick={(e) => e.target === e.currentTarget && closeRuleModal()}
        >
          <div
            style={{
              background: C.surface,
              borderRadius: RADIUS_CARD,
              padding: 24,
              width: '100%',
              maxWidth: 480,
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
                {editingRule ? '编辑规则' : '新增规则'}
              </h2>
              <button
                onClick={closeRuleModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: C.textSecondary,
                  cursor: 'pointer',
                }}
              >
                <RiCloseLine size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveRule}>
              {/* Rule type */}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    color: C.textSecondary,
                    marginBottom: 6,
                  }}
                >
                  规则类型
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['keyword', 'regex', 'semantic'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setRuleForm({ ...ruleForm, rule_type: type })}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        background: ruleForm.rule_type === type ? C.accent : 'transparent',
                        color: ruleForm.rule_type === type ? C.bg : C.textSecondary,
                        border: `1px solid ${ruleForm.rule_type === type ? C.accent : C.border}`,
                        borderRadius: RADIUS_BTN,
                        fontSize: 13,
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      {RULE_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pattern */}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    color: C.textSecondary,
                    marginBottom: 6,
                  }}
                >
                  匹配模式
                </label>
                <input
                  type="text"
                  value={ruleForm.pattern}
                  onChange={(e) => setRuleForm({ ...ruleForm, pattern: e.target.value })}
                  required
                  placeholder={
                    ruleForm.rule_type === 'regex'
                      ? '输入正则表达式'
                      : ruleForm.rule_type === 'semantic'
                      ? '输入语义描述'
                      : '输入关键词'
                  }
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: RADIUS_BTN,
                    color: C.textPrimary,
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Is regex toggle */}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    fontSize: 14,
                    color: C.textPrimary,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={ruleForm.is_regex}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, is_regex: e.target.checked })
                    }
                    style={{ width: 18, height: 18, accentColor: C.accent }}
                  />
                  使用正则表达式匹配
                </label>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    color: C.textSecondary,
                    marginBottom: 6,
                  }}
                >
                  描述（可选）
                </label>
                <input
                  type="text"
                  value={ruleForm.description}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, description: e.target.value })
                  }
                  placeholder="规则用途说明"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: RADIUS_BTN,
                    color: C.textPrimary,
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Enabled */}
              <div style={{ marginBottom: 24 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    fontSize: 14,
                    color: C.textPrimary,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={ruleForm.enabled}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, enabled: e.target.checked })
                    }
                    style={{ width: 18, height: 18, accentColor: C.accent }}
                  />
                  启用此规则
                </label>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={closeRuleModal}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'transparent',
                    color: C.textSecondary,
                    border: `1px solid ${C.border}`,
                    borderRadius: RADIUS_BTN,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={savingRule}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: C.accent,
                    color: C.bg,
                    border: 'none',
                    borderRadius: RADIUS_BTN,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: savingRule ? 'not-allowed' : 'pointer',
                    opacity: savingRule ? 0.6 : 1,
                  }}
                >
                  {savingRule ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {dialog}
    </div>
  );
};

export default ContentPolicyPage;
