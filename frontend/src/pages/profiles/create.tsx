import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiArrowLeftLine, RiAddLine } from 'react-icons/ri';
import { profilesAPI } from '../../api/profiles';
import { proxiesAPI, Proxy } from '../../api/proxies';
import { groupsAPI, Group } from '../../api/groups';
import { browserKernelsAPI, BrowserKernel } from '../../api/browserKernels';

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
  const [kernels, setKernels] = useState<BrowserKernel[]>([]);
  const [ipConfigMode, setIpConfigMode] = useState<IpConfigMode>('buy');
  const [errors, setErrors] = useState<{ name?: string; account_username?: string }>({});
  const [form, setForm] = useState({
    name: '',
    account_username: '',
    account_platform: 'twitter',
    account_password: '',
    proxy_id: '',
    notes: '',
    tags: '',
    group_id: '',
    kernel_version: '',
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
    browserKernelsAPI.list().then((res) => {
      setKernels(res.data.kernels || []);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!form.name.trim()) newErrors.name = '请填写环境名称';
    if (!form.account_username.trim()) newErrors.account_username = '请填写平台账号';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
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
        kernel_version: form.kernel_version || undefined,
        group: form.group_id ? groups.find(g => g.id === form.group_id)?.name : undefined,
      });
      toast.success('环境创建成功');
      navigate('/profiles');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/profiles')}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RiArrowLeftLine className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">创建环境</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  环境名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); if (errors.name) setErrors((prev) => ({ ...prev, name: undefined })); }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="例如：日本推特#1"
                  required
                />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  平台账号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.account_username}
                  onChange={(e) => { setForm({ ...form, account_username: e.target.value }); if (errors.account_username) setErrors((prev) => ({ ...prev, account_username: undefined })); }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.account_username ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="平台用户名"
                  required
                />
                {errors.account_username && <p className="text-sm text-destructive mt-1">{errors.account_username}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">平台</label>
                <select
                  value={form.account_platform}
                  onChange={(e) => setForm({ ...form, account_platform: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="twitter">Twitter / X</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                  <option value="weibo">微博</option>
                  <option value="xhs">小红书</option>
                  <option value="douyin">抖音</option>
                  <option value="bilibili">B站</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">平台密码</label>
                <input
                  type="password"
                  value={form.account_password}
                  onChange={(e) => setForm({ ...form, account_password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="密码（可选）"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分组</label>
                <select
                  value={form.group_id}
                  onChange={(e) => setForm({ ...form, group_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">默认分组</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="用逗号分隔，如：日本,电商"
                />
              </div>
            </div>
          </div>

          {/* IP 配置 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">IP 配置</h2>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="ipMode"
                  checked={ipConfigMode === 'buy'}
                  onChange={() => setIpConfigMode('buy')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">购买代理</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="ipMode"
                  checked={ipConfigMode === 'bind'}
                  onChange={() => setIpConfigMode('bind')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">绑定已有代理</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="ipMode"
                  checked={ipConfigMode === 'none'}
                  onChange={() => setIpConfigMode('none')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">不使用代理</span>
              </label>
            </div>

            {ipConfigMode === 'buy' && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">购买代理功能即将上线，请先选择「绑定已有代理」</p>
              </div>
            )}

            {ipConfigMode === 'bind' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择代理</label>
                <select
                  value={form.proxy_id}
                  onChange={(e) => setForm({ ...form, proxy_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">请选择代理</option>
                  {proxies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.location || p.server} ({p.protocol})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {ipConfigMode === 'none' && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">将使用本地网络访问平台</p>
              </div>
            )}
          </div>

          {/* 指纹配置 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">指纹配置</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">操作系统</label>
                <select
                  value={form.os}
                  onChange={(e) => setForm({ ...form, os: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {OS_OPTIONS.map((os) => (
                    <option key={os} value={os}>{os}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">浏览器</label>
                <select
                  value={form.browser}
                  onChange={(e) => setForm({ ...form, browser: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {BROWSER_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分辨率</label>
                <select
                  value={form.resolution}
                  onChange={(e) => setForm({ ...form, resolution: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {RESOLUTION_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">时区</label>
                <div className="flex gap-2">
                  <select
                    value={form.timezone}
                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={form.timezone_custom}
                    onChange={(e) => setForm({ ...form, timezone_custom: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="自定义时区"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">语言</label>
                <div className="flex gap-2">
                  <select
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={form.language_custom}
                    onChange={(e) => setForm({ ...form, language_custom: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="自定义语言"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WebGL GPU</label>
                <select
                  value={form.webgl}
                  onChange={(e) => setForm({ ...form, webgl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {WEBGL_OPTIONS.map((gpu) => (
                    <option key={gpu} value={gpu}>{gpu}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  浏览器内核版本
                </label>
                <select
                  value={form.kernel_version}
                  onChange={(e) => setForm({ ...form, kernel_version: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">使用默认内核</option>
                  {kernels.map((k) => (
                    <option key={k.id} value={k.version}>{k.display_name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  选择 CloakBrowser 内核版本，不选则使用默认版本
                </p>
              </div>
            </div>
          </div>

          {/* 备注 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">备注</h2>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="添加备注信息..."
            />
          </div>

          {/* 提交 */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/profiles')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <RiAddLine className="w-4 h-4" />
              {submitting ? '创建中...' : '创建环境'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProfilePage;
