import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Components } from 'react-markdown';
import { EmptyState } from '../components/ui/empty-state';
import {
  RiSendPlaneFill,
  RiRobot2Line,
  RiUserLine,
  RiSparklingLine,
  RiSettings3Line,
  RiChatNewLine,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiCheckLine,
  RiChatHistoryLine,
  RiMenuFoldLine,
  RiMenuUnfoldLine,
} from 'react-icons/ri';
import {
  Users,
  MessageSquare,
  KeyRound,
  Activity,
  ChevronRight,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  BrainCircuit,
  Puzzle,
  BarChart3,
  Settings2,
  Command,
  HelpCircle,
  BookOpen,
  SendHorizontal,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { agentProfileAPI, AgentProfileUpdate, agentChatAPI } from '../api/client';
import { automationsAPI } from '../api/automations';
import type { ChatSessionItem } from '../api/client';
import { accountsAPI } from '../api/accounts';
import { llmAPI, type AvailableModel } from '../api/llm';
import apiClient from '../api/client';

// ── Types ──

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface DashboardStat {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

// ── Inline dark code-block styles (no external CSS dependency) ──

const CODE_BLOCK_STYLES = `
.hljs{display:block;overflow-x:auto;padding:1em;background:#1a1a2e;color:#e0e0e0;border-radius:8px;font-family:var(--font-mono,monospace);font-size:13px;line-height:1.5}
.hljs-keyword,.hljs-selector-tag,.hljs-literal,.hljs-section,.hljs-link{color:#ff79c6}
.hljs-function .hljs-keyword{color:#8be9fd}
.hljs-string,.hljs-title,.hljs-name,.hljs-type,.hljs-attribute,.hljs-symbol,.hljs-bullet,.hljs-addition,.hljs-variable,.hljs-template-tag,.hljs-template-variable{color:#f1fa8c}
.hljs-comment,.hljs-quote,.hljs-deletion,.hljs-meta{color:#6272a4}
.hljs-number,.hljs-regexp,.hljs-literal,.hljs-built_in,.hljs-builtin-name{color:#bd93f9}
.hljs-params{color:#ffb86c}
.hljs-emphasis{font-style:italic}
.hljs-strong{font-weight:bold}
`;

const WRITING_STYLES = ['casual', 'professional', 'creative', 'technical'] as const;
const TONES = ['friendly', 'formal', 'humorous', 'neutral'] as const;
const SESSION_STORAGE_KEY = 'agent_console_session_id';
const GUIDE_DISMISSED_KEY = 'agent-guide-dismissed';
const SIDEBAR_WIDTH = 260;
const RIGHT_PANEL_WIDTH = 260;

// ── Helper: copy to clipboard ──

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ── Component: CopyButton ──

const CopyButton: React.FC<{ text: string; className?: string; size?: number }> = ({
  text,
  className = '',
  size = 14,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('复制失败');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${className}`}
      style={{
        background: 'rgba(255,255,255,0.06)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--divider)',
      }}
      title="复制"
    >
      {copied ? <RiCheckLine size={size} style={{ color: 'var(--success)' }} /> : <RiFileCopyLine size={size} />}
    </button>
  );
};

// ── Component: CodeBlock with copy ──

const CodeBlock: React.FC<{ language?: string; children: string }> = ({ language, children }) => {
  const codeText = String(children).replace(/\n$/, '');
  return (
    <div className="relative group/code my-3 rounded-lg overflow-hidden" style={{ border: '1px solid var(--divider)' }}>
      {language && (
        <div
          className="flex items-center justify-between px-3 py-1.5 text-xs"
          style={{
            background: 'rgba(255,255,255,0.04)',
            color: 'var(--text-tertiary)',
            borderBottom: '1px solid var(--divider)',
          }}
        >
          <span className="font-mono">{language}</span>
          <CopyButton text={codeText} size={13} />
        </div>
      )}
      <pre className="m-0 overflow-x-auto" style={{ background: '#1a1a2e', margin: 0 }}>
        <code className={`hljs language-${language || 'text'}`}>{children}</code>
      </pre>
    </div>
  );
};

// ── Markdown components ──

const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const isInline = !match && !String(children).includes('\n');
    if (isInline) {
      return (
        <code
          className="px-1.5 py-0.5 rounded text-xs font-mono"
          style={{
            background: 'rgba(255,255,255,0.08)',
            color: 'var(--hive-gold)',
          }}
          {...props}
        >
          {children}
        </code>
      );
    }
    return <CodeBlock language={match?.[1]}>{String(children)}</CodeBlock>;
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto my-3 rounded-lg" style={{ border: '1px solid var(--divider)' }}>
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    );
  },
  thead({ children }) {
    return <thead style={{ background: 'rgba(255,255,255,0.04)' }}>{children}</thead>;
  },
  th({ children }) {
    return (
      <th
        className="text-left px-3 py-2 text-xs font-semibold"
        style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--divider)' }}
      >
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td
        className="px-3 py-2 text-xs"
        style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--divider)' }}
      >
        {children}
      </td>
    );
  },
  a({ children, href }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:opacity-80"
        style={{ color: 'var(--hive-gold)' }}
      >
        {children}
      </a>
    );
  },
  ul({ children }) {
    return <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>;
  },
  li({ children }) {
    return <li className="text-sm leading-relaxed">{children}</li>;
  },
  p({ children }) {
    return <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>;
  },
  h1({ children }) {
    return <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="text-base font-semibold mt-3 mb-2">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>;
  },
  blockquote({ children }) {
    return (
      <blockquote
        className="pl-3 my-2 italic"
        style={{ borderLeft: '3px solid var(--hive-gold)', color: 'var(--text-secondary)' }}
      >
        {children}
      </blockquote>
    );
  },
  hr() {
    return <hr className="my-3" style={{ borderColor: 'var(--divider)' }} />;
  },
};

// ── Component: MarkdownMessage ──

const MarkdownMessage: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="relative group/message">
      {/* Copy overlay for entire message */}
      <div className="absolute top-2 right-2 opacity-0 group-hover/message:opacity-100 transition-opacity z-10">
        <CopyButton text={content} />
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ReactMarkdown remarkPlugins={[remarkGfm as any]} rehypePlugins={[rehypeHighlight as any]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

// ── Component: StatCard ──

const StatCard: React.FC<{ stat: DashboardStat }> = ({ stat }) => {
  const isEmptyValue = stat.value === 0 || stat.value === '-' || stat.value === '--';
  const displayValue = stat.value === 0 || stat.value === '-' ? '--' : stat.value;
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--divider)',
      }}
    >
      <div
        className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
        style={{ background: stat.bgColor, color: stat.color }}
      >
        {stat.icon}
      </div>
      <div className="min-w-0">
        <div
          className="text-lg font-bold leading-tight"
          style={{ color: isEmptyValue ? 'var(--text-tertiary)' : 'var(--text-primary)' }}
        >
          {displayValue}
        </div>
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {stat.label}
        </div>
      </div>
    </div>
  );
};

// ── Component: GuidePanel ──

const GUIDE_ITEMS = [
  { icon: <BrainCircuit size={16} />, title: '说人话指挥', desc: '"每天早上8点去推特搜AI新闻并点赞前3条" — AI自动创建技能并定时执行' },
  { icon: <Puzzle size={16} />, title: '创建自动化技能', desc: '"帮我创建一个发推技能，每周一三五早上9点发科技新闻"' },
  { icon: <BarChart3 size={16} />, title: '立即执行', desc: '"马上跑我的AI新闻技能" 或 "现在发一条推" — 立即触发，不等定时' },
  { icon: <Settings2 size={16} />, title: '修改已有技能', desc: '"把早8点改成早9点" / "语气改得更毒舌" — 改技能配置一句话搞定' },
  { icon: <Command size={16} />, title: '平台账号管理', desc: '"添加一个Twitter账号" / "给这个环境绑定代理" — 在聊天里管理一切' },
];

const GuidePanel: React.FC<{ open: boolean; onToggle: () => void }> = ({ open, onToggle }) => {
  if (!open) {
    return (
      <button
        onClick={onToggle}
        className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors flex-shrink-0"
        style={{
          background: 'rgba(255,255,255,0.04)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--divider)',
          position: 'absolute',
          right: 12,
          top: 12,
          zIndex: 20,
        }}
        title="展开使用指引"
      >
        <PanelLeftOpen size={16} />
      </button>
    );
  }

  return (
    <aside
      className="flex-shrink-0 flex flex-col border-l transition-all duration-300 ease-in-out"
      style={{
        width: RIGHT_PANEL_WIDTH,
        borderColor: 'var(--divider)',
        background: 'var(--sidebar-bg)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--divider)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          蜂巢 Agent 使用指引
        </span>
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          title="收起"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {GUIDE_ITEMS.map((item, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <div className="flex-shrink-0 mt-0.5" style={{ color: 'var(--hive-gold)' }}>
              {item.icon}
            </div>
            <div>
              <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {item.title}
              </div>
              <div className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                {item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-3 py-3 border-t" style={{ borderColor: 'var(--divider)' }}>
        <button
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: 'rgba(255,193,7,0.08)',
            color: 'var(--hive-gold)',
            border: '1px solid rgba(255,193,7,0.15)',
          }}
          onClick={() => toast('新手指南即将上线')}
        >
          <BookOpen size={14} />
          新手指南
        </button>
      </div>
    </aside>
  );
};

// ── Main Page ──

const AgentConsolePage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Right guide panel state (dismissible via localStorage)
  const [guideOpen, setGuideOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(GUIDE_DISMISSED_KEY) !== 'true';
    }
    return true;
  });

  // Dashboard stats
  const [accountCount, setAccountCount] = useState<number | null>(null);
  const [todayMessages, setTodayMessages] = useState(0);
  const [apiQuota, setApiQuota] = useState<number | null>(null);

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

  // Model selector state
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');

  // Responsive sidebar & guide
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
      if (window.innerWidth < 1280) {
        setGuideOpen(false);
      } else {
        const dismissed = localStorage.getItem(GUIDE_DISMISSED_KEY) === 'true';
        setGuideOpen(!dismissed);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Load available models
  useEffect(() => {
    let mounted = true;
    llmAPI.listAvailableModels()
      .then((res) => {
        if (!mounted) return;
        setAvailableModels(res.data.models);
        if (res.data.models.length > 0) {
          setSelectedModel(res.data.models[0].model_name);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Load dashboard stats
  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      try {
        const accRes = await accountsAPI.list({ limit: 1 });
        if (mounted) setAccountCount(accRes.data.total);
      } catch {
        // silent fail
      }

      try {
        const subRes = await apiClient.get('/billing/subscription');
        const subData = subRes.data;
        if (mounted) {
          const plan = subData?.plan;
          if (plan?.limits?.api_daily) {
            setApiQuota(plan.limits.api_daily);
          } else {
            setApiQuota(null);
          }
        }
      } catch {
        // silent fail
      }
    };

    loadStats();
    return () => {
      mounted = false;
    };
  }, []);

  // Update today messages count
  useEffect(() => {
    const today = new Date().toDateString();
    const count = messages.filter((m) => m.role === 'user' && m.timestamp && new Date(m.timestamp).toDateString() === today).length;
    setTodayMessages(count);
  }, [messages]);

  const loadSessionDetail = async (sid: string) => {
    try {
      const res = await agentChatAPI.getSession(sid);
      const data = res.data;
      const msgs: ChatMessage[] = data.messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.timestamp,
        }));
      setMessages(msgs);
      setSessionId(sid);
      localStorage.setItem(SESSION_STORAGE_KEY, sid);
    } catch {
      toast.error('加载会话失败');
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  };

  // Load sessions list and restore session on mount
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Load sessions
      setSessionsLoading(true);
      try {
        const res = await agentChatAPI.listSessions();
        if (mounted) setSessions(res.data.sessions);
      } catch {
        // silent fail
      } finally {
        if (mounted) setSessionsLoading(false);
      }

      // Restore session
      const savedId = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedId && mounted) {
        try {
          const res = await agentChatAPI.getSession(savedId);
          if (!mounted) return;
          const msgs: ChatMessage[] = res.data.messages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
              timestamp: m.timestamp,
            }));
          setMessages(msgs);
          setSessionId(savedId);
        } catch {
          if (mounted) toast.error('加载会话失败');
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, []);

  const handleNewSession = () => {
    setMessages([]);
    setSessionId(null);
    setRemaining(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    inputRef.current?.focus();
  };

  const handleSwitchSession = (sid: string) => {
    if (sid === sessionId) return;
    loadSessionDetail(sid);
  };

  const handleDeleteSession = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定删除该会话？')) return;
    try {
      await agentChatAPI.deleteSession(sid);
      setSessions((prev) => prev.filter((s) => s.id !== sid));
      if (sessionId === sid) {
        handleNewSession();
      }
      toast.success('会话已删除');
    } catch {
      toast.error('删除失败');
    }
  };

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
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || '加载配置失败';
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
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || '保存失败';
      toast.error(detail);
    } finally {
      setSaving(false);
    }
  };

  const loadSessions = async () => {
    try {
      const res = await agentChatAPI.listSessions();
      setSessions(res.data.sessions);
    } catch {
      // silent
    }
  };

  // ── Streaming chat via SSE ──
  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Add user message immediately
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Create placeholder assistant message for streaming
    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      abortRef.current = new AbortController();
      const response = await agentChatAPI.chatStreamFetch(text, sessionId, abortRef.current.signal, selectedModel || null);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `请求失败 (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const decoder = new TextDecoder();
      let buffer = '';
      let currentSid: string | null = null;
      let currentRemaining: number | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE lines
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const chunk of lines) {
          const dataLine = chunk.trim().split('\n').find((l) => l.startsWith('data:'));
          if (!dataLine) continue;
          const jsonStr = dataLine.slice(5).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const evt = JSON.parse(jsonStr);
            if (evt.type === 'token') {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last && last.role === 'assistant') {
                  next[next.length - 1] = { ...last, content: last.content + (evt.content || '') };
                }
                return next;
              });
            } else if (evt.type === 'finish') {
              currentSid = evt.session_id ?? currentSid;
              currentRemaining = evt.remaining ?? currentRemaining;
            } else if (evt.type === 'error') {
              throw new Error(evt.detail || '流式响应错误');
            }
          } catch {
            // ignore malformed events
          }
        }
      }

      if (currentSid) {
        setSessionId(currentSid);
        localStorage.setItem(SESSION_STORAGE_KEY, currentSid);
      }
      if (currentRemaining !== null) setRemaining(currentRemaining);

      // Refresh session list to update title
      loadSessions();

      // ── 发推意图检测 ──
      const tweetKeywords = ['发推', '发推文', '发一条推', '发帖', '帮我发推', '帮我发帖', '发布推文'];
      const isTweetIntent = tweetKeywords.some(kw => text.includes(kw));
      
      if (isTweetIntent) {
        try {
          const task = await automationsAPI.createTask({
            name: `Agent发推: ${text.slice(0, 30)}`,
            action: 'post_tweet',
            params: { content: text },
          });
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `✅ 已创建发推任务 (ID: ${task.id})，桌面客户端将自动执行。`,
            timestamp: new Date().toISOString(),
          }]);
        } catch (err: any) {
          console.error('创建发推任务失败:', err);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `❌ 创建发推任务失败: ${err.message || '未知错误'}`,
            timestamp: new Date().toISOString(),
          }]);
        }
      }
    } catch (err) {
      const detail = (err as Error).message || '发送失败，请稍后重试';
      toast.error(detail);
      // Remove the empty assistant placeholder and restore user message
      setMessages((prev) => {
        let next = [...prev];
        // Remove empty assistant placeholder
        if (next.length > 0 && next[next.length - 1].role === 'assistant' && !next[next.length - 1].content) {
          next = next.slice(0, -1);
        }
        // Remove user message so they can retry
        if (next.length > 0 && next[next.length - 1].role === 'user' && next[next.length - 1].content === text) {
          next = next.slice(0, -1);
        }
        return next;
      });
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const handleAbort = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
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

  // Dashboard stats data (softened empty states)
  const stats: DashboardStat[] = [
    {
      label: '账号数量',
      value: accountCount ?? '--',
      icon: <Users size={16} />,
      color: '#22c55e',
      bgColor: 'rgba(34,197,94,0.12)',
    },
    {
      label: '今日消息',
      value: todayMessages || '--',
      icon: <MessageSquare size={16} />,
      color: '#3b82f6',
      bgColor: 'rgba(59,130,246,0.12)',
    },
    {
      label: 'API 剩余配额',
      value: remaining !== null ? remaining : apiQuota !== null ? apiQuota : '--',
      icon: <KeyRound size={16} />,
      color: '#f59e0b',
      bgColor: 'rgba(245,158,11,0.12)',
    },
    {
      label: '活跃会话',
      value: sessions.length || '--',
      icon: <Activity size={16} />,
      color: '#a855f7',
      bgColor: 'rgba(168,85,247,0.12)',
    },
  ];

  // ── Render ──
  return (
    <div className="flex" style={{ height: 'calc(100vh - 64px)', background: 'var(--page-bg)' }}>
      {/* Inject code styles */}
      <style>{CODE_BLOCK_STYLES}</style>

      {/* Right Sidebar — History Sessions */}
      <aside
        className="flex-shrink-0 flex flex-col border-l transition-all duration-300 ease-in-out"
        style={{
          order: 2,
          width: sidebarOpen ? SIDEBAR_WIDTH : 0,
          borderColor: 'var(--divider)',
          background: 'var(--sidebar-bg)',
          overflow: 'hidden',
        }}
      >
        <div className="flex flex-col h-full" style={{ width: SIDEBAR_WIDTH }}>
          {/* Sidebar Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--divider)' }}
          >
            <div className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <RiChatHistoryLine size={18} />
              <span className="text-sm font-semibold">历史会话</span>
            </div>
            <button
              onClick={handleNewSession}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors"
              style={{
                background: 'var(--hive-gold-bg)',
                color: 'var(--hive-gold)',
              }}
              title="新建会话"
            >
              <RiChatNewLine size={14} />
              新建
            </button>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto py-2">
            {sessionsLoading ? (
              <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
                加载中…
              </div>
            ) : sessions.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
                暂无历史会话
              </div>
            ) : (
              sessions.map((sess) => {
                const isActive = sess.id === sessionId;
                return (
                  <div
                    key={sess.id}
                    onClick={() => handleSwitchSession(sess.id)}
                    className="group relative mx-2 mb-1 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
                    style={{
                      background: isActive ? 'rgba(255,193,7,0.10)' : 'transparent',
                      borderLeft: isActive ? '3px solid var(--hive-gold)' : '3px solid transparent',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-medium truncate"
                          style={{ color: isActive ? 'var(--hive-gold)' : 'var(--text-primary)' }}
                        >
                          {sess.title}
                        </p>
                        <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                          {sess.updated_at
                            ? new Date(sess.updated_at).toLocaleString('zh-CN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(sess.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 rounded"
                        style={{ color: 'var(--text-tertiary)' }}
                        title="删除"
                      >
                        <RiDeleteBinLine size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 relative">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--divider)', background: 'rgba(255,255,255,0.04)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
              style={{
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--divider)',
              }}
              title={sidebarOpen ? '收起侧栏' : '展开侧栏'}
            >
              {sidebarOpen ? <RiMenuFoldLine size={16} /> : <RiMenuUnfoldLine size={16} />}
            </button>
            <div
              className="flex items-center justify-center w-9 h-9 rounded-lg"
              style={{ background: 'var(--hive-gold-bg)' }}
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
                  color: remaining <= 5 ? 'var(--error)' : 'var(--text-secondary)',
                  border: '1px solid var(--divider)',
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
                border: '1px solid var(--divider)',
              }}
              title="设置"
            >
              <RiSettings3Line size={18} />
            </button>
          </div>
        </div>

        {/* Dashboard Stats Bar */}
        <div
          className="px-6 py-3 border-b"
          style={{ borderColor: 'var(--divider)', background: 'rgba(255,255,255,0.02)' }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((stat, idx) => (
              <StatCard key={idx} stat={stat} />
            ))}
          </div>
        </div>

        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          {isEmpty ? (
            <EmptyState
              icon={<RiRobot2Line size={32} className="text-muted-foreground" />}
              title="对蜂巢说话，AI 帮你干活"
              description="试试说：「每天早上8点去推特搜AI新闻并点赞前3条」- AI会帮你创建技能、自动生成操作脚本、定时执行。"
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
                        msg.role === 'user' ? 'rgba(25,118,210,0.15)' : 'var(--hive-gold-bg)',
                    }}
                  >
                    {msg.role === 'user' ? (
                      <RiUserLine size={16} style={{ color: 'var(--hive-blue)' }} />
                    ) : (
                      <RiRobot2Line size={16} style={{ color: 'var(--hive-gold)' }} />
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className="relative max-w-[80%] sm:max-w-[70%] px-4 py-3 text-sm leading-relaxed rounded-2xl"
                    style={{
                      background: msg.role === 'user' ? 'var(--hive-blue)' : 'var(--card-bg)',
                      color: msg.role === 'user' ? '#FFFFFF' : 'var(--text-primary)',
                      border: msg.role === 'user' ? 'none' : '1px solid var(--divider)',
                      borderRadius:
                        msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    }}
                  >
                    {msg.role === 'assistant' ? (
                      <MarkdownMessage content={msg.content} />
                    ) : (
                      <p className="m-0 whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex gap-3 flex-row">
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--hive-gold-bg)' }}
                  >
                    <RiRobot2Line size={16} style={{ color: 'var(--hive-gold)' }} />
                  </div>
                  <div
                    className="px-4 py-3 rounded-2xl flex items-center gap-2"
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--divider)',
                      borderRadius: '18px 18px 18px 4px',
                    }}
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: 'var(--gray-500)', animationDelay: '0ms' }}
                    />
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: 'var(--gray-500)', animationDelay: '150ms' }}
                    />
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: 'var(--gray-500)', animationDelay: '300ms' }}
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
          <div className="max-w-3xl mx-auto">
            {availableModels.length > 0 && (
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--gray-700)' }}>模型</span>
                <Select
                  value={selectedModel}
                  onValueChange={setSelectedModel}
                  disabled={loading}
                >
                  <SelectTrigger
                    className="h-7 text-xs border-0 bg-transparent px-2 py-0"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <SelectValue placeholder="选择模型" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((m) => (
                      <SelectItem key={m.model_name} value={m.model_name}>
                        {m.provider_display} · {m.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入你的问题…"
                  rows={1}
                  disabled={loading}
                  className="input w-full resize-none pr-12 focus-visible:border-[#FFC107] focus-visible:ring-2 focus-visible:ring-[#FFC107]/30"
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
                  style={{ color: 'var(--gray-700)' }}
                >
                  ↵
                </span>
              </div>
              {loading ? (
                <button
                  onClick={handleAbort}
                  className="flex items-center justify-center w-12 h-12 p-0 rounded-xl flex-shrink-0"
                  style={{
                    background: 'var(--error-bg)',
                    color: 'var(--error)',
                    borderRadius: '12px',
                    border: '1px solid rgba(244,67,54,0.2)',
                  }}
                  title="停止生成"
                >
                  <span className="w-3 h-3 rounded-sm bg-current" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#FFC107] text-[#121212] hover:bg-[#FFB300] transition-colors flex-shrink-0"
                >
                  <SendHorizontal size={18} />
                </button>
              )}
            </div>
            <p className="text-center text-xs mt-2" style={{ color: 'var(--gray-700)' }}>
              AI 生成内容仅供参考，请核实后使用
            </p>
          </div>
        </div>
      </div>

      {/* Right Guide Panel */}
      <GuidePanel
        open={guideOpen}
        onToggle={() => {
          const next = !guideOpen;
          setGuideOpen(next);
          if (!next) {
            localStorage.setItem(GUIDE_DISMISSED_KEY, 'true');
          } else {
            localStorage.removeItem(GUIDE_DISMISSED_KEY);
          }
        }}
      />

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent
          className="sm:max-w-md"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--divider)',
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
                    border: '1px solid var(--divider)',
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
                    border: '1px solid var(--divider)',
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
                    border: '1px solid var(--divider)',
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
                    border: '1px solid var(--divider)',
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
                    border: '1px solid var(--divider)',
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
                border: '1px solid var(--divider)',
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
