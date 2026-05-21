import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  RiTwitterXLine,
  RiWeiboLine,
  RiVideoLine,
  RiLeafLine,
  RiTvLine,
  RiGlobalLine,
  RiRefreshLine,
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiRobot2Line,
  RiSparklingLine,
  RiSettings4Line,
  RiPlayCircleLine,
  RiPauseCircleLine,
  RiCheckboxCircleLine,
} from 'react-icons/ri';
import apiClient from '../api/client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Types ───────────────────────────────────────────────────────────

interface ContentRules {
  tone?: string;
  focus?: string[];
}

interface Skill {
  id: string;
  name: string;
  action: string;
  schedule: string;
  content_rules?: ContentRules;
  status: 'active' | 'paused';
  run_count: number;
  last_run_at: string | null;
  script_steps?: string[];
  dynamic_vars?: string[];
}

interface Channel {
  id: string;
  platform: string;
  account_id: string;
  display_name: string;
  style: string;
  language: string;
  is_default: boolean;
  skills: Skill[];
}

interface Persona {
  tone: string;
  language: string;
}

interface AgentConfig {
  id: string;
  tenant_id: string;
  status: 'active' | 'paused';
  persona: Persona;
  channels: Channel[];
}

interface Template {
  id: string;
  name: string;
  platform: string;
  description: string;
}

// ─── Platform Icon Mapping ───────────────────────────────────────────

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  twitter: <RiTwitterXLine size={20} />,
  weibo: <RiWeiboLine size={20} />,
  douyin: <RiVideoLine size={20} />,
  xiaohongshu: <RiLeafLine size={20} />,
  bilibili: <RiTvLine size={20} />,
};

function PlatformIcon({ platform }: { platform: string }) {
  return <span className="text-[#FFC107]">{PLATFORM_ICONS[platform] || <RiGlobalLine size={20} />}</span>;
}

function platformLabel(p: string) {
  const map: Record<string, string> = {
    twitter: 'Twitter',
    weibo: '微博',
    douyin: '抖音',
    xiaohongshu: '小红书',
    bilibili: 'B站',
  };
  return map[p] || p;
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    post_tweet: '发帖',
    auto_reply: '自动回复',
    rewrite: '改写',
    analysis: '分析',
  };
  return map[action] || action;
}

// ─── Skeletons ───────────────────────────────────────────────────────

function AgentStatusSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/10 bg-card p-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  );
}

function ChannelSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

const AgentManagementPage: React.FC = () => {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dialog states
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [skillDialogMode, setSkillDialogMode] = useState<'add' | 'edit'>('add');
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeSkill, setActiveSkill] = useState<Partial<Skill>>({});

  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [channelForm, setChannelForm] = useState({ platform: 'twitter', account_id: '', display_name: '', style: '', language: 'zh' });

  const [channelEditOpen, setChannelEditOpen] = useState(false);
  const [channelEditForm, setChannelEditForm] = useState<Partial<Channel>>({});

  const [personaEditOpen, setPersonaEditOpen] = useState(false);
  const [personaForm, setPersonaForm] = useState<Persona>({ tone: '', language: 'zh' });

  // ─── Fetch ─────────────────────────────────────────────────────────

  const fetchConfig = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await apiClient.get<AgentConfig>('/agents/config');
      setConfig(res.data.config);
    } catch {
      toast.error('获取 Agent 配置失败');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await apiClient.get<{ templates: Template[] }>('/agents/templates');
      setTemplates(res.data.templates || []);
    } catch {
      // silent fail for templates
      setTemplates([]);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchTemplates();
  }, [fetchConfig, fetchTemplates]);

  // ─── Agent Status ──────────────────────────────────────────────────

  const toggleAgentStatus = async () => {
    if (!config) return;
    const next = config.status === 'active' ? 'paused' : 'active';
    try {
      await apiClient.put('/agents/config', { status: next });
      setConfig({ ...config, status: next });
      toast.success(next === 'active' ? 'Agent 已启动' : 'Agent 已暂停');
    } catch {
      toast.error('状态切换失败');
    }
  };

  const updatePersona = async () => {
    if (!config) return;
    try {
      await apiClient.put('/agents/config', { persona: personaForm });
      setConfig({ ...config, persona: personaForm });
      setPersonaEditOpen(false);
      toast.success('人设已更新');
    } catch {
      toast.error('更新失败');
    }
  };

  // ─── Channel ───────────────────────────────────────────────────────

  const addChannel = async () => {
    try {
      await apiClient.post('/agents/config/channels', channelForm);
      setChannelDialogOpen(false);
      setChannelForm({ platform: 'twitter', account_id: '', display_name: '', style: '', language: 'zh' });
      fetchConfig();
      toast.success('Channel 已添加');
    } catch {
      toast.error('添加失败');
    }
  };

  const updateChannel = async () => {
    if (!channelEditForm.id) return;
    try {
      await apiClient.patch(`/agents/config/channels/${channelEditForm.id}`, {
        display_name: channelEditForm.display_name,
        style: channelEditForm.style,
        language: channelEditForm.language,
      });
      setChannelEditOpen(false);
      fetchConfig();
      toast.success('Channel 已更新');
    } catch {
      toast.error('更新失败');
    }
  };

  const deleteChannel = async (id: string) => {
    if (!confirm('确定删除这个 Channel 吗？相关 Skill 也会被删除。')) return;
    try {
      await apiClient.delete(`/agents/config/channels/${id}`);
      fetchConfig();
      toast.success('已删除');
    } catch {
      toast.error('删除失败');
    }
  };

  // ─── Skill ─────────────────────────────────────────────────────────

  const openAddSkill = (channelId: string) => {
    setActiveChannelId(channelId);
    setActiveSkill({ name: '', action: 'post_tweet', schedule: '0 */6 * * *', status: 'active', content_rules: { tone: '毒舌', focus: ['科技'] }, script_steps: [], dynamic_vars: [] });
    setSkillDialogMode('add');
    setSkillDialogOpen(true);
  };

  const openEditSkill = (channelId: string, skill: Skill) => {
    setActiveChannelId(channelId);
    setActiveSkill({ ...skill });
    setSkillDialogMode('edit');
    setSkillDialogOpen(true);
  };

  const saveSkill = async () => {
    if (!activeChannelId) return;
    const payload = {
      name: activeSkill.name || '',
      action: activeSkill.action || 'post_tweet',
      schedule: activeSkill.schedule || '0 */6 * * *',
      content_rules: activeSkill.content_rules || { tone: '毒舌', focus: ['科技'] },
      status: activeSkill.status || 'active',
      script_steps: activeSkill.script_steps || [],
      dynamic_vars: activeSkill.dynamic_vars || [],
    };
    try {
      if (skillDialogMode === 'add') {
        await apiClient.post(`/agents/config/channels/${activeChannelId}/skills`, payload);
        toast.success('Skill 已添加');
      } else if (activeSkill.id) {
        await apiClient.patch(`/agents/config/channels/${activeChannelId}/skills/${activeSkill.id}`, payload);
        toast.success('Skill 已更新');
      }
      setSkillDialogOpen(false);
      fetchConfig();
    } catch {
      toast.error('保存失败');
    }
  };

  const toggleSkillStatus = async (channelId: string, skill: Skill) => {
    const next = skill.status === 'active' ? 'paused' : 'active';
    try {
      await apiClient.patch(`/agents/config/channels/${channelId}/skills/${skill.id}`, { status: next });
      setConfig((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          channels: prev.channels.map((ch) =>
            ch.id === channelId
              ? { ...ch, skills: ch.skills.map((s) => (s.id === skill.id ? { ...s, status: next } : s)) }
              : ch
          ),
        };
      });
      toast.success(next === 'active' ? 'Skill 已启用' : 'Skill 已暂停');
    } catch {
      toast.error('操作失败');
    }
  };

  const triggerSkillNow = async (channelId: string, skillId: string) => {
    try {
      await apiClient.post(`/agents/skills/${skillId}/trigger`, { channel_id: channelId });
      toast.success('Skill 已触发执行');
      fetchConfig();
    } catch {
      toast.error('触发执行失败');
    }
  };

  const deleteSkill = async (channelId: string, skillId: string) => {
    if (!confirm('确定删除这个 Skill 吗？')) return;
    try {
      await apiClient.delete(`/agents/config/channels/${channelId}/skills/${skillId}`);
      fetchConfig();
      toast.success('已删除');
    } catch {
      toast.error('删除失败');
    }
  };

  // ─── Apply Template ────────────────────────────────────────────────

  const applyTemplate = async (template: Template) => {
    if (!config) return;
    // Try to find a matching channel or use the first one
    const targetChannel = config.channels.find((c) => c.platform === template.platform) || config.channels[0];
    if (!targetChannel) {
      toast.error('请先添加一个 Channel');
      return;
    }
    try {
      await apiClient.post(`/agents/config/channels/${targetChannel.id}/skills`, {
        name: template.name,
        action: 'post_tweet',
        schedule: '0 */6 * * *',
        content_rules: { tone: config.persona.tone || '毒舌', focus: ['科技'] },
        status: 'active',
      });
      fetchConfig();
      toast.success(`模板「${template.name}」已应用`);
    } catch {
      toast.error('应用模板失败');
    }
  };

  // ─── Render ────────────────────────────────────────────────────────

  const isEmpty = !loading && (!config || config.channels.length === 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Agent 管理</h1>
          <p className="text-sm text-muted-foreground">配置 Channel 与 Skill，管理 Agent 运行状态</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchConfig} disabled={refreshing}>
          <RiRefreshLine className={refreshing ? 'animate-spin' : ''} />
          刷新
        </Button>
      </div>

      {/* Agent Status Bar */}
      {loading ? (
        <AgentStatusSkeleton />
      ) : config ? (
        <Card className="border-border/10 bg-card/80 backdrop-blur">
          <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: config.status === 'active' ? 'rgba(255,193,7,0.15)' : 'rgba(120,120,120,0.15)' }}
              >
                {config.status === 'active' ? (
                  <RiCheckboxCircleLine size={24} style={{ color: '#FFC107' }} />
                ) : (
                  <RiPauseCircleLine size={24} className="text-muted-foreground" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Agent 状态</span>
                  <Badge
                    variant={config.status === 'active' ? 'default' : 'secondary'}
                    className={config.status === 'active' ? 'bg-[#FFC107]/20 text-[#FFC107] hover:bg-[#FFC107]/30' : ''}
                  >
                    {config.status === 'active' ? '运行中' : '已暂停'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  人设: {config.persona.tone || '未设置'} · 语言: {config.persona.language === 'zh' ? '中文' : config.persona.language}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPersonaForm({ ...config.persona });
                  setPersonaEditOpen(true);
                }}
              >
                <RiSettings4Line />
                编辑人设
              </Button>
              <Switch checked={config.status === 'active'} onCheckedChange={toggleAgentStatus} />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Channel List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <ChannelSkeleton />
          <ChannelSkeleton />
        </div>
      ) : isEmpty ? (
        <Card className="border-dashed border-border/30 bg-card/50 py-12 text-center">
          <CardContent className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <RiRobot2Line size={32} className="text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground">还没有配置</h3>
              <p className="text-sm text-muted-foreground">先选择一个模板快速开始，或手动添加 Channel</p>
            </div>
            <Button
              onClick={() => setChannelDialogOpen(true)}
              className="bg-[#FFC107] text-black hover:bg-[#FFC107]/90"
            >
              <RiAddLine />
              添加 Channel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {config!.channels.map((channel) => (
            <Card key={channel.id} className="border-border/10 bg-card/80 backdrop-blur">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <PlatformIcon platform={channel.platform} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{channel.display_name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 text-xs">
                        <span>{platformLabel(channel.platform)}</span>
                        <span>·</span>
                        <span className="text-[#FFC107]">{channel.style}</span>
                        {channel.is_default && (
                          <Badge variant="outline" className="border-[#FFC107]/40 text-[#FFC107] text-[10px]">
                            默认
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => {
                        setChannelEditForm({ ...channel });
                        setChannelEditOpen(true);
                      }}
                    >
                      <RiEditLine size={14} />
                    </Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => deleteChannel(channel.id)}>
                      <RiDeleteBinLine size={14} className="text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-2 pt-0">
                {channel.skills.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/30 py-4 text-center text-xs text-muted-foreground">
                    暂无 Skill
                  </div>
                ) : (
                  channel.skills.map((skill) => (
                    <div
                      key={skill.id}
                      className="group flex items-center justify-between rounded-lg border border-border/10 bg-background/50 p-3 transition-colors hover:border-[#FFC107]/30"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{skill.name}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {actionLabel(skill.action)}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{skill.schedule}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>跑 {skill.run_count} 次</span>
                          {skill.last_run_at && <span>上次: {new Date(skill.last_run_at).toLocaleString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => triggerSkillNow(channel.id, skill.id)}
                          title="立即执行"
                        >
                          <RiPlayCircleLine size={14} className="text-[#FFC107]" />
                        </Button>
                        <Switch
                          checked={skill.status === 'active'}
                          onCheckedChange={() => toggleSkillStatus(channel.id, skill)}
                        />
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEditSkill(channel.id, skill)}
                        >
                          <RiEditLine size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => deleteSkill(channel.id, skill.id)}
                        >
                          <RiDeleteBinLine size={14} className="text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>

              <CardFooter className="pt-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-[#FFC107] hover:bg-[#FFC107]/10 hover:text-[#FFC107]"
                  onClick={() => openAddSkill(channel.id)}
                >
                  <RiAddLine size={16} />
                  添加 Skill
                </Button>
              </CardFooter>
            </Card>
          ))}

          {/* Add Channel Card */}
          <button
            onClick={() => setChannelDialogOpen(true)}
            className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/30 bg-card/30 text-muted-foreground transition-colors hover:border-[#FFC107]/40 hover:text-[#FFC107]"
          >
            <RiAddLine size={28} />
            <span className="text-sm font-medium">添加 Channel</span>
          </button>
        </div>
      )}

      {/* Templates */}
      {!loading && templates.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">快速模板</h2>
          <div className="flex flex-wrap gap-3">
            {templates.slice(0, 4).map((t) => (
              <Button
                key={t.id}
                variant="outline"
                size="sm"
                className="border-border/20 hover:border-[#FFC107]/40 hover:text-[#FFC107]"
                onClick={() => applyTemplate(t)}
              >
                <RiSparklingLine size={14} />
                {t.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Dialogs ─────────────────────────────────────────────────── */}

      {/* Persona Edit Dialog */}
      <Dialog open={personaEditOpen} onOpenChange={setPersonaEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑人设</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>语气风格</Label>
              <Input
                value={personaForm.tone}
                onChange={(e) => setPersonaForm({ ...personaForm, tone: e.target.value })}
                placeholder="例如：毒舌、温和、专业"
              />
            </div>
            <div className="space-y-2">
              <Label>语言</Label>
              <Select
                value={personaForm.language}
                onValueChange={(v) => setPersonaForm({ ...personaForm, language: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPersonaEditOpen(false)}>
              取消
            </Button>
            <Button onClick={updatePersona} className="bg-[#FFC107] text-black hover:bg-[#FFC107]/90">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Channel Add Dialog */}
      <Dialog open={channelDialogOpen} onOpenChange={setChannelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加 Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>平台</Label>
              <Select
                value={channelForm.platform}
                onValueChange={(v) => setChannelForm({ ...channelForm, platform: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="weibo">微博</SelectItem>
                  <SelectItem value="douyin">抖音</SelectItem>
                  <SelectItem value="xiaohongshu">小红书</SelectItem>
                  <SelectItem value="bilibili">B站</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>账号 ID</Label>
              <Input
                value={channelForm.account_id}
                onChange={(e) => setChannelForm({ ...channelForm, account_id: e.target.value })}
                placeholder="平台账号标识"
              />
            </div>
            <div className="space-y-2">
              <Label>显示名称</Label>
              <Input
                value={channelForm.display_name}
                onChange={(e) => setChannelForm({ ...channelForm, display_name: e.target.value })}
                placeholder="例如：大号、官方号"
              />
            </div>
            <div className="space-y-2">
              <Label>风格</Label>
              <Input
                value={channelForm.style}
                onChange={(e) => setChannelForm({ ...channelForm, style: e.target.value })}
                placeholder="例如：科技毒舌"
              />
            </div>
            <div className="space-y-2">
              <Label>语言</Label>
              <Select
                value={channelForm.language}
                onValueChange={(v) => setChannelForm({ ...channelForm, language: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChannelDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={addChannel} className="bg-[#FFC107] text-black hover:bg-[#FFC107]/90">
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Channel Edit Dialog */}
      <Dialog open={channelEditOpen} onOpenChange={setChannelEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑 Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>显示名称</Label>
              <Input
                value={channelEditForm.display_name || ''}
                onChange={(e) => setChannelEditForm({ ...channelEditForm, display_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>风格</Label>
              <Input
                value={channelEditForm.style || ''}
                onChange={(e) => setChannelEditForm({ ...channelEditForm, style: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>语言</Label>
              <Select
                value={channelEditForm.language || 'zh'}
                onValueChange={(v) => setChannelEditForm({ ...channelEditForm, language: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChannelEditOpen(false)}>
              取消
            </Button>
            <Button onClick={updateChannel} className="bg-[#FFC107] text-black hover:bg-[#FFC107]/90">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skill Add/Edit Dialog */}
      <Dialog open={skillDialogOpen} onOpenChange={setSkillDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{skillDialogMode === 'add' ? '添加 Skill' : '编辑 Skill'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>名称</Label>
              <Input
                value={activeSkill.name || ''}
                onChange={(e) => setActiveSkill({ ...activeSkill, name: e.target.value })}
                placeholder="例如：热点吐槽"
              />
            </div>
            <div className="space-y-2">
              <Label>动作</Label>
              <Select
                value={activeSkill.action || 'post_tweet'}
                onValueChange={(v) => setActiveSkill({ ...activeSkill, action: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="post_tweet">发帖</SelectItem>
                  <SelectItem value="auto_reply">自动回复</SelectItem>
                  <SelectItem value="rewrite">改写</SelectItem>
                  <SelectItem value="analysis">分析</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>调度 (Cron)</Label>
              <Input
                value={activeSkill.schedule || ''}
                onChange={(e) => setActiveSkill({ ...activeSkill, schedule: e.target.value })}
                placeholder="*/43 * * * *"
              />
            </div>
            <div className="space-y-2">
              <Label>语气</Label>
              <Input
                value={activeSkill.content_rules?.tone || ''}
                onChange={(e) =>
                  setActiveSkill({
                    ...activeSkill,
                    content_rules: { ...(activeSkill.content_rules || {}), tone: e.target.value },
                  })
                }
                placeholder="毒舌"
              />
            </div>
            <div className="space-y-2">
              <Label>关注领域 (逗号分隔)</Label>
              <Input
                value={(activeSkill.content_rules?.focus || []).join(', ')}
                onChange={(e) =>
                  setActiveSkill({
                    ...activeSkill,
                    content_rules: {
                      ...(activeSkill.content_rules || {}),
                      focus: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    },
                  })
                }
                placeholder="国际, 科技"
              />
            </div>
            <div className="space-y-2">
              <Label>执行脚本步骤 (每行一个CDP步骤)</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                value={(activeSkill.script_steps || []).join('\n')}
                onChange={(e) =>
                  setActiveSkill({
                    ...activeSkill,
                    script_steps: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="例如：\n导航到 https://twitter.com\n点击 [data-testid='tweetButton']\n输入 $content"
              />
              <p className="text-xs text-muted-foreground">支持变量替换：$content, $title, $tags</p>
            </div>
            <div className="space-y-2">
              <Label>动态变量 (逗号分隔)</Label>
              <Input
                value={(activeSkill.dynamic_vars || []).join(', ')}
                onChange={(e) =>
                  setActiveSkill({
                    ...activeSkill,
                    dynamic_vars: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="content, title, tags"
              />
              <p className="text-xs text-muted-foreground">调度器会为这些变量调用AI生成内容</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={activeSkill.status === 'active'}
                onCheckedChange={(checked) => setActiveSkill({ ...activeSkill, status: checked ? 'active' : 'paused' })}
              />
              <Label className="cursor-pointer">启用</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkillDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={saveSkill} className="bg-[#FFC107] text-black hover:bg-[#FFC107]/90">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentManagementPage;
