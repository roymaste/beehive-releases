import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/client';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Mail, Lock, ArrowRight, Check, Loader2 } from 'lucide-react';

// ── 蜂巢背景六边形 SVG ──────────────────────────────────────────
const HoneycombPattern: React.FC = () => (
  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 pointer-events-none">
    <defs>
      <pattern id="hex" width="52" height="60" patternUnits="userSpaceOnUse">
        <path
          d="M26 0L46 10V30L26 40L6 30V10L26 0Z"
          fill="none"
          stroke="#FFC107"
          strokeWidth="0.8"
          opacity="0.2"
        />
      </pattern>
      <mask id="hexMask">
        <rect width="100%" height="100%" fill="white" />
        <rect x="0" y="0" width="100%" height="100%" fill="url(#hexFade)" />
      </mask>
      <linearGradient id="hexFade" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="white" stopOpacity="1" />
        <stop offset="40%" stopColor="white" stopOpacity="0.6" />
        <stop offset="70%" stopColor="white" stopOpacity="0.1" />
        <stop offset="100%" stopColor="white" stopOpacity="0" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#hex)" mask="url(#hexMask)" />
  </svg>
);

// ── 装饰线条 + 发光节点 ─────────────────────────────────────────
const CircuitLines: React.FC = () => (
  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 pointer-events-none">
    <defs>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    {/* 右上区域装饰线 */}
    <g opacity="0.35" stroke="#FFC107" strokeWidth="1" fill="none">
      <path d="M75% 5% L85% 5% L85% 15% L92% 15% L92% 25%" />
      <path d="M70% 12% L78% 12% L78% 22% L88% 22% L88% 30%" />
      <path d="M80% 8% L80% 18% L90% 18% L90% 28% L95% 28%" />
    </g>
    {/* 发光节点 */}
    <g fill="#FFC107" filter="url(#glow)">
      <circle cx="85%" cy="5%" r="3" opacity="0.8" />
      <circle cx="92%" cy="15%" r="2.5" opacity="0.6" />
      <circle cx="92%" cy="25%" r="2" opacity="0.5" />
      <circle cx="78%" cy="12%" r="2.5" opacity="0.6" />
      <circle cx="88%" cy="22%" r="2" opacity="0.5" />
      <circle cx="88%" cy="30%" r="2" opacity="0.4" />
      <circle cx="90%" cy="18%" r="2.5" opacity="0.6" />
      <circle cx="95%" cy="28%" r="2" opacity="0.4" />
    </g>
  </svg>
);

// ── Logo：六边形 + 蜜蜂 ─────────────────────────────────────────
const HiveLogo: React.FC<{ size?: number }> = ({ size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <defs>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFC107" />
        <stop offset="100%" stopColor="#FF9800" />
      </linearGradient>
    </defs>
    {/* 外六边形 */}
    <path
      d="M32 4L54 15V41L32 52L10 41V15L32 4Z"
      fill="url(#logoGrad)"
      fillOpacity="0.12"
      stroke="#FFC107"
      strokeWidth="1.5"
    />
    {/* 内六边形 */}
    <path
      d="M32 16L44 22.5V35.5L32 42L20 35.5V22.5L32 16Z"
      fill="url(#logoGrad)"
      fillOpacity="0.25"
      stroke="#FFC107"
      strokeWidth="1"
    />
    {/* 蜜蜂身体 */}
    <ellipse cx="32" cy="29" rx="5" ry="7" fill="#FFC107" />
    {/* 蜜蜂条纹 */}
    <line x1="28" y1="26" x2="36" y2="26" stroke="#121212" strokeWidth="1.2" opacity="0.6" />
    <line x1="27.5" y1="29" x2="36.5" y2="29" stroke="#121212" strokeWidth="1.2" opacity="0.6" />
    <line x1="28" y1="32" x2="36" y2="32" stroke="#121212" strokeWidth="1.2" opacity="0.6" />
    {/* 蜜蜂头 */}
    <circle cx="32" cy="21" r="3.5" fill="#FFC107" />
    {/* 触角 */}
    <path d="M30 18.5Q28 15 26 16" stroke="#FFC107" strokeWidth="0.8" fill="none" />
    <path d="M34 18.5Q36 15 38 16" stroke="#FFC107" strokeWidth="0.8" fill="none" />
    {/* 翅膀 */}
    <ellipse cx="27" cy="23" rx="4" ry="2.5" fill="#FFC107" fillOpacity="0.35" transform="rotate(-25 27 23)" />
    <ellipse cx="37" cy="23" rx="4" ry="2.5" fill="#FFC107" fillOpacity="0.35" transform="rotate(25 37 23)" />
  </svg>
);

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingPwd, setSendingPwd] = useState(false);
  const [pwdSent, setPwdSent] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [mounted, setMounted] = useState(false);

  const { tenantLogin } = useAuth();
  const navigate = useNavigate();
  const [downloads, setDownloads] = useState<Record<string, string>>({});

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // 动态获取 GitHub Release 下载链接
  useEffect(() => {
    fetch('https://api.github.com/repos/roymaste/beehive-releases/releases/latest')
      .then((r) => r.json())
      .then((data) => {
        if (!data?.assets) return;
        const map: Record<string, string> = {};
        for (const asset of data.assets) {
          const name = asset.name.toLowerCase();
          if (name.endsWith('.dmg')) map.macos = asset.browser_download_url;
          else if (name.endsWith('.exe')) map.windows = asset.browser_download_url;
          else if (name.endsWith('.deb') || name.includes('appimage')) map.linux = asset.browser_download_url;
        }
        setDownloads(map);
      })
      .catch(() => {/* 静默失败，fallback 显示"暂未发布" */});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) newErrors.email = '请输入邮箱';
    if (!password.trim()) newErrors.password = '请输入密码';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      await tenantLogin(email.trim(), password);
      toast.success('登录成功！欢迎回来');
      navigate('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        '登录失败，请检查账号密码';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGetPassword = async () => {
    const account = email.trim();
    if (!account) {
      toast.error('请先输入注册邮箱');
      return;
    }
    setSendingPwd(true);
    try {
      await authAPI.sendPassword(account);
      setPwdSent(true);
      toast.success('密码已发送到您的注册邮箱，请查收');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        '获取密码失败，请稍后重试';
      toast.error(msg);
    } finally {
      setSendingPwd(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: '#121212' }}
    >
      {/* ── Layer 1: 径向渐变底 ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 30%, #212121 0%, #121212 100%)',
        }}
      />

      {/* ── Layer 2: 右上金色辉光 ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 80% 20%, rgba(255,193,7,0.18) 0%, transparent 60%)',
        }}
      />

      {/* ── Layer 3: 六边形网格 ── */}
      <HoneycombPattern />

      {/* ── Layer 4: 装饰线条 + 发光节点 ── */}
      <CircuitLines />

      {/* ── 主内容 ── */}
      <div
        className="w-full max-w-md mx-4 relative z-10"
        style={{
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          opacity: mounted ? 1 : 0,
          transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <Card className="border border-white/[0.06] shadow-2xl"
          style={{
            background: 'rgba(30,30,30,0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <CardHeader className="text-center space-y-3 pb-2">
            <div className="flex justify-center">
              <HiveLogo size={72} />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight text-white">
                蜂巢智能体
              </CardTitle>
              <CardDescription className="text-sm text-[#FFC107]/80 font-medium tracking-wide">
                HiveAgent
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">邮箱</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="输入注册邮箱"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setPwdSent(false);
                      if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                    }}
                    autoFocus
                    className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:border-[#FFC107] focus-visible:ring-[#FFC107]/30"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-400">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="输入密码"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                    }}
                    className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:border-[#FFC107] focus-visible:ring-[#FFC107]/30"
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-red-400">{errors.password}</p>
                )}
              </div>

              {pwdSent && (
                <div className="p-3 rounded-lg text-sm text-center flex items-center justify-center gap-2 bg-[#FFC107]/10 text-[#FFC107] border border-[#FFC107]/20">
                  <Check className="h-4 w-4" />
                  密码已发送到您的邮箱，请查收后登录
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 gap-2 bg-[#FFC107] text-[#121212] hover:bg-[#FFB300] font-semibold border-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      验证中...
                    </>
                  ) : (
                    <>
                      登录系统
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={sendingPwd}
                  onClick={handleGetPassword}
                  className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
                >
                  {sendingPwd ? '发送中...' : '获取密码'}
                </Button>
              </div>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-gray-500">或</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <div className="text-center space-y-4">
              <p className="text-sm text-gray-400">
                还没有账号？{' '}
                <Link
                  to="/register"
                  className="font-semibold text-[#FFC107] hover:text-[#FFB300] transition-colors"
                >
                  立即注册
                </Link>
              </p>

              <Link
                to="/admin/login"
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                管理入口 →
              </Link>
            </div>

            {/* 下载桌面客户端 */}
            <div className="mt-6 pt-5 border-t border-white/10">
              <p className="text-center mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                下载桌面客户端
              </p>
              <div className="flex gap-2">
                {/* macOS */}
                {downloads.macos ? (
                  <a
                    href={downloads.macos}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-2 rounded-xl text-center block no-underline border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex justify-center mb-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.21-1.98 1.07-3.11-1.05.05-2.31.72-3.06 1.64-.67.81-1.26 2.11-1.1 3.11 1.19.09 2.4-.6 3.09-1.64z" />
                      </svg>
                    </div>
                    <div className="text-xs font-medium text-gray-400">macOS</div>
                    <div className="text-[10px] mt-0.5 text-[#FFC107]">.dmg 下载</div>
                  </a>
                ) : (
                  <div className="flex-1 py-2.5 px-2 rounded-xl text-center border border-white/10 bg-white/5">
                    <div className="flex justify-center mb-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.21-1.98 1.07-3.11-1.05.05-2.31.72-3.06 1.64-.67.81-1.26 2.11-1.1 3.11 1.19.09 2.4-.6 3.09-1.64z" />
                      </svg>
                    </div>
                    <div className="text-xs font-medium text-gray-400">macOS</div>
                    <div className="text-[10px] mt-0.5 text-gray-600">暂未发布</div>
                  </div>
                )}

                {/* Linux */}
                {downloads.linux ? (
                  <a
                    href={downloads.linux}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-2 rounded-xl text-center block no-underline border border-[#FFC107]/20 bg-[#FFC107]/5 hover:bg-[#FFC107]/10 transition-colors"
                  >
                    <div className="flex justify-center mb-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#FFC107]">
                        <path d="M12.5 2c-2.5 0-3.5.5-4.2 1.5-.7 1-1.3 2.5-1.3 4.5 0 1.5.3 2.5.8 3.2.5.7 1.2 1 2 1.2-.5.3-1 .8-1.3 1.5-.3.7-.5 1.5-.5 2.5 0 1.5.5 2.5 1.3 3.2.8.7 1.8 1 3 1s2.2-.3 3-1c.8-.7 1.3-1.7 1.3-3.2 0-1-.2-1.8-.5-2.5-.3-.7-.8-1.2-1.3-1.5.8-.2 1.5-.5 2-1.2.5-.7.8-1.7.8-3.2 0-2-.6-3.5-1.3-4.5-.7-1-1.7-1.5-4.2-1.5z" />
                      </svg>
                    </div>
                    <div className="text-xs font-semibold text-[#FFC107]">Linux</div>
                    <div className="text-[10px] mt-0.5 text-gray-400">.deb / AppImage</div>
                  </a>
                ) : (
                  <div className="flex-1 py-2.5 px-2 rounded-xl text-center border border-[#FFC107]/20 bg-[#FFC107]/5">
                    <div className="flex justify-center mb-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#FFC107]">
                        <path d="M12.5 2c-2.5 0-3.5.5-4.2 1.5-.7 1-1.3 2.5-1.3 4.5 0 1.5.3 2.5.8 3.2.5.7 1.2 1 2 1.2-.5.3-1 .8-1.3 1.5-.3.7-.5 1.5-.5 2.5 0 1.5.5 2.5 1.3 3.2.8.7 1.8 1 3 1s2.2-.3 3-1c.8-.7 1.3-1.7 1.3-3.2 0-1-.2-1.8-.5-2.5-.3-.7-.8-1.2-1.3-1.5.8-.2 1.5-.5 2-1.2.5-.7.8-1.7.8-3.2 0-2-.6-3.5-1.3-4.5-.7-1-1.7-1.5-4.2-1.5z" />
                      </svg>
                    </div>
                    <div className="text-xs font-semibold text-[#FFC107]">Linux</div>
                    <div className="text-[10px] mt-0.5 text-gray-600">暂未发布</div>
                  </div>
                )}

                {/* Windows */}
                {downloads.windows ? (
                  <a
                    href={downloads.windows}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-2 rounded-xl text-center block no-underline border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors"
                  >
                    <div className="flex justify-center mb-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400">
                        <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-13zM5.5 5a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-13a.5.5 0 0 0-.5-.5h-13z" />
                        <path d="M10 8h4v4h-4zM8 10h4v4H8zM14 10h4v4h-4zM10 14h4v4h-4z" />
                      </svg>
                    </div>
                    <div className="text-xs font-semibold text-blue-400">Windows</div>
                    <div className="text-[10px] mt-0.5 text-gray-400">.exe 安装</div>
                  </a>
                ) : (
                  <div className="flex-1 py-2.5 px-2 rounded-xl text-center border border-blue-500/20 bg-blue-500/5">
                    <div className="flex justify-center mb-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400">
                        <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-13zM5.5 5a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-13a.5.5 0 0 0-.5-.5h-13z" />
                        <path d="M10 8h4v4h-4zM8 10h4v4H8zM14 10h4v4h-4zM10 14h4v4h-4z" />
                      </svg>
                    </div>
                    <div className="text-xs font-semibold text-blue-400">Windows</div>
                    <div className="text-[10px] mt-0.5 text-gray-600">暂未发布</div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
