import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RiRefreshLine, RiDeleteBinLine, RiRobot2Line, RiSparklingLine } from 'react-icons/ri';
import apiClient from '../api/client';

interface SkillItem {
  id: string;
  name: string;
  description: string;
  trigger_keywords: string[];
  action_type: string;
  config: Record<string, any>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

const AgentManagementPage: React.FC = () => {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ skills: SkillItem[]; total: number }>('/agent/skills');
      setSkills(res.data.skills || []);
    } catch {
      toast.error('获取技能列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);

  const toggleSkill = async (skill: SkillItem) => {
    try {
      await apiClient.put(`/agent/skills/${skill.id}`, { enabled: !skill.enabled });
      setSkills(prev => prev.map(s => s.id === skill.id ? { ...s, enabled: !s.enabled } : s));
      toast.success(skill.enabled ? '已禁用' : '已启用');
    } catch {
      toast.error('操作失败');
    }
  };

  const deleteSkill = async (id: string) => {
    if (!confirm('确定要删除这个技能吗？')) return;
    try {
      await apiClient.delete(`/agent/skills/${id}`);
      setSkills(prev => prev.filter(s => s.id !== id));
      toast.success('已删除');
    } catch {
      toast.error('删除失败');
    }
  };

  const actionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      post_tweet: '发帖', auto_reply: '自动回复', rewrite: '内容改写', analysis: '数据分析',
    };
    return labels[type] || type;
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Agent 管理</h1>
          <p className="text-sm" style={{ color: '#78716c' }}>管理已安装的技能和 Agent 配置</p>
        </div>
        <button className="apple-btn flex items-center gap-2" onClick={fetchSkills} disabled={loading}>
          <RiRefreshLine size={16} /> 刷新
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#78716c' }}>
          <RiSparklingLine size={32} style={{ color: '#d6d3d1', marginBottom: 12 }} />
          <p>加载中...</p>
        </div>
      ) : skills.length === 0 ? (
        <div className="apple-card p-8 text-center">
          <RiRobot2Line size={48} style={{ color: '#d6d3d1', marginBottom: 16, display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
          <h3 className="text-lg font-medium mb-2" style={{ color: '#44403c' }}>暂无安装的技能</h3>
          <p className="text-sm" style={{ color: '#78716c' }}>
            去 <a href="/agent/console" style={{ color: '#2563eb' }}>Agent 对话</a> 中说"帮我装一个技能"来开始
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {skills.map(skill => (
            <div key={skill.id} className="apple-card p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm" style={{ color: '#1c1917' }}>{skill.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#f5f5f4', color: '#78716c' }}>
                    {actionTypeLabel(skill.action_type)}
                  </span>
                </div>
                <p className="text-xs" style={{ color: '#78716c' }}>{skill.description}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => toggleSkill(skill)}
                  className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
                  style={{
                    borderColor: skill.enabled ? '#16a34a' : '#d6d3d1',
                    color: skill.enabled ? '#16a34a' : '#78716c',
                    background: skill.enabled ? '#f0fdf4' : '#fafaf9',
                  }}
                >
                  {skill.enabled ? '已启用' : '已禁用'}
                </button>
                <button onClick={() => deleteSkill(skill.id)} className="text-xs p-1.5 rounded-lg hover:bg-red-50 transition-colors" style={{ color: '#dc2626' }} title="删除">
                  <RiDeleteBinLine size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentManagementPage;
