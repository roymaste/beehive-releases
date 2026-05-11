import React from 'react';
import { RiArrowUpSLine, RiArrowDownSLine, RiCheckboxBlankLine, RiCheckboxLine, RiCheckboxIndeterminateLine } from 'react-icons/ri';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState, EmptyStateTable } from '@/components/ui/empty-state';

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
      <span className="inline-flex flex-col ml-1 leading-none">
        <RiArrowUpSLine
          size={12}
          className={isActive && sortDir === 'asc' ? 'text-[#e11d48] -mb-0.5' : 'text-[#d6d3d1] -mb-0.5'}
        />
        <RiArrowDownSLine
          size={12}
          className={isActive && sortDir === 'desc' ? 'text-[#e11d48] -mt-0.5' : 'text-[#d6d3d1] -mt-0.5'}
        />
      </span>
    );
  };

  if (loading) {
    return (
      <div className="card">
        <TableSkeleton rows={5} columns={columns.length} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <EmptyState
          title="加载失败"
          description="数据加载失败，请稍后重试"
          action={onRetry ? { label: '重试', onClick: onRetry } : undefined}
        />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card">
        <EmptyStateTable title={emptyText} />
      </div>
    );
  }

  return (
    <div className="card overflow-auto">
      <table className="table">
        <thead>
          <tr>
            {onSelectionChange && (
              <th className="w-11 py-3 pl-4 pr-2">
                <button
                  onClick={toggleAll}
                  className="bg-transparent border-none cursor-pointer p-0 flex items-center hover:opacity-80 transition-opacity"
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
                style={{ width: col.width }}
                className={col.sortable ? 'cursor-pointer' : 'cursor-default'}
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
              <tr key={id} className="hover:bg-muted/50 transition-colors">
                {onSelectionChange && (
                  <td className="w-11 py-3 pl-4 pr-2">
                    <button
                      onClick={() => toggleRow(id)}
                      className="bg-transparent border-none cursor-pointer p-0 flex items-center hover:opacity-80 transition-opacity"
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
