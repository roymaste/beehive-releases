import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiArrowLeftLine,
  RiAddLine,
  RiDeleteBinLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiSaveLine,
  RiFileListLine,
  RiGlobeLine,
  RiTimeLine,
  RiEyeLine,
  RiCursorLine,
  RiKeyboardLine,
  RiUploadLine,
  RiGitBranchLine,
  RiLoopLeftLine,
  RiCameraLine,
  RiText,
  RiFlashlightLine,
  RiBookLine,
} from 'react-icons/ri';

import { ScriptTemplate } from '@/api/client';

// Icon mapping
const ICON_MAP: Record<string, React.FC<{ size?: number; style?: React.CSSProperties }>> = {
  Globe: RiGlobeLine,
  Clock: RiTimeLine,
  Eye: RiEyeLine,
  Cursor: RiCursorLine,
  Keyboard: RiKeyboardLine,
  ArrowDown: RiArrowDownLine,
  ArrowUp: RiArrowUpLine,
  Upload: RiUploadLine,
  GitBranch: RiGitBranchLine,
  Repeat: RiLoopLeftLine,
  Camera: RiCameraLine,
  Text: RiText,
};

// ── Types ──────────────────────────────────────────────────────

interface ActionParam {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  default?: unknown;
  placeholder?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
}

interface ActionType {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  params: ActionParam[];
}

interface Step {
  id: string;
  action: string;
  params: Record<string, unknown>;
  // for nested steps (if_element, loop_elements)
  then_steps?: Step[];
  else_steps?: Step[];
  for_each_steps?: Step[];
}

interface TaskForm {
  name: string;
  action: string;
  schedule: string;
  steps: Step[];
}

// ── API ────────────────────────────────────────────────────────

// ── Component ─────────────────────────────────────────────────

const RpaEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionTypesError, setActionTypesError] = useState(false);
  const [leftPanelTab, setLeftPanelTab] = useState<'actions' | 'templates'>('actions');
  const [scriptTemplates, setScriptTemplates] = useState<ScriptTemplate[]>([]);

  const [form, setForm] = useState<TaskForm>({
    name: '',
    action: 'custom',
    schedule: '',
    steps: [],
  });

  // Load action types
  useEffect(() => {
    setLoading(true);
    setActionTypesError(false);
    fetch('/api/v1/action-types')
      .then((r) => r.json())
      .then((data) => {
        setActionTypes(data.action_types || []);
        setCategories(data.categories || {});
      })
      .catch(() => {
        toast.error('加载操作类型失败');
        setActionTypesError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  // Load script templates
  useEffect(() => {
    fetch('/api/v1/script-templates')
      .then((r) => r.json())
      .then((data) => setScriptTemplates(data.templates || []))
      .catch(() => {/* silent fail — templates are optional */});
  }, []);

  // Load existing task if editing
  useEffect(() => {
    if (!isEditMode) return;
    fetch(`/api/v1/automations/tasks/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setForm({
          name: data.name || '',
          action: data.action || 'custom',
          schedule: data.schedule || '',
          steps: data.params?.steps || [],
        });
      })
      .catch(() => toast.error('加载任务失败'));
  }, [id, isEditMode]);

  const allSteps = form.steps;

  const getSelectedStep = useCallback((): Step | null => {
    if (!selectedStepId) return null;
    const find = (steps: Step[]): Step | null => {
      for (const s of steps) {
        if (s.id === selectedStepId) return s;
        if (s.then_steps) { const f = find(s.then_steps); if (f) return f; }
        if (s.else_steps) { const f = find(s.else_steps); if (f) return f; }
        if (s.for_each_steps) { const f = find(s.for_each_steps); if (f) return f; }
      }
      return null;
    };
    return find(allSteps);
  }, [selectedStepId, allSteps]);

  const addStep = (actionId: string) => {
    const at = actionTypes.find((a) => a.id === actionId);
    if (!at) return;

    const newStep: Step = {
      id: `step_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      action: actionId,
      params: at.params.reduce((acc, p) => ({ ...acc, [p.name]: p.default ?? '' }), {}),
    };

    setForm((f) => ({ ...f, steps: [...f.steps, newStep] }));
    setSelectedStepId(newStep.id);
  };

  const deleteStep = (stepId: string) => {
    setForm((f) => {
      const remove = (steps: Step[]): Step[] =>
        steps.filter((s) => {
          if (s.id === stepId) return false;
          if (s.then_steps) s.then_steps = remove(s.then_steps);
          if (s.else_steps) s.else_steps = remove(s.else_steps);
          if (s.for_each_steps) s.for_each_steps = remove(s.for_each_steps);
          return true;
        });
      return { ...f, steps: remove(f.steps) };
    });
    if (selectedStepId === stepId) setSelectedStepId(null);
  };

  const moveStep = (stepId: string, direction: 'up' | 'down') => {
    setForm((f) => {
      const idx = f.steps.findIndex((s) => s.id === stepId);
      if (idx < 0) return f;
      const newSteps = [...f.steps];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= newSteps.length) return f;
      [newSteps[idx], newSteps[targetIdx]] = [newSteps[targetIdx], newSteps[idx]];
      return { ...f, steps: newSteps };
    });
  };

  const updateStepParam = (stepId: string, paramName: string, value: unknown) => {
    setForm((f) => {
      const update = (steps: Step[]): Step[] =>
        steps.map((s) => {
          if (s.id === stepId) return { ...s, params: { ...s.params, [paramName]: value } };
          if (s.then_steps) s.then_steps = update(s.then_steps);
          if (s.else_steps) s.else_steps = update(s.else_steps);
          if (s.for_each_steps) s.for_each_steps = update(s.for_each_steps);
          return s;
        });
      return { ...f, steps: update(f.steps) };
    });
  };

  // Convert a script template's steps to editor Step objects
  const importTemplateSteps = (template: ScriptTemplate) => {
    const convert = (tSteps: ScriptTemplate['steps']): Step[] =>
      tSteps.map((ts) => ({
        id: `step_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        action: ts.action,
        params: { ...ts.params },
        then_steps: ts.then_steps ? convert(ts.then_steps) : undefined,
        else_steps: ts.else_steps ? convert(ts.else_steps) : undefined,
        for_each_steps: ts.for_each_steps ? convert(ts.for_each_steps) : undefined,
      }));

    const newSteps = convert(template.steps);
    setForm((f) => ({ ...f, steps: [...f.steps, ...newSteps] }));
    toast.success(`已导入模板「${template.name}」共${template.steps.length}步`);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('请输入任务名称');
      return;
    }
    if (form.steps.length === 0) {
      toast.error('请至少添加一个步骤');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      const payload = {
        name: form.name,
        action: form.action,
        schedule: form.schedule || undefined,
        params: { steps: form.steps },
      };

      const url = isEditMode ? `/api/v1/automations/tasks/${id}` : '/api/v1/automations/tasks';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('保存失败');
      toast.success(isEditMode ? '任务已更新' : '任务已创建');
      navigate('/automations');
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // ── Render: Step card ─────────────────────────────────────────

  const renderStepCard = (step: Step, _index: number, depth = 0) => {
    const at = actionTypes.find((a) => a.id === step.action);
    if (!at) return null;

    const IconComp = ICON_MAP[at.icon] || RiFlashlightLine;
    const isSelected = selectedStepId === step.id;
    const isNested = depth > 0;

    const paramSummary = at.params
      .filter((p) => p.type !== 'steps' && step.params[p.name] !== '' && step.params[p.name] !== undefined && step.params[p.name] !== false)
      .slice(0, 2)
      .map((p) => {
        const val = step.params[p.name];
        if (typeof val === 'boolean') return p.label;
        return `${p.label}: ${String(val).slice(0, 20)}`;
      })
      .join(' · ');

    return (
      <div key={step.id} style={{ marginBottom: isNested ? 8 : 0 }}>
        <div
          onClick={() => setSelectedStepId(step.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            background: isSelected ? '#f0fdf4' : '#ffffff',
            border: `1.5px solid ${isSelected ? '#22c55e' : isNested ? '#e5e7eb' : '#e5e7eb'}`,
            borderRadius: 10,
            cursor: 'pointer',
            marginLeft: isNested ? 24 : 0,
            transition: 'all 0.15s',
          }}
        >
          <IconComp size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1917' }}>{at.name}</div>
            {paramSummary && (
              <div style={{ fontSize: 11, color: '#78716c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {paramSummary}
              </div>
            )}
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => moveStep(step.id, 'up')}
              title="上移"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#78716c', borderRadius: 6, display: 'flex' }}
            >
              <RiArrowUpLine size={14} />
            </button>
            <button
              onClick={() => moveStep(step.id, 'down')}
              title="下移"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#78716c', borderRadius: 6, display: 'flex' }}
            >
              <RiArrowDownLine size={14} />
            </button>
            <button
              onClick={() => deleteStep(step.id)}
              title="删除"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#e11d48', borderRadius: 6, display: 'flex' }}
            >
              <RiDeleteBinLine size={14} />
            </button>
          </div>
        </div>

        {/* Nested steps */}
        {step.then_steps && step.then_steps.length > 0 && (
          <div style={{ marginTop: 4, marginLeft: 12, borderLeft: '2px solid #d1d5db', paddingLeft: 8 }}>
            <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4, fontWeight: 600 }}>✓ 条件成立</div>
            {step.then_steps.map((s, i) => renderStepCard(s, i, depth + 1))}
          </div>
        )}
        {step.else_steps && step.else_steps.length > 0 && (
          <div style={{ marginTop: 4, marginLeft: 12, borderLeft: '2px solid #d1d5db', paddingLeft: 8 }}>
            <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4, fontWeight: 600 }}>✗ 条件不成立</div>
            {step.else_steps.map((s, i) => renderStepCard(s, i, depth + 1))}
          </div>
        )}
        {step.for_each_steps && step.for_each_steps.length > 0 && (
          <div style={{ marginTop: 4, marginLeft: 12, borderLeft: '2px solid #d1d5db', paddingLeft: 8 }}>
            <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4, fontWeight: 600 }}>↻ 循环体</div>
            {step.for_each_steps.map((s, i) => renderStepCard(s, i, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // ── Render: Action type card ──────────────────────────────────

  const renderActionCard = (at: ActionType) => {
    const IconComp = ICON_MAP[at.icon] || RiFlashlightLine;
    return (
      <button
        key={at.id}
        onClick={() => addStep(at.id)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 4,
          padding: '10px 12px',
          background: '#ffffff',
          border: '1.5px solid #e5e7eb',
          borderRadius: 10,
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#22c55e'; (e.currentTarget as HTMLButtonElement).style.background = '#f0fdf4'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLButtonElement).style.background = '#ffffff'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconComp size={15} style={{ color: '#22c55e' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1c1917' }}>{at.name}</span>
        </div>
        <span style={{ fontSize: 11, color: '#78716c', lineHeight: 1.4 }}>{at.description}</span>
      </button>
    );
  };

  // ── Render: Parameter form ────────────────────────────────────

  const renderParamField = (param: ActionParam, value: unknown, onChange: (v: unknown) => void) => {
    switch (param.type) {
      case 'text':
      case 'textarea':
        return (
          <div key={param.name}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
              {param.label} {param.required && <span style={{ color: '#e11d48' }}>*</span>}
            </label>
            {param.type === 'textarea' ? (
              <textarea
                className="input"
                value={String(value ?? '')}
                onChange={(e) => onChange(e.target.value)}
                placeholder={param.placeholder}
                rows={3}
                style={{ resize: 'vertical', fontSize: 13 }}
              />
            ) : (
              <input
                className="input"
                value={String(value ?? '')}
                onChange={(e) => onChange(e.target.value)}
                placeholder={param.placeholder}
                style={{ fontSize: 13 }}
              />
            )}
          </div>
        );

      case 'number':
        return (
          <div key={param.name}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
              {param.label} {param.required && <span style={{ color: '#e11d48' }}>*</span>}
            </label>
            <input
              type="number"
              className="input"
              value={String(value ?? param.default ?? '')}
              onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
              min={param.min}
              max={param.max}
              placeholder={param.placeholder}
              style={{ fontSize: 13 }}
            />
          </div>
        );

      case 'select':
        return (
          <div key={param.name}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
              {param.label} {param.required && <span style={{ color: '#e11d48' }}>*</span>}
            </label>
            <select
              className="select"
              value={String(value ?? param.default ?? '')}
              onChange={(e) => onChange(e.target.value)}
              style={{ fontSize: 13 }}
            >
              {(param.options || []).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        );

      case 'boolean':
        return (
          <div key={param.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id={`param-${param.name}`}
              checked={Boolean(value ?? param.default ?? false)}
              onChange={(e) => onChange(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <label htmlFor={`param-${param.name}`} style={{ fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
              {param.label}
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  const selectedStep = getSelectedStep();
  const selectedActionType = selectedStep ? actionTypes.find((a) => a.id === selectedStep.action) : null;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <p style={{ color: '#78716c' }}>加载中...</p>
      </div>
    );
  }

  if (actionTypesError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 16 }}>
        <p style={{ color: '#e11d48', margin: 0 }}>加载操作类型失败</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 20px',
            background: '#e11d48',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          重试
        </button>
      </div>
    );
  }

  // Group action types by category
  const grouped = actionTypes.reduce<Record<string, ActionType[]>>((acc, at) => {
    const cat = at.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(at);
    return acc;
  }, {});

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/automations')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#78716c', display: 'flex', alignItems: 'center', padding: 4 }}
          >
            <RiArrowLeftLine size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1c1917', margin: 0, letterSpacing: '-0.3px' }}>
              {isEditMode ? '编辑RPA脚本' : '新建RPA脚本'}
            </h1>
            <p style={{ fontSize: 12, color: '#78716c', margin: '2px 0 0' }}>
              拖拽操作步骤，构建自动化流程
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn"
            onClick={handleSave}
            disabled={saving}
            style={{ background: '#22c55e', color: '#fff' }}
          >
            <RiSaveLine size={15} />
            {saving ? '保存中...' : '保存脚本'}
          </button>
        </div>
      </div>

      {/* Task meta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16, flexShrink: 0 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>任务名称 *</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="例如：Twitter自动发帖"
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>任务类型</label>
          <select
            className="select"
            value={form.action}
            onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
          >
            <option value="custom">自定义流程</option>
            <option value="post_tweet">发推</option>
            <option value="like_tweet">点赞</option>
            <option value="check_account">账号检查</option>
            <option value="warmup">养号</option>
            <option value="scrape">数据采集</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Cron调度（可选）</label>
          <input
            className="input"
            value={form.schedule}
            onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value }))}
            placeholder="0 9 * * *（每天9点）"
          />
        </div>
      </div>

      {/* Three-column editor */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 280px', gap: 16, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Left: Action type palette */}
        <div style={{ overflowY: 'auto', paddingRight: 4 }}>
          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            <button
              onClick={() => setLeftPanelTab('actions')}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                background: leftPanelTab === 'actions' ? '#22c55e' : '#f3f4f6',
                color: leftPanelTab === 'actions' ? '#ffffff' : '#6b7280',
                transition: 'all 0.15s',
              }}
            >
              <RiFileListLine size={13} />
              操作类型
            </button>
            <button
              onClick={() => setLeftPanelTab('templates')}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                background: leftPanelTab === 'templates' ? '#22c55e' : '#f3f4f6',
                color: leftPanelTab === 'templates' ? '#ffffff' : '#6b7280',
                transition: 'all 0.15s',
              }}
            >
              <RiBookLine size={13} />
              模板库
            </button>
          </div>

          {leftPanelTab === 'actions' ? (
            /* Action types list */
            Object.entries(grouped).map(([cat, types]) => (
              <div key={cat} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                  {categories[cat] || cat}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {types.map((at) => renderActionCard(at))}
                </div>
              </div>
            ))
          ) : (
            /* Template library */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {scriptTemplates.length === 0 ? (
                <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>加载中...</p>
              ) : (
                (() => {
                  // Group by platform
                  const platformOrder = ['twitter', 'weibo', 'xiaohongshu', 'douyin', 'shop'];
                  const platformLabels: Record<string, string> = {
                    twitter: 'Twitter/X',
                    weibo: '微博',
                    xiaohongshu: '小红书',
                    douyin: '抖音/TikTok',
                    shop: '网店',
                  };
                  const groupedTemplates = scriptTemplates.reduce<Record<string, ScriptTemplate[]>>((acc, t) => {
                    if (!acc[t.platform]) acc[t.platform] = [];
                    acc[t.platform].push(t);
                    return acc;
                  }, {});
                  return platformOrder
                    .filter((p) => groupedTemplates[p])
                    .map((platform) => (
                      <div key={platform} style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                          {platformLabels[platform] || platform}
                        </div>
                        {groupedTemplates[platform].map((tmpl) => (
                          <button
                            key={tmpl.id}
                            onClick={() => importTemplateSteps(tmpl)}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              gap: 3,
                              padding: '9px 11px',
                              background: '#ffffff',
                              border: '1.5px solid #e5e7eb',
                              borderRadius: 10,
                              cursor: 'pointer',
                              textAlign: 'left',
                              width: '100%',
                              marginBottom: 5,
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#22c55e'; (e.currentTarget as HTMLButtonElement).style.background = '#f0fdf4'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLButtonElement).style.background = '#ffffff'; }}
                          >
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#1c1917' }}>{tmpl.name}</span>
                            <span style={{ fontSize: 11, color: '#78716c', lineHeight: 1.4 }}>{tmpl.description}</span>
                            <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600, marginTop: 2 }}>+ {tmpl.steps.length} 步</span>
                          </button>
                        ))}
                      </div>
                    ));
                })()
              )}
            </div>
          )}
        </div>

        {/* Middle: Steps canvas */}
        <div style={{ overflowY: 'auto', paddingRight: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RiFileListLine size={14} style={{ color: '#78716c' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>步骤序列</span>
              <span style={{ fontSize: 11, color: '#78716c' }}>({form.steps.length} 步)</span>
            </div>
          </div>

          {form.steps.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 200,
              border: '2px dashed #e5e7eb',
              borderRadius: 12,
              color: '#9ca3af',
            }}>
              <RiAddLine size={32} style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 13, margin: 0 }}>点击左侧操作类型添加步骤</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.steps.map((step, i) => renderStepCard(step, i))}
            </div>
          )}
        </div>

        {/* Right: Parameter editor */}
        <div style={{ overflowY: 'auto', paddingRight: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <RiFlashlightLine size={14} style={{ color: '#78716c' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>参数配置</span>
          </div>

          {!selectedStep ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 160,
              border: '2px dashed #e5e7eb',
              borderRadius: 12,
              color: '#9ca3af',
            }}>
              <p style={{ fontSize: 13, margin: 0, textAlign: 'center' }}>选择左侧步骤<br />配置参数</p>
            </div>
          ) : selectedActionType ? (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                {(() => { const Ic = ICON_MAP[selectedActionType.icon] || RiFlashlightLine; return <Ic size={15} style={{ color: '#22c55e' }} />; })()}
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1c1917' }}>{selectedActionType.name}</span>
              </div>
              {selectedActionType.description && (
                <p style={{ fontSize: 12, color: '#78716c', marginBottom: 14 }}>{selectedActionType.description}</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {selectedActionType.params
                  .filter((p) => p.type !== 'steps')
                  .map((param) =>
                    renderParamField(param, selectedStep.params[param.name], (v) => updateStepParam(selectedStep.id, param.name, v))
                  )}
              </div>

              {/* Nested steps management for flow types */}
              {(selectedStep.action === 'if_element' || selectedStep.action === 'loop_elements') && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: 12, color: '#78716c', marginBottom: 8 }}>
                    {selectedStep.action === 'if_element' ? '条件分支内嵌步骤（点击操作类型添加）' : '循环体内嵌步骤（点击操作类型添加）'}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {(selectedStep.action === 'if_element'
                      ? ['then_steps', 'else_steps']
                      : ['for_each_steps']
                    ).map((key) => (
                      <div key={key}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase' }}>
                          {key === 'then_steps' ? '✓ 成立时' : key === 'else_steps' ? '✗ 不成立时' : '↻ 循环体'}：
                        </div>
                        {(form.steps.find(s => s.id === selectedStep.id) as Step)?.[key as keyof Step]?.length === 0 && (
                          <p style={{ fontSize: 11, color: '#d1d5db', fontStyle: 'italic' }}>暂无步骤</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default RpaEditorPage;
