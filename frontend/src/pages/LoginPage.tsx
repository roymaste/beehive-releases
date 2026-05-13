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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div
        className="w-full max-w-md mx-4"
        style={{
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          opacity: mounted ? 1 : 0,
          transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <Card>
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-2">
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                <defs>
                  <linearGradient id="hiveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFC107" />
                    <stop offset="100%" stopColor="#FF9800" />
                  </linearGradient>
                </defs>
                <path
                  d="M28 4L48 14V38L28 48L8 38V14L28 4Z"
                  fill="url(#hiveGrad)"
                  fillOpacity="0.15"
                  stroke="#FFC107"
                  strokeWidth="1.5"
                />
                <path
                  d="M28 14L38 19.5V30.5L28 36L18 30.5V19.5L28 14Z"
                  fill="url(#hiveGrad)"
                  fillOpacity="0.3"
                  stroke="#FFC107"
                  strokeWidth="1"
                />
                <circle cx="28" cy="25" r="3" fill="#FFC107" />
                <circle cx="28" cy="25" r="6" fill="#FFC107" fillOpacity="0.15" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">蜂巢智能</CardTitle>
            <CardDescription>HiveAgent · 智能自动化平台</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                    className="pl-9"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="输入密码"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                    }}
                    className="pl-9"
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              {pwdSent && (
                <div className="p-3 rounded-lg text-sm text-center flex items-center justify-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                  <Check className="h-4 w-4" />
                  密码已发送到您的邮箱，请查收后登录
                </div>
              )}

              <div className="flex gap-3">
                <Button type="submit" disabled={loading} className="flex-1 gap-2">
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
                >
                  {sendingPwd ? '发送中...' : '获取密码'}
                </Button>
              </div>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">或</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                还没有账号？{' '}
                <Link
                  to="/register"
                  className="font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
                >
                  立即注册
                </Link>
              </p>

              <Link
                to="/admin/login"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                管理入口 →
              </Link>
            </div>

            {/* 下载桌面客户端 */}
            <div className="mt-6 pt-5 border-t">
              <p className="text-center mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                下载桌面客户端
              </p>
              <div className="flex gap-2">
                {/* macOS */}
                {downloads.macos ? (
                  <a
                    href={downloads.macos}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-2 rounded-xl text-center block no-underline border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex justify-center mb-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-muted-foreground">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.21-1.98 1.07-3.11-1.05.05-2.31.72-3.06 1.64-.67.81-1.26 2.11-1.1 3.11 1.19.09 2.4-.6 3.09-1.64z" />
                      </svg>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">macOS</div>
                    <div className="text-[10px] mt-0.5 text-amber-600">.dmg 下载</div>
                  </a>
                ) : (
                  <div className="flex-1 py-2.5 px-2 rounded-xl text-center border bg-muted/30">
                    <div className="flex justify-center mb-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-muted-foreground">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.21-1.98 1.07-3.11-1.05.05-2.31.72-3.06 1.64-.67.81-1.26 2.11-1.1 3.11 1.19.09 2.4-.6 3.09-1.64z" />
                      </svg>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">macOS</div>
                    <div className="text-[10px] mt-0.5 text-muted-foreground/60">暂未发布</div>
                  </div>
                )}

                {/* Linux */}
                {downloads.linux ? (
                  <a
                    href={downloads.linux}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-2 rounded-xl text-center block no-underline border bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 transition-colors border-amber-200 dark:border-amber-800"
                  >
                    <div className="flex justify-center mb-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-amber-600">
                        <path d="M12.5 2c-2.5 0-3.5.5-4.2 1.5-.7 1-1.3 2.5-1.3 4.5 0 1.5.3 2.5.8 3.2.5.7 1.2 1 2 1.2-.5.3-1 .8-1.3 1.5-.3.7-.5 1.5-.5 2.5 0 1.5.5 2.5 1.3 3.2.8.7 1.8 1 3 1s2.2-.3 3-1c.8-.7 1.3-1.7 1.3-3.2 0-1-.2-1.8-.5-2.5-.3-.7-.8-1.2-1.3-1.5.8-.2 1.5-.5 2-1.2.5-.7.8-1.7.8-3.2 0-2-.6-3.5-1.3-4.5-.7-1-1.7-1.5-4.2-1.5z" />
                      </svg>
                    </div>
                    <div className="text-xs font-semibold text-amber-600">Linux</div>
                    <div className="text-[10px] mt-0.5 text-muted-foreground">.deb / AppImage</div>
                  </a>
                ) : (
                  <div className="flex-1 py-2.5 px-2 rounded-xl text-center border bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                    <div className="flex justify-center mb-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-amber-600">
                        <path d="M12.5 2c-2.5 0-3.5.5-4.2 1.5-.7 1-1.3 2.5-1.3 4.5 0 1.5.3 2.5.8 3.2.5.7 1.2 1 2 1.2-.5.3-1 .8-1.3 1.5-.3.7-.5 1.5-.5 2.5 0 1.5.5 2.5 1.3 3.2.8.7 1.8 1 3 1s2.2-.3 3-1c.8-.7 1.3-1.7 1.3-3.2 0-1-.2-1.8-.5-2.5-.3-.7-.8-1.2-1.3-1.5.8-.2 1.5-.5 2-1.2.5-.7.8-1.7.8-3.2 0-2-.6-3.5-1.3-4.5-.7-1-1.7-1.5-4.2-1.5z" />
                      </svg>
                    </div>
                    <div className="text-xs font-semibold text-amber-600">Linux</div>
                    <div className="text-[10px] mt-0.5 text-muted-foreground/60">暂未发布</div>
                  </div>
                )}

                {/* Windows */}
                {downloads.windows ? (
                  <a
                    href={downloads.windows}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-2 rounded-xl text-center block no-underline border bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 transition-colors border-blue-200 dark:border-blue-800"
                  >
                    <div className="flex justify-center mb-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-blue-600">
                        <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-13zM5.5 5a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-13a.5.5 0 0 0-.5-.5h-13z" />
                        <path d="M10 8h4v4h-4zM8 10h4v4H8zM14 10h4v4h-4zM10 14h4v4h-4z" />
                      </svg>
                    </div>
                    <div className="text-xs font-semibold text-blue-600">Windows</div>
                    <div className="text-[10px] mt-0.5 text-muted-foreground">.exe 安装</div>
                  </a>
                ) : (
                  <div className="flex-1 py-2.5 px-2 rounded-xl text-center border bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                    <div className="flex justify-center mb-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-blue-600">
                        <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-13zM5.5 5a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-13a.5.5 0 0 0-.5-.5h-13z" />
                        <path d="M10 8h4v4h-4zM8 10h4v4H8zM14 10h4v4h-4zM10 14h4v4h-4z" />
                      </svg>
                    </div>
                    <div className="text-xs font-semibold text-blue-600">Windows</div>
                    <div className="text-[10px] mt-0.5 text-muted-foreground/60">暂未发布</div>
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
