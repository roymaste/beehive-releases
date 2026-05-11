import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiArrowLeftLine, RiAddLine } from 'react-icons/ri';
import { proxiesAPI } from '../../api/proxies';

const PROXY_TYPES = ['HTTP', 'HTTPS', 'SOCKS5'];

const AddProxyPage: React.FC = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ host?: string; port?: string }>({});
  const [form, setForm] = useState({
    protocol: 'HTTP',
    host: '',
    port: '',
    username: '',
    password: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!form.host.trim()) newErrors.host = '请填写代理主机';
    if (!form.port.trim()) newErrors.port = '请填写代理端口';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }
    setSubmitting(true);
    try {
      await proxiesAPI.create({
        protocol: form.protocol,
        server: form.host.trim(),
        port: form.port.trim(),
        username: form.username || undefined,
        password: form.password || undefined,
        notes: form.notes || undefined,
      });
      toast.success('代理添加成功');
      navigate('/proxies');
    } catch {
      toast.error('添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <button
        onClick={() => navigate('/proxies')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e11d48', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20, padding: 0 }}
      >
        <RiArrowLeftLine size={16} />
        返回代理列表
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1c1917', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
        添加代理
      </h1>
      <p style={{ fontSize: 13, color: '#78716c', margin: '0 0 24px' }}>
        配置一个新的代理服务器
      </p>

      <div className="card" style={{ padding: 28 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1c1917', marginBottom: 6 }}>
                代理名称 / 备注
              </label>
              <input
                className="input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="例如：美国住宅代理-01"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1c1917', marginBottom: 6 }}>
                  类型
                </label>
                <select
                  className="select"
                  value={form.protocol}
                  onChange={(e) => setForm({ ...form, protocol: e.target.value })}
                  style={{ width: '100%' }}
                >
                  {PROXY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1c1917', marginBottom: 6 }}>
                  主机 *
                </label>
                <input
                  className={`input ${errors.host ? 'border-red-500' : ''}`}
                  value={form.host}
                  onChange={(e) => { setForm({ ...form, host: e.target.value }); if (errors.host) setErrors((prev) => ({ ...prev, host: undefined })); }}
                  placeholder="192.168.1.1"
                />
                {errors.host && <p className="text-sm text-destructive mt-1">{errors.host}</p>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1c1917', marginBottom: 6 }}>
                  端口 *
                </label>
                <input
                  className={`input ${errors.port ? 'border-red-500' : ''}`}
                  value={form.port}
                  onChange={(e) => { setForm({ ...form, port: e.target.value }); if (errors.port) setErrors((prev) => ({ ...prev, port: undefined })); }}
                  placeholder="8080"
                />
                {errors.port && <p className="text-sm text-destructive mt-1">{errors.port}</p>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1c1917', marginBottom: 6 }}>
                  用户名
                </label>
                <input
                  className="input"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="选填"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1c1917', marginBottom: 6 }}>
                密码
              </label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="选填"
              />
            </div>
          </div>

          <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn"
              onClick={() => navigate('/proxies')}
              style={{ background: '#fafaf9', color: '#1c1917' }}
            >
              取消
            </button>
            <button type="submit" className="btn" disabled={submitting}>
              <RiAddLine size={16} />
              {submitting ? '添加中...' : '添加代理'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProxyPage;
