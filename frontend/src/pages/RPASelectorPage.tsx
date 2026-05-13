import React, { useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  RiGlobalLine,
  RiRefreshLine,
  RiCursorLine,
  RiKeyboardLine,
  RiArrowDownLine,
  RiAddLine,
  RiDeleteBinLine,
  RiCodeLine,
  RiErrorWarningLine,
  RiLoader4Line,
  RiDragMoveLine,
  RiArrowUpLine,
  RiArrowUpSLine,
  RiArrowDownSLine,
} from 'react-icons/ri';

import {
  rpaSelectorAPI,
  DOMElement,
} from '../api/client';

// ── Design System Colors ───────────────────────────────────────


// ── Types ──────────────────────────────────────────────────────

interface ActionItem {
  id: string;
  element: DOMElement;
  action: 'click' | 'type' | 'scroll';
  value?: string;
}

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

// ── Helper Components ──────────────────────────────────────────

const Badge: React.FC<{ children: React.ReactNode; color?: string; bg?: string }> = ({
  children,
  color = 'var(--hive-gold)',
  bg = 'rgba(255,193,7,0.10)',
}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 500,
      color,
      background: bg,
      border: `1px solid ${color}20`,
    }}
  >
    {children}
  </span>
);

const IconButton: React.FC<{
  onClick: () => void;
  icon: React.ReactNode;
  title?: string;
  danger?: boolean;
  disabled?: boolean;
}> = ({ onClick, icon, title, danger, disabled }) => (
  <button
    onClick={onClick}
    title={title}
    disabled={disabled}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 28,
      height: 28,
      borderRadius: 6,
      border: 'none',
      background: 'transparent',
      color: danger ? 'var(--error)' : 'var(--text-secondary)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'all 0.12s',
    }}
    onMouseEnter={(e) => {
      if (!disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'transparent';
    }}
  >
    {icon}
  </button>
);

// ── Main Page ──────────────────────────────────────────────────

const RPASelectorPage: React.FC = () => {
  const [url, setUrl] = useState('');
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle');
  const [elements, setElements] = useState<DOMElement[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<DOMElement | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [scriptName, setScriptName] = useState('');

  // Fetch DOM snapshot
  const handleFetchDOM = useCallback(async () => {
    if (!url.trim()) {
      toast.error('请输入目标网址');
      return;
    }
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
      setUrl(targetUrl);
    }

    setFetchStatus('loading');
    setFetchError(null);
    setElements([]);
    setSelectedElement(null);

    try {
      const res = await rpaSelectorAPI.getDOMSnapshot(targetUrl);
      const data = res.data;
      setElements(data.elements || []);
      setFetchStatus('success');
      toast.success(`已获取 ${(data.elements || []).length} 个元素`);
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      const msg = err?.response?.data?.detail || err.message || '获取 DOM 失败';
      setFetchError(msg);
      setFetchStatus('error');
      toast.error(msg);
    }
  }, [url]);

  // Add action
  const [pendingAction, setPendingAction] = useState<'click' | 'type' | 'scroll'>('click');
  const [pendingValue, setPendingValue] = useState('');

  const handleAddAction = useCallback(() => {
    if (!selectedElement) {
      toast.error('请先选择一个元素');
      return;
    }
    const newAction: ActionItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      element: selectedElement,
      action: pendingAction,
      value: pendingAction === 'type' ? pendingValue : undefined,
    };
    setActions((prev) => [...prev, newAction]);
    setPendingValue('');
    toast.success('已添加到动作序列');
  }, [selectedElement, pendingAction, pendingValue]);

  // Remove action
  const handleRemoveAction = useCallback((id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Move action
  const handleMoveAction = useCallback((index: number, direction: 'up' | 'down') => {
    setActions((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }, []);

  // Generate script
  const handleGenerateScript = useCallback(async () => {
    if (actions.length === 0) {
      toast.error('动作序列不能为空');
      return;
    }
    if (!url.trim()) {
      toast.error('URL 不能为空');
      return;
    }

    setGenerating(true);
    try {
      const res = await rpaSelectorAPI.generateScript({
        url: url.trim(),
        actions: actions.map((a) => ({
          selector: a.element.selector,
          action: a.action,
          value: a.value,
          tag: a.element.tag,
          text: a.element.text,
        })),
        name: scriptName.trim() || undefined,
      });
      toast.success(`脚本已生成并保存：${res.data.script_id}`);
      setActions([]);
      setScriptName('');
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      const msg = err?.response?.data?.detail || err.message || '生成脚本失败';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  }, [actions, url, scriptName]);

  // Filter & group elements by tag for tree-like display
  const tagGroups = useMemo(() => {
    const groups: Record<string, DOMElement[]> = {};
    elements.forEach((el) => {
      const tag = el.tag.toLowerCase();
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push(el);
    });
    return groups;
  }, [elements]);

  const tagOrder = useMemo(() => {
    const priority = ['a', 'button', 'input', 'textarea', 'select', 'form', 'div', 'span', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'ul', 'ol', 'nav', 'header', 'footer', 'section', 'article'];
    const tags = Object.keys(tagGroups).sort((a, b) => {
      const ia = priority.indexOf(a);
      const ib = priority.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
    return tags;
  }, [tagGroups]);

  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set(['a', 'button', 'input']));

  const toggleTag = useCallback((tag: string) => {
    setExpandedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
              letterSpacing: '-0.3px',
            }}
          >
            RPA 元素选择器
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-tertiary)' }}>
            抓取网页 DOM，选择元素并生成自动化脚本
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 600 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <RiGlobalLine
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetchDOM()}
              className="input"
              style={{
                width: '100%',
                padding: '10px 14px 10px 36px',
                fontSize: 13,
                borderRadius: 8,
                border: `1px solid ${'var(--divider)'}`,
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
          <button
            onClick={handleFetchDOM}
            disabled={fetchStatus === 'loading'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 18px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--hive-gold)',
              color: 'var(--page-bg)',
              fontSize: 13,
              fontWeight: 600,
              cursor: fetchStatus === 'loading' ? 'not-allowed' : 'pointer',
              opacity: fetchStatus === 'loading' ? 0.7 : 1,
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (fetchStatus !== 'loading') e.currentTarget.style.background = 'var(--hive-gold-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--hive-gold)';
            }}
          >
            {fetchStatus === 'loading' ? (
              <RiLoader4Line size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <RiRefreshLine size={16} />
            )}
            获取 DOM
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Left: Element Tree */}
        <div
          style={{
            flex: 1.2,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--card-bg)',
            border: `1px solid ${'var(--divider)'}`,
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: `1px solid ${'var(--divider)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              元素列表
            </span>
            {elements.length > 0 && (
              <Badge color={'var(--text-secondary)'} bg="rgba(255,255,255,0.04)">
                共 {elements.length} 个
              </Badge>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {fetchStatus === 'idle' && (
              <EmptyState icon={<RiGlobalLine size={40} color={'var(--text-tertiary)'} />} text="输入网址并点击“获取 DOM”开始" />
            )}
            {fetchStatus === 'loading' && (
              <LoadingState text="正在抓取页面元素..." />
            )}
            {fetchStatus === 'error' && (
              <ErrorState message={fetchError || '获取失败'} onRetry={handleFetchDOM} />
            )}
            {fetchStatus === 'success' && elements.length === 0 && (
              <EmptyState icon={<RiGlobalLine size={40} color={'var(--text-tertiary)'} />} text="未检测到可交互元素" />
            )}
            {fetchStatus === 'success' &&
              tagOrder.map((tag) => {
                const group = tagGroups[tag];
                const expanded = expandedTags.has(tag);
                return (
                  <div key={tag}>
                    <button
                      onClick={() => toggleTag(tag)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 16px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {expanded ? <RiArrowDownSLine size={14} /> : <RiArrowUpSLine size={14} />}
                      &lt;{tag}&gt;
                      <Badge color={'var(--text-tertiary)'} bg="rgba(255,255,255,0.04)">
                        {group.length}
                      </Badge>
                    </button>
                    {expanded &&
                      group.map((el, idx) => {
                        const isSelected = selectedElement?.ref === el.ref;
                        return (
                          <button
                            key={`${el.ref}-${idx}`}
                            onClick={() => setSelectedElement(el)}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '8px 16px 8px 32px',
                              border: 'none',
                              borderLeft: `2px solid ${isSelected ? 'var(--hive-gold)' : 'transparent'}`,
                              background: isSelected ? 'rgba(255,255,255,0.10)' : 'transparent',
                              color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                              fontSize: 13,
                              cursor: 'pointer',
                              transition: 'all 0.1s',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2,
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <span
                              style={{
                                fontWeight: isSelected ? 500 : 400,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {el.text || el.attributes['aria-label'] || el.attributes['placeholder'] || el.attributes['name'] || el.attributes['id'] || '(无文本)'}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                color: 'var(--text-tertiary)',
                                fontFamily: 'monospace',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {el.selector}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Middle: Element Detail */}
        <div
          style={{
            flex: 0.8,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--card-bg)',
            border: `1px solid ${'var(--divider)'}`,
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: `1px solid ${'var(--divider)'}`,
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            元素详情
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {!selectedElement ? (
              <EmptyState icon={<RiCursorLine size={40} color={'var(--text-tertiary)'} />} text="在左侧列表中选择一个元素" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <Label>标签</Label>
                  <Value>
                    <Badge>&lt;{selectedElement.tag}&gt;</Badge>
                  </Value>
                </div>

                <div>
                  <Label>文本内容</Label>
                  <Value
                    style={{
                      background: 'var(--page-bg)',
                      padding: 10,
                      borderRadius: 8,
                      border: `1px solid ${'var(--divider)'}`,
                      fontSize: 13,
                      wordBreak: 'break-word',
                    }}
                  >
                    {selectedElement.text || '-'}
                  </Value>
                </div>

                <div>
                  <Label>Selector</Label>
                  <Value
                    style={{
                      background: 'var(--page-bg)',
                      padding: 10,
                      borderRadius: 8,
                      border: `1px solid ${'var(--divider)'}`,
                      fontFamily: 'monospace',
                      fontSize: 12,
                      wordBreak: 'break-all',
                      color: 'var(--hive-gold)',
                    }}
                  >
                    {selectedElement.selector}
                  </Value>
                </div>

                <div>
                  <Label>Bounds</Label>
                  <Value style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Metric label="X" value={selectedElement.bounds.x} />
                    <Metric label="Y" value={selectedElement.bounds.y} />
                    <Metric label="W" value={selectedElement.bounds.width} />
                    <Metric label="H" value={selectedElement.bounds.height} />
                  </Value>
                </div>

                <div>
                  <Label>Attributes</Label>
                  <div
                    style={{
                      background: 'var(--page-bg)',
                      borderRadius: 8,
                      border: `1px solid ${'var(--divider)'}`,
                      padding: '8px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      maxHeight: 160,
                      overflowY: 'auto',
                    }}
                  >
                    {Object.entries(selectedElement.attributes).length === 0 ? (
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>无属性</span>
                    ) : (
                      Object.entries(selectedElement.attributes).map(([k, v]) => (
                        <div
                          key={k}
                          style={{
                            display: 'flex',
                            gap: 8,
                            fontSize: 12,
                            fontFamily: 'monospace',
                          }}
                        >
                          <span style={{ color: 'var(--hive-blue)', minWidth: 80 }}>{k}</span>
                          <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{v}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${'var(--divider)'}`, paddingTop: 14, marginTop: 4 }}>
                  <Label>设置动作</Label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['click', 'type', 'scroll'] as const).map((a) => (
                        <button
                          key={a}
                          onClick={() => setPendingAction(a)}
                          style={{
                            flex: 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            padding: '8px 0',
                            borderRadius: 6,
                            border: `1px solid ${pendingAction === a ? 'var(--hive-gold)' : 'var(--divider)'}`,
                            background: pendingAction === a ? 'rgba(255,193,7,0.10)' : 'transparent',
                            color: pendingAction === a ? 'var(--hive-gold)' : 'var(--text-secondary)',
                            fontSize: 12,
                            fontWeight: pendingAction === a ? 600 : 400,
                            cursor: 'pointer',
                            transition: 'all 0.12s',
                          }}
                        >
                          {a === 'click' && <RiCursorLine size={14} />}
                          {a === 'type' && <RiKeyboardLine size={14} />}
                          {a === 'scroll' && <RiArrowDownLine size={14} />}
                          {a === 'click' && '点击'}
                          {a === 'type' && '输入'}
                          {a === 'scroll' && '滚动'}
                        </button>
                      ))}
                    </div>

                    {pendingAction === 'type' && (
                      <input
                        type="text"
                        placeholder="输入要填入的文本..."
                        value={pendingValue}
                        onChange={(e) => setPendingValue(e.target.value)}
                        className="input"
                        style={{
                          padding: '8px 12px',
                          fontSize: 13,
                          borderRadius: 6,
                          border: `1px solid ${'var(--divider)'}`,
                          background: 'var(--page-bg)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                        }}
                      />
                    )}

                    <button
                      onClick={handleAddAction}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '10px 0',
                        borderRadius: 8,
                        border: 'none',
                        background: 'var(--hive-blue)',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hive-blue-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--hive-blue)')}
                    >
                      <RiAddLine size={16} />
                      添加到动作序列
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Action Sequence */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--card-bg)',
            border: `1px solid ${'var(--divider)'}`,
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: `1px solid ${'var(--divider)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              动作序列
            </span>
            {actions.length > 0 && (
              <Badge color={'var(--hive-gold)'} bg={'rgba(255,193,7,0.10)'}>
                {actions.length} 步
              </Badge>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {actions.length === 0 ? (
              <EmptyState icon={<RiDragMoveLine size={40} color={'var(--text-tertiary)'} />} text="尚未添加任何动作" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 12px' }}>
                {actions.map((action, index) => (
                  <div
                    key={action.id}
                    style={{
                      background: 'var(--page-bg)',
                      border: `1px solid ${'var(--divider)'}`,
                      borderRadius: 8,
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: 'rgba(255,193,7,0.10)',
                            color: 'var(--hive-gold)',
                            fontSize: 11,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {index + 1}
                        </span>
                        <Badge
                          color={
                            action.action === 'click'
                              ? 'var(--hive-blue)'
                              : action.action === 'type'
                              ? 'var(--hive-gold)'
                              : 'var(--text-secondary)'
                          }
                          bg={
                            action.action === 'click'
                              ? 'rgba(25,118,210,0.12)'
                              : action.action === 'type'
                              ? 'rgba(255,193,7,0.10)'
                              : 'rgba(255,255,255,0.04)'
                          }
                        >
                          {action.action === 'click' && <RiCursorLine size={11} />}
                          {action.action === 'type' && <RiKeyboardLine size={11} />}
                          {action.action === 'scroll' && <RiArrowDownLine size={11} />}
                          {action.action === 'click' && '点击'}
                          {action.action === 'type' && '输入'}
                          {action.action === 'scroll' && '滚动'}
                        </Badge>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton
                          onClick={() => handleMoveAction(index, 'up')}
                          icon={<RiArrowUpLine size={14} />}
                          title="上移"
                          disabled={index === 0}
                        />
                        <IconButton
                          onClick={() => handleMoveAction(index, 'down')}
                          icon={<RiArrowDownLine size={14} />}
                          title="下移"
                          disabled={index === actions.length - 1}
                        />
                        <IconButton
                          onClick={() => handleRemoveAction(action.id)}
                          icon={<RiDeleteBinLine size={14} />}
                          title="删除"
                          danger
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontFamily: 'monospace',
                      }}
                    >
                      {action.element.selector}
                    </div>

                    {action.value && (
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-tertiary)',
                          background: 'rgba(255,255,255,0.03)',
                          padding: '4px 8px',
                          borderRadius: 4,
                          wordBreak: 'break-all',
                        }}
                      >
                        值: {action.value}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generate Script Footer */}
          <div
            style={{
              borderTop: `1px solid ${'var(--divider)'}`,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <input
              type="text"
              placeholder="脚本名称（可选）"
              value={scriptName}
              onChange={(e) => setScriptName(e.target.value)}
              className="input"
              style={{
                padding: '8px 12px',
                fontSize: 13,
                borderRadius: 6,
                border: `1px solid ${'var(--divider)'}`,
                background: 'var(--page-bg)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <button
              onClick={handleGenerateScript}
              disabled={generating || actions.length === 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '10px 0',
                borderRadius: 8,
                border: 'none',
                background: 'var(--hive-gold)',
                color: 'var(--page-bg)',
                fontSize: 13,
                fontWeight: 600,
                cursor: generating || actions.length === 0 ? 'not-allowed' : 'pointer',
                opacity: generating || actions.length === 0 ? 0.6 : 1,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!generating && actions.length > 0) e.currentTarget.style.background = 'var(--hive-gold-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--hive-gold)';
              }}
            >
              {generating ? (
                <RiLoader4Line size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <RiCodeLine size={16} />
              )}
              {generating ? '生成中...' : '生成脚本'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
    {children}
  </div>
);

const Value: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ fontSize: 13, color: 'var(--text-primary)', ...style }}>{children}</div>
);

const Metric: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div
    style={{
      background: 'var(--page-bg)',
      border: `1px solid ${'var(--divider)'}`,
      borderRadius: 6,
      padding: '6px 10px',
      minWidth: 48,
      textAlign: 'center',
    }}
  >
    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
      {value}
    </div>
  </div>
);

const EmptyState: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: '48px 24px',
      color: 'var(--text-tertiary)',
    }}
  >
    {icon}
    <span style={{ fontSize: 13, textAlign: 'center' }}>{text}</span>
  </div>
);

const LoadingState: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: '48px 24px',
      color: 'var(--text-secondary)',
    }}
  >
    <RiLoader4Line size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--hive-gold)' }} />
    <span style={{ fontSize: 13 }}>{text}</span>
  </div>
);

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: '48px 24px',
    }}
  >
    <RiErrorWarningLine size={32} color={'var(--error)'} />
    <span style={{ fontSize: 13, color: 'var(--error)', textAlign: 'center', maxWidth: 280 }}>{message}</span>
    <button
      onClick={onRetry}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        borderRadius: 6,
        border: `1px solid ${'var(--error)'}40`,
        background: 'transparent',
        color: 'var(--error)',
        fontSize: 12,
        cursor: 'pointer',
        transition: 'all 0.12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `${'var(--error)'}15`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <RiRefreshLine size={14} />
      重试
    </button>
  </div>
);

export default RPASelectorPage;
