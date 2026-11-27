import React, { useState, useEffect, useCallback } from 'react';
import { ParchmentPanel } from '../components/ui/ParchmentPanel';
import { Button } from '../components/ui/Button';
import { ManuscriptInput, ManuscriptSelect } from '../components/ui/Input';
import { ManuscriptModal } from '../components/ui/Modal';
import { RoleBook } from '../components/RoleBook';
import { BookTabs } from '../components/ui/BookTabs';
import { LobbyView } from '../components/lobby/LobbyView';
import { ActiveGameView } from '../components/game/ActiveGameView';
import { ManuscriptErrorBoundary } from '../components/ui/ManuscriptErrorBoundary';
import { useRoom } from '../context/RoomContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { listOpenLobbies } from '../services/lobbyService';
import { RoomDocument, GameMode } from '../types/game';
import { PLAYER_COUNT_TABLE } from '../types/rules';
import {
  KeyRound,
  Plus,
  Users,
  Shield,
  Compass,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface PlayPageProps {
  gameMode: GameMode;
  onToggleGameMode: () => void;
}

export const PlayPage: React.FC<PlayPageProps> = ({ gameMode }) => {
  const { inLobby, currentRoom, createChamber, joinChamberByCode, joinChamberById, loading } = useRoom();
  const { user, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'lobby' | 'tome'>('lobby');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [chamberCode, setChamberCode] = useState('');

  // Create Room Form State
  const [chamberName, setChamberName] = useState('Chamber of Whispers');
  const [playerTarget, setPlayerTarget] = useState('16');
  const [timeMode, setTimeMode] = useState<'accelerated' | 'realtime'>('accelerated');
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>(gameMode);

  // Open chambers list state
  const [openChambers, setOpenChambers] = useState<RoomDocument[]>([]);
  const [isFetchingChambers, setIsFetchingChambers] = useState(false);

  const fetchChambers = useCallback(async () => {
    setIsFetchingChambers(true);
    try {
      const list = await listOpenLobbies();
      setOpenChambers(list);
    } finally {
      setIsFetchingChambers(false);
    }
  }, []);

  useEffect(() => {
    fetchChambers();
  }, [fetchChambers]);

  // If already in a room:
  if (inLobby && currentRoom) {
    if (currentRoom.status !== 'lobby') {
      return (
        <ManuscriptErrorBoundary fallbackMessage="The active match view encountered a disruption.">
          <ActiveGameView />
        </ManuscriptErrorBoundary>
      );
    }
    return (
      <ManuscriptErrorBoundary fallbackMessage="The chamber lobby view encountered a disruption.">
        <LobbyView />
      </ManuscriptErrorBoundary>
    );
  }

  const handleJoinChamber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chamberCode.trim()) {
      showToast('Please inscribe a valid chamber seal code.', 'warning', 'Invalid Seal');
      return;
    }
    if (!user) {
      openAuthModal('login');
      return;
    }

    try {
      await joinChamberByCode(chamberCode.trim());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not enter chamber.';
      showToast(msg, 'danger', 'Entry Denied');
    }
  };

  const handleCreateChamber = async () => {
    if (!user) {
      openAuthModal('login');
      return;
    }

    try {
      await createChamber({
        roomName: chamberName.trim(),
        gameMode: selectedGameMode,
        targetPlayerCount: parseInt(playerTarget, 10),
        isRealTime: timeMode === 'realtime',
      });
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not establish chamber.';
      showToast(msg, 'danger', 'Creation Failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <BookTabs
        activeTab={activeSubTab}
        onChange={(id) => setActiveSubTab(id as 'lobby' | 'tome')}
        tabs={[
          { id: 'lobby', label: 'Match Chambers', icon: <Users className="w-4 h-4" /> },
          { id: 'tome', label: 'Tome of Roles & Scaling', icon: <Compass className="w-4 h-4" /> },
        ]}
      />

      {activeSubTab === 'lobby' ? (
        <div className="space-y-6">
          {/* Header Action Section */}
          <ParchmentPanel variant="framed">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-serif uppercase tracking-widest text-manuscript-burgundy font-bold">
                  Secret Assembly
                </span>
                <h2 className="text-2xl font-serif font-black text-ink">Chamber Entry & Creation</h2>
                <p className="text-xs font-body text-ink-light mt-1">
                  Private multiplayer sessions among trusted comrades. Enter an existing seal or establish a new chamber.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="wax"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    if (!user) {
                      openAuthModal('login');
                      return;
                    }
                    setIsCreateModalOpen(true);
                  }}
                >
                  Create Chamber
                </Button>
              </div>
            </div>
          </ParchmentPanel>

          {/* Join Chamber Form & Active Rooms */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Join by Code */}
            <ParchmentPanel variant="sheet" className="space-y-4">
              <div className="border-b border-parchment-400 pb-2">
                <h3 className="font-serif font-bold text-base text-ink flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-manuscript-burgundy" />
                  Enter by Chamber Seal
                </h3>
                <p className="text-xs font-body text-ink-light">Inscribe the 6-character room code</p>
              </div>

              <form onSubmit={handleJoinChamber} className="space-y-3">
                <ManuscriptInput
                  placeholder="e.g. FUG-K89"
                  value={chamberCode}
                  onChange={(e) => setChamberCode(e.target.value.toUpperCase())}
                  maxLength={12}
                />
                <Button type="submit" variant="ink" className="w-full" loading={loading}>
                  Cross the Threshold
                </Button>
              </form>
            </ParchmentPanel>

            {/* Open Chambers Browser */}
            <ParchmentPanel variant="bound" className="md:col-span-2 space-y-4">
              <div className="border-b border-parchment-400 pb-2 flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-base text-ink flex items-center gap-2">
                    <Shield className="w-4 h-4 text-manuscript-forest" />
                    Assembled Chambers in the Realm
                  </h3>
                  <p className="text-xs font-body text-ink-light">
                    Public or unsealed gatherings awaiting hunters
                  </p>
                </div>

                <Button
                  variant="parchment"
                  size="sm"
                  icon={<RefreshCw className={`w-3.5 h-3.5 ${isFetchingChambers ? 'animate-spin' : ''}`} />}
                  onClick={fetchChambers}
                >
                  Refresh
                </Button>
              </div>

              {openChambers.length === 0 ? (
                <div className="p-6 text-center text-xs font-body text-ink-light italic">
                  No open chambers currently awaiting hunters. Establish your own secret chamber or inscribe a private seal.
                </div>
              ) : (
                <div className="space-y-2">
                  {openChambers.map((chamber) => (
                    <div
                      key={chamber.id}
                      className="p-3 bg-parchment-100 rounded border border-parchment-300 flex items-center justify-between hover:bg-parchment-200 transition-colors"
                    >
                      <div>
                        <div className="font-serif font-bold text-sm text-ink flex items-center gap-2">
                          <span>{chamber.roomName}</span>
                          <span className="text-[10px] font-mono text-manuscript-burgundy font-bold px-1.5 py-0.2 rounded bg-parchment-200 border border-parchment-400">
                            {chamber.roomCode}
                          </span>
                        </div>
                        <div className="text-[11px] font-body text-ink-light mt-0.5">
                          {chamber.playerCount} / {chamber.settings.targetPlayerCount + 1} Hunters •{' '}
                          {chamber.settings.gameMode === 'automated' ? 'Automated Mode' : 'Human Host Mode'} •{' '}
                          {chamber.settings.isRealTime ? 'Real-Time' : 'Accelerated'}
                        </div>
                      </div>

                      <Button
                        variant="parchment"
                        size="sm"
                        icon={<ArrowRight className="w-4 h-4" />}
                        onClick={async () => {
                          try {
                            await joinChamberById(chamber.id);
                          } catch (err: unknown) {
                            const msg = err instanceof Error ? err.message : 'Could not enter chamber.';
                            showToast(msg, 'danger', 'Entry Denied');
                          }
                        }}
                      >
                        Enter
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ParchmentPanel>
          </div>
        </div>
      ) : (
        <RoleBook />
      )}

      {/* Create Chamber Modal */}
      <ManuscriptModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Establish Secret Chamber"
        subtitle="Inscribe the parameters of your match"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="wax" size="sm" onClick={handleCreateChamber} loading={loading}>
              Seal Chamber
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <ManuscriptInput
            label="Chamber Designation"
            value={chamberName}
            onChange={(e) => setChamberName(e.target.value)}
          />

          <ManuscriptSelect
            label="Arbitration Mode"
            value={selectedGameMode}
            onChange={(e) => setSelectedGameMode(e.target.value as GameMode)}
            options={[
              { label: 'Autonomous Automated Mode (Default)', value: 'automated' },
              { label: 'Human Host Moderation Mode', value: 'human_host' },
            ]}
          />

          <ManuscriptSelect
            label="Target Hunter Count (Excluding The Fugitive)"
            value={playerTarget}
            onChange={(e) => setPlayerTarget(e.target.value)}
            options={PLAYER_COUNT_TABLE.map((cfg) => ({
              label: `${cfg.regularPlayers} Hunters (${cfg.activeTeams} Teams, ${cfg.soloCount} Solos, ${cfg.totalHouses} Houses)`,
              value: String(cfg.regularPlayers),
            }))}
          />

          <ManuscriptSelect
            label="Temporal Cycle Progression"
            value={timeMode}
            onChange={(e) => setTimeMode(e.target.value as 'accelerated' | 'realtime')}
            options={[
              { label: 'Accelerated Mode (10 min Day / 5 min Night)', value: 'accelerated' },
              { label: 'Real-Time Mode (Day: 08:00–18:00 / Night: 18:00–08:00)', value: 'realtime' },
            ]}
          />
        </div>
      </ManuscriptModal>
    </div>
  );
};
