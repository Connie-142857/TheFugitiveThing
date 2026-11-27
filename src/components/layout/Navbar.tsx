import React from 'react';
import { Home, Play, User, BarChart3, ShoppingBag, Gift, Settings, Shield, LogIn, Coins, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { PlayerAvatar } from '../ui/PlayerAvatar';
import { isDailyRewardAvailable } from '../../services/dailyRewardService';

export type PageId = 'home' | 'play' | 'profile' | 'stats' | 'shop' | 'rewards' | 'settings';

interface NavbarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  gameMode: 'automated' | 'human_host';
  onToggleGameMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  gameMode,
  onToggleGameMode,
}) => {
  const { user, profile, openAuthModal } = useAuth();
  const { t, openTutorial, playSound } = useSettings();
  const hasDailyReward = isDailyRewardAvailable(profile);

  const navItems: { id: PageId; label: string; icon: React.ReactNode; shortLabel: string }[] = [
    { id: 'home', label: t.nav.home, shortLabel: t.nav.shortHome, icon: <Home className="w-4 h-4" /> },
    { id: 'play', label: t.nav.play, shortLabel: t.nav.shortPlay, icon: <Play className="w-4 h-4" /> },
    { id: 'profile', label: t.nav.profile, shortLabel: t.nav.shortProfile, icon: <User className="w-4 h-4" /> },
    { id: 'stats', label: t.nav.stats, shortLabel: t.nav.shortStats, icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'shop', label: t.nav.shop, shortLabel: t.nav.shortShop, icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'rewards', label: t.nav.rewards, shortLabel: t.nav.shortRewards, icon: <Gift className="w-4 h-4" /> },
    { id: 'settings', label: t.nav.settings, shortLabel: t.nav.shortSettings, icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Desktop & Tablet Top Header */}
      <header className="border-b-2 border-manuscript-charcoal bg-parchment-100 shadow-md relative z-30">
        <div className="h-1 bg-gradient-to-r from-manuscript-burgundy via-manuscript-gold to-manuscript-forest" />
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Logo & Emblem */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 text-left select-none group rounded p-1"
            aria-label="Return to Chronicle Home"
          >
            <img src="./seal.svg" alt="" className="w-9 h-9 drop-shadow-md group-hover:scale-105 transition-transform" />
            <div>
              <h1 className="text-xl sm:text-2xl font-serif font-black tracking-widest text-ink uppercase">
                The Fugitive
              </h1>
              <span className="text-[10px] font-serif uppercase tracking-wider text-manuscript-burgundy font-bold block -mt-0.5">
                Social Deduction Strategy
              </span>
            </div>
          </button>

          {/* Right Header Area: Tutorial + Engine Mode + Player Auth Pill */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                playSound('click');
                openTutorial();
              }}
              className="btn-parchment text-xs px-2.5 py-1.5 rounded flex items-center gap-1.5 min-h-[36px]"
              aria-label={t.tutorial.openGuide}
              title={t.tutorial.openGuide}
            >
              <BookOpen className="w-3.5 h-3.5 text-manuscript-burgundy" />
              <span className="hidden sm:inline">{t.tutorial.openGuide}</span>
            </button>

            {/* Engine Mode Toggle */}
            <button
              type="button"
              onClick={onToggleGameMode}
              className={`text-xs font-serif font-bold px-2.5 py-1.5 rounded border transition-all flex items-center gap-1.5 shadow-xs min-h-[36px] ${
                gameMode === 'automated'
                  ? 'bg-manuscript-forest text-parchment-50 border-emerald-900'
                  : 'bg-manuscript-burgundy text-parchment-50 border-red-950'
              }`}
              title="Toggle between Automated Game Arbiter and Human Moderator Mode"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Engine:</span>
              <span>{gameMode === 'automated' ? 'Automated' : 'Host Mode'}</span>
            </button>

            {/* Authenticated Player Status or Login Button */}
            {user && profile ? (
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="flex items-center gap-2 bg-parchment-200 hover:bg-parchment-300/80 px-2.5 py-1 rounded border border-parchment-400 transition-all shadow-xs min-h-[36px]"
                aria-label="View your hunter dossier"
                title="View your hunter dossier"
              >
                <PlayerAvatar
                  username={profile.username}
                  size="sm"
                  level={profile.level}
                />
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-serif font-bold text-ink leading-tight">
                    {profile.username}
                  </div>
                  <div className="text-[10px] font-serif text-manuscript-gold font-bold flex items-center gap-0.5">
                    <Coins className="w-3 h-3" />
                    <span>{profile.coins}</span>
                  </div>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="btn-wax text-xs px-3 py-1.5 rounded flex items-center gap-1.5 shadow-sm min-h-[36px]"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Enter Citadel</span>
              </button>
            )}
          </div>
        </div>

        {/* Desktop Book Navigation Ribbons */}
        <nav aria-label="Primary navigation" className="hidden md:flex max-w-6xl mx-auto px-4 space-x-1 overflow-x-auto scrollbar-none pt-1">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
                className={`px-3.5 py-2 font-serif text-xs tracking-wider uppercase font-semibold rounded-t border-t-2 border-l border-r transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-parchment-200 border-manuscript-burgundy text-manuscript-burgundy font-bold shadow-sm -mb-px z-10'
                    : 'bg-parchment-300/40 border-transparent text-ink-light hover:bg-parchment-200/80 hover:text-ink'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.id === 'rewards' && hasDailyReward && (
                  <span
                    className="w-2 h-2 rounded-full bg-manuscript-gold ring-2 ring-amber-200 animate-pulse motion-reduce:animate-none"
                    aria-label="Daily reward available"
                    title="Daily Reward Available"
                  />
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Mobile Bottom Navigation Bar (Thumb Friendly) */}
      <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 left-0 right-0 bg-parchment-100 border-t-2 border-manuscript-charcoal z-40 shadow-lg px-1 py-1 flex justify-around items-center">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded transition-colors min-w-[44px] min-h-[44px] ${
                isActive ? 'text-manuscript-burgundy font-bold' : 'text-ink-light hover:text-ink'
              }`}
            >
              <span className={`relative p-1 rounded ${isActive ? 'bg-manuscript-burgundy/10' : ''}`}>
                {item.icon}
                {item.id === 'rewards' && hasDailyReward && (
                  <span
                    className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-manuscript-gold"
                    aria-label="Daily reward available"
                    title="Daily Reward Available"
                  />
                )}
              </span>
              <span className="text-[10px] font-serif tracking-tighter uppercase mt-0.5">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
