import React from 'react';
import { Navbar, PageId } from './Navbar';
import { usePWA } from '../../hooks/usePWA';
import { WifiOff, Download } from 'lucide-react';
import { GameMode } from '../../types/game';

interface AppShellProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  gameMode: GameMode;
  onToggleGameMode: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentPage,
  onNavigate,
  gameMode,
  onToggleGameMode,
  children,
}) => {
  const { isOnline, isInstallable, installApp } = usePWA();

  return (
    <div className="min-h-screen flex flex-col bg-parchment-200 text-ink pb-20 md:pb-0">
      {/* Skip to main content for keyboard & screen-reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-manuscript-burgundy focus:text-white focus:rounded focus:font-serif focus:text-xs"
      >
        Skip to main content
      </a>
      {/* Offline Proclamation Banner */}
      {!isOnline && (
        <div className="bg-red-950 text-red-100 px-4 py-2 text-xs font-serif text-center flex items-center justify-center gap-2 border-b border-red-800 shadow-md">
          <WifiOff className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>
            <strong>Connection severed:</strong> You are currently disconnected from the realm. Multiplayer chambers cannot proceed offline. Reconnecting automatically...
          </span>
        </div>
      )}

      {/* PWA Install Banner */}
      {isInstallable && (
        <div className="bg-manuscript-forest text-parchment-50 px-4 py-2 text-xs font-serif flex items-center justify-between border-b border-emerald-950 shadow-sm">
          <span>Install The Fugitive as a standalone manuscript application for optimal gameplay.</span>
          <button
            onClick={installApp}
            className="btn-parchment px-3 py-1 text-[11px] font-bold rounded flex items-center gap-1 shadow-sm text-ink"
          >
            <Download className="w-3.5 h-3.5" />
            Install App
          </button>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        currentPage={currentPage}
        onNavigate={onNavigate}
        gameMode={gameMode}
        onToggleGameMode={onToggleGameMode}
      />

      {/* Main Content Area */}
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 animate-fadeIn focus:outline-none">
        {children}
      </main>

      {/* Medieval Manuscript Footer */}
      <footer className="border-t border-parchment-400 bg-parchment-100 py-3 text-center text-xs text-ink-light font-body mt-auto hidden md:block">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>The Fugitive • Strategic Social Deduction Game</span>
          <span className="font-serif text-[11px] text-manuscript-burgundy font-semibold">
            Medieval Manuscript Design System • Authoritative Backend
          </span>
        </div>
      </footer>
    </div>
  );
};
