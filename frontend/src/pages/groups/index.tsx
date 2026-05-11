import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  RiAddLine,
  RiRefreshLine,
  RiEditLine,
  RiDeleteBinLine,
  RiLoader4Line,
  RiCloseLine,
} from 'react-icons/ri';
import { groupsAPI, Group } from '../../api/groups';
import { profilesAPI } from '../../api/profiles';
import DataTable, { Column } from '../../components/DataTable';

// Dark theme palette
const C = {
  bg: '#121212',
  surface: '#1e1e1e',
  surfaceHover: '#2a2a2a',
  textPrimary: '#fafafa',
  textSecondary: '#9e9e9e',
  textTertiary: '#757575',
  accent: '#FFC107',
  accentHover: '#FFA000',
  secondary: '#1976D2',
  border: 'rgba(255,255,255,0.06)',
  danger: '#e11d48',
};

interface GroupWithCount extends Group {
  profileCount?: number;
}

const GroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<GroupWithCount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [, _setCountLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const { confirm, dialog } = useConfirmDialog();

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await groupsAPI.list();
      const groupsWithCount: GroupWithCount[] = res.data.groups.map((g) => ({
        ...g,
        profileCount: undefined,
      }));
      setGroups(groupsWithCount);
      setTotal(res.data.total);
    } catch {
      toast.error('获取分组列表失败');
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch profile count per group
  const fetchProfileCounts = useCallback(async () => {
    if (groups.length === 0) return;
    _setCountLoading(true);
    try {
      const counts = await Promise.all(
        groups.map(async (g) => {
          const res = await profilesAPI.list({ group_id: g.id });
          return { id: g.id, count: res.data.total };
        })
      );
      setGroups((prev) =>
        prev.map((g) => {
          const found = counts.find((c) => c.id === g.id);
          return found ? { ...g, profileCount: found.count } : g;
        })
      );
    } catch {
      // silently fail - counts are non-critical
    } finally {
      _setCountLoading(false);
    }
  }, [groups.length]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (!loading && groups.length > 0) {
      fetchProfileCounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handleRefresh = () => {
    fetchGroups();
  };

  const openCreateModal = () => {
    setModalMode('create');
    setEditingGroup(null);
    setFormName('');
    setFormDescription('');
    setShowModal(true);
  };

  const openEditModal = (group: Group) => {
    setModalMode('edit');
    setEditingGroup(group);
    setFormName(group.name);
    setFormDescription(group.description || '');
    setShowModal(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error('请输入分组名称');
      return;
    }
    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        await groupsAPI.create({ name: formName.trim(), description: formDescription.trim() || undefined });
        toast.success('分组已创建');
      } else if (editingGroup) {
        await groupsAPI.update(editingGroup.id, {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
        });
        toast.success('分组已更新');
      }
      setShowModal(false);
      fetchGroups();
    } catch (err) {
      toast.error(modalMode === 'create' ? '创建失败' : '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (group: GroupWithCount) => {
    confirm({
      title: '删除分组',
      description: `确定要删除分组「${group.name}」吗？${group.profileCount !== undefined && group.profileCount > 0 ? `该分组下有 ${group.profileCount} 个环境，删除后这些环境将移至默认分组。` : ''}`,
      onConfirm: async () => {
        try {
          await groupsAPI.delete(group.id);
          toast.success('分组已删除');
          fetchGroups();
        } catch {
          toast.error('删除失败');
        }
      },
    });
  };

  const columns: Column<GroupWithCount>[] = [
    {
      key: 'name',
      title: '名称',
      sortable: true,
      width: '200px',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500, color: C.textPrimary }}>{row.name}</div>
          {row.description && (
            <div style={{ fontSize: 12, color: C.textTertiary, marginTop: 2 }}>
              {row.description.length > 40 ? row.description.slice(0, 40) + '…' : row.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'profileCount',
      title: '环境数',
      width: '100px',
      render: (row) => (
        <span style={{ color: C.textSecondary, fontSize: 13 }}>
          {row.profileCount !== undefined ? (
            row.profileCount
          ) : (
            <RiLoader4Line size={14} className="spin" style={{ color: C.textTertiary }} />
          )}
        </span>
      ),
    },
    {
      key: 'created_at',
      title: '创建时间',
      sortable: true,
      width: '160px',
      render: (row) => (
        <span style={{ fontSize: 13, color: C.textSecondary }}>
          {new Date(row.created_at).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'updated_at',
      title: '更新时间',
      sortable: true,
      width: '160px',
      render: (row) => (
        <span style={{ fontSize: 13, color: C.textSecondary }}>
          {new Date(row.updated_at).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      width: '120px',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => openEditModal(row)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: C.secondary,
              display: 'flex',
              alignItems: 'center',
            }}
            title="编辑"
          >
            <RiEditLine size={16} />
          </button>
          <button
            onClick={() => handleDelete(row)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: C.textTertiary,
              display: 'flex',
              alignItems: 'center',
            }}
            title="删除"
          >
            <RiDeleteBinLine size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-6">
            环境分组
          </h1>
          <p style={{ fontSize: 13, color: C.textSecondary, margin: '4px 0 0' }}>
            共 {total} 个分组
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleRefresh}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 12px',
              color: C.textSecondary,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              borderRadius: 6,
            }}
            title="刷新"
          >
            <RiRefreshLine size={16} />
            刷新
          </button>
          <button
            onClick={openCreateModal}
            style={{
              background: C.accent,
              border: 'none',
              borderRadius: 8,
              padding: '9px 18px',
              color: '#121212',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RiAddLine size={16} />
            新建分组
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataTable
          columns={columns}
          data={groups}
          rowKey={(r) => r.id}
          loading={loading}
          error={fetchError}
          onRetry={fetchGroups}
          emptyText="暂无分组，点击「新建分组」创建"
        />
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            style={{
              background: C.surface,
              borderRadius: 12,
              padding: 24,
              width: 440,
              maxWidth: '90vw',
              border: `1px solid ${C.border}`,
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: C.textPrimary, margin: 0 }}>
                {modalMode === 'create' ? '新建分组' : '编辑分组'}
              </h2>
              <button
                onClick={closeModal}
                disabled={submitting}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  padding: 4,
                  color: C.textSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                <RiCloseLine size={18} />
              </button>
            </div>

            {/* Form */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: C.textSecondary, marginBottom: 6 }}>
                分组名称 <span style={{ color: C.danger }}>*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="请输入分组名称"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  color: C.textPrimary,
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, color: C.textSecondary, marginBottom: 6 }}>
                分组描述
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="可选的分组描述"
                disabled={submitting}
                rows={3}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  color: C.textPrimary,
                  fontSize: 13,
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={closeModal}
                disabled={submitting}
                style={{
                  padding: '9px 20px',
                  background: 'none',
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  color: C.textSecondary,
                  fontSize: 13,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: '9px 20px',
                  background: submitting ? C.textTertiary : C.accent,
                  border: 'none',
                  borderRadius: 8,
                  color: submitting ? C.textSecondary : '#121212',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {submitting && <RiLoader4Line size={14} className="spin" />}
                {modalMode === 'create' ? '创建' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
      {dialog}
    </div>
  );
};

export default GroupsPage;
