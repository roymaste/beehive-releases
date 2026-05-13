import React, { useEffect, useRef, useState } from 'react';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import { EmptyState } from '../components/ui/empty-state';
import {
  RiSendPlaneFill,
  RiRobot2Line,
  RiUserLine,
  RiSparklingLine,
  RiSettings3Line,
} from 'react-icons/ri';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { agentProfileAPI, AgentProfileUpdate } from '../api/client';

// ── Beehive Dark Palette ──


interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface ChatResponse {
  reply: string;
  session_id: string;
  remaining: number;
}

const WRITING_STYLES = ['casual', 'professional', 'creative', 'technical'] as const;
const TONES = ['friendly', 'formal', 'humorous', 'neutral'] as const;

const AgentConsolePage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Settings dialog state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [writingStyle, setWritingStyle] = useState('');
  const [tone, setTone] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [domains, setDomains] = useState('');
  const [keywords, setKeywords] = useState('');

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  }, [input]);

  const loadProfile = async () => {
    setProfileLoading(true);
    try {
      const res = await agentProfileAPI.get();
      const data = res.data;
      setWritingStyle(data.writing_style || '');
      setTone(data.tone || '');
      setCustomInstructions(data.custom_instructions || '');
      setDomains(data.knowledge_base?.domains?.join(', ') || '');
      setKeywords(data.knowledge_base?.keywords?.join(', ') || '');
    } catch (err: any) {
      const detail = err.response?.data?.detail || '加载配置失败';
      toast.error(detail);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleOpenSettings = () => {
    setSettingsOpen(true);
    loadProfile();
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload: AgentProfileUpdate = {
        writing_style: writingStyle || undefined,
        tone: tone || undefined,
        custom_instructions: customInstructions || undefined,
        knowledge_base: {
          domains: domains
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          keywords: keywords
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
      };
      await agentProfileAPI.update(payload);
      toast.success('配置已保存');
      setSettingsOpen(false);
    } catch (err: any) {
      const detail = err.response?.data?.detail || '保存失败';
      toast.error(detail);
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiClient.post<ChatResponse>('/agent/chat', {
        message: text,
        session_id: sessionId,
      });
      const data = res.data;

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setSessionId(data.session_id);
      setRemaining(data.remaining);
    } catch (err: any) {
      const detail = err.response?.data?.detail || '发送失败，请稍后重试';
      toast.error(detail);
      // Rollback user message on error so user can retry
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0 && !loading;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]" style={{ background: 'var(--page-bg)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'var(--divider)', background: 'rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg"
            style={{ background: 'rgba(255,193,7,0.12)' }}
          >
            <RiRobot2Line size={20} style={{ color: 'var(--hive-gold)' }} />
          </div>
          <div>
            <h1 className="text-base font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
              AI 智能助手
            </h1>
            <p className="text-xs m-0" style={{ color: 'var(--text-secondary)' }}>
              社交媒体运营专家
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {remaining !== null && (
            <div
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.04)',
                color: remaining <= 5 ? '#F44336' : 'var(--text-secondary)',
                border: `1px solid ${'var(--divider)'}`,
              }}
            >
              <RiSparklingLine size={14} />
              剩余对话次数：{remaining}
            </div>
          )}
          <button
            onClick={handleOpenSettings}
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-secondary)',
              border: `1px solid ${'var(--divider)'}`,
            }}
            title="设置"
          >
            <RiSettings3Line size={18} />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {isEmpty ? (
          <EmptyState
            icon={<RiRobot2Line size={32} className="text-muted-foreground" />}
            title="开始与 AI 助手对话"
            description="我可以帮你策划内容、优化文案、分析数据。输入你的问题，开始对话吧！"
            action={{
              label: '开始对话',
              onClick: () => inputRef.current?.focus(),
            }}
          />
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      msg.role === 'user'
                        ? 'rgba(25,118,210,0.15)'
                        : 'rgba(255,193,7,0.12)',
                  }}
                >
                  {msg.role === 'user' ? (
                    <RiUserLine size={16} style={{ color: '#1976D2' }} />
                  ) : (
                    <RiRobot2Line size={16} style={{ color: 'var(--hive-gold)' }} />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className="relative max-w-[80%] sm:max-w-[70%] px-4 py-3 text-sm leading-relaxed rounded-2xl"
                  style={{
                    background:
                      msg.role === 'user' ? '#1976D2' : 'var(--card-bg)',
                    color: msg.role === 'user' ? '#FFFFFF' : 'var(--text-primary)',
                    border:
                      msg.role === 'user'
                        ? 'none'
                        : `1px solid ${'var(--divider)'}`,
                    borderRadius:
                      msg.role === 'user'
                        ? '18px 18px 4px 18px'
                        : '18px 18px 18px 4px',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-3 flex-row">
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,193,7,0.12)' }}
                >
                  <RiRobot2Line size={16} style={{ color: 'var(--hive-gold)' }} />
                </div>
                <div
                  className="px-4 py-3 rounded-2xl flex items-center gap-2"
                  style={{
                    background: 'var(--card-bg)',
                    border: `1px solid ${'var(--divider)'}`,
                    borderRadius: '18px 18px 18px 4px',
                  }}
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: '#9E9E9E', animationDelay: '0ms' }}
                  />
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: '#9E9E9E', animationDelay: '150ms' }}
                  />
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: '#9E9E9E', animationDelay: '300ms' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div
        className="px-4 py-4 sm:px-6 border-t"
        style={{ borderColor: 'var(--divider)', background: 'rgba(255,255,255,0.04)' }}
      >
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的问题…"
              rows={1}
              disabled={loading}
              className="input w-full resize-none pr-12"
              style={{
                background: 'var(--card-bg)',
                borderColor: 'rgba(255,255,255,0.10)',
                color: 'var(--text-primary)',
                borderRadius: '12px',
                padding: '12px 48px 12px 16px',
                minHeight: '48px',
                maxHeight: '160px',
                lineHeight: '1.5',
              }}
            />
            <span
              className="absolute right-3 bottom-3 text-xs"
              style={{ color: '#616161' }}
            >
              ↵
            </span>
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="btn flex items-center justify-center w-12 h-12 p-0 rounded-xl flex-shrink-0"
            style={{
              background:
                input.trim() && !loading ? 'var(--hive-gold)' : 'rgba(255,255,255,0.06)',
              color: input.trim() && !loading ? 'var(--page-bg)' : '#616161',
              borderRadius: '12px',
            }}
          >
            <RiSendPlaneFill size={20} />
          </button>
        </div>
        <p className="text-center text-xs mt-2" style={{ color: '#616161' }}>
          AI 生成内容仅供参考，请核实后使用
        </p>
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent
          className="sm:max-w-md"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${'var(--divider)'}`,
            color: 'var(--text-primary)',
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--text-primary)' }}>智能体设置</DialogTitle>
          </DialogHeader>

          {profileLoading ? (
            <div className="py-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
              加载中…
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Writing Style */}
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  写作风格
                </label>
                <select
                  value={writingStyle}
                  onChange={(e) => setWritingStyle(e.target.value)}
                  className="w-full rounded-lg text-sm outline-none"
                  style={{
                    background: 'var(--card-bg)',
                    border: `1px solid ${'var(--divider)'}`,
                    color: 'var(--text-primary)',
                    padding: '9px 14px',
                    appearance: 'auto',
                  }}
                >
                  <option value="">默认</option>
                  {WRITING_STYLES.map((s) => (
                    <option key={s} value={s}>
                      {s === 'casual'
                        ? '轻松随意'
                        : s === 'professional'
                        ? '专业严谨'
                        : s === 'creative'
                        ? '创意发散'
                        : '技术深度'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tone */}
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  语气
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full rounded-lg text-sm outline-none"
                  style={{
                    background: 'var(--card-bg)',
                    border: `1px solid ${'var(--divider)'}`,
                    color: 'var(--text-primary)',
                    padding: '9px 14px',
                    appearance: 'auto',
                  }}
                >
                  <option value="">默认</option>
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {t === 'friendly'
                        ? '友好亲切'
                        : t === 'formal'
                        ? '正式庄重'
                        : t === 'humorous'
                        ? '幽默风趣'
                        : '中性客观'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Instructions */}
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  自定义指令
                </label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="输入额外的行为指令…"
                  rows={4}
                  className="w-full rounded-lg text-sm outline-none resize-none"
                  style={{
                    background: 'var(--card-bg)',
                    border: `1px solid ${'var(--divider)'}`,
                    color: 'var(--text-primary)',
                    padding: '10px 14px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Domains */}
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  知识领域（逗号分隔）
                </label>
                <input
                  type="text"
                  value={domains}
                  onChange={(e) => setDomains(e.target.value)}
                  placeholder="例如：科技, 金融, 教育"
                  className="w-full rounded-lg text-sm outline-none"
                  style={{
                    background: 'var(--card-bg)',
                    border: `1px solid ${'var(--divider)'}`,
                    color: 'var(--text-primary)',
                    padding: '9px 14px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Keywords */}
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  关键词（逗号分隔）
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="例如：AI, 区块链, 自媒体"
                  className="w-full rounded-lg text-sm outline-none"
                  style={{
                    background: 'var(--card-bg)',
                    border: `1px solid ${'var(--divider)'}`,
                    color: 'var(--text-primary)',
                    padding: '9px 14px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2" style={{ borderColor: 'var(--divider)' }}>
            <button
              onClick={() => setSettingsOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--text-secondary)',
                border: `1px solid ${'var(--divider)'}`,
              }}
            >
              取消
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={saving || profileLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: 'var(--hive-gold)',
                color: 'var(--page-bg)',
                opacity: saving || profileLoading ? 0.6 : 1,
              }}
            >
              {saving ? '保存中…' : '保存'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentConsolePage;
