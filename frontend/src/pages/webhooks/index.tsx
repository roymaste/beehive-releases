import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  RiLinksLine,
  RiAddLine,
  RiDeleteBinLine,
  RiRefreshLine,
  RiCheckLine,
  RiCloseLine,
  RiTimeLine,
} from 'react-icons/ri';
import apiClient from '../../api/client';
import { useConfirmDialog } from '../../components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';

// ── Types ──

interface WebhookSubscription {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

interface WebhookLog {
  id: string;
  event: string;
  status: string;
  response_code: number | null;
  error: string | null;
  retry_count: number;
  created_at: string;
}

interface EventMap {
  [key: string]: string;
}

// ── Known events ──

const ALL_EVENTS: EventMap = {
  'task.completed': '任务完成',
  'task.failed': '任务失败',
  'task.scheduled': '任务已调度',
  'account.login_success': '账号登录成功',
  'account.login_failed': '账号登录失败',
  'account.banned': '账号被封禁',
  'executor.online': '执行器上线',
  'executor.offline': '执行器下线',
  'executor.error': '执行器异常',
  'proxy.failed': '代理检测失败',
};

// ── Palette ──

// ── Event Badge Colors ──
const EVENT_COLORS: Record<string, string> = {
  'task.completed': '#4caf50',
  'task.failed': '#ef5350',
  'account.login_success': '#4caf50',
  'account.login_failed': '#ef5350',
  'account.banned': 'var(--warning)',
  'executor.online': '#2196f3',
  'executor.offline': 'var(--text-secondary)',
  'proxy.failed': 'var(--warning)',
};

// ── Component ──

const WebhooksPage: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  // Form state
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>([]);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await apiClient.get<WebhookSubscription[]>('/webhooks');
      setWebhooks(res.data);
    } catch {
      toast.error('获取 Webhook 列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async (id: string) => {
    try {
      const res = await apiClient.get<WebhookLog[]>(`/webhooks/${id}/logs`);
      setLogs(res.data);
    } catch {
      setLogs([]);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  useEffect(() => {
    if (selectedWebhook) {
      fetchLogs(selectedWebhook);
    } else {
      setLogs([]);
    }
  }, [selectedWebhook, fetchLogs]);

  const handleCreate = async () => {
    if (!formName.trim() || !formUrl.trim() || formEvents.length === 0) {
      toast.error('请填写完整信息并选择至少一个事件');
      return;
    }
    setSending(true);
    try {
      await apiClient.post('/webhooks', {
        name: formName.trim(),
        url: formUrl.trim(),
        events: formEvents,
      });
      toast.success('Webhook 创建成功');
      setShowForm(false);
      setFormName('');
      setFormUrl('');
      setFormEvents([]);
      fetchWebhooks();
    } catch {
      toast.error('创建失败');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    confirm({
      title: '删除确认',
      description: '确定删除此 Webhook？',
      onConfirm: async () => {
        try {
          await apiClient.delete(`/webhooks/${id}`);
          toast.success('已删除');
          if (selectedWebhook === id) {
            setSelectedWebhook(null);
          }
          fetchWebhooks();
        } catch {
          toast.error('删除失败');
        }
      },
    });
  };

  const handleTest = async (id: string) => {
    try {
      await apiClient.post(`/webhooks/${id}/test`);
      toast.success('测试事件已发送');
      if (selectedWebhook === id) {
        setTimeout(() => fetchLogs(id), 2000);
      }
    } catch {
      toast.error('发送测试事件失败');
    }
  };

  const toggleEvent = (e: string) => {
    setFormEvents((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]
    );
  };

  if (loading) {
    return (
      <div style={{ padding: 32, color: 'var(--text-secondary)' }}>
        加载中...
      </div>
    );
  }

  return (
    <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-6">
            Webhook 通知
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            当自动化任务、账号状态或执行器事件发生时，蜂巢会 POST JSON 到你配置的 URL
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: 'var(--hive-gold)',
            color: 'var(--page-bg)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hive-gold-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--hive-gold)')}
        >
          <RiAddLine size={16} />
          {showForm ? '取消' : '新建 Webhook'}
        </button>
      </div>

      {/* ── Create Form ── */}
      {showForm && (
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: `1px solid ${'var(--divider)'}`,
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>
            新建 Webhook 订阅
          </h3>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              名称
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="例如：生产环境"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${'var(--divider)'}`,
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              回调 URL
            </label>
            <input
              type="url"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="https://your-server.com/webhook"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${'var(--divider)'}`,
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              监听事件
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(ALL_EVENTS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => toggleEvent(key)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    border: `1px solid ${formEvents.includes(key) ? 'var(--hive-gold)' : 'var(--divider)'}`,
                    backgroundColor: formEvents.includes(key) ? 'var(--hive-gold)' : 'transparent',
                    color: formEvents.includes(key) ? 'var(--hive-gold)' : 'var(--text-secondary)',
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                  {formEvents.includes(key) && (
                    <RiCheckLine size={12} style={{ marginLeft: 4, verticalAlign: 'middle' }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={sending}
            style={{
              padding: '8px 24px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: sending ? 'var(--text-tertiary)' : 'var(--hive-blue)',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: sending ? 'not-allowed' : 'pointer',
            }}
          >
            {sending ? '创建中...' : '创建 Webhook'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* ── List ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {webhooks.length === 0 ? (
            <EmptyState
              icon={<RiLinksLine size={48} />}
              title="暂无 Webhook 订阅"
              description="创建你的第一个 Webhook 来接收事件通知"
            />
          ) : (
            webhooks.map((wh) => (
              <div
                key={wh.id}
                onClick={() => setSelectedWebhook(wh.id === selectedWebhook ? null : wh.id)}
                style={{
                  backgroundColor: selectedWebhook === wh.id ? 'var(--hover-bg)' : 'var(--card-bg)',
                  border: `1px solid ${selectedWebhook === wh.id ? 'var(--hive-gold)' : 'var(--divider)'}`,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 8,
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                      {wh.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, wordBreak: 'break-all' }}>
                      {wh.url}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 10,
                        backgroundColor: wh.status === 'active' ? 'rgba(76,175,80,0.15)' : 'rgba(158,158,158,0.15)',
                        color: wh.status === 'active' ? 'var(--success)' : 'var(--text-tertiary)',
                      }}
                    >
                      {wh.status === 'active' ? '运行中' : '已暂停'}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTest(wh.id); }}
                      title="发送测试事件"
                      style={{
                        padding: '6px',
                        borderRadius: 6,
                        border: `1px solid ${'var(--divider)'}`,
                        backgroundColor: 'transparent',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                      }}
                    >
                      <RiRefreshLine size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(wh.id); }}
                      title="删除"
                      style={{
                        padding: '6px',
                        borderRadius: 6,
                        border: `1px solid ${'var(--divider)'}`,
                        backgroundColor: 'transparent',
                        color: 'var(--error)',
                        cursor: 'pointer',
                        display: 'flex',
                      }}
                    >
                      <RiDeleteBinLine size={14} />
                    </button>
                  </div>
                </div>

                {/* Events badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {wh.events.map((evt) => (
                    <span
                      key={evt}
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 10,
                        backgroundColor: `${EVENT_COLORS[evt] || 'var(--text-tertiary)'}22`,
                        color: EVENT_COLORS[evt] || 'var(--text-secondary)',
                      }}
                    >
                      {ALL_EVENTS[evt] || evt}
                    </span>
                  ))}
                </div>

                {/* Secret display */}
                {selectedWebhook === wh.id && (
                  <div style={{ marginTop: 12, padding: 8, backgroundColor: 'var(--card-bg)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>签名密钥（secret）</div>
                    <code style={{ fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                      {wh.secret}
                    </code>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>
                      蜂巢使用 HMAC-SHA256 对请求体签名，签名值在 X-Webhook-Signature header 中
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* ── Logs Panel ── */}
        {selectedWebhook && (
          <div
            style={{
              width: 340,
              flexShrink: 0,
              backgroundColor: 'var(--card-bg)',
              border: `1px solid ${'var(--divider)'}`,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <h3
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '0 0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <RiTimeLine size={14} />
              发送记录
              <button
                onClick={() => selectedWebhook && fetchLogs(selectedWebhook)}
                style={{
                  marginLeft: 'auto',
                  padding: '4px',
                  borderRadius: 4,
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                }}
              >
                <RiRefreshLine size={14} />
              </button>
            </h3>

            {logs.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: '24px 0' }}>
                暂无发送记录
              </p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: '10px 0',
                    borderBottom: `1px solid ${'var(--divider)'}`,
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {ALL_EVENTS[log.event] || log.event}
                    </span>
                    {log.status === 'success' ? (
                      <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <RiCheckLine size={12} />
                        {log.response_code}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--error)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <RiCloseLine size={12} />
                        {log.response_code || '超时'}
                      </span>
                    )}
                  </div>
                  {log.error && (
                    <div style={{ color: 'var(--error)', marginTop: 2, fontSize: 11 }}>{log.error}</div>
                  )}
                  <div style={{ color: 'var(--text-tertiary)', marginTop: 2, fontSize: 11 }}>
                    {new Date(log.created_at).toLocaleString('zh-CN')}
                    {log.retry_count > 0 && ` · 重试 ${log.retry_count} 次`}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      {dialog}
    </div>
  );
};

export default WebhooksPage;
