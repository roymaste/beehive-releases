import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentsAPI, ContentGenerateResponse, aiScriptAPI, GenerateScriptResponse, ScriptTemplateStep } from '../api/client';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import { RiRobot2Line, RiFlashlightFill, RiFileCodeLine, RiEyeLine, RiEditLine } from 'react-icons/ri';

// ── Beehive Dark Palette ──
const C = {
  bg: '#121212',
  surface: '#1e1e1e',
  surfaceHover: '#2a2a2a',
  cardBg: '#1a1a1a',
  textPrimary: '#fafafa',
  textSecondary: '#9e9e9e',
  textTertiary: '#757575',
  accent: '#FFC107',
  accentHover: '#FFA000',
  secondary: '#1976D2',
  border: 'rgba(255,255,255,0.06)',
  success: '#4caf50',
  error: '#f44336',
  warning: '#ff9800',
};

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
  { value: 'weibo', label: '微博', emoji: '📱' },
  { value: 'xiaohongshu', label: '小红书', emoji: '📕' },
  { value: 'douyin', label: '抖音', emoji: '🎵' },
  { value: 'shop', label: '网店', emoji: '🛒' },
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
        <div style={{ background: C.cardBg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
          <label style={{ display: 'block', fontSize: 13, color: C.textSecondary, marginBottom: 8, fontWeight: 500 }}>
            话题 / 产品描述
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="例如：今天苹果发布了新一代 iPhone，A19 芯片性能提升 40%..."
            rows={5}
            disabled={step === 'generating' || step === 'publishing'}
            style={{
              width: '100%', background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: 12, fontSize: 14, color: C.textPrimary,
              resize: 'vertical', outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ background: C.cardBg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: C.textSecondary, marginBottom: 8, fontWeight: 500 }}>
              目标平台
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPlatform(p.value)}
                  disabled={step === 'generating' || step === 'publishing'}
                  style={{
                    padding: '8px 12px', borderRadius: 8, border: `1px solid ${platform === p.value ? C.accent : C.border}`,
                    background: platform === p.value ? 'rgba(255,193,7,0.08)' : C.surface,
                    color: platform === p.value ? C.accent : C.textSecondary, cursor: 'pointer',
                    fontSize: 13, textAlign: 'left',
                  }}
                >
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: C.textSecondary, marginBottom: 8, fontWeight: 500 }}>
              文案风格
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  disabled={step === 'generating' || step === 'publishing'}
                  style={{
                    padding: '8px 12px', borderRadius: 8, border: `1px solid ${style === s.value ? C.accent : C.border}`,
                    background: style === s.value ? 'rgba(255,193,7,0.08)' : C.surface,
                    color: style === s.value ? C.accent : C.textSecondary, cursor: 'pointer',
                    fontSize: 13, textAlign: 'center',
                  }}
                >
                  {s.label}
                  <span style={{ display: 'block', fontSize: 11, color: C.textTertiary, marginTop: 2 }}>{s.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 账号选择 + 操作按钮 */}
      <div style={{ background: C.cardBg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <label style={{ fontSize: 13, color: C.textSecondary, fontWeight: 500 }}>
            选择发布账号（{platform === 'twitter' ? '🐦' : platform === 'weibo' ? '📱' : platform === 'xiaohongshu' ? '📕' : '🎵'}
            {' '}{PLATFORMS.find(p => p.value === platform)?.label}，共 {filteredAccounts.length} 个可用）
          </label>
          {step === 'idle' && (
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              style={{
                padding: '10px 24px', borderRadius: 8, border: 'none',
                background: canGenerate ? C.accent : C.textTertiary, color: canGenerate ? '#000' : C.textTertiary,
                fontWeight: 600, fontSize: 14, cursor: canGenerate ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <RiFlashlightFill size={16} />
              AI 生成并发布
            </button>
          )}
          {step === 'generating' && (
            <span style={{ color: C.accent, fontSize: 14 }}>⏳ AI 正在生成文案...</span>
          )}
          {step === 'preview' && (
            <button
              onClick={handlePublish}
              disabled={!canPublish}
              style={{
                padding: '10px 24px', borderRadius: 8, border: 'none',
                background: canPublish ? C.secondary : C.textTertiary,
                color: canPublish ? '#fff' : C.textTertiary,
                fontWeight: 600, fontSize: 14, cursor: canPublish ? 'pointer' : 'not-allowed',
              }}
            >
              🚀 确认发布到 {selectedAccounts.length} 个账号
            </button>
          )}
          {step === 'publishing' && (
            <span style={{ color: C.secondary, fontSize: 14 }}>⏳ RPA 拟人执行中...</span>
          )}
          {(step === 'done' || step === 'error') && (
            <button
              onClick={resetAll}
              style={{
                padding: '10px 24px', borderRadius: 8, border: `1px solid ${C.border}`,
                background: C.surface, color: C.textPrimary, cursor: 'pointer', fontSize: 14,
              }}
            >
              重新开始
            </button>
          )}
        </div>

        {filteredAccounts.length === 0 ? (
          <p style={{ color: C.textTertiary, fontSize: 13, padding: 16, textAlign: 'center', background: C.surface, borderRadius: 8 }}>
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
                  padding: '6px 14px', borderRadius: 20, border: `1px solid ${selectedAccounts.includes(acc.id) ? C.accent : C.border}`,
                  background: selectedAccounts.includes(acc.id) ? 'rgba(255,193,7,0.12)' : C.surface,
                  color: selectedAccounts.includes(acc.id) ? C.accent : C.textSecondary,
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
        <div style={{ background: C.cardBg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
          <h3 style={{ fontSize: 14, color: C.accent, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <RiRobot2Line size={18} />
            AI 生成结果 — {PLATFORMS.find(p => p.value === result.platform)?.emoji} {result.platform}
            {' · '}{STYLES.find(s => s.value === result.style)?.label}
            {' · '}{result.word_count}字
          </h3>

          <div style={{
            background: C.surface, borderRadius: 8, padding: 16,
            border: `1px solid ${C.border}`, marginBottom: 16, fontSize: 14, lineHeight: 1.7,
            whiteSpace: 'pre-wrap', color: C.textPrimary,
          }}>
            {result.content}
          </div>

          {publishResults.length > 0 && (
            <div>
              <h4 style={{ fontSize: 13, color: C.textSecondary, margin: '0 0 8px 0' }}>发布结果</h4>
              {publishResults.map((pr, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 12px', borderRadius: 8, marginBottom: 6,
                    background: pr.status === 'error' ? 'rgba(244,67,54,0.08)' : 'rgba(76,175,80,0.08)',
                    border: `1px solid ${pr.status === 'error' ? C.error : C.success}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 13 }}>
                    @{pr.account_id?.slice(0, 8)}...
                    {pr.post_url && (
                      <a href={pr.post_url} target="_blank" rel="noopener noreferrer"
                         style={{ color: C.secondary, marginLeft: 8, fontSize: 12 }}>
                        查看发布 →
                      </a>
                    )}
                  </span>
                  <span style={{
                    fontSize: 12, padding: '2px 8px', borderRadius: 4,
                    background: pr.status === 'error' ? C.error : C.success,
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

// ── Tab: 脚本生成（新增）───────────────────────────────────────

type ScriptStep = 'idle' | 'generating' | 'preview';

const ScriptTab: React.FC = () => {
  const [scriptGoal, setScriptGoal] = useState('');
  const [scriptPlatform, setScriptPlatform] = useState('twitter');
  const [scriptStep, setScriptStep] = useState<ScriptStep>('idle');
  const [generatedScript, setGeneratedScript] = useState<GenerateScriptResponse | null>(null);
  const navigate = useNavigate();

  const canGenerate = scriptGoal.trim().length >= 3;

  const handleGenerateScript = async () => {
    setScriptStep('generating');
    setGeneratedScript(null);
    try {
      const res = await aiScriptAPI.generateScript({
        platform: scriptPlatform,
        goal: scriptGoal.trim(),
      });
      setGeneratedScript(res.data);
      setScriptStep('preview');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || '脚本生成失败');
      setScriptStep('idle');
    }
  };

  const handleOpenEditor = () => {
    // 先保存到后端，然后跳转到编辑器
    const token = localStorage.getItem('access_token');
    const scriptName = `AI生成_${scriptPlatform}_${new Date().toLocaleDateString('zh-CN')}`;
    const payload = {
      name: scriptName,
      action: 'custom',
      params: { steps: generatedScript?.steps },
    };

    fetch('/api/v1/automations/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((data) => {
        toast.success('脚本已保存，正在打开编辑器...');
        navigate(`/automations/editor/${data.id}`);
      })
      .catch(() => toast.error('保存失败，请稍后重试'));
  };

  const resetScript = () => {
    setScriptStep('idle');
    setGeneratedScript(null);
    setScriptGoal('');
  };

  const renderStep = (step: ScriptTemplateStep, index: number) => {
    const paramStr = Object.entries(step.params || {})
      .filter(([, v]) => v !== '' && v !== undefined && v !== null)
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? v.slice(0, 40) : JSON.stringify(v)}`)
      .join(' · ');

    return (
      <div key={index} style={{ marginBottom: 8 }}>
        <div style={{
          background: C.surface,
          borderRadius: 8,
          border: `1px solid ${C.border}`,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}>
          <span style={{
            background: C.accent,
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
            <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
              {step.action}
            </div>
            {paramStr && (
              <div style={{ fontSize: 12, color: C.textTertiary, marginTop: 3, wordBreak: 'break-all' }}>
                {paramStr}
              </div>
            )}
          </div>
        </div>
        {/* then_steps */}
        {step.then_steps && step.then_steps.length > 0 && (
          <div style={{ marginLeft: 24, marginTop: 6, borderLeft: `2px solid ${C.accent}`, paddingLeft: 12 }}>
            <div style={{ fontSize: 11, color: C.accent, marginBottom: 4, fontWeight: 600 }}>✓ 条件成立</div>
            {step.then_steps.map((s, i) => renderStep(s, i))}
          </div>
        )}
        {step.else_steps && step.else_steps.length > 0 && (
          <div style={{ marginLeft: 24, marginTop: 6, borderLeft: `2px solid ${C.error}`, paddingLeft: 12 }}>
            <div style={{ fontSize: 11, color: C.error, marginBottom: 4, fontWeight: 600 }}>✗ 条件不成立</div>
            {step.else_steps.map((s, i) => renderStep(s, i))}
          </div>
        )}
        {step.for_each_steps && step.for_each_steps.length > 0 && (
          <div style={{ marginLeft: 24, marginTop: 6, borderLeft: `2px solid ${C.secondary}`, paddingLeft: 12 }}>
            <div style={{ fontSize: 11, color: C.secondary, marginBottom: 4, fontWeight: 600 }}>↻ 循环体</div>
            {step.for_each_steps.map((s, i) => renderStep(s, i))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* 脚本生成输入区 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, marginBottom: 24 }}>
        <div style={{ background: C.cardBg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
          <label style={{ display: 'block', fontSize: 13, color: C.textSecondary, marginBottom: 8, fontWeight: 500 }}>
            🤖 描述你想要实现的自动化流程
          </label>
          <textarea
            value={scriptGoal}
            onChange={(e) => setScriptGoal(e.target.value)}
            placeholder={
              scriptPlatform === 'twitter'
                ? '例如：登录 Twitter，搜索关键词"AI"，给前三条推文点赞并转发'
                : scriptPlatform === 'weibo'
                ? '例如：登录微博，发布一条带图片的微博，添加话题 #科技'
                : scriptPlatform === 'xiaohongshu'
                ? '例如：在小红书发布一篇笔记，包含标题、正文和标签'
                : scriptPlatform === 'douyin'
                ? '例如：登录抖音创作平台，上传视频并填写描述和标签'
                : '例如：登录淘宝商家后台，上架一个新商品'
            }
            rows={5}
            disabled={scriptStep === 'generating'}
            style={{
              width: '100%', background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: 12, fontSize: 14, color: C.textPrimary,
              resize: 'vertical', outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ background: C.cardBg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
          <label style={{ display: 'block', fontSize: 13, color: C.textSecondary, marginBottom: 8, fontWeight: 500 }}>
            目标平台
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SCRIPT_PLATFORMS.map((p) => (
              <button
                key={p.value}
                onClick={() => setScriptPlatform(p.value)}
                disabled={scriptStep === 'generating'}
                style={{
                  padding: '9px 12px', borderRadius: 8,
                  border: `1px solid ${scriptPlatform === p.value ? C.accent : C.border}`,
                  background: scriptPlatform === p.value ? 'rgba(255,193,7,0.08)' : C.surface,
                  color: scriptPlatform === p.value ? C.accent : C.textSecondary,
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
              disabled={!canGenerate || scriptStep === 'generating'}
              style={{
                width: '100%', padding: '11px 16px', borderRadius: 8, border: 'none',
                background: canGenerate && scriptStep !== 'generating' ? C.accent : C.textTertiary,
                color: canGenerate && scriptStep !== 'generating' ? '#000' : '#666',
                fontWeight: 700, fontSize: 14, cursor: canGenerate && scriptStep !== 'generating' ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {scriptStep === 'generating' ? (
                <>⏳ AI 生成中...</>
              ) : (
                <>
                  <RiRobot2Line size={16} />
                  生成 RPA 脚本
                </>
              )}
            </button>
            {scriptStep === 'preview' && (
              <button
                onClick={resetScript}
                style={{
                  width: '100%', marginTop: 8, padding: '9px 16px', borderRadius: 8,
                  border: `1px solid ${C.border}`, background: C.surface,
                  color: C.textSecondary, fontSize: 13, cursor: 'pointer',
                }}
              >
                重新生成
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 脚本预览区 */}
      {generatedScript && (
        <div style={{ background: C.cardBg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, color: C.accent, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <RiFileCodeLine size={18} />
              生成结果 — {generatedScript.steps.length} 个步骤
              <span style={{ fontSize: 12, color: C.textTertiary, fontWeight: 400 }}>
                · {SCRIPT_PLATFORMS.find(p => p.value === generatedScript.platform)?.emoji} {generatedScript.platform}
                · {generatedScript.model}
              </span>
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  // 复制 JSON 到剪贴板
                  navigator.clipboard.writeText(JSON.stringify(generatedScript.steps, null, 2));
                  toast.success('JSON 已复制到剪贴板');
                }}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.border}`,
                  background: C.surface, color: C.textSecondary, fontSize: 13, cursor: 'pointer',
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
                  background: C.accent, color: '#000', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <RiEyeLine size={14} />
                在编辑器中打开
              </button>
            </div>
          </div>

          {/* 步骤列表 */}
          <div>
            {generatedScript.steps.map((step, index) => renderStep(step, index))}
          </div>

          {generatedScript.steps.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: C.textTertiary }}>
              未生成任何步骤，请调整描述后重试
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
    <div style={{ background: C.bg, minHeight: '100vh', padding: 32, color: C.textPrimary }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <RiFlashlightFill color={C.accent} size={24} />
          AI 工作流
          <span style={{ fontSize: 13, color: C.textTertiary, fontWeight: 400, marginLeft: 8 }}>
            内容生成 · RPA 脚本生成
          </span>
        </h1>
      </div>

      {/* Tab Bar */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 24,
        borderBottom: `1px solid ${C.border}`,
        paddingBottom: 0,
      }}>
        <button
          onClick={() => setActiveTab('content')}
          style={{
            padding: '10px 20px', borderRadius: '8px 8px 0 0',
            border: 'none', borderBottom: `2px solid ${activeTab === 'content' ? C.accent : 'transparent'}`,
            background: activeTab === 'content' ? 'rgba(255,193,7,0.06)' : 'transparent',
            color: activeTab === 'content' ? C.accent : C.textSecondary,
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
            border: 'none', borderBottom: `2px solid ${activeTab === 'script' ? C.accent : 'transparent'}`,
            background: activeTab === 'script' ? 'rgba(255,193,7,0.06)' : 'transparent',
            color: activeTab === 'script' ? C.accent : C.textSecondary,
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
