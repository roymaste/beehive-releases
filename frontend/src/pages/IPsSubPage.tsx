import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ipsAPI, IPAsset } from '../api/client';
import toast from 'react-hot-toast';
import { RiAddLine, RiDeleteBinLine, RiRefreshLine } from 'react-icons/ri';
import { useConfirmDialog } from '../components/ui/confirm-dialog';

const IPsSubPage: React.FC = () => {
  const { id: tenantId } = useParams<{ id: string }>();
  const [ips, setIps] = useState<IPAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    type: 'purchased',
    provider: '',
    protocol: 'socks5',
    server: '',
    port: '',
    username: '',
    password: '',
    location: '',
    bound_to: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  const fetchIPs = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await ipsAPI.list(tenantId, 0, 200);
      setIps(res.data.ips);
      setTotal(res.data.total);
    } catch {
      toast.error('获取IP资产失败');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchIPs();
  }, [fetchIPs]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.server.trim() || !form.port.trim()) {
      toast.error('请填写服务器地址和端口');
      return;
    }
    if (!tenantId) return;
    setSubmitting(true);
    try {
      await ipsAPI.create(tenantId, {
        type: form.type,
        provider: form.provider || undefined,
        protocol: form.protocol,
        server: form.server,
        port: form.port,
        username: form.username || undefined,
        password: form.password || undefined,
        location: form.location || undefined,
        bound_to: form.bound_to || undefined,
        notes: form.notes || undefined,
      });
      toast.success('IP资产创建成功！');
      setShowCreate(false);
      setForm({ type: 'http', provider: '', protocol: 'http', server: '', port: '', username: '', password: '', location: '', bound_to: '', notes: '' });
      fetchIPs();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (ipId: string, server: string) => {
    if (!tenantId) return;
    confirm({
      title: '删除确认',
      description: `确定要删除IP资产「${server}」吗？`,
      onConfirm: async () => {
        try {
          await ipsAPI.delete(tenantId, ipId);
          toast.success('已删除');
          fetchIPs();
        } catch {
          toast.error('删除失败');
        }
      },
    });
  };

  const ipTypeOptions = ['purchased', 'owned'];
  const ipProtocolOptions = ['http', 'https', 'socks5', 'shadowsocks', 'vmess', 'trojan'];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm m-0" style={{ color: '#78716c' }}>
          共 {total} 个IP资产
        </p>
        <div className="flex gap-2">
          <button onClick={fetchIPs} className="btn flex items-center gap-1" style={{ padding: '4px 12px', fontSize: '12px' }} disabled={loading}>
            <RiRefreshLine size={14} />
            刷新
          </button>
          <button onClick={() => setShowCreate(true)} className="btn flex items-center gap-1" style={{ padding: '4px 12px', fontSize: '12px' }}>
            <RiAddLine size={14} />
            添加IP
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>类型</th>
              <th>协议</th>
              <th>服务器</th>
              <th>端口</th>
              <th>地区</th>
              <th>状态</th>
              <th>绑定到</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-8" style={{ color: '#78716c' }}>加载中...</td>
              </tr>
            ) : ips.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8" style={{ color: '#78716c' }}>暂无IP资产</td>
              </tr>
            ) : (
              ips.map((ip) => (
                <tr key={ip.id}>
                  <td>
                    <span className="badge badge-active">{ip.type}</span>
                  </td>
                  <td style={{ color: '#78716c' }}>{ip.protocol}</td>
                  <td style={{ color: '#1c1917', fontFamily: 'monospace' }}>{ip.server}</td>
                  <td style={{ color: '#e11d48', fontFamily: 'monospace' }}>{ip.port}</td>
                  <td style={{ color: '#78716c' }}>{ip.location || '—'}</td>
                  <td>
                    <span className={`badge ${ip.status === 'active' ? 'badge-active' : 'badge-suspended'}`}>
                      {ip.status}
                    </span>
                  </td>
                  <td style={{ color: '#78716c', fontSize: '13px' }}>{ip.bound_to || '—'}</td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(ip.id, ip.server)}
                        className="btn btn-danger flex items-center gap-1"
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                      >
                        <RiDeleteBinLine size={11} />
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="apple-modal relative" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#1c1917' }}>添加IP资产</h2>
            <form onSubmit={handleCreate}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>类型</label>
                  <select className="apple-select w-full" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {ipTypeOptions.map((t) => (
                      <option key={t} value={t}>{t === 'purchased' ? '购买' : '自备'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>协议</label>
                  <select className="apple-select w-full" value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value })}>
                    {ipProtocolOptions.map((p) => (
                      <option key={p} value={p}>{p.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>服务器地址 *</label>
                  <input className="input" value={form.server} onChange={(e) => setForm({ ...form, server: e.target.value })} placeholder="192.168.1.1" required />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>端口 *</label>
                  <input className="input" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} placeholder="8080" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>用户名</label>
                  <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="可选" />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>密码</label>
                  <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="可选" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>地区</label>
                  <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="如：US, JP" />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>服务商</label>
                  <input className="input" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="如：BrightData" />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>绑定账号ID</label>
                <input className="input" value={form.bound_to} onChange={(e) => setForm({ ...form, bound_to: e.target.value })} placeholder="平台账号ID" />
              </div>
              <div className="mt-4">
                <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>备注</label>
                <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="可选" />
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowCreate(false)} className="btn">取消</button>
                <button type="submit" className="btn" disabled={submitting}>
                  {submitting ? '创建中...' : '确认添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {dialog}
    </div>
  );
};

export default IPsSubPage;
