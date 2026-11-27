import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { RoomProvider } from './context/RoomContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { AuthModal } from './components/auth/AuthModal';
import { TutorialModal } from './components/onboarding/TutorialModal';
import { ManuscriptErrorBoundary } from './components/ui/ManuscriptErrorBoundary';
import { AppShell } from './components/layout/AppShell';
import { PageId } from './components/layout/Navbar';
import { GameMode } from './types/game';

// The 7 Initial Pages
import { HomePage } from './pages/HomePage';
import { PlayPage } from './pages/PlayPage';
import { ProfilePage } from './pages/ProfilePage';
import { StatisticsPage } from './pages/StatisticsPage';
import { ShopPage } from './pages/ShopPage';
import { DailyRewardsPage } from './pages/DailyRewardsPage';
import { SettingsPage } from './pages/SettingsPage';

export const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageId>('home');
  const [gameMode, setGameMode] = useState<GameMode>('automated');
  const { showToast } = useToast();
  const { preferences, playSound } = useSettings();

  // Handle chamber invite links (?join=ROOMCODE)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('join') || params.get('room');
    if (inviteCode && preferences.notificationsEnabled && preferences.notifyLobbyUpdates) {
      playSound('alert');
      showToast(
        `Chamber invitation detected for seal code "${inviteCode.toUpperCase()}". Enter the Secret Chamber to join!`,
        'info',
        'Match Invitation'
      );
      setCurrentPage('play');
    }
  }, []);

  const handleToggleGameMode = () => {
    setGameMode((prev) => (prev === 'automated' ? 'human_host' : 'automated'));
  };

  return (
    <AppShell
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      gameMode={gameMode}
      onToggleGameMode={handleToggleGameMode}
    >
      {currentPage === 'home' && <HomePage onNavigate={setCurrentPage} />}
      {currentPage === 'play' && (
        <PlayPage gameMode={gameMode} onToggleGameMode={handleToggleGameMode} />
      )}
      {currentPage === 'profile' && <ProfilePage />}
      {currentPage === 'stats' && <StatisticsPage />}
      {currentPage === 'shop' && <ShopPage />}
      {currentPage === 'rewards' && <DailyRewardsPage />}
      {currentPage === 'settings' && (
        <SettingsPage gameMode={gameMode} onToggleGameMode={handleToggleGameMode} />
      )}
      <AuthModal />
      <TutorialModal />
    </AppShell>
  );
};

export const App: React.FC = () => {
  return (
    <ManuscriptErrorBoundary>
      <ToastProvider>
        <SettingsProvider>
          <AuthProvider>
            <RoomProvider>
              <AppContent />
            </RoomProvider>
          </AuthProvider>
        </SettingsProvider>
      </ToastProvider>
    </ManuscriptErrorBoundary>
  );
};

export default App;
