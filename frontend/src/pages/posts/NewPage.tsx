import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiCheckLine,
  RiCloseLine,
  RiLoader4Line,
  RiArrowGoBackLine,
  RiListCheck,
  RiTimeLine,
} from 'react-icons/ri';
import { profilesAPI, Profile } from '../../api/profiles';
import { automationsAPI, BatchPublishResponse, BatchPublishResultItem } from '../../api/automations';
import apiClient from '../../api/client';

// Twitter emoji as platform indicator
const PLATFORM_EMOJI: Record<string, string> = {
  twitter: '🐦',
  x: '𝕏',
  weibo: '📘',
  xiaohongshu: '📕',
  douyin: '🎵',
};

const DEFAULT_EMOJI = '🌐';

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  running: { color: '#22c55e', label: '运行中' },
  active: { color: '#22c55e', label: '运行中' },
  stopped: { color: '#a1a1aa', label: '已停止' },
  error: { color: '#ef4444', label: '错误' },
};

interface PublishResult {
  task_id: string;
  status: string;
  profile_id: string;
  tweet_url?: string;
  error?: string;
}

const PostsNewPage: React.FC = () => {
  const navigate = useNavigate();

  // Profile list
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Mode: single or batch
  const [batchMode, setBatchMode] = useState(false);

  // Selected profile(s)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Content
  const [content, setContent] = useState('');
  const MAX_CHARS = 280;

  // Schedule
  const [schedule, setSchedule] = useState('');
  const [useSchedule, setUseSchedule] = useState(false);

  // Publishing state
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [batchResult, setBatchResult] = useState<BatchPublishResponse | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    setFetchError(false);
    try {
      const res = await profilesAPI.list({ skip: 0, limit: 100, status: 'running' });
      setProfiles(res.data.profiles);
    } catch {
      toast.error('获取账号列表失败');
      setFetchError(true);
    } finally {
      setLoadingProfiles(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const toggleProfileSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const handleBatchPublish = async () => {
    if (selectedIds.length === 0) {
      toast.error('请至少选择一个账号');
      return;
    }
    if (!content.trim()) {
      toast.error('请输入要发布的内容');
      return;
    }

    setPublishing(true);
    setBatchResult(null);
    try {
      const payload: Parameters<typeof automationsAPI.batchPublish>[0] = {
        profile_ids: selectedIds,
        platform: 'twitter',
        content: content.trim(),
        media_urls: [],
        ...(useSchedule && schedule.trim() ? { schedule: schedule.trim() } : {}),
      };
      const res = await automationsAPI.batchPublish(payload);
      setBatchResult(res.data);

      const failed = res.data.results.filter((r) => r.status === 'error').length;
      if (failed === 0) {
        toast.success(`发布成功！共 ${res.data.total} 个账号`);
      } else {
        toast.error(`${failed}/${res.data.total} 个账号发布失败`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? err?.message ?? '发布失败';
      toast.error(msg);
    } finally {
      setPublishing(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedId) {
      toast.error('请先选择一个账号');
      return;
    }
    if (!content.trim()) {
      toast.error('请输入要发布的内容');
      return;
    }

    setPublishing(true);
    setResult(null);
    try {
      const res = await apiClient.post<PublishResult>('/agents/publish', {
        profile_id: selectedId,
        platform: 'twitter',
        content: content.trim(),
        media_urls: [],
      });
      setResult(res.data);
      if (res.data.status === 'published' || res.data.status === 'success') {
        toast.success('发布成功！');
      } else {
        toast.error(res.data.error ?? '发布失败');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? err?.message ?? '发布失败';
      toast.error(msg);
      setResult({
        task_id: '',
        status: 'error',
        profile_id: selectedId,
        tweet_url: undefined,
        error: msg,
      });
    } finally {
      setPublishing(false);
    }
  };

  const charCount = content.length;
  const overLimit = charCount > MAX_CHARS;

  const renderProfileCard = (profile: Profile, isMulti: boolean) => {
    const emoji = PLATFORM_EMOJI[profile.account_platform ?? ''] ?? DEFAULT_EMOJI;
    const statusCfg = STATUS_CONFIG[profile.status] ?? STATUS_CONFIG.stopped;
    const isSelected = isMulti ? selectedIds.includes(profile.id) : selectedId === profile.id;

    return (
      <div
        key={profile.id}
        onClick={() => isMulti ? toggleProfileSelection(profile.id) : setSelectedId(profile.id)}
        style={{
          background: isSelected ? 'rgba(245,158,11,0.08)' : '#18181b',
          border: `1px solid ${isSelected ? 'rgba(245,158,11,0.4)' : '#27272a'}`,
          borderRadius: 10,
          padding: '12px 14px',
          cursor: 'pointer',
          transition: 'all 0.15s',
          position: 'relative',
        }}
      >
        {isSelected && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RiCheckLine size={12} color="#09090b" />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 18 }}>{emoji}</span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: isSelected ? '#fafafa' : '#e4e4e7',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {profile.name}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#71717a' }}>
            {profile.account_platform
              ? profile.account_platform.charAt(0).toUpperCase() + profile.account_platform.slice(1)
              : '—'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: statusCfg.color,
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: 12, color: statusCfg.color }}>
              {statusCfg.label}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: '#a1a1aa',
            cursor: 'pointer',
            padding: 6,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            fontSize: 14,
          }}
          title="返回"
        >
          <RiArrowGoBackLine size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground" style={{ margin: 0 }}>
            发帖
          </h1>
          <p style={{ fontSize: 13, color: '#71717a', margin: '4px 0 0' }}>
            选择运行中的账号，撰写内容并发布
          </p>
        </div>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => { setBatchMode(false); setSelectedIds([]); }}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            background: !batchMode ? '#f59e0b' : '#27272a',
            color: !batchMode ? '#09090b' : '#a1a1aa',
            transition: 'all 0.15s',
          }}
        >
          单账号发帖
        </button>
        <button
          onClick={() => { setBatchMode(true); setSelectedId(null); }}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            background: batchMode ? '#f59e0b' : '#27272a',
            color: batchMode ? '#09090b' : '#a1a1aa',
            transition: 'all 0.15s',
          }}
        >
          <RiListCheck size={14} style={{ marginRight: 4 }} />
          批量发帖
        </button>
      </div>

      {/* Step 1: Select account(s) */}
      <section style={{ marginBottom: 28 }}>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#a1a1aa',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            marginBottom: 12,
          }}
        >
          {batchMode ? '1 · 选择账号（可多选）' : '1 · 选择账号'}
          {batchMode && selectedIds.length > 0 && (
            <span style={{ color: '#f59e0b', marginLeft: 8 }}>
              已选 {selectedIds.length} 个
            </span>
          )}
        </h2>

        {loadingProfiles ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#71717a',
              padding: '20px 0',
            }}
          >
            <RiLoader4Line size={16} className="spin" />
            <span style={{ fontSize: 14 }}>加载账号中...</span>
          </div>
        ) : fetchError ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444' }}>
            <RiCloseLine size={16} />
            <span style={{ fontSize: 14 }}>加载失败</span>
            <button
              onClick={fetchProfiles}
              style={{
                background: 'none',
                border: '1px solid #ef4444',
                color: '#ef4444',
                borderRadius: 6,
                padding: '2px 10px',
                fontSize: 12,
                cursor: 'pointer',
                marginLeft: 8,
              }}
            >
              重试
            </button>
          </div>
        ) : profiles.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '24px',
              textAlign: 'center',
              color: '#71717a',
              fontSize: 14,
            }}
          >
            暂无可用账号，请确保有运行中的环境
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 10,
            }}
          >
            {profiles.map((profile) => renderProfileCard(profile, batchMode))}
          </div>
        )}
      </section>

      {/* Step 2: Write content */}
      <section style={{ marginBottom: 28 }}>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#a1a1aa',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            marginBottom: 12,
          }}
        >
          2 · 撰写内容
        </h2>

        <div style={{ position: 'relative' }}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="输入要发布的内容..."
            disabled={(!batchMode && !selectedId) || (batchMode && selectedIds.length === 0) || publishing}
            style={{
              width: '100%',
              minHeight: 120,
              background: '#18181b',
              border: `1px solid ${overLimit ? '#ef4444' : '#27272a'}`,
              borderRadius: 10,
              padding: '12px 14px',
              paddingBottom: 32,
              color: '#fafafa',
              fontSize: 14,
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", "SF Pro", system-ui, sans-serif',
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.6,
              boxSizing: 'border-box',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              right: 12,
              fontSize: 12,
              color: overLimit ? '#ef4444' : '#52525b',
              fontWeight: overLimit ? 600 : 400,
            }}
          >
            {charCount}/{MAX_CHARS}
          </div>
        </div>
      </section>

      {/* Step 3: Schedule (batch mode only) */}
      {batchMode && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <h2
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#a1a1aa',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                margin: 0,
              }}
            >
              <RiTimeLine size={12} style={{ marginRight: 4 }} />
              定时（可选）
            </h2>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useSchedule}
                onChange={(e) => setUseSchedule(e.target.checked)}
                style={{ width: 14, height: 14 }}
              />
              <span style={{ fontSize: 12, color: '#71717a' }}>启用定时</span>
            </label>
          </div>
          {useSchedule && (
            <input
              className="input"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="0 9 * * *（每天9点）"
              style={{ fontSize: 13 }}
            />
          )}
        </section>
      )}

      {/* Step 3/4: Publish */}
      <section style={{ marginBottom: 28 }}>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#a1a1aa',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            marginBottom: 12,
          }}
        >
          {batchMode ? '4 · 发布' : '3 · 发布'}
        </h2>

        <button
          onClick={batchMode ? handleBatchPublish : handlePublish}
          disabled={
            (batchMode ? selectedIds.length === 0 : !selectedId) ||
            !content.trim() ||
            overLimit ||
            publishing
          }
          className="btn"
          style={{
            minWidth: 120,
            opacity:
              (batchMode ? selectedIds.length === 0 : !selectedId) ||
              !content.trim() ||
              overLimit ||
              publishing
                ? 0.5
                : 1,
          }}
        >
          {publishing ? (
            <>
              <RiLoader4Line size={16} className="spin" />
              {batchMode ? '批量发布中...' : '发布中...'}
            </>
          ) : batchMode ? (
            useSchedule ? '创建定时任务' : '立即批量发布'
          ) : (
            '立即发布'
          )}
        </button>
      </section>

      {/* Result (single mode) */}
      {!batchMode && result && (
        <section>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#a1a1aa',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: 12,
            }}
          >
            发布结果
          </h2>
          <div
            className="card"
            style={{
              padding: '16px 18px',
              borderColor:
                result.status === 'error' || result.error
                  ? 'rgba(239,68,68,0.3)'
                  : 'rgba(34,197,94,0.3)',
            }}
          >
            {result.status !== 'error' && !result.error && result.tweet_url ? (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: '#22c55e',
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  <RiCheckLine size={16} />
                  发布成功
                </div>
                <a
                  href={result.tweet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#f59e0b',
                    fontSize: 13,
                    wordBreak: 'break-all',
                  }}
                >
                  {result.tweet_url}
                </a>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: '#ef4444',
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  <RiCloseLine size={16} />
                  发布失败
                </div>
                <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>
                  {result.error ?? '未知错误'}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Result (batch mode) */}
      {batchMode && batchResult && (
        <section>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#a1a1aa',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: 12,
            }}
          >
            批量发布结果
          </h2>
          <div
            className="card"
            style={{ padding: '16px 18px' }}
          >
            <div style={{ marginBottom: 12, fontSize: 13, color: '#71717a' }}>
              共 {batchResult.total} 个账号，
              {batchResult.scheduled > 0 && `创建 ${batchResult.scheduled} 个定时任务，`}
              {batchResult.immediate > 0 && `立即发布 ${batchResult.immediate} 个。`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {batchResult.results.map((r: BatchPublishResultItem, i: number) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: r.status === 'error' ? '#ef4444' : '#22c55e',
                  }}
                >
                  {r.status === 'error' ? <RiCloseLine size={14} /> : <RiCheckLine size={14} />}
                  <span style={{ flex: 1 }}>{r.profile_id}</span>
                  {r.task_id && (
                    <span style={{ color: '#71717a', fontSize: 11 }}>
                      任务: {r.task_id.slice(0, 8)}...
                    </span>
                  )}
                  {r.tweet_url && (
                    <a
                      href={r.tweet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#f59e0b', fontSize: 12 }}
                    >
                      查看
                    </a>
                  )}
                  {r.error && <span style={{ color: '#ef4444', fontSize: 12 }}>{r.error}</span>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default PostsNewPage;
