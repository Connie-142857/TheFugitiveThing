import React from 'react';
import { ParchmentPanel } from '../components/ui/ParchmentPanel';
import { Button } from '../components/ui/Button';
import { ManuscriptSelect } from '../components/ui/Input';
import { usePWA } from '../hooks/usePWA';
import { useToast } from '../context/ToastContext';
import { useSettings, FontScale } from '../context/SettingsContext';
import { LANGUAGE_LABELS, SupportedLanguage } from '../i18n/translations';
import {
  Settings,
  Download,
  Volume2,
  Smartphone,
  CheckCircle,
  Bell,
  Eye,
  Globe,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import { GameMode } from '../types/game';

interface SettingsPageProps {
  gameMode: GameMode;
  onToggleGameMode: () => void;
}

interface ToggleRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) => (
  <div className="flex items-center justify-between gap-3 p-3 rounded bg-parchment-100 border border-parchment-300">
    <div>
      <label htmlFor={id} className="font-serif font-bold text-ink text-xs sm:text-sm block cursor-pointer">
        {label}
      </label>
      <span className="text-xs font-body text-ink-light">{description}</span>
    </div>
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`px-3 py-1.5 rounded font-serif text-xs font-bold min-w-[82px] min-h-[36px] transition-colors disabled:opacity-40 ${
        checked ? 'bg-manuscript-forest text-white' : 'bg-parchment-300 text-ink-light'
      }`}
    >
      {checked ? 'Enabled' : 'Disabled'}
    </button>
  </div>
);

export const SettingsPage: React.FC<SettingsPageProps> = ({ gameMode, onToggleGameMode }) => {
  const { isInstallable, isInstalled, installApp } = usePWA();
  const { showToast } = useToast();
  const { preferences, updatePreferences, resetPreferences, t, playSound, openTutorial } = useSettings();

  const handleInstallClick = async () => {
    const success = await installApp();
    if (success) {
      playSound('reward');
      showToast('The Fugitive has been installed to your device.', 'success', 'Installation Complete');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center border-b border-parchment-400 pb-3">
        <h2 className="text-2xl font-serif text-ink tracking-wide flex items-center justify-center gap-2">
          <Settings className="w-6 h-6 text-manuscript-burgundy" />
          {t.settings.title}
        </h2>
        <p className="text-xs font-body italic text-ink-light">{t.settings.subtitle}</p>
      </div>

      {/* Onboarding / Tutorial Replay */}
      <ParchmentPanel variant="bound" className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="font-serif font-bold text-base text-ink flex items-center justify-center sm:justify-start gap-2">
            <BookOpen className="w-5 h-5 text-manuscript-burgundy" />
            {t.tutorial.title}
          </h3>
          <p className="text-xs font-body text-ink-light">
            Replay the interactive beginner guide covering factions, day/night cycles, crimes, houses, Spawnpoints, and chat rules.
          </p>
        </div>
        <Button
          variant="wax"
          size="sm"
          icon={<BookOpen className="w-4 h-4" />}
          onClick={() => {
            playSound('click');
            openTutorial();
          }}
        >
          {t.home.startTutorial}
        </Button>
      </ParchmentPanel>

      {/* Audio, Music & Sound Effects */}
      <ParchmentPanel variant="sheet" className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-serif font-bold text-base text-ink flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-manuscript-gold" />
            {t.settings.audioSection}
          </h3>
          <Button
            variant="parchment"
            size="sm"
            onClick={() => playSound('phase')}
            disabled={!preferences.masterAudioEnabled || !preferences.sfxEnabled}
          >
            {t.settings.testSfx}
          </Button>
        </div>

        <div className="space-y-3">
          <ToggleRow
            id="pref-master-audio"
            label={t.settings.masterAudio}
            description="Master toggle for all chamber music and acoustic cues"
            checked={preferences.masterAudioEnabled}
            onChange={(v) => updatePreferences({ masterAudioEnabled: v })}
          />

          <ToggleRow
            id="pref-music"
            label={t.settings.musicToggle}
            description="Subtle ambient chamber drone during gameplay"
            checked={preferences.musicEnabled}
            disabled={!preferences.masterAudioEnabled}
            onChange={(v) => updatePreferences({ musicEnabled: v })}
          />

          {preferences.masterAudioEnabled && preferences.musicEnabled && (
            <div className="p-3 rounded bg-parchment-100 border border-parchment-300 flex items-center gap-4">
              <label htmlFor="music-vol" className="text-xs font-serif font-bold text-ink min-w-[110px]">
                Music Volume: {preferences.musicVolume}%
              </label>
              <input
                id="music-vol"
                type="range"
                min={0}
                max={100}
                value={preferences.musicVolume}
                onChange={(e) => updatePreferences({ musicVolume: Number(e.target.value) })}
                className="flex-1 accent-manuscript-burgundy"
              />
            </div>
          )}

          <ToggleRow
            id="pref-sfx"
            label={t.settings.sfxToggle}
            description="Chimes for phase transitions, rewards, level-ups, and alerts"
            checked={preferences.sfxEnabled}
            disabled={!preferences.masterAudioEnabled}
            onChange={(v) => updatePreferences({ sfxEnabled: v })}
          />

          {preferences.masterAudioEnabled && preferences.sfxEnabled && (
            <div className="p-3 rounded bg-parchment-100 border border-parchment-300 flex items-center gap-4">
              <label htmlFor="sfx-vol" className="text-xs font-serif font-bold text-ink min-w-[110px]">
                SFX Volume: {preferences.sfxVolume}%
              </label>
              <input
                id="sfx-vol"
                type="range"
                min={0}
                max={100}
                value={preferences.sfxVolume}
                onChange={(e) => updatePreferences({ sfxVolume: Number(e.target.value) })}
                className="flex-1 accent-manuscript-burgundy"
              />
            </div>
          )}
        </div>
      </ParchmentPanel>

      {/* Notifications */}
      <ParchmentPanel variant="bound" className="space-y-4">
        <h3 className="font-serif font-bold text-base text-ink flex items-center gap-2">
          <Bell className="w-5 h-5 text-manuscript-burgundy" />
          {t.settings.notificationsSection}
        </h3>

        <div className="space-y-3">
          <ToggleRow
            id="pref-notif-master"
            label={t.settings.notifMaster}
            description="Controls all live proclamation toasts across lobbies and matches"
            checked={preferences.notificationsEnabled}
            onChange={(v) => updatePreferences({ notificationsEnabled: v })}
          />
          <ToggleRow
            id="pref-notif-lobby"
            label={t.settings.notifLobby}
            description="Alerts when players join, leave, or receive chamber invites"
            checked={preferences.notifyLobbyUpdates}
            disabled={!preferences.notificationsEnabled}
            onChange={(v) => updatePreferences({ notifyLobbyUpdates: v })}
          />
          <ToggleRow
            id="pref-notif-phase"
            label={t.settings.notifPhases}
            description="Alerts when a match begins or transitions between Day and Night"
            checked={preferences.notifyPhaseTransitions}
            disabled={!preferences.notificationsEnabled}
            onChange={(v) => updatePreferences({ notifyPhaseTransitions: v })}
          />
          <ToggleRow
            id="pref-notif-events"
            label={t.settings.notifEvents}
            description="Alerts for game events you are permitted to see based on your role"
            checked={preferences.notifyGameEvents}
            disabled={!preferences.notificationsEnabled}
            onChange={(v) => updatePreferences({ notifyGameEvents: v })}
          />
          <ToggleRow
            id="pref-notif-rewards"
            label={t.settings.notifRewards}
            description="Alerts for XP, Silver Coins, Level-ups, and Achievement unlocks"
            checked={preferences.notifyRewards}
            disabled={!preferences.notificationsEnabled}
            onChange={(v) => updatePreferences({ notifyRewards: v })}
          />
        </div>
      </ParchmentPanel>

      {/* Accessibility & UI Preferences */}
      <ParchmentPanel variant="sheet" className="space-y-4">
        <h3 className="font-serif font-bold text-base text-ink flex items-center gap-2">
          <Eye className="w-5 h-5 text-manuscript-forest" />
          {t.settings.accessibilitySection}
        </h3>

        <div className="space-y-3">
          <ToggleRow
            id="pref-reduced-motion"
            label={t.settings.reducedMotion}
            description="Disables pulse, spin, fade, and transition animations across the app"
            checked={preferences.reducedMotion}
            onChange={(v) => updatePreferences({ reducedMotion: v })}
          />

          <ToggleRow
            id="pref-high-contrast"
            label={t.settings.highContrast}
            description="Enhances keyboard focus rings and panel border contrast"
            checked={preferences.highContrast}
            onChange={(v) => updatePreferences({ highContrast: v })}
          />

          <ToggleRow
            id="pref-compact-mode"
            label={t.settings.compactMode}
            description="Reduces vertical spacing for dense tactical viewing"
            checked={preferences.compactMode}
            onChange={(v) => updatePreferences({ compactMode: v })}
          />

          <div className="p-3 rounded bg-parchment-100 border border-parchment-300 space-y-1.5">
            <label htmlFor="pref-font-scale" className="font-serif font-bold text-xs sm:text-sm text-ink block">
              {t.settings.fontSize}
            </label>
            <ManuscriptSelect
              id="pref-font-scale"
              value={preferences.fontScale}
              onChange={(e) => updatePreferences({ fontScale: e.target.value as FontScale })}
              options={[
                { label: 'Standard (16px)', value: 'standard' },
                { label: 'Large (18px)', value: 'large' },
                { label: 'Extra Large (20px)', value: 'xlarge' },
              ]}
            />
          </div>
        </div>
      </ParchmentPanel>

      {/* Language & Localization */}
      <ParchmentPanel variant="bound" className="space-y-4">
        <h3 className="font-serif font-bold text-base text-ink flex items-center gap-2">
          <Globe className="w-5 h-5 text-manuscript-burgundy" />
          {t.settings.languageSection}
        </h3>
        <div className="p-3 rounded bg-parchment-100 border border-parchment-300 space-y-1.5">
          <label htmlFor="pref-language" className="font-serif font-bold text-xs sm:text-sm text-ink block">
            {t.settings.languageLabel}
          </label>
          <ManuscriptSelect
            id="pref-language"
            value={preferences.language}
            onChange={(e) => updatePreferences({ language: e.target.value as SupportedLanguage })}
            options={(Object.keys(LANGUAGE_LABELS) as SupportedLanguage[]).map((code) => ({
              label: LANGUAGE_LABELS[code],
              value: code,
            }))}
          />
        </div>
      </ParchmentPanel>

      {/* Engine & PWA Section */}
      <ParchmentPanel variant="framed" className="space-y-4">
        <h3 className="font-serif font-bold text-base text-ink flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-manuscript-forest" />
          Authority Mode & Device Installation
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-body">
          <div className="p-3 bg-parchment-200 rounded border border-parchment-300 space-y-2">
            <span className="font-serif font-bold text-ink block">Arbitration Mode</span>
            <p className="text-ink-light">
              Toggle between the autonomous game manager (Automated Mode) or human host moderation.
            </p>
            <Button variant="wax" size="sm" onClick={onToggleGameMode}>
              Current: {gameMode === 'automated' ? 'Automated Mode' : 'Human Host Mode'}
            </Button>
          </div>

          <div className="p-3 bg-parchment-200 rounded border border-parchment-300 flex flex-col justify-between gap-2">
            <div>
              <span className="font-serif font-bold text-ink block">PWA Standalone App</span>
              <div className="flex items-center gap-2 pt-1 font-serif text-[11px]">
                {isInstalled ? (
                  <span className="text-emerald-800 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Installed as Standalone App
                  </span>
                ) : isInstallable ? (
                  <span className="text-manuscript-gold font-bold">Ready for Home Screen Installation</span>
                ) : (
                  <span className="text-ink-light">Running in Browser Environment</span>
                )}
              </div>
            </div>
            {isInstallable && (
              <Button variant="gold" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleInstallClick}>
                Install App
              </Button>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-parchment-300 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={() => {
              resetPreferences();
              showToast('All preferences restored to defaults.', 'info', 'Defaults Restored');
            }}
          >
            {t.settings.resetDefaults}
          </Button>
        </div>
      </ParchmentPanel>
    </div>
  );
};
