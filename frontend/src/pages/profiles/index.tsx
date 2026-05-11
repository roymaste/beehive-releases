import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  RiAddLine,
  RiRefreshLine,
  RiPlayLine,
  RiStopLine,
  RiEditLine,
  RiDeleteBinLine,
  RiLayoutGridLine,
  RiListCheck2,
  RiSettings3Line,
  RiLoader4Line,
  RiFolderLine,
  RiUploadLine,
} from 'react-icons/ri';
import { profilesAPI, Profile } from '../../api/profiles';
import { groupsAPI, Group } from '../../api/groups';
import { isDesktopApp, launchLocalBeehiveBrowser, stopLocalBeehiveBrowser, listLocalRunningCloaks, fingerprintToLauncherConfig } from '../../lib/desktop';
import DataTable, { Column } from '../../components/DataTable';
import BatchActions, { defaultProfileBatchActions } from '../../components/BatchActions';
import SearchFilter from '../../components/SearchFilter';
import ImportModal from './ImportModal';

const PAGE_SIZE = 20;

const STATUS_TABS = [
  { key: 'all', label: '全部' },
  { key: 'running', label: '运行中' },
  { key: 'stopped', label: '已停止' },
  { key: 'mine', label: '我创建的' },
];

// Status dot component with different states
const StatusDot: React.FC<{ status: string; error?: string }> = ({ status, error }) => {
  const [showError, setShowError] = useState(false);

  if (status === 'loading') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <RiLoader4Line size={14} className="spin" style={{ color: 'var(--text-tertiary)' }} />
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>加载中</span>
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, position: 'relative' }}
        onMouseEnter={() => setShowError(true)}
        onMouseLeave={() => setShowError(false)}
      >
        <span className="status-dot" style={{ background: 'var(--error)' }} />
        <span style={{ fontSize: 13, color: 'var(--error)' }}>错误</span>
        {showError && error && (
          <span style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 100,
            background: '#27272a', color: '#fff', padding: '6px 10px', borderRadius: 6,
            fontSize: 12, whiteSpace: 'nowrap', marginTop: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}>
            {error}
          </span>
        )}
      </span>
    );
  }

  if (status === 'running' || status === 'active') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span className="status-dot" style={{ background: 'var(--success)' }} />
        <span style={{ fontSize: 13, color: 'var(--success)' }}>运行中</span>
      </span>
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span className="status-dot" style={{ background: 'var(--gray-500)' }} />
      <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>已停止</span>
    </span>
  );
};

// Track button loading states per profile
type ButtonLoadingState = Record<string, 'start' | 'stop' | null>;

const ProfilesPage: React.FC = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  // 分组相关状态
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  // 导入弹窗
  const [showImportModal, setShowImportModal] = useState(false);

  // Button loading states
  const [buttonLoading, setButtonLoading] = useState<ButtonLoadingState>({});
  // Local PID map for desktop app (profileId -> pid)
  const [localPids, setLocalPids] = useState<Record<string, number>>({});
  // Error states per profile
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  // Profile status overrides (for optimistic updates)
  const [statusOverride, setStatusOverride] = useState<Record<string, string>>({});
  // Fetch error state
  const [fetchError, setFetchError] = useState(false);

  const isDesktop = isDesktopApp();
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const params: Record<string, unknown> = {
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        sort_by: sortKey,
        sort_dir: sortDir,
      };
      if (activeTab !== 'all') params.status = activeTab;
      if (search.trim()) params.search = search.trim();
      if (selectedGroupId) params.group_id = selectedGroupId;

      const res = await profilesAPI.list(params as Parameters<typeof profilesAPI.list>[0]);
      setProfiles(res.data.profiles);
      setTotal(res.data.total);
    } catch {
      toast.error('获取环境列表失败');
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, search, sortKey, sortDir, selectedGroupId]);

  // Fetch groups on mount
  const fetchGroups = useCallback(async () => {
    try {
      const res = await groupsAPI.list();
      setGroups(res.data.groups);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  }, []);

  // Fetch local running cloaks on mount (desktop only)
  const fetchLocalCloaks = useCallback(async () => {
    if (!isDesktop) return;
    try {
      const pids = await listLocalRunningCloaks();
      setLocalPids(pids);
    } catch (err) {
      console.error('Failed to fetch local cloaks:', err);
    }
  }, [isDesktop]);

  useEffect(() => {
    fetchProfiles();
    fetchLocalCloaks();
    fetchGroups();
  }, [fetchProfiles, fetchLocalCloaks, fetchGroups]);

  // Auto-poll running profiles every 10 seconds
  useEffect(() => {
    const startPolling = () => {
      pollIntervalRef.current = setInterval(async () => {
        try {
          if (isDesktop) {
            // Desktop: poll local cloaks via Tauri
            const pids = await listLocalRunningCloaks();
            setLocalPids(pids);
            setProfiles((prev) => prev.map((p) => {
              const isLocallyRunning = p.id in pids;
              return { ...p, status: isLocallyRunning ? 'running' : 'stopped' };
            }));
          } else {
            // Web: poll backend /profiles/status for running profiles
            const runningProfiles = profiles.filter((p) => {
              const effective = statusOverride[p.id] || p.status;
              return effective === 'running' || effective === 'active';
            });
            if (runningProfiles.length === 0) return;
            const ids = runningProfiles.map((p) => p.id);
            const res = await profilesAPI.getStatuses(ids);
            const statuses = res.data;
            setProfiles((prev) => prev.map((p) => {
              if (ids.includes(p.id) && statuses[p.id]) {
                return { ...p, status: statuses[p.id].status };
              }
              return p;
            }));
          }
        } catch (err) {
          console.error('Status poll failed:', err);
        }
      }, 10000);
    };

    startPolling();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isDesktop, profiles, statusOverride]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleRefresh = () => {
    setSelectedIds(new Set());
    setProfileErrors({});
    fetchProfiles();
    fetchLocalCloaks();
  };

  const handleBatchAction = async (action: string) => {
    try {
      await profilesAPI.batchAction({
        profile_ids: Array.from(selectedIds),
        action: action as 'start' | 'stop' | 'delete',
      });
      toast.success('批量操作已提交');
      setSelectedIds(new Set());
      fetchProfiles();
    } catch {
      toast.error('批量操作失败');
    }
  };

  const handleStart = async (profile: Profile) => {
    setButtonLoading((prev) => ({ ...prev, [profile.id]: 'start' }));
    setProfileErrors((prev) => { const n = { ...prev }; delete n[profile.id]; return n; });
    try {
      if (isDesktop) {
        const fingerprint = (profile as any).fingerprint || {};
        const proxyUrl = (profile as any).proxy_url;
        const config = fingerprintToLauncherConfig(
          profile.id,
          fingerprint,
          proxyUrl,
          'https://twitter.com'
        );
        const result = await launchLocalBeehiveBrowser(config);
        toast.success(`环境已本地启动 (PID: ${result.pid})`);
        setLocalPids((prev) => ({ ...prev, [profile.id]: result.pid }));
        setStatusOverride((prev) => ({ ...prev, [profile.id]: 'running' }));
      } else {
        await profilesAPI.start(profile.id);
        toast.success('环境已启动');
        setStatusOverride((prev) => ({ ...prev, [profile.id]: 'running' }));
      }
    } catch (err) {
      toast.error('启动失败: ' + (err as Error).message);
      setProfileErrors((prev) => ({ ...prev, [profile.id]: (err as Error).message }));
      setStatusOverride((prev) => ({ ...prev, [profile.id]: 'error' }));
    } finally {
      setButtonLoading((prev) => { const n = { ...prev }; delete n[profile.id]; return n; });
    }
  };

  const handleStop = async (profile: Profile) => {
    setButtonLoading((prev) => ({ ...prev, [profile.id]: 'stop' }));
    setProfileErrors((prev) => { const n = { ...prev }; delete n[profile.id]; return n; });
    try {
      if (isDesktop) {
        await stopLocalBeehiveBrowser(profile.id);
        toast.success('环境已关闭');
        setLocalPids((prev) => { const n = { ...prev }; delete n[profile.id]; return n; });
        setStatusOverride((prev) => ({ ...prev, [profile.id]: 'stopped' }));
      } else {
        await profilesAPI.stop(profile.id);
        toast.success('环境已关闭');
        setStatusOverride((prev) => ({ ...prev, [profile.id]: 'stopped' }));
      }
    } catch (err) {
      toast.error('关闭失败: ' + (err as Error).message);
      setProfileErrors((prev) => ({ ...prev, [profile.id]: (err as Error).message }));
      setStatusOverride((prev) => ({ ...prev, [profile.id]: 'error' }));
    } finally {
      setButtonLoading((prev) => { const n = { ...prev }; delete n[profile.id]; return n; });
    }
  };

  const { confirm, dialog } = useConfirmDialog();

  const handleDelete = async (id: string) => {
    confirm({
      title: '删除环境',
      description: '确定删除该环境？',
      onConfirm: async () => {
        try {
          await profilesAPI.delete(id);
          toast.success('已删除');
          fetchProfiles();
        } catch {
          toast.error('删除失败');
        }
      },
    });
  };

  // Get effective status for a profile
  const getEffectiveStatus = (profile: Profile): string => {
    if (statusOverride[profile.id]) return statusOverride[profile.id];
    return profile.status;
  };

  const columns: Column<Profile>[] = [
    { key: 'name', title: '名称', sortable: true, width: '180px',
      render: (row) => (
        <div>
          <div
            style={{ color: 'var(--error)', fontWeight: 500, cursor: 'pointer' }}
            onClick={() => navigate(`/profiles/${row.id}`)}
          >
            {row.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
            ID: {row.id.slice(0, 8)}...
          </div>
        </div>
      ),
    },
    { key: 'account_username', title: '账号', sortable: true, width: '140px',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{row.account_username}</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{row.account_platform || '—'}</div>
        </div>
      ),
    },
    { key: 'proxy_ip', title: '代理IP', width: '160px',
      render: (row) => (
        <div>
          <span style={{ fontSize: 13, color: row.proxy_info ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
            {row.proxy_info ? row.proxy_info.split(':')[0] : '直连'}
          </span>
          {row.proxy_info && (
            <span className="badge badge-active" style={{ fontSize: 10, marginLeft: 6 }}>
              已绑定
            </span>
          )}
        </div>
      ),
    },
    { key: 'platform', title: '所属平台', width: '120px',
      render: (row) => (
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          {row.account_platform ? row.account_platform.charAt(0).toUpperCase() + row.account_platform.slice(1) : '—'}
        </span>
      ),
    },
    { key: 'last_operation', title: '最后操作', width: '130px',
      render: (row) => (
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          {row.last_launched_at
            ? new Date(row.last_launched_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '—'}
        </span>
      ),
    },
    { key: 'created_at', title: '创建时间', sortable: true, width: '140px',
      render: (row) => (
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          {new Date(row.created_at).toLocaleDateString('zh-CN')}
        </span>
      ),
    },
    { key: 'status', title: '状态', width: isDesktop ? '120px' : '90px',
      render: (row) => {
        const effectiveStatus = getEffectiveStatus(row);
        const error = profileErrors[row.id];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <StatusDot status={effectiveStatus} error={error} />
            {isDesktop && localPids[row.id] && (
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                PID: {localPids[row.id]}
              </span>
            )}
          </div>
        );
      },
    },
    { key: 'actions', title: '操作', width: '140px',
      render: (row) => {
        const loadingState = buttonLoading[row.id];
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => handleStart(row)}
              disabled={!!loadingState}
              style={{
                background: 'none', border: 'none', cursor: loadingState ? 'not-allowed' : 'pointer',
                padding: 4, color: loadingState ? 'var(--text-tertiary)' : 'var(--success)', opacity: loadingState ? 0.6 : 1,
              }}
              title="启动"
            >
              {loadingState === 'start' ? <RiLoader4Line size={18} className="spin" /> : <RiPlayLine size={18} />}
            </button>
            <button
              onClick={() => handleStop(row)}
              disabled={!!loadingState}
              style={{
                background: 'none', border: 'none', cursor: loadingState ? 'not-allowed' : 'pointer',
                padding: 4, color: loadingState ? 'var(--text-tertiary)' : 'var(--error)', opacity: loadingState ? 0.6 : 1,
              }}
              title="关闭"
            >
              {loadingState === 'stop' ? <RiLoader4Line size={18} className="spin" /> : <RiStopLine size={18} />}
            </button>
            <button
              onClick={() => navigate(`/profiles/${row.id}`)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--error)' }}
              title="编辑"
            >
              <RiEditLine size={16} />
            </button>
            <button
              onClick={() => handleDelete(row.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-tertiary)' }}
              title="删除"
            >
              <RiDeleteBinLine size={16} />
            </button>
          </div>
        );
      },
    },
  ];

  // 批量移动到分组
  const handleMoveToGroup = async (targetGroupId: string | null) => {
    if (selectedIds.size === 0) {
      toast.error('请先选择要移动的环境');
      return;
    }
    try {
      const res = await groupsAPI.batchSetProfileGroup(Array.from(selectedIds), targetGroupId);
      if (res.data.failed === 0) {
        toast.success(`已移动 ${res.data.success} 个环境到目标分组`);
      } else {
        toast.error(`成功 ${res.data.success}，失败 ${res.data.failed}`);
      }
      setSelectedIds(new Set());
      fetchProfiles();
    } catch (err) {
      toast.error('移动分组失败');
    }
  };

  const batchHandlers = {
    onStart: () => handleBatchAction('start'),
    onStop: () => handleBatchAction('stop'),
    onChangeProxy: () => toast('修改代理功能开发中'),
    onShare: () => toast('分享功能开发中'),
    onTransfer: () => toast('转移功能开发中'),
    onDelete: () => handleBatchAction('delete'),
    onMoveToGroup: (groupId: string | null) => handleMoveToGroup(groupId),
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-6">
            环境管理
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
            共 {total} 个浏览器环境
            {isDesktop && Object.keys(localPids).length > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--success)' }}>
                · {Object.keys(localPids).length} 个本地运行中
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn"
            onClick={() => setShowImportModal(true)}
            style={{ padding: '10px 22px' }}
          >
            <RiUploadLine size={18} />
            批量导入
          </button>
          <button
            className="btn"
            onClick={() => navigate('/profiles/create')}
            style={{ padding: '10px 22px' }}
          >
            <RiAddLine size={18} />
            新建环境
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        {/* 分组筛选 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RiFolderLine size={16} style={{ color: 'var(--text-tertiary)' }} />
          <select
            className="select"
            value={selectedGroupId}
            onChange={(e) => {
              setSelectedGroupId(e.target.value);
              setPage(0);
              setSelectedIds(new Set());
            }}
            style={{ minWidth: 140, fontSize: 13 }}
          >
            <option value="">全部分组</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <SearchFilter
        tabs={STATUS_TABS}
        activeTab={activeTab}
        onTabChange={(key) => { setActiveTab(key); setPage(0); setSelectedIds(new Set()); }}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        searchPlaceholder="搜索环境名称、账号... "
        rightActions={
          <>
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}
              title={viewMode === 'list' ? '切换为网格视图' : '切换为列表视图'}
            >
              {viewMode === 'list' ? <RiLayoutGridLine size={18} /> : <RiListCheck2 size={18} />}
            </button>
            <button
              onClick={handleRefresh}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}
              title="刷新"
            >
              <RiRefreshLine size={18} />
            </button>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}
              title="列设置"
            >
              <RiSettings3Line size={18} />
            </button>
          </>
        }
      />
      </div>

      {/* Batch Actions */}
      <BatchActions
        selectedCount={selectedIds.size}
        actions={defaultProfileBatchActions(selectedIds.size, batchHandlers)}
      />

      {/* Move to Group - when items are selected */}
      {selectedIds.size > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            background: 'var(--hover-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
            移动到分组：
          </span>
          <select
            className="select"
            value=""
            onChange={(e) => {
              if (e.target.value === '__remove__') {
                handleMoveToGroup(null);
              } else if (e.target.value) {
                handleMoveToGroup(e.target.value);
              }
            }}
            style={{ minWidth: 140, fontSize: 13 }}
          >
            <option value="">选择目标分组...</option>
            <option value="__remove__">移出分组（默认分组）</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Data Table */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataTable
          columns={columns}
          data={profiles}
          rowKey={(r) => r.id}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          loading={loading}
          error={fetchError}
          onRetry={fetchProfiles}
          emptyText="暂无环境，点击「新建环境」开始"
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 0' }}>
          <button
            className="btn"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            style={{ padding: '6px 16px', fontSize: 13, background: page === 0 ? '#27272a' : 'var(--error)', color: page === 0 ? 'var(--text-tertiary)' : '#fff' }}
          >
            上一页
          </button>
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
            第 {page + 1} / {totalPages} 页（共 {total} 条）
          </span>
          <button
            className="btn"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            style={{ padding: '6px 16px', fontSize: 13, background: page >= totalPages - 1 ? '#27272a' : 'var(--error)', color: page >= totalPages - 1 ? 'var(--text-tertiary)' : '#fff' }}
          >
            下一页
          </button>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImportComplete={() => {
            setShowImportModal(false);
            fetchProfiles();
          }}
        />
      )}
      {dialog}
    </div>
  );
};

export default ProfilesPage;
