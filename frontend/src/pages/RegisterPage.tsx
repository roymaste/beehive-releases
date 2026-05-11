import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/client';
import toast from 'react-hot-toast';
import { RiUserAddLine } from 'react-icons/ri';

// UX: Design System colors — centralized to avoid hard-coded hex drift
const C = {
  bg: '#121212',
  surface: '#1e1e1e',
  textPrimary: '#fafafa',
  textSecondary: '#9e9e9e',
  textTertiary: '#757575',
  accent: '#FFC107',
  border: 'rgba(255,255,255,0.06)',
};

const COUNTDOWN_SECONDS = 60;

const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [company, setCompany] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    verificationCode?: string;
    agreed?: string;
  }>({});

  // 验证码相关
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { register } = useAuth();
  const navigate = useNavigate();

  // 发送验证码
  const handleSendCode = async () => {
    if (!email.trim()) {
      toast.error('请先输入邮箱地址');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('请输入有效的邮箱地址');
      return;
    }
    setSendingCode(true);
    try {
      await authAPI.sendCode(email.trim());
      setCodeSent(true);
      setCountdown(COUNTDOWN_SECONDS);
      toast.success('验证码已发送到邮箱');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '发送失败，请稍后重试';
      toast.error(msg);
    } finally {
      setSendingCode(false);
    }
  };

  // 倒计时 effect
  React.useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // 验证码输入处理
  const handleCodeChange = (index: number, value: string) => {
    // 只允许数字
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = [...verificationCode];
    newCode[index] = digit;
    setVerificationCode(newCode);

    // 自动跳到下一个输入框
    if (digit && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  // 验证码键盘处理（退格键往前跳）
  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  // 粘贴处理
  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newCode = [...verificationCode];
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || '';
    }
    setVerificationCode(newCode);
    const lastFilled = Math.min(pasted.length - 1, 5);
    codeInputRefs.current[lastFilled]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = '请输入住户名称';
    if (!email.trim()) newErrors.email = '请输入邮箱地址';
    if (!password.trim()) newErrors.password = '请输入密码';
    if (!confirmPassword.trim()) newErrors.confirmPassword = '请确认密码';
    if (!agreed) newErrors.agreed = '请阅读并同意服务条款';
    if (password && confirmPassword && password !== confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致';
    }
    if (password && password.length < 6) {
      newErrors.password = '密码长度至少6位';
    }
    const code = verificationCode.join('');
    if (code.length !== 6) {
      newErrors.verificationCode = '请输入完整的6位验证码';
    } else if (!/^\d{6}$/.test(code)) {
      newErrors.verificationCode = '验证码必须是6位数字';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, code, company.trim() || undefined);
      toast.success('注册成功！欢迎加入蜂巢');
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '注册失败，请稍后重试';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#121212' }}
    >
      <div className="apple-card p-10 w-full max-w-md relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <RiUserAddLine size={48} style={{ color: '#FFC107' }} />
          </div>
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: C.textPrimary, letterSpacing: '-0.3px' }}
          >
            注册住户账号
          </h1>
          <p style={{ color: C.textSecondary, fontSize: '13px' }}>
            BEEHIVE AGENT · 创建你的智能体空间
          </p>
        </div>

        {/* Divider */}
        <div className="border-t mb-6" style={{ borderColor: C.border }} />

        <form onSubmit={handleSubmit}>
          {/* 邮箱 */}
          <div className="mb-4">
            <label
              className="block text-sm mb-2 font-medium"
              style={{ color: C.textSecondary }}
            >
              邮箱 <span style={{ color: C.accent }}>*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                className={`apple-input flex-1 ${errors.email ? 'border-red-500' : ''}`}
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((prev) => ({ ...prev, email: undefined })); }}
                placeholder="输入邮箱地址"
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={sendingCode || countdown > 0}
                className="apple-btn px-3 py-2 text-sm whitespace-nowrap"
                // UX: unify countdown colors with C.accent; add opacity when sendingCode
                style={{
                  background: countdown > 0 ? 'rgba(255,193,7,0.15)' : C.accent,
                  color: countdown > 0 ? C.textSecondary : C.bg,
                  border: 'none',
                  cursor: countdown > 0 || sendingCode ? 'not-allowed' : 'pointer',
                  minWidth: 96,
                  fontWeight: 600,
                  opacity: sendingCode ? 0.7 : 1,
                }}
              >
                {sendingCode
                  ? '发送中...'
                  : countdown > 0
                  ? `${countdown}s后重发`
                  : '发送验证码'}
              </button>
            </div>
          </div>

          {/* 验证码 */}
          {codeSent && (
            <div className="mb-4">
              <label
                className="block text-sm mb-2 font-medium"
                style={{ color: C.textSecondary }}
              >
                邮箱验证码 <span style={{ color: C.accent }}>*</span>
              </label>
              <div className="flex gap-2" onPaste={handleCodePaste}>
                {verificationCode.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { codeInputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => { handleCodeChange(i, e.target.value); if (errors.verificationCode) setErrors((prev) => ({ ...prev, verificationCode: undefined })); }}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    className={`apple-input text-center text-xl font-bold tracking-widest ${errors.verificationCode ? 'border-red-500' : ''}`}
                    style={{ width: 44, textAlign: 'center' }}
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              {errors.verificationCode && <p className="text-sm text-destructive mt-1">{errors.verificationCode}</p>}
              <p style={{ color: C.textTertiary, fontSize: 12, marginTop: 6 }}>
                没收到？检查一下垃圾邮件，或等待 {countdown === 0 ? '60' : countdown} 秒后重新发送
              </p>
            </div>
          )}

          {/* 密码 */}
          <div className="mb-4">
            <label
              className="block text-sm mb-2 font-medium"
              style={{ color: C.textSecondary }}
            >
              密码 <span style={{ color: C.accent }}>*</span>
            </label>
            <input
              type="password"
              className={`input ${errors.password ? 'border-red-500' : ''}`}
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((prev) => ({ ...prev, password: undefined })); }}
              placeholder="输入密码（至少6位）"
            />
            {errors.password && <p className="text-sm text-destructive mt-1">{errors.password}</p>}
          </div>

          {/* 确认密码 */}
          <div className="mb-4">
            <label
              className="block text-sm mb-2 font-medium"
              style={{ color: C.textSecondary }}
            >
              确认密码 <span style={{ color: C.accent }}>*</span>
            </label>
            <input
              type="password"
              className={`input ${errors.confirmPassword ? 'border-red-500' : ''}`}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined })); }}
              placeholder="再次输入密码"
            />
            {errors.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword}</p>}
          </div>

          {/* 住户名称 */}
          <div className="mb-4">
            <label
              className="block text-sm mb-2 font-medium"
              style={{ color: C.textSecondary }}
            >
              住户名称 <span style={{ color: C.accent }}>*</span>
            </label>
            <input
              type="text"
              className={`input ${errors.name ? 'border-red-500' : ''}`}
              value={name}
              onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((prev) => ({ ...prev, name: undefined })); }}
              placeholder="输入住户名称"
            />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
          </div>

          {/* 公司名（可选） */}
          <div className="mb-4">
            <label
              className="block text-sm mb-2 font-medium"
              style={{ color: C.textSecondary }}
            >
              公司名称
            </label>
            <input
              type="text"
              className="input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="输入公司名称（选填）"
            />
          </div>

          {/* 服务条款同意 */}
          <div className="mb-6 flex items-start gap-2">
            <input
              type="checkbox"
              id="tos-agree"
              checked={agreed}
              onChange={(e) => { setAgreed(e.target.checked); if (errors.agreed) setErrors((prev) => ({ ...prev, agreed: undefined })); }}
              style={{
                marginTop: 3,
                accentColor: '#FFC107',
                width: 16,
                height: 16,
                flexShrink: 0,
              }}
            />
            <label
              htmlFor="tos-agree"
              style={{ color: C.textTertiary, fontSize: 12, lineHeight: 1.5, cursor: 'pointer' }}
            >
              我已阅读并同意{' '}
              <a
                href="https://nousresearch.feishu.cn/docx/TfHOdTOo8oYiSMxuRZecPT36ngb"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#FFC107', textDecoration: 'underline' }}
              >
                服务条款
              </a>
            </label>
            {errors.agreed && <p className="text-sm text-destructive mt-1">{errors.agreed}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="apple-btn w-full py-3 text-base"
            disabled={loading}
            // UX: loading state must show both opacity reduction and not-allowed cursor
            style={loading ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
          >
            {loading ? '注册中...' : '创建账号'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p style={{ color: C.textTertiary, fontSize: '13px' }}>
            已有账号？{' '}
            <Link
              to="/login"
              style={{ color: C.accent, fontWeight: 500, textDecoration: 'none' }}
            >
              立即登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
