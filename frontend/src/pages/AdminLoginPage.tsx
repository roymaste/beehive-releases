import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/client';
import toast from 'react-hot-toast';

// UX: Design System colors — centralized to avoid hard-coded hex drift
const C = {
  bg: '#121212',
  surface: '#1e1e1e',
  textSecondary: '#9e9e9e',
  textTertiary: '#757575',
  accent: '#FFC107',
  secondary: '#1976D2',
  border: 'rgba(255,255,255,0.06)',
};

const AdminLoginPage: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingPwd, setSendingPwd] = useState(false);
  const [pwdSent, setPwdSent] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('请输入用户名和密码');
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
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
    const account = username.trim();
    if (!account) {
      toast.error('请先输入管理员账号');
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
          <p style={{ color: '#9e9e9e', fontSize: '13px' }}>
            后台管理 · 仅限管理员
          </p>
        </div>

        <div className="border-t mb-6" style={{ borderColor: C.border }} />

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm mb-2 font-medium" style={{ color: '#9e9e9e' }}>
              管理员账号
            </label>
            <input
              type="text"
              className="input"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setPwdSent(false); }}
              placeholder="输入管理员账号"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm mb-2 font-medium" style={{ color: '#9e9e9e' }}>
              密码
            </label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
            />
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
              {loading ? '验证中...' : '登录后台'}
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
          <p style={{ color: C.textTertiary, fontSize: '11px' }}>
            默认账号 admin · 忘记密码可点「获取密码」
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
