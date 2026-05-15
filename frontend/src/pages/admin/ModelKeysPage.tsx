import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  RiAddLine,
  RiRefreshLine,
  RiEditLine,
  RiDeleteBinLine,
} from 'react-icons/ri';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { llmAPI, LLMProvider, LLMModel, LLMApiKeyItem } from '../../api/llm';

const RADIUS_CARD = 12;

const SCOPE_OPTIONS = [
  { value: 'public', label: '公共' },
  { value: 'private', label: '仅自己' },
  { value: 'team', label: '团队' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: '启用' },
  { value: 'disabled', label: '禁用' },
];

interface FormData {
  name: string;
  provider_id: string;
  base_url: string;
  api_key: string;
  supported_models: string[];
  scope: string;
  max_concurrency: number;
  priority: number;
  is_fallback: boolean;
}

const emptyForm: FormData = {
  name: '',
  provider_id: '',
  base_url: '',
  api_key: '',
  supported_models: [],
  scope: 'public',
  max_concurrency: 5,
  priority: 10,
  is_fallback: false,
};

const ModelKeysPage: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<LLMApiKeyItem[]>([]);
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [models, setModels] = useState<LLMModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<LLMApiKeyItem | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog } = useConfirmDialog();
  const [deleteTarget, setDeleteTarget] = useState<LLMApiKeyItem | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);

  const fetchApiKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await llmAPI.listApiKeys();
      setApiKeys(res.data.items || []);
    } catch {
      toast.error('获取 API Key 列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await llmAPI.listProviders();
      setProviders(res.data.items || []);
    } catch {
      toast.error('获取供应商列表失败');
    }
  }, []);

  const fetchModels = useCallback(async (providerId?: string) => {
    try {
      const res = await llmAPI.listModels(providerId);
      setModels(res.data.items || []);
    } catch {
      toast.error('获取模型列表失败');
    }
  }, []);

  useEffect(() => {
    fetchApiKeys();
    fetchProviders();
    fetchModels();
  }, [fetchApiKeys, fetchProviders, fetchModels]);

  const openCreateDialog = () => {
    setEditingKey(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (key: LLMApiKeyItem) => {
    setEditingKey(key);
    setFormData({
      name: key.name,
      provider_id: key.provider_id,
      base_url: key.base_url,
      api_key: '',
      supported_models: key.supported_models || [],
      scope: key.scope,
      max_concurrency: key.max_concurrency,
      priority: key.priority,
      is_fallback: key.is_fallback,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingKey(null);
    setFormData(emptyForm);
  };

  const handleProviderChange = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    setFormData((prev) => ({
      ...prev,
      provider_id: providerId,
      base_url: provider?.base_url || prev.base_url,
      supported_models: [],
    }));
    fetchModels(providerId);
  };

  const handleModelToggle = (modelId: string) => {
    setFormData((prev) => {
      const exists = prev.supported_models.includes(modelId);
      return {
        ...prev,
        supported_models: exists
          ? prev.supported_models.filter((m) => m !== modelId)
          : [...prev.supported_models, modelId],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingKey) {
        const payload: Partial<FormData> = { ...formData };
        if (!payload.api_key) {
          delete (payload as Record<string, unknown>).api_key;
        }
        await llmAPI.updateApiKey(editingKey.id, payload);
        toast.success('API Key 已更新');
      } else {
        await llmAPI.createApiKey(formData);
        toast.success('API Key 已创建');
      }
      closeDialog();
      fetchApiKeys();
    } catch {
      toast.error(editingKey ? '更新失败' : '创建失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (key: LLMApiKeyItem) => {
    setDeleteTarget(key);
    setAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await llmAPI.deleteApiKey(deleteTarget.id);
      toast.success('已删除');
      fetchApiKeys();
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleteTarget(null);
      setAlertOpen(false);
    }
  };

  const handleToggleStatus = (key: LLMApiKeyItem) => {
    const nextStatus = key.status === 'active' ? 'disabled' : 'active';
    const action = nextStatus === 'active' ? '启用' : '禁用';
    confirm({
      title: `${action}确认`,
      description: `确定要${action}「${key.name}」吗？`,
      onConfirm: async () => {
        try {
          await llmAPI.updateApiKey(key.id, { status: nextStatus });
          toast.success(`已${action}`);
          fetchApiKeys();
        } catch {
          toast.error(`${action}失败`);
        }
      },
    });
  };

  const getProviderName = (providerId: string) => {
    const p = providers.find((pr) => pr.id === providerId);
    return p?.display_name || p?.name || providerId;
  };

  const getModelNames = (modelIds: string[]) => {
    return modelIds
      .map((id) => {
        const m = models.find((mo) => mo.id === id || mo.model_name === id);
        return m?.display_name || m?.model_name || id;
      })
      .join(', ');
  };

  const statusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <Badge
          variant="default"
          className="cursor-pointer"
          onClick={() => {
            const key = apiKeys.find((k) => k.status === status);
            if (key) handleToggleStatus(key);
          }}
        >
          启用
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="cursor-pointer"
      >
        禁用
      </Badge>
    );
  };

  const filteredModels = formData.provider_id
    ? models.filter((m) => m.provider_id === formData.provider_id)
    : models;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-6">
            模型API管理
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
            管理 LLM API Keys 和供应商配置
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="outline"
            onClick={fetchApiKeys}
          >
            <RiRefreshLine size={18} />
            刷新
          </Button>
          <Button
            onClick={openCreateDialog}
          >
            <RiAddLine size={18} />
            添加 Key
          </Button>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: `1px solid ${'var(--divider)'}`,
          borderRadius: RADIUS_CARD,
          overflow: 'hidden',
        }}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>供应商</TableHead>
              <TableHead>模型</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>已调用次数</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
                  加载中...
                </TableCell>
              </TableRow>
            ) : apiKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
                  暂无API Key，点击上方添加
                </TableCell>
              </TableRow>
            ) : (
              apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{key.name}</div>
                    {key.is_fallback && (
                      <Badge variant="outline" className="mt-1">备用</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{getProviderName(key.provider_id)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground" style={{ maxWidth: 240, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getModelNames(key.supported_models)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={key.status === 'active' ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => handleToggleStatus(key)}
                    >
                      {key.status === 'active' ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{key.usage_count.toLocaleString()}</span>
                  </TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openEditDialog(key)}
                        title="编辑"
                      >
                        <RiEditLine size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDelete(key)}
                        title="删除"
                        className="text-destructive"
                      >
                        <RiDeleteBinLine size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg" showCloseButton={true}>
          <DialogHeader>
            <DialogTitle>{editingKey ? '编辑 API Key' : '添加 API Key'}</DialogTitle>
            <DialogDescription>
              {editingKey ? '修改 API Key 配置信息' : '配置新的 LLM API Key'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Name */}
              <div className="grid gap-2">
                <Label htmlFor="name">名称</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：OpenAI-Production"
                  required
                />
              </div>

              {/* Provider */}
              <div className="grid gap-2">
                <Label htmlFor="provider">供应商</Label>
                <Select
                  value={formData.provider_id}
                  onValueChange={handleProviderChange}
                >
                  <SelectTrigger id="provider">
                    <SelectValue placeholder="选择供应商" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.display_name || p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Base URL */}
              <div className="grid gap-2">
                <Label htmlFor="base_url">API 地址</Label>
                <Input
                  id="base_url"
                  value={formData.base_url}
                  onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  required
                />
              </div>

              {/* API Key */}
              <div className="grid gap-2">
                <Label htmlFor="api_key">API Key</Label>
                <Input
                  id="api_key"
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder={editingKey ? '留空表示不修改' : 'sk-...'}
                  required={!editingKey}
                />
              </div>

              {/* Supported Models */}
              <div className="grid gap-2">
                <Label>支持模型</Label>
                <div
                  style={{
                    maxHeight: 160,
                    overflowY: 'auto',
                    border: '1px solid var(--divider)',
                    borderRadius: 8,
                    padding: '8px 12px',
                  }}
                >
                  {filteredModels.length === 0 ? (
                    <span className="text-sm text-muted-foreground">请先选择供应商</span>
                  ) : (
                    filteredModels.map((m) => (
                      <label
                        key={m.id}
                        className="flex items-center gap-2 py-1 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.supported_models.includes(m.id)}
                          onChange={() => handleModelToggle(m.id)}
                          className="rounded border-input"
                        />
                        <span className="text-sm text-foreground">
                          {m.display_name || m.model_name}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Scope */}
              <div className="grid gap-2">
                <Label htmlFor="scope">作用域</Label>
                <Select
                  value={formData.scope}
                  onValueChange={(v) => setFormData({ ...formData, scope: v })}
                >
                  <SelectTrigger id="scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCOPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Max Concurrency & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="max_concurrency">并发上限</Label>
                  <Input
                    id="max_concurrency"
                    type="number"
                    min={1}
                    value={formData.max_concurrency}
                    onChange={(e) =>
                      setFormData({ ...formData, max_concurrency: parseInt(e.target.value) || 1 })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority">优先级</Label>
                  <Input
                    id="priority"
                    type="number"
                    min={0}
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                    }
                    required
                  />
                </div>
              </div>

              {/* Is Fallback */}
              {editingKey && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_fallback">是否备用</Label>
                  <Switch
                    id="is_fallback"
                    checked={formData.is_fallback}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_fallback: checked })
                    }
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                取消
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {dialog}

      {/* Delete AlertDialog */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除确认</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `确定要删除「${deleteTarget.name}」吗？此操作不可恢复。` : '确定要删除吗？此操作不可恢复。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteTarget(null); setAlertOpen(false); }}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ModelKeysPage;
