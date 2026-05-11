import React from 'react';
import { RiSearchLine } from 'react-icons/ri';

interface FilterTab {
  key: string;
  label: string;
  count?: number;
}

interface SearchFilterProps {
  tabs: FilterTab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  extraFilters?: React.ReactNode;
  rightActions?: React.ReactNode;
}

const SearchFilter: React.FC<SearchFilterProps> = ({
  tabs,
  activeTab,
  onTabChange,
  searchValue,
  onSearchChange,
  searchPlaceholder = '搜索...',
  extraFilters,
  rightActions,
}) => {
  return (
    <div style={{ marginBottom: 12 }}>
      {/* Status tabs row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className="tab"
              style={{
                ...(activeTab === tab.key ? {
                  color: '#e11d48',
                  borderBottom: '2px solid #0071e3',
                } : {
                  color: '#78716c',
                  borderBottom: '2px solid transparent',
                }),
                padding: '8px 18px',
                fontSize: 14,
                fontWeight: activeTab === tab.key ? 600 : 400,
              }}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span style={{ marginLeft: 6, fontSize: 12, color: activeTab === tab.key ? '#e11d48' : '#78716c' }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        {rightActions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {rightActions}
          </div>
        )}
      </div>

      {/* Search + extra filters row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 420 }}>
          <RiSearchLine
            size={16}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#78716c' }}
          />
          <input
            type="text"
            className="input px-3 py-2 w-60"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        {extraFilters}
      </div>
    </div>
  );
};

export default SearchFilter;
