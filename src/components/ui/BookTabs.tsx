import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

interface BookTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const BookTabs: React.FC<BookTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
}) => {
  return (
    <div
      className={`flex space-x-1 sm:space-x-2 border-b border-parchment-400 overflow-x-auto scrollbar-none pb-0 ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-3 sm:px-4 py-2 font-serif text-xs sm:text-sm tracking-wide rounded-t border-t border-l border-r transition-all flex items-center gap-1.5 whitespace-nowrap ${
              isActive
                ? 'bg-parchment-100 border-parchment-500 text-manuscript-burgundy font-bold shadow-sm -mb-px z-10'
                : 'bg-parchment-300/40 border-parchment-400/60 text-ink-light hover:bg-parchment-200 hover:text-ink'
            }`}
          >
            {tab.icon && <span className="opacity-80">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-manuscript-gold text-ink font-bold">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
