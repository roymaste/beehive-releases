import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiArrowLeftLine, RiSaveLine } from 'react-icons/ri';
import { proxiesAPI, Proxy } from '../../api/proxies';

const PROXY_TYPES = ['HTTP', 'HTTPS', 'SOCKS5'];

const EditProxyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
    if (!form.server.trim() || !form.port.trim()) {
      toast.error('请填写服务器地址和端口');
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

      <div className="apple-card" style={{ padding: 28 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1c1917', marginBottom: 6 }}>
                代理名称 / 备注
              </label>
              <input
                className="apple-input"
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
                  className="apple-select"
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
                  className="apple-input"
                  value={form.server}
                  onChange={(e) => setForm({ ...form, server: e.target.value })}
                  placeholder="192.168.1.1"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1c1917', marginBottom: 6 }}>
                  端口 *
                </label>
                <input
                  className="apple-input"
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: e.target.value })}
                  placeholder="8080"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1c1917', marginBottom: 6 }}>
                  用户名
                </label>
                <input
                  className="apple-input"
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
                className="apple-input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="留空则不修改密码"
              />
            </div>
          </div>

          <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="apple-btn"
              onClick={() => navigate('/proxies')}
              style={{ background: '#fafaf9', color: '#1c1917' }}
            >
              取消
            </button>
            <button type="submit" className="apple-btn" disabled={submitting}>
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
