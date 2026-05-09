import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiArrowLeftLine, RiAddLine } from 'react-icons/ri';
import { profilesAPI } from '../../api/profiles';
import { proxiesAPI, Proxy } from '../../api/proxies';
import { groupsAPI, Group } from '../../api/groups';

const OS_OPTIONS = ['Windows', 'MacOS', 'Linux'];
const BROWSER_OPTIONS = ['Chromium', 'Firefox'];
const RESOLUTION_OPTIONS = ['1920×1080', '2560×1440', '1440×900', '1366×768', '1280×720'];
const TIMEZONE_OPTIONS = ['Asia/Shanghai', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Europe/Berlin'];
const LANGUAGE_OPTIONS = ['zh-CN', 'en-US', 'ja-JP', 'ko-KR', 'de-DE', 'fr-FR'];
const WEBGL_OPTIONS = ['Intel', 'NVIDIA', 'AMD'];

type IpConfigMode = 'buy' | 'bind' | 'none';

const CreateProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [ipConfigMode, setIpConfigMode] = useState<IpConfigMode>('buy');
  const [ownProxy, setOwnProxy] = useState({
    server: '',
    port: '',
    username: '',
    password: '',
  });
  const [form, setForm] = useState({
    name: '',
    account_username: '',
    account_platform: 'twitter',
    account_password: '',
    proxy_id: '',
    notes: '',
    tags: '',
    group_id: '',
    // Fingerprint
    os: 'Windows',
    browser: 'Chromium',
    resolution: '1920×1080',
    timezone: 'Asia/Shanghai',
    timezone_custom: '',
    language: 'zh-CN',
    language_custom: '',
    webgl: 'Intel',
  });

  useEffect(() => {
    proxiesAPI.list({ limit: 200 }).then((res) => {
      setProxies(res.data.proxies || []);
    }).catch(() => {});
    groupsAPI.list().then((res) => {
      setGroups(res.data.groups || []);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.account_username.trim()) {
      toast.error('请填写环境名称和账号');
      return;
    }
    setSubmitting(true);
    try {
      // 解析分辨率
      const resolutionParts = form.resolution.split('×');
      const screenWidth = parseInt(resolutionParts[0], 10) || 1920;
      const screenHeight = parseInt(resolutionParts[1], 10) || 1080;

      // 时区：优先使用自定义值
      const timezone = form.timezone_custom || form.timezone || undefined;
      // 语言：优先使用自定义值
      const locale = form.language_custom || form.language || undefined;

      // 构建指纹配置
      const fingerprint = {
        platform: form.os.toLowerCase(),
        timezone,
        locale,
        screen_width: screenWidth,
        screen_height: screenHeight,
        gpu_vendor: form.webgl,
        fingerprint_seed: Math.floor(Math.random() * 90000) + 10000,
        humanize: true,
        headless: false,
        geoip: true,
      };

      await profilesAPI.create({
        name: form.name.trim(),
        platform: form.account_platform || undefined,
        proxy_id: form.proxy_id || undefined,
        notes: form.notes || undefined,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
        fingerprint,
        group: form.group_id ? groups.find(g => g.id === form.group_id)?.name : undefined,
      });
      toast.success('环境创建成功');
      navigate('/profiles');
    } catch {
      toast.error('创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = { width: '100%', background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#fafafa', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#9e9e9e', marginBottom: 6 };
  const sectionTitleStyle: React.CSSProperties = { fontSize: 15, fontWeight: 600, color: '#fafafa', margin: '0 0 16px' };

  // Card styles
  const cardBase: React.CSSProperties = {
    padding: '20px 16px',
    borderRadius: 12,
    border: '2px solid',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    textAlign: 'center',
    minHeight: 120,
    justifyContent: 'center',
  };

  const cardSelected: React.CSSProperties = {
    ...cardBase,
    borderWidth: 3,
  };

  const cardUnselected: React.CSSProperties = {
    ...cardBase,
    background: '#1a1a1a',
    borderColor: '#333',
  };

  const buyCardStyle = ipConfigMode === 'buy' ? { ...cardSelected, borderColor: '#FFC107', background: 'rgba(255,193,7,0.1)' } : { ...cardUnselected, borderColor: '#333' };
  const bindCardStyle = ipConfigMode === 'bind' ? { ...cardSelected, borderColor: '#1976D2', background: 'rgba(25,118,210,0.1)' } : { ...cardUnselected, borderColor: '#333' };
  const noneCardStyle = ipConfigMode === 'none' ? { ...cardSelected, borderColor: '#555', background: 'rgba(100,100,100,0.1)' } : { ...cardUnselected, borderColor: '#333' };

  const cardTitleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: '#fafafa', margin: 0 };
  const cardDescStyle: React.CSSProperties = { fontSize: 12, color: '#9e9e9e', margin: 0 };

  return (
    <div style={{ maxWidth: 720, background: '#121212', minHeight: '100vh', padding: 24 }}>
      <button
        onClick={() => navigate('/profiles')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F44336', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20, padding: 0 }}
      >
        <RiArrowLeftLine size={16} />
        返回环境列表
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fafafa', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
        新建环境
      </h1>
      <p style={{ fontSize: 13, color: '#9e9e9e', margin: '0 0 24px' }}>
        创建新的浏览器指纹环境，配置代理与账号
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* 基本信息 */}
        <div style={{ background: '#1e1e1e', borderRadius: 12, padding: 28 }}>
          <h3 style={sectionTitleStyle}>基本信息</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle}>
                环境名称 *
              </label>
              <input
                style={inputStyle}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如：推特账号-主号"
              />
            </div>
            <div>
              <label style={labelStyle}>
                备注
              </label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical' }}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="备注信息..."
                rows={2}
              />
            </div>
            <div>
              <label style={labelStyle}>
                标签
              </label>
              <input
                style={inputStyle}
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="多个标签用逗号分隔，如：主号, 美国"
              />
            </div>
            <div>
              <label style={labelStyle}>
                分组
              </label>
              <select
                style={inputStyle}
                value={form.group_id}
                onChange={(e) => setForm({ ...form, group_id: e.target.value })}
              >
                <option value="">默认分组</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 代理配置 - 三选项卡片 */}
        <div style={{ background: '#1e1e1e', borderRadius: 12, padding: 28 }}>
          <h3 style={sectionTitleStyle}>代理IP配置</h3>
          
          {/* 三选项卡片 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {/* 购买蜂巢IP */}
            <div
              style={buyCardStyle}
              onClick={() => setIpConfigMode('buy')}
            >
              <span style={{ fontSize: 24 }}>⭐</span>
              <span style={cardTitleStyle}>购买蜂巢IP</span>
              <span style={{ ...cardDescStyle, color: '#FFC107' }}>(推荐)</span>
            </div>

            {/* 绑定自有IP */}
            <div
              style={bindCardStyle}
              onClick={() => setIpConfigMode('bind')}
            >
              <span style={{ fontSize: 24 }}>📎</span>
              <span style={cardTitleStyle}>绑定自有IP</span>
              <span style={cardDescStyle}>使用自己的代理</span>
            </div>

            {/* 暂不绑定 */}
            <div
              style={noneCardStyle}
              onClick={() => setIpConfigMode('none')}
            >
              <span style={{ fontSize: 24 }}>⚠️</span>
              <span style={cardTitleStyle}>暂不绑定</span>
              <span style={cardDescStyle}>有封号风险</span>
            </div>
          </div>

          {/* 根据选择显示不同内容 */}
          {ipConfigMode === 'buy' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <a
                href="/proxies/buy"
                style={{ display: 'inline-block', padding: '12px 32px', background: '#FFC107', color: '#121212', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: 14 }}
              >
                去购买IP →
              </a>
              <p style={{ fontSize: 12, color: '#9e9e9e', marginTop: 12 }}>
                蜂巢IP来自真实住宅代理，安全稳定
              </p>


            </div>
          )}

          {ipConfigMode === 'bind' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: '#9e9e9e', margin: '0 0 8px' }}>
                请填写您的代理信息：
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>服务器 *</label>
                  <input
                    style={inputStyle}
                    value={ownProxy.server}
                    onChange={(e) => setOwnProxy({ ...ownProxy, server: e.target.value })}
                    placeholder="例：203.0.113.1"
                  />
                </div>
                <div>
                  <label style={labelStyle}>端口 *</label>
                  <input
                    style={inputStyle}
                    value={ownProxy.port}
                    onChange={(e) => setOwnProxy({ ...ownProxy, port: e.target.value })}
                    placeholder="例：8080"
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>用户名</label>
                  <input
                    style={inputStyle}
                    value={ownProxy.username}
                    onChange={(e) => setOwnProxy({ ...ownProxy, username: e.target.value })}
                    placeholder="可选"
                  />
                </div>
                <div>
                  <label style={labelStyle}>密码</label>
                  <input
                    type="password"
                    style={inputStyle}
                    value={ownProxy.password}
                    onChange={(e) => setOwnProxy({ ...ownProxy, password: e.target.value })}
                    placeholder="可选"
                  />
                </div>
              </div>
            </div>
          )}

          {ipConfigMode === 'none' && (
            <div style={{ background: '#F44336', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div>
                <p style={{ margin: 0, fontSize: 14, color: '#ffffff', fontWeight: 600 }}>
                  未绑定干净代理IP可能导致账号被平台降权、限流甚至封禁。
                </p>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                  强烈建议绑定专业住宅IP保障账号安全
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 账号配置 */}
        <div style={{ background: '#1e1e1e', borderRadius: 12, padding: 28 }}>
          <h3 style={sectionTitleStyle}>账号配置</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div>
                <label style={labelStyle}>
                  账号用户名 *
                </label>
                <input
                  style={inputStyle}
                  value={form.account_username}
                  onChange={(e) => setForm({ ...form, account_username: e.target.value })}
                  placeholder="@username"
                />
              </div>
              <div>
                <label style={labelStyle}>
                  平台
                </label>
                <select
                  style={inputStyle}
                  value={form.account_platform}
                  onChange={(e) => setForm({ ...form, account_platform: e.target.value })}
                >
                  <option value="twitter">Twitter / X</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="discord">Discord</option>
                  <option value="other">其他</option>
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>
                账号密码
              </label>
              <input
                type="password"
                style={inputStyle}
                value={form.account_password}
                onChange={(e) => setForm({ ...form, account_password: e.target.value })}
                placeholder="留空则使用默认密码"
              />
            </div>
          </div>
        </div>

        {/* 指纹配置 */}
        <div style={{ background: '#1e1e1e', borderRadius: 12, padding: 28 }}>
          <h3 style={sectionTitleStyle}>指纹配置</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div>
                <label style={labelStyle}>
                  操作系统
                </label>
                <select
                  style={inputStyle}
                  value={form.os}
                  onChange={(e) => setForm({ ...form, os: e.target.value })}
                >
                  {OS_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>
                  浏览器内核
                </label>
                <select
                  style={inputStyle}
                  value={form.browser}
                  onChange={(e) => setForm({ ...form, browser: e.target.value })}
                >
                  {BROWSER_OPTIONS.map((b) => (<option key={b} value={b}>{b}</option>))}
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                屏幕分辨率
              </label>
              <select
                style={inputStyle}
                value={form.resolution}
                onChange={(e) => setForm({ ...form, resolution: e.target.value })}
              >
                {RESOLUTION_OPTIONS.map((r) => (<option key={r} value={r}>{r}</option>))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div>
                <label style={labelStyle}>
                  时区
                </label>
                <select
                  style={inputStyle}
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                >
                  {TIMEZONE_OPTIONS.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
                <input
                  style={{ ...inputStyle, marginTop: 8 }}
                  value={form.timezone_custom}
                  onChange={(e) => setForm({ ...form, timezone_custom: e.target.value })}
                  placeholder="自定义时区，如 Europe/Paris"
                />
              </div>
              <div>
                <label style={labelStyle}>
                  语言
                </label>
                <select
                  style={inputStyle}
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                >
                  {LANGUAGE_OPTIONS.map((l) => (<option key={l} value={l}>{l}</option>))}
                </select>
                <input
                  style={{ ...inputStyle, marginTop: 8 }}
                  value={form.language_custom}
                  onChange={(e) => setForm({ ...form, language_custom: e.target.value })}
                  placeholder="自定义语言，如 es-ES"
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                WebGL 供应商
              </label>
              <select
                style={inputStyle}
                value={form.webgl}
                onChange={(e) => setForm({ ...form, webgl: e.target.value })}
              >
                {WEBGL_OPTIONS.map((w) => (<option key={w} value={w}>{w}</option>))}
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => navigate('/profiles')}
            style={{ background: '#333', color: '#fafafa', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            取消
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{ background: '#FFC107', color: '#121212', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, opacity: submitting ? 0.6 : 1 }}
          >
            <RiAddLine size={16} />
            {submitting ? '创建中...' : '创建环境'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProfilePage;
