import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useNavigate } from 'react-router-dom';
import { agentsAPI, ContentGenerateResponse, rpaScriptAPI, RpaGenerateScriptResponse, RpaScriptStep } from '../api/client';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import { RiRobot2Line, RiFlashlightFill, RiFileCodeLine, RiEyeLine, RiEditLine } from 'react-icons/ri';

// ── Beehive Dark Palette ──


const PLATFORMS = [
  { value: 'twitter', label: 'Twitter / X', emoji: '🐦' },
  { value: 'weibo', label: '微博', emoji: '📱' },
  { value: 'xiaohongshu', label: '小红书', emoji: '📕' },
  { value: 'douyin', label: '抖音', emoji: '🎵' },
  { value: 'shop', label: '网店', emoji: '🛒' },
];

const STYLES = [
  { value: 'sharp', label: '毒舌', desc: '犀利、一针见血' },
  { value: 'professional', label: '专业', desc: '严谨、逻辑清晰' },
  { value: 'friendly', label: '亲和', desc: '亲切、贴近生活' },
  { value: 'humorous', label: '搞笑', desc: '幽默、意想不到' },
];

const SCRIPT_PLATFORMS = [
  { value: 'twitter', label: 'Twitter / X', emoji: '🐦' },
  { value: 'facebook', label: 'Facebook', emoji: '📘' },
  { value: 'weibo', label: '微博', emoji: '📱' },
  { value: 'xiaohongshu', label: '小红书', emoji: '📕' },
  { value: 'douyin', label: '抖音', emoji: '🎵' },
  { value: 'shop', label: '网店', emoji: '🛒' },
  { value: 'custom', label: '自定义', emoji: '🔧' },
];

interface Account {
  id: string;
  username: string;
  platform: string;
  status: string;
}

// ── Tab: 内容生成（原有功能）──────────────────────────────────

type ContentStep = 'idle' | 'generating' | 'preview' | 'publishing' | 'done' | 'error';

const ContentTab: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('twitter');
  const [style, setStyle] = useState('sharp');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [step, setStep] = useState<ContentStep>('idle');
  const [result, setResult] = useState<ContentGenerateResponse | null>(null);
  const [publishResults, setPublishResults] = useState<any[]>([]);

  useEffect(() => {
    agentsAPI.accounts().then((res) => {
      setAccounts(res.data.accounts || []);
    }).catch(() => {});
  }, []);

  const filteredAccounts = accounts.filter(
    (a) => a.platform === platform && a.status === 'active'
  );
  const canGenerate = topic.trim().length >= 2 && filteredAccounts.length > 0;
  const canPublish = result && selectedAccounts.length > 0;

  const handleGenerate = async () => {
    setStep('generating');
    setResult(null);
    setPublishResults([]);
    try {
      const res = await apiClient.post<ContentGenerateResponse>('/agents/content/generate', {
        topic: topic.trim(),
        platform,
        style,
      });
      setResult(res.data);
      setStep('preview');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || '生成失败');
      setStep('error');
    }
  };

  const handlePublish = async () => {
    setStep('publishing');
    try {
      const res = await apiClient.post('/agents/publish', {
        topic: topic.trim(),
        platform,
        style,
        account_ids: selectedAccounts,
      });
      setPublishResults(res.data.results || []);
      const success = (res.data.results || []).filter((r: any) => r.status !== 'error').length;
      toast.success(`发布完成：${success}/${res.data.results.length} 成功`);
      setStep('done');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || '发布失败');
      setStep('preview');
    }
  };

  const resetAll = () => {
    setStep('idle');
    setResult(null);
    setPublishResults([]);
    setTopic('');
    setSelectedAccounts([]);
  };

  const toggleAccount = (id: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  return (
    <>
      {/* 输入区 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, marginBottom: 24 }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: `1px solid ${'var(--divider)'}`, padding: 20 }}>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>
            话题 / 产品描述
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="例如：今天苹果发布了新一代 iPhone，A19 芯片性能提升 40%..."
            rows={5}
            disabled={step === 'generating' || step === 'publishing'}
            style={{
              width: '100%', background: 'var(--card-bg)', border: `1px solid ${'var(--divider)'}`,
              borderRadius: 8, padding: 12, fontSize: 14, color: 'var(--text-primary)',
              resize: 'vertical', outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: `1px solid ${'var(--divider)'}`, padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>
              目标平台
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPlatform(p.value)}
                  disabled={step === 'generating' || step === 'publishing'}
                  style={{
                    padding: '8px 12px', borderRadius: 8, border: `1px solid ${platform === p.value ? 'var(--hive-gold)' : 'var(--divider)'}`,
                    background: platform === p.value ? 'rgba(255,193,7,0.08)' : 'var(--card-bg)',
                    color: platform === p.value ? 'var(--hive-gold)' : 'var(--text-secondary)', cursor: 'pointer',
                    fontSize: 13, textAlign: 'left',
                  }}
                >
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>
              文案风格
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  disabled={step === 'generating' || step === 'publishing'}
                  style={{
                    padding: '8px 12px', borderRadius: 8, border: `1px solid ${style === s.value ? 'var(--hive-gold)' : 'var(--divider)'}`,
                    background: style === s.value ? 'rgba(255,193,7,0.08)' : 'var(--card-bg)',
                    color: style === s.value ? 'var(--hive-gold)' : 'var(--text-secondary)', cursor: 'pointer',
                    fontSize: 13, textAlign: 'center',
                  }}
                >
                  {s.label}
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 账号选择 + 操作按钮 */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: `1px solid ${'var(--divider)'}`, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
            选择发布账号（{platform === 'twitter' ? '🐦' : platform === 'weibo' ? '📱' : platform === 'xiaohongshu' ? '📕' : '🎵'}
            {' '}{PLATFORMS.find(p => p.value === platform)?.label}，共 {filteredAccounts.length} 个可用）
          </label>
          {step === 'idle' && (
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              style={{
                padding: '10px 24px', borderRadius: 8, border: 'none',
                background: canGenerate ? 'var(--hive-gold)' : 'var(--text-tertiary)', color: canGenerate ? '#000' : 'var(--text-tertiary)',
                fontWeight: 600, fontSize: 14, cursor: canGenerate ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <RiFlashlightFill size={16} />
              AI 生成并发布
            </button>
          )}
          {step === 'generating' && (
            <span style={{ color: 'var(--hive-gold)', fontSize: 14 }}>⏳ AI 正在生成文案...</span>
          )}
          {step === 'preview' && (
            <button
              onClick={handlePublish}
              disabled={!canPublish}
              style={{
                padding: '10px 24px', borderRadius: 8, border: 'none',
                background: canPublish ? 'var(--hive-blue)' : 'var(--text-tertiary)',
                color: canPublish ? '#fff' : 'var(--text-tertiary)',
                fontWeight: 600, fontSize: 14, cursor: canPublish ? 'pointer' : 'not-allowed',
              }}
            >
              🚀 确认发布到 {selectedAccounts.length} 个账号
            </button>
          )}
          {step === 'publishing' && (
            <span style={{ color: 'var(--hive-blue)', fontSize: 14 }}>⏳ RPA 拟人执行中...</span>
          )}
          {(step === 'done' || step === 'error') && (
            <button
              onClick={resetAll}
              style={{
                padding: '10px 24px', borderRadius: 8, border: `1px solid ${'var(--divider)'}`,
                background: 'var(--card-bg)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 14,
              }}
            >
              重新开始
            </button>
          )}
        </div>

        {filteredAccounts.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: 16, textAlign: 'center', background: 'var(--card-bg)', borderRadius: 8 }}>
            当前平台没有可用账号，请先在「账号管理」绑定账号
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {filteredAccounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => toggleAccount(acc.id)}
                disabled={step !== 'idle' && step !== 'preview'}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: `1px solid ${selectedAccounts.includes(acc.id) ? 'var(--hive-gold)' : 'var(--divider)'}`,
                  background: selectedAccounts.includes(acc.id) ? 'rgba(255,193,7,0.12)' : 'var(--card-bg)',
                  color: selectedAccounts.includes(acc.id) ? 'var(--hive-gold)' : 'var(--text-secondary)',
                  cursor: (step !== 'idle' && step !== 'preview') ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                }}
              >
                @{acc.username}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 结果展示区 */}
      {result && (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: `1px solid ${'var(--divider)'}`, padding: 20 }}>
          <h3 style={{ fontSize: 14, color: 'var(--hive-gold)', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <RiRobot2Line size={18} />
            AI 生成结果 — {PLATFORMS.find(p => p.value === result.platform)?.emoji} {result.platform}
            {' · '}{STYLES.find(s => s.value === result.style)?.label}
            {' · '}{result.word_count}字
          </h3>

          <div style={{
            background: 'var(--card-bg)', borderRadius: 8, padding: 16,
            border: `1px solid ${'var(--divider)'}`, marginBottom: 16, fontSize: 14, lineHeight: 1.7,
            whiteSpace: 'pre-wrap', color: 'var(--text-primary)',
          }}>
            {result.content}
          </div>

          {publishResults.length > 0 && (
            <div>
              <h4 style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>发布结果</h4>
              {publishResults.map((pr, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 12px', borderRadius: 8, marginBottom: 6,
                    background: pr.status === 'error' ? 'rgba(244,67,54,0.08)' : 'rgba(76,175,80,0.08)',
                    border: `1px solid ${pr.status === 'error' ? 'var(--error)' : 'var(--success)'}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 13 }}>
                    @{pr.account_id?.slice(0, 8)}...
                    {pr.post_url && (
                      <a href={pr.post_url} target="_blank" rel="noopener noreferrer"
                         style={{ color: 'var(--hive-blue)', marginLeft: 8, fontSize: 12 }}>
                        查看发布 →
                      </a>
                    )}
                  </span>
                  <span style={{
                    fontSize: 12, padding: '2px 8px', borderRadius: 4,
                    background: pr.status === 'error' ? 'var(--error)' : 'var(--success)',
                    color: '#fff',
                  }}>
                    {pr.status === 'error' ? '❌ ' + (pr.error || '失败') : '✅ 已发布'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

// ── Tab: 智能脚本生成（v2 — CDP + 模板 + LLM 混合）────────────────

type GenPhase = 'idle' | 'generating' | 'preview';

const ScriptTab: React.FC = () => {
  const [scriptGoal, setScriptGoal] = useState('');
  const [scriptPlatform, setScriptPlatform] = useState('twitter');
  const [scriptUrl, setScriptUrl] = useState('');
  const [scriptPhase, setScriptPhase] = useState<GenPhase>('idle');
  const [generated, setGenerated] = useState<RpaGenerateScriptResponse | null>(null);
  const [showHtmlPreview, setShowHtmlPreview] = useState(true);
  const navigate = useNavigate();

  const canGenerate = scriptGoal.trim().length >= 3;

  const getPlaceholder = (platform: string) => {
    switch (platform) {
      case 'twitter': return '例如：登录 Twitter，搜索关键词"AI"，给前三条推文点赞并转发';
      case 'facebook': return '例如：登录 Facebook，发布一条动态并@好友';
      case 'weibo': return '例如：登录微博，发布一条带图片的微博，添加话题 #科技';
      case 'xiaohongshu': return '例如：在小红书发布一篇笔记，包含标题、正文和标签';
      case 'douyin': return '例如：登录抖音创作平台，上传视频并填写描述和标签';
      case 'shop': return '例如：登录淘宝商家后台，上架一个新商品';
      default: return '例如：打开页面，点击搜索框，输入关键词并搜索';
    }
  };

  const handleGenerateScript = async () => {
    setScriptPhase('generating');
    setGenerated(null);
    try {
      const res = await rpaScriptAPI.generate({
        platform: scriptPlatform,
        instruction: scriptGoal.trim(),
        ...(scriptUrl.trim() ? { url: scriptUrl.trim() } : {}),
      });
      setGenerated(res.data);
      setScriptPhase('preview');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || '脚本生成失败');
      setScriptPhase('idle');
    }
  };

  const handleOpenEditor = async () => {
    if (!generated) return;
    try {
      const scriptName = `AI生成_${generated.platform}_${new Date().toLocaleDateString('zh-CN')}`;
      const saveRes = await rpaScriptAPI.save({
        name: scriptName,
        platform: generated.platform,
        instruction: scriptGoal.trim(),
        steps: generated.steps,
        url: scriptUrl.trim() || undefined,
      });
      toast.success('脚本已保存，正在打开编辑器...');
      navigate(`/automations/editor/${saveRes.data.script_id}`);
    } catch {
      toast.error('保存失败，请稍后重试');
    }
  };

  const resetScript = () => {
    setScriptPhase('idle');
    setGenerated(null);
    setScriptGoal('');
    setScriptUrl('');
  };

  const renderFlatStep = (step: RpaScriptStep, index: number) => {
    const actionColors: Record<string, string> = {
      click: '#4caf50',
      type: '#2196f3',
      wait: '#ff9800',
      scroll: '#9c27b0',
      navigate: '#00bcd4',
    };
    const color = actionColors[step.action] || 'var(--hive-gold)';

    return (
      <div
        key={index}
        style={{
          background: 'var(--card-bg)',
          borderRadius: 8,
          border: `1px solid ${'var(--divider)'}`,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          marginBottom: 8,
        }}
      >
        <span style={{
          background: color,
          color: '#000',
          borderRadius: '50%',
          width: 22,
          height: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
        }}>
          {index + 1}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
              {step.action}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--page-bg)', padding: '2px 8px', borderRadius: 4 }}>
              {step.wait_ms}ms
            </span>
          </div>
          {step.target && (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3, fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {step.target}
            </div>
          )}
          {step.value && (
            <div style={{ fontSize: 12, color: '#e0e0e0', marginTop: 4, background: '#2a2a2a', padding: '6px 10px', borderRadius: 4, wordBreak: 'break-all' }}>
              {step.value.length > 80 ? step.value.slice(0, 80) + '...' : step.value}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 输入区 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, marginBottom: 24 }}>
        <div>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: `1px solid ${'var(--divider)'}`, padding: 20, marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>
              🤖 描述你想要实现的自动化流程
            </label>
            <textarea
              value={scriptGoal}
              onChange={(e) => setScriptGoal(e.target.value)}
              placeholder={getPlaceholder(scriptPlatform)}
              rows={4}
              disabled={scriptPhase === 'generating'}
              style={{
                width: '100%', background: 'var(--card-bg)', border: `1px solid ${'var(--divider)'}`,
                borderRadius: 8, padding: 12, fontSize: 14, color: 'var(--text-primary)',
                resize: 'vertical', outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: `1px solid ${'var(--divider)'}`, padding: 20 }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>
              🌐 目标页面 URL（可选，提供后将使用 CDP 检测真实元素）
            </label>
            <input
              type="text"
              value={scriptUrl}
              onChange={(e) => setScriptUrl(e.target.value)}
              placeholder="https://twitter.com/login"
              disabled={scriptPhase === 'generating'}
              style={{
                width: '100%', background: 'var(--card-bg)', border: `1px solid ${'var(--divider)'}`,
                borderRadius: 8, padding: '10px 12px', fontSize: 14, color: 'var(--text-primary)',
                outline: 'none', fontFamily: 'inherit',
              }}
            />
            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-tertiary)' }}>
              填写 URL 后，系统会通过 CDP DOMSnapshot 分析页面真实结构，生成更精确的选择器
            </p>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: `1px solid ${'var(--divider)'}`, padding: 20 }}>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>
            目标平台
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SCRIPT_PLATFORMS.map((p) => (
              <button
                key={p.value}
                onClick={() => setScriptPlatform(p.value)}
                disabled={scriptPhase === 'generating'}
                style={{
                  padding: '9px 12px', borderRadius: 8,
                  border: `1px solid ${scriptPlatform === p.value ? 'var(--hive-gold)' : 'var(--divider)'}`,
                  background: scriptPlatform === p.value ? 'rgba(255,193,7,0.08)' : 'var(--card-bg)',
                  color: scriptPlatform === p.value ? 'var(--hive-gold)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: 13, textAlign: 'left',
                }}
              >
                {p.emoji} {p.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <button
              onClick={handleGenerateScript}
              disabled={!canGenerate || scriptPhase === 'generating'}
              style={{
                width: '100%', padding: '11px 16px', borderRadius: 8, border: 'none',
                background: canGenerate && scriptPhase !== 'generating' ? 'var(--hive-gold)' : 'var(--text-tertiary)',
                color: canGenerate && scriptPhase !== 'generating' ? '#000' : '#666',
                fontWeight: 700, fontSize: 14, cursor: canGenerate && scriptPhase !== 'generating' ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {scriptPhase === 'generating' ? (
                <>⏳ AI 生成中...</>
              ) : (
                <>
                  <RiRobot2Line size={16} />
                  生成 RPA 脚本
                </>
              )}
            </button>
            {scriptPhase === 'preview' && (
              <button
                onClick={resetScript}
                style={{
                  width: '100%', marginTop: 8, padding: '9px 16px', borderRadius: 8,
                  border: `1px solid ${'var(--divider)'}`, background: 'var(--card-bg)',
                  color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
                }}
              >
                重新生成
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 预览区 */}
      {generated && (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: `1px solid ${'var(--divider)'}`, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, color: 'var(--hive-gold)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <RiFileCodeLine size={18} />
              生成结果
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 400 }}>
                · {SCRIPT_PLATFORMS.find(p => p.value === generated.platform)?.emoji} {generated.platform}
                · {generated.steps.length} 步
                · 来源: {generated.source}
              </span>
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowHtmlPreview((v) => !v)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: `1px solid ${'var(--divider)'}`,
                  background: 'var(--card-bg)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
                }}
              >
                {showHtmlPreview ? '查看 JSON' : '查看卡片'}
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(generated.steps, null, 2));
                  toast.success('JSON 已复制到剪贴板');
                }}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: `1px solid ${'var(--divider)'}`,
                  background: 'var(--card-bg)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <RiEditLine size={14} />
                复制 JSON
              </button>
              <button
                onClick={handleOpenEditor}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: 'var(--hive-gold)', color: '#000', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <RiEyeLine size={14} />
                在编辑器中打开
              </button>
            </div>
          </div>

          {/* 变量提示 */}
          {generated.variables.length > 0 && (
            <div style={{ marginBottom: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {generated.variables.map((v) => (
                <span key={v} style={{ fontSize: 11, color: 'var(--hive-gold)', background: 'rgba(255,193,7,0.08)', padding: '3px 10px', borderRadius: 4, border: `1px solid ${'var(--hive-gold)'}` }}>
                  {'{{'} {v} {'}}'}
                </span>
              ))}
            </div>
          )}

          {showHtmlPreview ? (
            <div
              style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${'var(--divider)'}` }}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generated.preview_html) }}
            />
          ) : (
            <div>
              {generated.steps.map((step, index) => renderFlatStep(step, index))}
              {generated.steps.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-tertiary)' }}>
                  未生成任何步骤，请调整描述后重试
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

// ── 主页面：Tab 切换 ──────────────────────────────────────────

type ActiveTab = 'content' | 'script';

const AIWorkflowPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('content');

  return (
    <div style={{ background: 'var(--page-bg)', minHeight: '100vh', padding: 32, color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <RiFlashlightFill color={'var(--hive-gold)'} size={24} />
          AI 工作流
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: 8 }}>
            内容生成 · RPA 脚本生成
          </span>
        </h1>
      </div>

      {/* Tab Bar */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 24,
        borderBottom: `1px solid ${'var(--divider)'}`,
        paddingBottom: 0,
      }}>
        <button
          onClick={() => setActiveTab('content')}
          style={{
            padding: '10px 20px', borderRadius: '8px 8px 0 0',
            border: 'none', borderBottom: `2px solid ${activeTab === 'content' ? 'var(--hive-gold)' : 'transparent'}`,
            background: activeTab === 'content' ? 'rgba(255,193,7,0.06)' : 'transparent',
            color: activeTab === 'content' ? 'var(--hive-gold)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'content' ? 600 : 400,
            fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <RiFlashlightFill size={16} />
          内容生成
        </button>
        <button
          onClick={() => setActiveTab('script')}
          style={{
            padding: '10px 20px', borderRadius: '8px 8px 0 0',
            border: 'none', borderBottom: `2px solid ${activeTab === 'script' ? 'var(--hive-gold)' : 'transparent'}`,
            background: activeTab === 'script' ? 'rgba(255,193,7,0.06)' : 'transparent',
            color: activeTab === 'script' ? 'var(--hive-gold)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'script' ? 600 : 400,
            fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <RiFileCodeLine size={16} />
          脚本生成
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'content' ? <ContentTab /> : <ScriptTab />}
    </div>
  );
};

export default AIWorkflowPage;
