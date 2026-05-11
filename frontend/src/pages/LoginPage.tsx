import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/client';
import toast from 'react-hot-toast';

// UX: Design System colors — centralized to avoid hard-coded hex drift
const C = {
  bg: '#121212',
  surface: '#1e1e1e',
  textSecondary: '#9e9e9e',
  accent: '#FFC107',
  secondary: '#1976D2',
  border: 'rgba(255,255,255,0.06)',
};

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingPwd, setSendingPwd] = useState(false);
  const [pwdSent, setPwdSent] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { tenantLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) newErrors.email = '请输入邮箱';
    if (!password.trim()) newErrors.password = '请输入密码';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }
    setLoading(true);
    try {
      await tenantLogin(email.trim(), password);
      toast.success('登录成功！欢迎回来');
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '登录失败，请检查账号密码';
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
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '获取密码失败，请稍后重试';
      toast.error(msg);
    } finally {
      setSendingPwd(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#121212' }}
    >
      <div className="apple-card p-10 w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/assets/logo-full.svg"
              alt="HiveAgent"
              style={{ width: 220, height: 48 }}
            />
          </div>
        </div>

        <div className="border-t mb-6" style={{ borderColor: C.border }} />

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm mb-2 font-medium" style={{ color: '#9e9e9e' }}>
              邮箱
            </label>
            <input
              type="email"
              className={`input ${errors.email ? 'border-red-500' : ''}`}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setPwdSent(false); if (errors.email) setErrors((prev) => ({ ...prev, email: undefined })); }}
              placeholder="输入注册邮箱"
              autoFocus
            />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-sm mb-2 font-medium" style={{ color: '#9e9e9e' }}>
              密码
            </label>
            <input
              type="password"
              className={`input ${errors.password ? 'border-red-500' : ''}`}
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((prev) => ({ ...prev, password: undefined })); }}
              placeholder="输入密码"
            />
            {errors.password && <p className="text-sm text-destructive mt-1">{errors.password}</p>}
          </div>

          {pwdSent && (
            <div
              className="mb-4 p-3 rounded-lg text-sm text-center"
              style={{ background: 'rgba(255,193,7,0.1)', color: '#FFC107', border: '1px solid rgba(255,193,7,0.3)' }}
            >
              ✅ 密码已发送到您的邮箱，请查收后登录
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              className="apple-btn flex-1 py-3 text-base"
              disabled={loading}
              // UX: loading state must show both opacity reduction and not-allowed cursor
              style={loading ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
            >
              {loading ? '验证中...' : '登录系统'}
            </button>
            <button
              type="button"
              className="apple-btn py-3 text-base"
              disabled={sendingPwd}
              onClick={handleGetPassword}
              // UX: use C.secondary instead of hard-coded #1976D2 for color consistency
              style={{
                flex: '0 0 auto',
                background: 'transparent',
                color: C.secondary,
                border: `1px solid ${C.secondary}`,
                padding: '12px 16px',
                whiteSpace: 'nowrap',
                cursor: sendingPwd ? 'not-allowed' : 'pointer',
                opacity: sendingPwd ? 0.7 : 1,
              }}
            >
              {sendingPwd ? '发送中...' : '获取密码'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p style={{ color: '#9e9e9e', fontSize: '13px' }}>
            没有账号？{' '}
            <Link
              to="/register"
              style={{ color: '#FFC107', fontWeight: 500, textDecoration: 'none' }}
            >
              立即注册
            </Link>
          </p>
          <p className="mt-4" style={{ fontSize: '11px' }}>
            <Link
              to="/admin/login"
              style={{ color: '#555', textDecoration: 'none' }}
            >
              管理入口
            </Link>
          </p>
        </div>

        {/* ── 下载桌面客户端 ── */}
        <div className="border-t mt-5 pt-5" style={{ borderColor: C.border }}>
          <p className="text-center mb-3" style={{ color: '#999', fontSize: '13px', fontWeight: 500 }}>
            下载桌面客户端
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <div
              style={{
                flex: 1, padding: '10px 8px', borderRadius: '8px', textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ color: '#555', fontSize: '11px', marginBottom: 2 }}>macOS</div>
              <div style={{ color: '#444', fontSize: '10px' }}>即将支持</div>
            </div>
            <a
              href="https://github.com/roymaste/beehive-releases/releases/tag/v0.1.0"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1, padding: '10px 8px', borderRadius: '8px', textAlign: 'center',
                textDecoration: 'none', display: 'block',
                background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.2)',
                cursor: 'pointer', transition: 'background 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.background='rgba(255,193,7,0.2)'}
              onMouseOut={(e) => e.currentTarget.style.background='rgba(255,193,7,0.1)'}
            >
              <div style={{ color: '#FFC107', fontSize: '13px', fontWeight: 600 }}>Linux</div>
              <div style={{ color: '#aaa', fontSize: '10px', marginTop: 2 }}>.deb / AppImage</div>
            </a>
            <a
              href="https://github.com/roymaste/beehive-releases/releases/latest/download/Beehive.Browser_0.1.0_x64-setup.exe"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1, padding: '10px 8px', borderRadius: '8px', textAlign: 'center',
                textDecoration: 'none', display: 'block',
                background: 'rgba(25,118,210,0.1)', border: '1px solid rgba(25,118,210,0.2)',
                cursor: 'pointer', transition: 'background 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.background='rgba(25,118,210,0.2)'}
              onMouseOut={(e) => e.currentTarget.style.background='rgba(25,118,210,0.1)'}
            >
              <div style={{ color: '#1976D2', fontSize: '13px', fontWeight: 600 }}>Windows</div>
              <div style={{ color: '#aaa', fontSize: '10px', marginTop: 2 }}>.exe 安装程序</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
