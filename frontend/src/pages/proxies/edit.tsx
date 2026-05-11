import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiArrowLeftLine, RiSaveLine } from 'react-icons/ri';
import {proxiesAPI} from '../../api/proxies';

const PROXY_TYPES = ['HTTP', 'HTTPS', 'SOCKS5'];

const EditProxyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ server?: string; port?: string }>({});
  const [form, setForm] = useState({
    protocol: 'HTTP',
    server: '',
    port: '',
    username: '',
    password: '',
    notes: '',
  });

  useEffect(() => {
    if (!id) return;
    proxiesAPI.get(id).then((res) => {
      const p = res.data;
      setForm({
        protocol: p.protocol || 'HTTP',
        server: p.server || '',
        port: p.port || '',
        username: p.username || '',
        password: '',
        notes: p.notes || '',
      });
    }).catch(() => {
      toast.error('获取代理信息失败');
    }).finally(() => {
      setLoading(false);
    });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!form.server.trim()) newErrors.server = '请填写服务器地址';
    if (!form.port.trim()) newErrors.port = '请填写端口';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }
    setSubmitting(true);
    try {
      await proxiesAPI.update(id!, {
        protocol: form.protocol,
        server: form.server.trim(),
        port: form.port.trim(),
        username: form.username || undefined,
        password: form.password || undefined,
        notes: form.notes || undefined,
      });
      toast.success('代理已更新');
      navigate('/proxies');
    } catch {
      toast.error('更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#78716c' }}>
        加载中...
      </div>
    );
  }

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
        编辑代理
      </h1>
      <p style={{ fontSize: 13, color: '#78716c', margin: '0 0 24px' }}>
        {form.server}:{form.port}
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
                  服务器地址 *
                </label>
                <input
                  className={`input ${errors.server ? 'border-red-500' : ''}`}
                  value={form.server}
                  onChange={(e) => { setForm({ ...form, server: e.target.value }); if (errors.server) setErrors((prev) => ({ ...prev, server: undefined })); }}
                  placeholder="192.168.1.1"
                />
                {errors.server && <p className="text-sm text-destructive mt-1">{errors.server}</p>}
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
                placeholder="留空则不修改密码"
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
              <RiSaveLine size={16} />
              {submitting ? '保存中...' : '保存修改'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProxyPage;
