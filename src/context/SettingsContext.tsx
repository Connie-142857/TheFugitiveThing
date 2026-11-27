import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  SupportedLanguage,
  TRANSLATIONS,
  TranslationDictionary,
} from '../i18n/translations';
import { audioService, SoundCueType } from '../services/audioService';

export type FontScale = 'standard' | 'large' | 'xlarge';

export interface UserPreferences {
  // Audio
  masterAudioEnabled: boolean;
  musicEnabled: boolean;
  musicVolume: number; // 0..100
  sfxEnabled: boolean;
  sfxVolume: number; // 0..100
  // Notifications
  notificationsEnabled: boolean;
  notifyLobbyUpdates: boolean;
  notifyPhaseTransitions: boolean;
  notifyGameEvents: boolean;
  notifyRewards: boolean;
  // Accessibility & UI
  reducedMotion: boolean;
  fontScale: FontScale;
  highContrast: boolean;
  compactMode: boolean;
  // Localization (default remains English)
  language: SupportedLanguage;
  // Onboarding
  hasCompletedTutorial: boolean;
}

const STORAGE_KEY = 'fugitive_preferences_v1';

export const DEFAULT_PREFERENCES: UserPreferences = {
  masterAudioEnabled: true,
  musicEnabled: false,
  musicVolume: 35,
  sfxEnabled: true,
  sfxVolume: 65,
  notificationsEnabled: true,
  notifyLobbyUpdates: true,
  notifyPhaseTransitions: true,
  notifyGameEvents: true,
  notifyRewards: true,
  reducedMotion: false,
  fontScale: 'standard',
  highContrast: false,
  compactMode: false,
  language: 'en',
  hasCompletedTutorial: false,
};

function loadPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const prefersReduced =
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
      return { ...DEFAULT_PREFERENCES, reducedMotion: prefersReduced };
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

interface SettingsContextValue {
  preferences: UserPreferences;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
  t: TranslationDictionary;
  playSound: (cue: SoundCueType) => void;
  isTutorialOpen: boolean;
  openTutorial: () => void;
  closeTutorial: (markCompleted?: boolean) => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  // Persist to localStorage & apply global accessibility attributes on <html>
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Ignore storage quota errors
    }

    const root = document.documentElement;
    root.setAttribute('data-reduced-motion', preferences.reducedMotion ? 'true' : 'false');
    root.setAttribute('data-font-scale', preferences.fontScale);
    root.setAttribute('data-high-contrast', preferences.highContrast ? 'true' : 'false');
    root.setAttribute('data-compact', preferences.compactMode ? 'true' : 'false');
    root.setAttribute('lang', preferences.language);
  }, [preferences]);

  // Sync ambient music
  useEffect(() => {
    if (preferences.masterAudioEnabled && preferences.musicEnabled) {
      audioService.setAmbientMusic(true, preferences.musicVolume / 100);
    } else {
      audioService.stopAmbientMusic();
    }
  }, [preferences.masterAudioEnabled, preferences.musicEnabled, preferences.musicVolume]);

  const updatePreferences = useCallback((patch: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  const playSound = useCallback(
    (cue: SoundCueType) => {
      if (!preferences.masterAudioEnabled || !preferences.sfxEnabled) return;
      audioService.playSfx(cue, preferences.sfxVolume / 100);
    },
    [preferences.masterAudioEnabled, preferences.sfxEnabled, preferences.sfxVolume]
  );

  const openTutorial = useCallback(() => {
    setIsTutorialOpen(true);
  }, []);

  const closeTutorial = useCallback((markCompleted: boolean = false) => {
    setIsTutorialOpen(false);
    if (markCompleted) {
      setPreferences((prev) => ({ ...prev, hasCompletedTutorial: true }));
    }
  }, []);

  const t = TRANSLATIONS[preferences.language] || TRANSLATIONS.en;

  return (
    <SettingsContext.Provider
      value={{
        preferences,
        updatePreferences,
        resetPreferences,
        t,
        playSound,
        isTutorialOpen,
        openTutorial,
        closeTutorial,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextValue => {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
};
