import React from 'react';
import { RiArrowUpSLine, RiArrowDownSLine, RiCheckboxBlankLine, RiCheckboxLine, RiCheckboxIndeterminateLine } from 'react-icons/ri';

export interface Column<T> {
  key: string;
  title: string;
  sortable?: boolean;
  width?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  loading?: boolean;
  emptyText?: string;
  error?: boolean;
  onRetry?: () => void;
}

function DataTable<T>({
  columns,
  data,
  rowKey,
  selectedIds,
  onSelectionChange,
  sortKey,
  sortDir,
  onSort,
  loading,
  emptyText = '暂无数据',
  error = false,
  onRetry,
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && selectedIds && data.every((r) => selectedIds.has(rowKey(r)));
  const someSelected = selectedIds && data.some((r) => selectedIds.has(rowKey(r))) && !allSelected;

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map((r) => rowKey(r))));
    }
  };

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  const handleSort = (col: Column<T>) => {
    if (col.sortable && onSort) {
      onSort(col.key);
    }
  };

  const renderSortIcon = (col: Column<T>) => {
    if (!col.sortable) return null;
    const isActive = sortKey === col.key;
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column', marginLeft: 4, lineHeight: 1 }}>
        <RiArrowUpSLine
          size={12}
          style={{ color: isActive && sortDir === 'asc' ? '#e11d48' : '#d6d3d1', marginBottom: -2 }}
        />
        <RiArrowDownSLine
          size={12}
          style={{ color: isActive && sortDir === 'desc' ? '#e11d48' : '#d6d3d1', marginTop: -2 }}
        />
      </span>
    );
  };

  if (loading) {
    return (
      <div className="apple-card" style={{ padding: '60px 0', textAlign: 'center', color: '#78716c' }}>
        加载中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="apple-card" style={{ padding: '60px 0', textAlign: 'center', color: '#e11d48' }}>
        <p style={{ margin: '0 0 16px', fontSize: 14 }}>加载失败，请稍后重试</p>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: '8px 20px',
              background: '#e11d48',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            重试
          </button>
        )}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="apple-card" style={{ padding: '60px 0', textAlign: 'center', color: '#78716c' }}>
        {emptyText}
      </div>
    );
  }

  return (
    <div className="apple-card" style={{ overflow: 'auto' }}>
      <table className="apple-table">
        <thead>
          <tr>
            {onSelectionChange && (
              <th style={{ width: 44, padding: '12px 8px 12px 16px' }}>
                <button
                  onClick={toggleAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {allSelected ? (
                    <RiCheckboxLine size={18} style={{ color: '#e11d48' }} />
                  ) : someSelected ? (
                    <RiCheckboxIndeterminateLine size={18} style={{ color: '#e11d48' }} />
                  ) : (
                    <RiCheckboxBlankLine size={18} style={{ color: '#d6d3d1' }} />
                  )}
                </button>
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  width: col.width,
                  cursor: col.sortable ? 'pointer' : 'default',
                }}
                onClick={() => handleSort(col)}
              >
                {col.title}
                {renderSortIcon(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const id = rowKey(row);
            const isSelected = selectedIds?.has(id);
            return (
              <tr key={id}>
                {onSelectionChange && (
                  <td style={{ width: 44, padding: '12px 8px 12px 16px' }}>
                    <button
                      onClick={() => toggleRow(id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {isSelected ? (
                        <RiCheckboxLine size={18} style={{ color: '#e11d48' }} />
                      ) : (
                        <RiCheckboxBlankLine size={18} style={{ color: '#d6d3d1' }} />
                      )}
                    </button>
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row, idx) : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
