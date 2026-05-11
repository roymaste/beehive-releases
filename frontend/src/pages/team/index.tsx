import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  RiRefreshLine,
  RiAddLine,
  RiDeleteBinLine,
  RiUserLine,
} from 'react-icons/ri';
import apiClient from '../../api/client';
import { useConfirmDialog } from '../../components/ui/confirm-dialog';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

const TeamPage: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', role: 'member' });
  const [submitting, setSubmitting] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ members: TeamMember[] }>('/team/members');
      setMembers(res.data.members || []);
    } catch {
      toast.error('获取成员列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.name.trim()) {
      toast.error('请填写邮箱和姓名');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/team/members', form);
      toast.success('邀请已发送');
      setShowInvite(false);
      setForm({ email: '', name: '', role: 'member' });
      fetchMembers();
    } catch {
      toast.error('邀请失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string, name: string) => {
    confirm({
      title: '移除确认',
      description: `确定移除成员「${name}」？`,
      onConfirm: async () => {
        try {
          await apiClient.delete(`/team/members/${id}`);
          toast.success('已移除');
          fetchMembers();
        } catch {
          toast.error('移除失败');
        }
      },
    });
  };

  const roleBadge = (role: string) => {
    const cls =
      role === 'admin' ? 'apple-badge-enterprise'
        : role === 'member' ? 'apple-badge-active'
        : 'apple-badge-free';
    return <span className={`apple-badge ${cls}`}>{role}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-6">
            团队管理
          </h1>
          <p className="text-sm mt-1" style={{ color: '#78716c' }}>
            共 {members.length} 个成员
          </p>
        </div>
        <div className="flex gap-2">
          <button className="apple-btn flex items-center gap-2" onClick={fetchMembers} disabled={loading}>
            <RiRefreshLine size={16} />
            刷新
          </button>
          <button className="apple-btn flex items-center gap-2" onClick={() => setShowInvite(true)}>
            <RiAddLine size={16} />
            邀请成员
          </button>
        </div>
      </div>

      <div className="apple-card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>姓名</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>加入时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8" style={{ color: '#78716c' }}>加载中...</td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8" style={{ color: '#78716c' }}>
                  <RiUserLine size={32} style={{ color: '#d6d3d1', marginBottom: 8 }} />
                  <p style={{ margin: 0 }}>暂无团队成员</p>
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 500, color: '#1c1917' }}>{m.name}</td>
                  <td style={{ color: '#78716c' }}>{m.email}</td>
                  <td>{roleBadge(m.role)}</td>
                  <td style={{ fontSize: 13, color: '#78716c' }}>
                    {new Date(m.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td>
                    <button
                      onClick={() => handleRemove(m.id, m.name)}
                      className="apple-btn btn-danger flex items-center gap-1"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      <RiDeleteBinLine size={12} />
                      移除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showInvite && (
        <div className="modal-overlay" onClick={() => setShowInvite(false)}>
          <div className="apple-modal relative" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#1c1917' }}>邀请成员</h2>
            <form onSubmit={handleInvite}>
              <div className="mb-4">
                <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>姓名 *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="成员姓名" required />
              </div>
              <div className="mb-4">
                <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>邮箱 *</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="member@example.com" required />
              </div>
              <div className="mb-6">
                <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>角色</label>
                <select className="apple-select w-full" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="admin">管理员</option>
                  <option value="member">成员</option>
                  <option value="viewer">查看者</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowInvite(false)} className="btn">取消</button>
                <button type="submit" className="btn" disabled={submitting}>
                  {submitting ? '邀请中...' : '发送邀请'}
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

export default TeamPage;
