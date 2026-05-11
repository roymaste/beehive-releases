import React from 'react';
import {
  RiPlayLine,
  RiStopLine,
  RiShareLine,
  RiSwapLine,
  RiLink,
  RiDeleteBinLine,
  RiMoreLine,
} from 'react-icons/ri';

interface BatchAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}

interface BatchActionsProps {
  selectedCount: number;
  actions: BatchAction[];
  extraActions?: BatchAction[];
}

const BatchActions: React.FC<BatchActionsProps> = ({ selectedCount, actions, extraActions }) => {
  if (selectedCount === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        background: '#18181b',
        border: '1px solid #27272a',
        borderRadius: 10,
        marginBottom: 12,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 13, color: '#e11d48', fontWeight: 600, marginRight: 8 }}>
        已选 {selectedCount} 项
      </span>
      {actions.map((action) => (
        <button
          key={action.key}
          onClick={action.onClick}
          className="btn"
          style={{
            padding: '6px 14px',
            fontSize: 13,
            background: action.danger ? '#e11d48' : '#e11d48',
          }}
        >
          {action.icon}
          {action.label}
        </button>
      ))}
      {extraActions && extraActions.length > 0 && (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            className="btn"
            style={{ padding: '6px 14px', fontSize: 13, background: '#3f3f46', color: '#a1a1aa' }}
          >
            <RiMoreLine size={14} />
            更多
          </button>
        </div>
      )}
    </div>
  );
};

// Pre-built default batch actions for profiles
export const defaultProfileBatchActions = (
  _selectedCount: number,
  handlers: {
    onStart: () => void;
    onStop: () => void;
    onChangeProxy: () => void;
    onShare: () => void;
    onTransfer: () => void;
    onDelete: () => void;
  },
): BatchAction[] => [
  { key: 'start', label: '批量启动', icon: <RiPlayLine size={14} />, onClick: handlers.onStart },
  { key: 'stop', label: '批量停止', icon: <RiStopLine size={14} />, onClick: handlers.onStop },
  { key: 'change_proxy', label: '改代理', icon: <RiLink size={14} />, onClick: handlers.onChangeProxy },
  { key: 'share', label: '分享', icon: <RiShareLine size={14} />, onClick: handlers.onShare },
  { key: 'transfer', label: '转移', icon: <RiSwapLine size={14} />, onClick: handlers.onTransfer },
  { key: 'delete', label: '删除', icon: <RiDeleteBinLine size={14} />, danger: true, onClick: handlers.onDelete },
];

export default BatchActions;
