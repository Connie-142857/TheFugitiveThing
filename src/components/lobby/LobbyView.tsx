import React, { useState, useEffect, useRef } from 'react';
import { useRoom } from '../../context/RoomContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import { ParchmentPanel } from '../ui/ParchmentPanel';
import { Button } from '../ui/Button';
import { PlayerAvatar } from '../ui/PlayerAvatar';
import { TeamBadge } from '../ui/Badges';
import { ManuscriptDivider } from '../ui/Divider';
import { ManuscriptModal } from '../ui/Modal';
import { ManuscriptSelect, ManuscriptInput } from '../ui/Input';
import { PLAYER_COUNT_TABLE } from '../../types/rules';
import { summonTestComrades } from '../../services/lobbyService';
import {
  Copy,
  Check,
  Shield,
  Clock,
  LogOut,
  Settings,
  Play,
  Share2,
  Users,
} from 'lucide-react';

export const LobbyView: React.FC = () => {
  const {
    currentRoom,
    leaveChamber,
    toggleReady,
    updateSettings,
    startMatch,
    isHost,
    currentPlayer,
  } = useRoom();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { preferences, playSound } = useSettings();

  const [copied, setCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isSummoning, setIsSummoning] = useState(false);

  const prevPlayersRef = useRef<Record<string, string> | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentRoom) return;
    const playersMap = currentRoom.players || {};
    const currentNames: Record<string, string> = {};
    for (const [uid, p] of Object.entries(playersMap)) {
      currentNames[uid] = p.username;
    }

    if (prevPlayersRef.current !== null && preferences.notificationsEnabled && preferences.notifyLobbyUpdates) {
      for (const [uid, name] of Object.entries(currentNames)) {
        if (!prevPlayersRef.current[uid] && uid !== user?.uid) {
          playSound('click');
          showToast(`${name} has joined the Secret Chamber.`, 'info', 'Lobby Update');
        }
      }
      for (const [uid, name] of Object.entries(prevPlayersRef.current)) {
        if (!currentNames[uid] && uid !== user?.uid) {
          showToast(`${name} departed from the chamber.`, 'warning', 'Lobby Update');
        }
      }
    }
    prevPlayersRef.current = currentNames;

    if (
      prevStatusRef.current === 'lobby' &&
      currentRoom.status !== 'lobby' &&
      preferences.notificationsEnabled &&
      preferences.notifyPhaseTransitions
    ) {
      playSound('matchStart');
      showToast('The match has begun! Inspect your Secret Role Briefing.', 'success', 'Match Starting');
    }
    prevStatusRef.current = currentRoom.status;
  }, [currentRoom?.players, currentRoom?.status, user?.uid, preferences.notificationsEnabled, preferences.notifyLobbyUpdates, preferences.notifyPhaseTransitions]);

  // Settings form states
  const [targetCount, setTargetCount] = useState(
    currentRoom ? String(currentRoom.settings.targetPlayerCount) : '16'
  );
  const [gameMode, setGameMode] = useState(
    currentRoom ? currentRoom.settings.gameMode : 'automated'
  );
  const [isRealTime, setIsRealTime] = useState(
    currentRoom ? currentRoom.settings.isRealTime : false
  );
  const [daySecs, setDaySecs] = useState(
    currentRoom ? String(currentRoom.settings.dayDurationSeconds) : '600'
  );
  const [nightSecs, setNightSecs] = useState(
    currentRoom ? String(currentRoom.settings.nightDurationSeconds) : '300'
  );

  if (!currentRoom) return null;

  const roomPlayers = currentRoom.players || {};
  const roomSettings = currentRoom.settings || {
    targetPlayerCount: 16,
    gameMode: 'automated',
    isRealTime: false,
    dayDurationSeconds: 600,
    nightDurationSeconds: 300,
    activeTeams: ['investigators', 'annihilators', 'communists', 'soldiers'],
    soloRoleCount: 0,
    totalHouses: 35,
    housesDestroyedPerRound: 2,
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentRoom.roomCode);
      setCopied(true);
      showToast(`Seal code ${currentRoom.roomCode} copied to clipboard.`, 'info', 'Seal Inscribed');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast(`Chamber Seal: ${currentRoom.roomCode}`, 'info', 'Share Code');
    }
  };

  const handleShareLink = async () => {
    const url = `${window.location.origin}?chamber=${currentRoom.roomCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'The Fugitive - Secret Chamber',
          text: `Join our secret chamber in The Fugitive with code ${currentRoom.roomCode}`,
          url,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(url);
    showToast('Chamber invite link copied to clipboard.', 'success', 'Link Forged');
  };

  const handleSaveSettings = async () => {
    const parsedTarget = parseInt(targetCount, 10);
    const parsedDay = parseInt(daySecs, 10);
    const parsedNight = parseInt(nightSecs, 10);

    await updateSettings({
      targetPlayerCount: parsedTarget,
      gameMode,
      isRealTime,
      dayDurationSeconds: parsedDay,
      nightDurationSeconds: parsedNight,
    });
    setIsSettingsOpen(false);
  };

  const handleStartGameAttempt = async () => {
    const activeCount = Object.values(roomPlayers).filter((p) => p && p.status !== 'left').length;
    if (activeCount < (currentRoom.minRequiredPlayers || 7)) {
      showToast(
        `By decree of the rulebook, a minimum of 7 players (6 regular hunters + 1 Fugitive) is required. Currently: ${activeCount} hunters.`,
        'warning',
        'Requirements Not Met'
      );
      return;
    }

    try {
      await startMatch();
    } catch {
      // Toast handled in context
    }
  };

  const handleSummonTestComrades = async () => {
    const currentCount = Object.values(roomPlayers).filter((p) => p && p.status !== 'left').length;
    const needed = Math.max(1, (currentRoom.minRequiredPlayers || 7) - currentCount);
    setIsSummoning(true);
    try {
      await summonTestComrades(currentRoom.id, needed);
      showToast(`Summoned ${needed} test comrade(s) into the chamber. Quota fulfilled!`, 'success', 'Comrades Assembled');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not summon test comrades.';
      showToast(msg, 'danger', 'Summoning Failed');
    } finally {
      setIsSummoning(false);
    }
  };

  const activePlayers = Object.values(roomPlayers).filter((p) => p && p.status !== 'left');
  const isSelfReady = currentPlayer?.status === 'ready';
  const readyCount = activePlayers.filter((p) => p.status === 'ready').length;
  const maxCapacity = (roomSettings.targetPlayerCount || 16) + 1;

  return (
    <div className="space-y-6">
      {/* Chamber Header & Seal Banner */}
      <ParchmentPanel variant="framed">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="text-xs font-serif uppercase tracking-widest text-manuscript-burgundy font-bold">
                Private Multiplayer Chamber
              </span>
              <span
                className={`text-[10px] font-serif uppercase font-bold px-2 py-0.5 rounded border ${
                  currentRoom.settings.gameMode === 'automated'
                    ? 'bg-emerald-950/20 text-emerald-950 border-emerald-800/40'
                    : 'bg-red-950/20 text-red-950 border-red-800/40'
                }`}
              >
                {currentRoom.settings.gameMode === 'automated'
                  ? 'Automated Arbiter'
                  : 'Host Moderator Presiding'}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-serif font-black text-ink">
              {currentRoom.roomName}
            </h2>

            <p className="text-xs font-body text-ink-light">
              Assembled Hunters: <strong className="text-ink">{activePlayers.length}</strong> / {maxCapacity} capacity • {readyCount} Ready
            </p>
          </div>

          {/* Chamber Seal Code Stamped Box */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="bg-parchment-200 border-2 border-dashed border-manuscript-gold px-4 py-2 rounded text-center shadow-xs">
              <span className="text-[10px] font-serif uppercase tracking-widest text-ink-light block">
                Chamber Seal
              </span>
              <span className="text-xl font-mono font-bold text-manuscript-burgundy tracking-wider block">
                {currentRoom.roomCode}
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="parchment"
                size="sm"
                icon={copied ? <Check className="w-4 h-4 text-emerald-800" /> : <Copy className="w-4 h-4" />}
                onClick={handleCopyCode}
                title="Copy chamber seal"
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>

              <Button
                variant="parchment"
                size="sm"
                icon={<Share2 className="w-4 h-4" />}
                onClick={handleShareLink}
                title="Share chamber invite link"
              >
                Share
              </Button>

              {isHost && (
                <Button
                  variant="ink"
                  size="sm"
                  icon={<Settings className="w-4 h-4" />}
                  onClick={() => setIsSettingsOpen(true)}
                  title="Configure chamber decrees"
                >
                  Settings
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                icon={<LogOut className="w-4 h-4" />}
                onClick={() => setIsLeaveModalOpen(true)}
                title="Depart chamber"
              >
                Leave
              </Button>
            </div>
          </div>
        </div>
      </ParchmentPanel>

      {/* Match Configuration Forecast */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <ParchmentPanel variant="sheet" className="p-3">
          <span className="text-[11px] font-serif text-ink-light block">Active Factions</span>
          <span className="text-lg font-serif font-bold text-manuscript-forest mt-0.5 block">
            {currentRoom.settings.activeTeams.length} Factions
          </span>
          <div className="flex justify-center gap-1 mt-1 flex-wrap">
            {currentRoom.settings.activeTeams.map((t) => (
              <TeamBadge key={t} team={t} size="sm" />
            ))}
          </div>
        </ParchmentPanel>

        <ParchmentPanel variant="sheet" className="p-3">
          <span className="text-[11px] font-serif text-ink-light block">Target Hunter Ratio</span>
          <span className="text-lg font-serif font-bold text-ink mt-0.5 block">
            {currentRoom.settings.targetPlayerCount} Regular + 1 Fugitive
          </span>
          <span className="text-[10px] font-body text-ink-light block mt-1">
            Solo Infiltrators: {currentRoom.settings.soloRoleCount}
          </span>
        </ParchmentPanel>

        <ParchmentPanel variant="sheet" className="p-3">
          <span className="text-[11px] font-serif text-ink-light block">Village Houses</span>
          <span className="text-lg font-serif font-bold text-amber-900 mt-0.5 block">
            {currentRoom.settings.totalHouses} Dwellings
          </span>
          <span className="text-[10px] font-body text-ink-light block mt-1">
            Demolished / Night: {currentRoom.settings.housesDestroyedPerRound}
          </span>
        </ParchmentPanel>

        <ParchmentPanel variant="sheet" className="p-3">
          <span className="text-[11px] font-serif text-ink-light block">Temporal Cycle</span>
          <span className="text-lg font-serif font-bold text-manuscript-burgundy mt-0.5 block">
            {currentRoom.settings.isRealTime ? 'Real-Time' : 'Accelerated'}
          </span>
          <span className="text-[10px] font-body text-ink-light block mt-1">
            Day: {Math.floor(currentRoom.settings.dayDurationSeconds / 60)}m • Night: {Math.floor(currentRoom.settings.nightDurationSeconds / 60)}m
          </span>
        </ParchmentPanel>
      </div>

      <ManuscriptDivider label={`Assembled Hunters (${activePlayers.length} / ${maxCapacity})`} />

      {/* Players List Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {activePlayers.map((player) => {
          const isCurrentUser = user?.uid === player.uid;
          const isPlayerHost = player.isHost || player.uid === currentRoom.hostUid;

          return (
            <div
              key={player.uid}
              className={`p-4 rounded border flex items-center justify-between transition-all ${
                isCurrentUser
                  ? 'bg-amber-50/80 border-manuscript-gold shadow-sm ring-1 ring-manuscript-gold/40'
                  : 'bg-parchment-100 border-parchment-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <PlayerAvatar
                  username={player.username}
                  size="md"
                  level={player.level}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-serif font-bold text-sm text-ink truncate max-w-[130px]">
                      {player.username}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[9px] font-serif uppercase px-1 rounded bg-manuscript-charcoal text-parchment-100">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-serif text-ink-light flex items-center gap-1">
                    {isPlayerHost && (
                      <span className="text-manuscript-burgundy font-bold flex items-center gap-0.5">
                        <Shield className="w-3 h-3" /> Host
                      </span>
                    )}
                    <span>Rank {player.level}</span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {player.status === 'ready' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-serif font-bold uppercase px-2 py-0.5 rounded bg-emerald-950/20 text-emerald-900 border border-emerald-800/40">
                    <Check className="w-3.5 h-3.5 text-emerald-800" /> Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-serif font-bold uppercase px-2 py-0.5 rounded bg-amber-950/15 text-amber-900 border border-amber-800/30">
                    <Clock className="w-3.5 h-3.5" /> Waiting
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Controls & Readiness */}
      <ParchmentPanel variant="bound" className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="font-serif font-bold text-base text-ink">
            {isSelfReady ? 'Decree Sealed: You are Prepared' : 'Declare Readiness to Proceed'}
          </h4>
          <p className="text-xs font-body text-ink-light">
            {activePlayers.length < currentRoom.minRequiredPlayers
              ? `Awaiting ${currentRoom.minRequiredPlayers - activePlayers.length} more hunter(s) to reach minimum quota (7 players).`
              : 'All requirements satisfied. Awaiting the command to initiate the hunt.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={isSelfReady ? 'parchment' : 'wax'}
            size="lg"
            icon={<Check className="w-5 h-5" />}
            onClick={toggleReady}
          >
            {isSelfReady ? 'Stand Down' : 'Declare Readiness'}
          </Button>

          {activePlayers.length < (currentRoom.minRequiredPlayers || 7) && (
            <Button
              variant="outline"
              size="lg"
              icon={<Users className="w-5 h-5 text-manuscript-forest" />}
              onClick={handleSummonTestComrades}
              loading={isSummoning}
              title="Summon test comrades to fulfill the 7-player quota for instant testing"
            >
              Summon Test Comrades (+{Math.max(1, (currentRoom.minRequiredPlayers || 7) - activePlayers.length)})
            </Button>
          )}

          {isHost && (
            <Button
              variant="ink"
              size="lg"
              icon={<Play className="w-5 h-5" />}
              onClick={handleStartGameAttempt}
              disabled={activePlayers.length < (currentRoom.minRequiredPlayers || 7)}
            >
              Commence Hunt
            </Button>
          )}
        </div>
      </ParchmentPanel>

      {/* Chamber Settings Modal (Host / Config) */}
      <ManuscriptModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Chamber Decrees & Configuration"
        subtitle="Authoritative game parameters"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(false)}>
              Cancel
            </Button>
            <Button variant="wax" size="sm" onClick={handleSaveSettings}>
              Seal Decrees
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <ManuscriptSelect
            label="Game Arbitration Mode"
            value={gameMode}
            onChange={(e) => setGameMode(e.target.value as 'automated' | 'human_host')}
            options={[
              { label: 'Autonomous Automated Mode (Default)', value: 'automated' },
              { label: 'Human Host Moderation Mode', value: 'human_host' },
            ]}
          />

          <ManuscriptSelect
            label="Target Hunter Count (Excluding The Fugitive)"
            value={targetCount}
            onChange={(e) => setTargetCount(e.target.value)}
            options={PLAYER_COUNT_TABLE.map((cfg) => ({
              label: `${cfg.regularPlayers} Hunters (${cfg.activeTeams} Teams of ${cfg.playersPerTeam}, ${cfg.soloCount} Solos, ${cfg.totalHouses} Houses)`,
              value: String(cfg.regularPlayers),
            }))}
          />

          <ManuscriptSelect
            label="Day & Night Clock Progression"
            value={isRealTime ? 'realtime' : 'accelerated'}
            onChange={(e) => setIsRealTime(e.target.value === 'realtime')}
            options={[
              { label: 'Accelerated Matches (Minutes)', value: 'accelerated' },
              { label: 'Real-Time Clock (08:00 - 18:00 Day / 18:00 - 08:00 Night)', value: 'realtime' },
            ]}
          />

          {!isRealTime && (
            <div className="grid grid-cols-2 gap-3">
              <ManuscriptInput
                label="Day Duration (Seconds)"
                type="number"
                value={daySecs}
                onChange={(e) => setDaySecs(e.target.value)}
                min={60}
                max={3600}
              />
              <ManuscriptInput
                label="Night Duration (Seconds)"
                type="number"
                value={nightSecs}
                onChange={(e) => setNightSecs(e.target.value)}
                min={60}
                max={3600}
              />
            </div>
          )}
        </div>
      </ManuscriptModal>

      {/* Leave Chamber Confirmation Modal */}
      <ManuscriptModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title="Depart from Chamber"
        subtitle="Confirm your withdrawal"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsLeaveModalOpen(false)}>
              Remain in Chamber
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setIsLeaveModalOpen(false);
                leaveChamber();
              }}
            >
              Withdraw
            </Button>
          </>
        }
      >
        <p className="text-xs font-body text-ink leading-relaxed">
          Are you certain you wish to withdraw from <strong>{currentRoom.roomName}</strong>?
          {isHost && currentRoom.settings.gameMode === 'human_host' && (
            <span className="block mt-2 text-manuscript-burgundy font-semibold">
              As presiding Host, leadership will automatically transfer to the senior comrade.
            </span>
          )}
        </p>
      </ManuscriptModal>
    </div>
  );
};
