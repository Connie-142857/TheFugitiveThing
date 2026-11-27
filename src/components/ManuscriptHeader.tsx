import React from 'react';
import { Scroll, Shield, Award, Map, ShoppingBag, Feather } from 'lucide-react';

export type NavTab = 'chronicle' | 'roles' | 'map' | 'shop' | 'profile';

interface ManuscriptHeaderProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  gameMode: 'automated' | 'human_host';
  onToggleGameMode?: () => void;
}

export const ManuscriptHeader: React.FC<ManuscriptHeaderProps> = ({
  currentTab,
  onSelectTab,
  gameMode,
  onToggleGameMode,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'chronicle', label: 'Chronicle', icon: <Scroll className="w-4 h-4" /> },
    { id: 'roles', label: 'Tome of Roles', icon: <Feather className="w-4 h-4" /> },
    { id: 'map', label: 'Tactical Map', icon: <Map className="w-4 h-4" /> },
    { id: 'shop', label: 'Merchant', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'profile', label: 'Dossier', icon: <Award className="w-4 h-4" /> },
  ];

  return (
    <header className="border-b-2 border-manuscript-charcoal bg-parchment-100 shadow-md relative z-20">
      {/* Top Gold Border Accent */}
      <div className="h-1 bg-gradient-to-r from-manuscript-burgundy via-manuscript-gold to-manuscript-forest" />

      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Title & Wax Seal */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src="/seal.svg" alt="Wax Seal" className="w-10 h-10 drop-shadow-md" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-black tracking-widest text-ink uppercase drop-shadow-sm flex items-center gap-2">
              The Fugitive
            </h1>
            <p className="text-[11px] font-serif tracking-wider text-manuscript-burgundy font-semibold">
              Anno Domini • Social Deduction Strategy
            </p>
          </div>
        </div>

        {/* Game Mode Selector Badge */}
        <div className="flex items-center gap-2 bg-parchment-200 px-3 py-1.5 rounded border border-parchment-400">
          <span className="text-xs font-serif text-ink-light">Engine Mode:</span>
          <button
            onClick={onToggleGameMode}
            className={`text-xs font-serif font-bold px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
              gameMode === 'automated'
                ? 'bg-manuscript-forest text-parchment-50 shadow-sm'
                : 'bg-manuscript-burgundy text-parchment-50 shadow-sm'
            }`}
            title="Click to toggle between Automated Mode and Human Host Mode"
          >
            <Shield className="w-3 h-3" />
            {gameMode === 'automated' ? 'Automated Mode' : 'Human Host Mode'}
          </button>
        </div>
      </div>

      {/* Medieval Book Ribbons Navigation */}
      <nav className="max-w-6xl mx-auto px-4 flex space-x-1 sm:space-x-2 overflow-x-auto scrollbar-none pt-1">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`px-3 sm:px-4 py-2 font-serif text-xs sm:text-sm tracking-wide rounded-t border-t-2 border-l border-r transition-all flex items-center gap-1.5 whitespace-nowrap ${
                isActive
                  ? 'bg-parchment-200 border-manuscript-burgundy text-manuscript-burgundy font-bold shadow-[0_-2px_6px_rgba(0,0,0,0.06)]'
                  : 'bg-parchment-300/50 border-transparent text-ink-light hover:bg-parchment-200/80 hover:text-ink'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
