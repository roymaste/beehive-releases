import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { tenantsAPI, APIKeyResponse } from '../api/client';
import toast from 'react-hot-toast';
import { RiKey2Line, RiAddLine, RiFileCopyLine } from 'react-icons/ri';

const APIKeysSubPage: React.FC = () => {
  const { id: tenantId } = useParams<{ id: string }>();
  const [keyName, setKeyName] = useState('default');
  const [generatedKey, setGeneratedKey] = useState<APIKeyResponse | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!tenantId) return;
    if (!keyName.trim()) {
      toast.error('请输入 Key 名称');
      return;
    }
    setGenerating(true);
    try {
      const res = await tenantsAPI.generateApiKey(tenantId, keyName.trim());
      setGeneratedKey(res.data);
      toast.success('API Key 已生成！');
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('已复制到剪贴板');
    } catch {
      toast.error('复制失败');
    }
  };

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: '#78716c' }}>
        为当前住户生成 API Key。请注意：API Key 仅在生成时显示一次，请妥善保管。
      </p>

      {/* Generate form */}
      <div className="apple-card p-6 mb-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm mb-2" style={{ color: '#1c1917' }}>Key 名称</label>
            <input
              className="input"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="输入 Key 名称，如：default、production"
           />
          </div>
          <button
            onClick={handleGenerate}
            className="apple-btn flex items-center gap-2"
            disabled={generating}
          >
            <RiAddLine size={16} />
            {generating ? '生成中...' : '生成 Key'}
          </button>
        </div>
      </div>

      {/* Generated key display */}
      {generatedKey && (
        <div className="apple-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <RiKey2Line size={20} style={{ color: '#e11d48' }} />
            <h3 className="text-lg font-bold m-0" style={{ color: '#1c1917' }}>已生成的 API Key</h3>
          </div>

          <div className="mb-4">
            <label className="block text-xs mb-1" style={{ color: '#1c1917' }}>Key 名称</label>
            <p className="text-sm m-0" style={{ color: '#1c1917' }}>{generatedKey.name}</p>
          </div>

          <div className="mb-4">
            <label className="block text-xs mb-1" style={{ color: '#1c1917' }}>API Key</label>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 p-3 rounded text-sm break-all"
                style={{
                  background: '#fafaf9',
                  border: '1px solid #d2d2d7',
                  color: '#0077ed',
                  fontFamily: 'monospace',
                }}
              >
                {generatedKey.api_key}
              </code>
              <button
                onClick={() => copyToClipboard(generatedKey.api_key)}
                className="apple-btn flex items-center gap-1"
                style={{ padding: '8px 12px' }}
                title="复制到剪贴板"
              >
                <RiFileCopyLine size={16} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: '#1c1917' }}>创建时间</label>
            <p className="text-sm m-0" style={{ color: '#78716c' }}>
              {new Date(generatedKey.created_at).toLocaleString('zh-CN')}
            </p>
          </div>

          <div className="mt-4 p-3 rounded" style={{ background: 'rgba(139, 37, 0, 0.1)', border: '1px solid #d2d2d7' }}>
            <p className="text-xs m-0" style={{ color: '#e11d48' }}>
              ⚠ 此 Key 仅在本次会话中显示。请立即复制并妥善保管，刷新或离开页面后将无法再次查看。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default APIKeysSubPage;
