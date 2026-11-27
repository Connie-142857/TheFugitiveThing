import React, { useState, useEffect, useRef } from 'react';
import { useRoom } from '../../context/RoomContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import { filterEventsForPlayer } from '../../services/gameEventManager';
import { SecretRoleBriefing } from './SecretRoleBriefing';
import { subscribeToPlayerSecretBriefing } from '../../services/matchInitService';
import {
  executeFugitiveActionInFirestore,
  advanceMatchPhaseInFirestore,
  submitRoomAction,
  executeInstantRoleActionInFirestore,
  INSTANT_ABILITY_IDS,
} from '../../services/matchActionService';
import {
  initiateDetectiveInterrogationInFirestore,
  submitInterrogationAnswersInFirestore,
} from '../../services/interrogationService';
import {
  claimMatchProgressionInFirestore,
  MatchProgressionOutcome,
} from '../../services/progressionService';
import { SecretRoleBriefingData, InterrogationAnswer } from '../../types/game';
import { ROLES } from '../../types/rules';
import { ParchmentPanel } from '../ui/ParchmentPanel';
import { Button } from '../ui/Button';
import { ManuscriptLoading } from '../ui/Loading';
import {
  Sun,
  Moon,
  MapPin,
  Users,
  LogOut,
  Skull,
  MessageSquare,
  Compass,
  Award,
  Scroll,
} from 'lucide-react';
import { ChamberChat } from '../chat/ChamberChat.tsx';
import { KnownIntelligenceDossier } from './KnownIntelligenceDossier.tsx';

export const ActiveGameView: React.FC = () => {
  const { currentRoom, leaveChamber } = useRoom();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { preferences, playSound } = useSettings();

  const [secretBriefing, setSecretBriefing] = useState<SecretRoleBriefingData | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(true);
  const [timeLeftSecs, setTimeLeftSecs] = useState<number>(0);

  // Fugitive Action form state
  const [targetHouseInput, setTargetHouseInput] = useState<string>('');
  const [selectedTargetUid, setSelectedTargetUid] = useState<string>('');
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [isAdvancingPhase, setIsAdvancingPhase] = useState(false);
  const [activeSubView, setActiveSubView] = useState<'tactical' | 'intel' | 'chat'>('tactical');

  // Role Ability form state
  const [selectedAbilityId, setSelectedAbilityId] = useState<string>('');
  const [abilityTargetPlayerUid, setAbilityTargetPlayerUid] = useState<string>('');
  const [abilityTargetHouse, setAbilityTargetHouse] = useState<string>('');
  const [abilityIngredient1, setAbilityIngredient1] = useState<'lotus' | 'dandelion' | 'poison' | 'mind_dust'>('dandelion');
  const [abilityIngredient2, setAbilityIngredient2] = useState<'lotus' | 'dandelion' | 'poison' | 'mind_dust'>('lotus');
  const [abilityContraptionType, setAbilityContraptionType] = useState<'defibrillator' | 'turret' | 'disruptor'>('turret');
  const [abilityContraptionCode, setAbilityContraptionCode] = useState<number>(1);
  const [abilityGuessRoleId, setAbilityGuessRoleId] = useState<string>('detective');
  const [abilityTargetPlayerUid2, setAbilityTargetPlayerUid2] = useState<string>('');
  const [abilityGuessRoleId2, setAbilityGuessRoleId2] = useState<string>('detective');
  const [abilityTargetPlayerUid3, setAbilityTargetPlayerUid3] = useState<string>('');
  const [abilityGuessRoleId3, setAbilityGuessRoleId3] = useState<string>('detective');
  const [isSubmittingAbility, setIsSubmittingAbility] = useState(false);

  // Active Interrogation answering state
  const [interrogationAnswers, setInterrogationAnswers] = useState<Record<number, InterrogationAnswer>>({});
  const [isSubmittingInterrogation, setIsSubmittingInterrogation] = useState(false);

  // Phase 8: Post-Match Progression Outcome
  const [progressionOutcome, setProgressionOutcome] = useState<MatchProgressionOutcome | null>(null);
  const claimedMatchRef = React.useRef<string | null>(null);

  // Phase 11: Phase Transition & Privacy-Filtered Event Notifications
  const prevPhaseRef = useRef<string | null>(null);
  const seenEventIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!currentRoom) return;
    const phaseKey = `${currentRoom.round || 1}_${currentRoom.phase || 'day'}`;
    if (prevPhaseRef.current !== null && prevPhaseRef.current !== phaseKey) {
      if (preferences.notificationsEnabled && preferences.notifyPhaseTransitions) {
        playSound('phase');
        const isDayPhase = (currentRoom.phase || 'day') === 'day';
        showToast(
          isDayPhase
            ? `Dawn of Round ${currentRoom.round || 1}. Town Forum is now open.`
            : `Twilight of Round ${currentRoom.round || 1}. Curfew is active; nocturnal abilities await.`,
          'info',
          isDayPhase ? 'Day Phase Begins' : 'Night Phase Begins'
        );
      }
    }
    prevPhaseRef.current = phaseKey;
  }, [currentRoom?.round, currentRoom?.phase, preferences.notificationsEnabled, preferences.notifyPhaseTransitions]);

  useEffect(() => {
    if (!currentRoom || !user) return;
    const events = ((currentRoom as any).events as any[]) || [];
    const isHumanMod =
      currentRoom.settings?.gameMode === 'human_host' && currentRoom.hostUid === user.uid;
    const visibleEvents = filterEventsForPlayer(events, user.uid, secretBriefing?.team, isHumanMod);

    if (seenEventIdsRef.current === null) {
      seenEventIdsRef.current = new Set(visibleEvents.map((e) => e.id));
      return;
    }

    if (preferences.notificationsEnabled && preferences.notifyGameEvents) {
      for (const evt of visibleEvents) {
        if (!seenEventIdsRef.current.has(evt.id)) {
          seenEventIdsRef.current.add(evt.id);
          if (evt.type !== 'day_started' && evt.type !== 'night_started') {
            showToast(evt.message, evt.type === 'player_killed' ? 'warning' : 'info', evt.title);
          }
        }
      }
    } else {
      visibleEvents.forEach((e) => seenEventIdsRef.current!.add(e.id));
    }
  }, [(currentRoom as any)?.events, user?.uid, secretBriefing?.team, preferences.notificationsEnabled, preferences.notifyGameEvents]);

  // Subscribe to own secret role briefing
  useEffect(() => {
    if (!currentRoom || !user) return;

    setLoadingBriefing(true);
    const unsubscribe = subscribeToPlayerSecretBriefing(
      currentRoom.id,
      user.uid,
      (briefing) => {
        setSecretBriefing(briefing);
        setLoadingBriefing(false);
      },
      (err) => {
        console.error('Error listening to secret briefing:', err);
        setLoadingBriefing(false);
      }
    );

    return () => unsubscribe();
  }, [currentRoom, user]);

  // Phase countdown timer & automated transition trigger
  useEffect(() => {
    if (!currentRoom?.phaseEndsAt) return;

    let isTriggering = false;

    const updateTimer = () => {
      const targetTime = currentRoom.phaseEndsAt || 0;
      const remainingMs = Math.max(0, targetTime - Date.now());
      setTimeLeftSecs(Math.floor(remainingMs / 1000));

      // Authoritative automated transition when timer elapses
      if (remainingMs <= 0 && !isTriggering && currentRoom.status !== 'finished' && currentRoom.status !== 'lobby') {
        isTriggering = true;
        advanceMatchPhaseInFirestore(currentRoom.id)
          .catch((err) => {
            console.warn('Auto phase advance error:', err);
          })
          .finally(() => {
            isTriggering = false;
          });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentRoom?.phaseEndsAt, currentRoom?.id, currentRoom?.status]);

  // Phase 8: Authoritatively claim XP, stats, achievements & match history when match finishes
  useEffect(() => {
    if (!currentRoom || !user) return;
    if (currentRoom.status !== 'finished' && currentRoom.status !== 'ended') return;
    if (claimedMatchRef.current === currentRoom.id) return;

    claimedMatchRef.current = currentRoom.id;
    claimMatchProgressionInFirestore(currentRoom.id, user.uid)
      .then((outcome) => {
        setProgressionOutcome(outcome);
        if (preferences.notificationsEnabled && preferences.notifyRewards) {
          playSound(outcome.leveledUp ? 'levelUp' : 'reward');
          showToast(
            `+${outcome.xpEarned} XP & +${outcome.coinsEarned} Silver Coins inscribed in your Dossier!`,
            'success',
            'Match Chronicle Recorded'
          );
          if (outcome.leveledUp) {
            showToast(
              `Rank Ascended! You reached Level ${outcome.newLevel}: ${outcome.newRankTitle}!`,
              'info',
              'Level Up!'
            );
          }
          if (outcome.newlyUnlockedAchievements.length > 0) {
            showToast(
              `Unlocked: ${outcome.newlyUnlockedAchievements.map((a) => a.name).join(', ')}`,
              'success',
              'Achievement Unlocked!'
            );
          }
        }
      })
      .catch((err) => {
        // Silently ignore duplicate claim errors; log others
        if (!String(err?.message || '').includes('already been claimed')) {
          console.warn('Progression claim skipped:', err);
        }
      });
  }, [currentRoom?.status, currentRoom?.id, user?.uid]);

  if (!currentRoom) return null;

  const roomPlayers = currentRoom.players || {};
  const roomSettings = currentRoom.settings || {
    gameMode: 'automated',
    isRealTime: false,
    activeTeams: ['investigators', 'annihilators', 'communists', 'soldiers'],
    soloRoleCount: 0,
    totalHouses: 35,
    housesDestroyedPerRound: 2,
  };

  const minutes = Math.floor(timeLeftSecs / 60);
  const seconds = timeLeftSecs % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const currentPhase = currentRoom.phase || 'day';
  const isDay = currentPhase === 'day';
  const currentRound = currentRoom.round || 1;
  const totalHouses = currentRoom.totalHouses || roomSettings.totalHouses || 35;
  const housesArray = Array.from({ length: totalHouses }, (_, i) => i + 1);

  const isFugitive = secretBriefing?.roleId === 'fugitive';
  const fugitiveShelter = (currentRoom as any).fugitiveCurrentHouse || secretBriefing?.specialKnowledge?.initialHouseNumber;
  const activeSpawnpoint = (currentRoom as any).fugitiveSpawnpointHouse || null;
  const spawnpointCooldown = (currentRoom as any).spawnpointCooldownRounds || 0;

  // Handle Fugitive Actions
  const handleFugitiveAction = async (type: 'change_house' | 'create_spawnpoint' | 'eliminate_player' | 'investigate_player') => {
    if (!user) return;
    setIsExecutingAction(true);
    try {
      let payload: any = { type };
      if (type === 'change_house' || type === 'create_spawnpoint') {
        const num = parseInt(targetHouseInput.trim(), 10);
        if (isNaN(num) || num < 1 || num > totalHouses) {
          showToast(`Please enter a valid dwelling number between 1 and ${totalHouses}.`, 'warning');
          setIsExecutingAction(false);
          return;
        }
        payload.targetHouseNumber = num;
      } else {
        if (!selectedTargetUid) {
          showToast('Please select a target pursuer.', 'warning');
          setIsExecutingAction(false);
          return;
        }
        payload.targetPlayerUid = selectedTargetUid;
      }

      const res = await executeFugitiveActionInFirestore(currentRoom.id, user.uid, payload);
      if (res.success) {
        if (type === 'investigate_player' && res.intel) {
          showToast(`Intel uncovered: ${res.intel.targetName} belongs to ${res.intel.targetTeam} (${res.intel.targetRole}).`, 'info');
        } else {
          showToast('Decree successfully executed and recorded in the High Ledger.', 'success');
        }
        setTargetHouseInput('');
        setSelectedTargetUid('');
      }
    } catch (err: any) {
      showToast(err.message || 'Decree execution failed.', 'danger');
    } finally {
      setIsExecutingAction(false);
    }
  };

  const handleExecuteRoleAbility = async (abilityId: string) => {
    if (!user || !currentRoom) return;
    const abilityDef = secretBriefing?.abilities?.find((a) => a.id === abilityId);
    if (abilityDef && abilityDef.timing !== currentPhase && abilityDef.timing !== 'unique') {
      showToast(
        `This decree may only be enacted during the ${abilityDef.timing === 'day' ? 'Day' : 'Night'} phase.`,
        'warning',
        'Phase Ineligible'
      );
      return;
    }
    setIsSubmittingAbility(true);
    try {
      const parsedHouses = abilityTargetHouse
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n >= 1 && n <= totalHouses);
      const houseNum = parsedHouses.length === 1 ? parsedHouses[0] : undefined;
      const houseNums = parsedHouses.length > 0 ? parsedHouses : undefined;
      const targetUid = abilityTargetPlayerUid || undefined;

      // Special real-time handling for Detective Interrogation
      if (abilityId === 'interrogate') {
        if (!targetUid) {
          showToast('Please select a suspect citizen to interrogate.', 'warning', 'No Target Selected');
          setIsSubmittingAbility(false);
          return;
        }
        await initiateDetectiveInterrogationInFirestore(currentRoom.id, user.uid, targetUid);
        showToast('Interrogation summons served! The suspect has been summoned to testify before the Tribunal.', 'success', 'Inquisition Begun');
        setSelectedAbilityId('');
        setAbilityTargetPlayerUid('');
        return;
      }

      const actionPayload: any = {
        sourcePlayerUid: user.uid,
        abilityId,
        targetPlayerUid: targetUid,
        targetHouseNumber: houseNum,
        targetHouseNumbers: houseNums,
        round: currentRound,
        phase: currentPhase,
      };

      if (abilityId === 'brew_concoction' || abilityId === 'administer_potion') {
        actionPayload.ingredient1 = abilityIngredient1;
        actionPayload.ingredient2 = abilityIngredient2;
      }
      if (abilityId === 'build_contraption' || abilityId === 'construct_contraption') {
        actionPayload.contraptionType = abilityContraptionType;
        actionPayload.contraptionCode = abilityContraptionCode;
      }
      if (abilityId === 'calculated_strike' || abilityId === 'contract_assassination') {
        const guesses: { playerUid: string; roleId: string }[] = [];
        if (targetUid) guesses.push({ playerUid: targetUid, roleId: abilityGuessRoleId });
        if (abilityTargetPlayerUid2) guesses.push({ playerUid: abilityTargetPlayerUid2, roleId: abilityGuessRoleId2 });
        if (abilityTargetPlayerUid3) guesses.push({ playerUid: abilityTargetPlayerUid3, roleId: abilityGuessRoleId3 });
        if (guesses.length === 0) {
          showToast('Please nominate at least 1 target player and their role.', 'warning', 'No Nomination');
          setIsSubmittingAbility(false);
          return;
        }
        actionPayload.guessRoles = guesses;
      }

      if (INSTANT_ABILITY_IDS.has(abilityId)) {
        const res = await executeInstantRoleActionInFirestore(currentRoom.id, actionPayload);
        showToast(res.summaryText, 'info', 'Instant Decree Executed');
      } else {
        await submitRoomAction(currentRoom.id, actionPayload);
        showToast('Decree recorded in the High Ledger! Actions resolve simultaneously at twilight.', 'success', 'Decree Inscribed');
      }
      setSelectedAbilityId('');
      setAbilityTargetPlayerUid('');
      setAbilityTargetHouse('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action submission failed.';
      showToast(msg, 'danger', 'Decree Failed');
    } finally {
      setIsSubmittingAbility(false);
    }
  };

  const handleSubmitInterrogationAnswers = async () => {
    if (!user || !currentRoom?.activeInterrogation) return;
    setIsSubmittingInterrogation(true);
    try {
      const res = await submitInterrogationAnswersInFirestore(
        currentRoom.id,
        user.uid,
        interrogationAnswers
      );
      if (res.success) {
        if (res.result?.targetKilled) {
          showToast('Your testimony was deemed perjury while carrying prior crimes: you have been executed.', 'danger', 'Tribunal Execution');
        } else if (res.result?.crimeCommitted) {
          showToast('A falsehood was detected in your testimony: you have incurred a Crime penalty.', 'warning', 'Perjury Detected');
        } else {
          showToast('Your testimony has been faithfully delivered to the Detective.', 'success', 'Testimony Recorded');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit testimony.';
      showToast(msg, 'danger', 'Submission Failed');
    } finally {
      setIsSubmittingInterrogation(false);
    }
  };

  const isHost = !!(
    currentRoom &&
    user &&
    (currentRoom.hostUid === user.uid ||
      (currentRoom.settings.gameMode === 'automated' && currentRoom.createdById === user.uid))
  );

  const handleManualAdvancePhase = async () => {
    if (!currentRoom || !user) return;
    setIsAdvancingPhase(true);
    try {
      const res = await advanceMatchPhaseInFirestore(currentRoom.id, user.uid, true);
      if (res.transitioned) {
        showToast(
          `Phase advanced to ${res.newPhase === 'night' ? 'Night Phase' : `Round ${res.newRound} Day Phase`}!`,
          'success',
          'Cycle Advanced'
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not advance phase.';
      showToast(msg, 'danger', 'Decree Failed');
    } finally {
      setIsAdvancingPhase(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner: Round & Phase Clocks */}
      <ParchmentPanel variant="framed">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-xs font-serif uppercase tracking-widest text-manuscript-burgundy font-bold">
                Active Chronicle Match
              </span>
              <span className="text-[10px] font-mono text-ink-light">
                Chamber {currentRoom.roomCode}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-serif font-black text-ink flex items-center justify-center sm:justify-start gap-2.5">
              {isDay ? (
                <Sun className="w-7 h-7 text-amber-600 animate-pulse" />
              ) : (
                <Moon className="w-7 h-7 text-indigo-700 animate-pulse" />
              )}
              <span>Round {currentRound} • {isDay ? 'Day Phase' : 'Night Phase'}</span>
            </h2>

            <p className="text-xs font-body text-ink-light">
              Phase concludes in <strong className="font-mono text-ink font-bold text-sm">{formattedTime}</strong> • Actions resolve simultaneously at twilight
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-parchment-200 border border-parchment-400 px-3 py-1.5 rounded text-center">
              <span className="text-[10px] font-serif uppercase tracking-wider text-ink-light block">
                Temporal Mode
              </span>
              <span className="text-xs font-serif font-bold text-ink">
                {currentRoom.settings.isRealTime ? 'Real-Time Clock' : 'Accelerated Cycle'}
              </span>
            </div>

            {isHost && (
              <Button
                variant="wax"
                size="sm"
                icon={isDay ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                onClick={handleManualAdvancePhase}
                loading={isAdvancingPhase}
                title={isDay ? 'Trigger Nightfall immediately' : 'Trigger Dawn and advance Round immediately'}
              >
                {isDay ? 'Trigger Nightfall' : 'Trigger Dawn'}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              icon={<LogOut className="w-4 h-4" />}
              onClick={leaveChamber}
              title="Withdraw from match"
            >
              Withdraw
            </Button>
          </div>
        </div>
      </ParchmentPanel>

      {/* Match Concluded & Progression Rewards Banner */}
      {(currentRoom.status === 'finished' || currentRoom.status === 'ended') && (
        <ParchmentPanel
          variant="framed"
          className="border-2 border-manuscript-gold bg-amber-50/90 space-y-3 p-4 sm:p-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-parchment-400 pb-2">
            <div>
              <span className="text-[10px] font-serif uppercase tracking-widest text-manuscript-burgundy font-bold block">
                Chronicle Concluded
              </span>
              <h3 className="font-serif font-black text-xl text-ink">
                {(currentRoom as any).winnerTeam
                  ? `Victory: ${String((currentRoom as any).winnerTeam).toUpperCase()}`
                  : 'Match Concluded'}
              </h3>
            </div>
            {progressionOutcome && (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded bg-manuscript-gold/20 border border-manuscript-gold text-amber-950 font-serif font-bold text-xs">
                  +{progressionOutcome.xpEarned} XP • +{progressionOutcome.coinsEarned} Coins
                </span>
                {progressionOutcome.leveledUp && (
                  <span className="px-3 py-1 rounded bg-emerald-900 text-parchment-100 font-serif font-bold text-xs">
                    Level {progressionOutcome.newLevel}: {progressionOutcome.newRankTitle}!
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="text-xs font-body text-ink-light">
            {(currentRoom as any).endReason || 'The hunt has reached its conclusion.'}
          </p>
          {progressionOutcome && progressionOutcome.newlyUnlockedAchievements.length > 0 && (
            <div className="text-xs font-serif text-emerald-950 bg-emerald-950/10 border border-emerald-800/30 rounded p-2">
              <strong>Unlocked Achievements:</strong>{' '}
              {progressionOutcome.newlyUnlockedAchievements.map((a) => a.name).join(' • ')}
            </div>
          )}
        </ParchmentPanel>
      )}

      {/* Active Interrogation Summons: Rendered for the interrogated suspect (e.g. on mobile/desktop) */}
      {currentRoom.activeInterrogation &&
        currentRoom.activeInterrogation.targetUid === user?.uid &&
        !currentRoom.activeInterrogation.completed && (
          <ParchmentPanel
            variant="framed"
            className="border-3 border-manuscript-burgundy bg-parchment-100 shadow-xl p-4 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 ring-2 ring-manuscript-burgundy/50"
          >
            <div className="flex items-center gap-3 border-b-2 border-manuscript-burgundy/40 pb-3">
              <div className="w-10 h-10 rounded-full bg-manuscript-burgundy text-parchment-100 flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
                ⚖️
              </div>
              <div>
                <h3 className="font-serif font-black text-base sm:text-lg text-manuscript-burgundy tracking-wide uppercase">
                  Tribunal Inquisition: You are Being Interrogated!
                </h3>
                <p className="text-xs font-serif text-ink-light leading-relaxed">
                  The Detective demands your sworn testimony before the Tribunal. False testimony incurs a <strong className="text-red-900">Crime</strong> penalty. Lying while already carrying a prior crime will result in <strong className="text-red-900 font-bold">immediate execution</strong>!
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {currentRoom.activeInterrogation.questions.map((qItem, idx) => {
                const currentVal = interrogationAnswers[idx] || 'dont_know';
                return (
                  <div
                    key={qItem.question.id || idx}
                    className="p-3 rounded bg-parchment-200/80 border border-parchment-400 space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-manuscript-burgundy text-parchment-100 shrink-0">
                        Q{idx + 1}
                      </span>
                      <span className="font-serif font-bold text-sm text-ink">
                        {qItem.question.questionText}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setInterrogationAnswers((prev) => ({ ...prev, [idx]: 'yes' }))
                        }
                        className={`py-2 px-2 sm:px-3 rounded text-xs font-serif font-bold transition-all border ${
                          currentVal === 'yes'
                            ? 'bg-emerald-900 text-parchment-100 border-emerald-950 shadow-sm'
                            : 'bg-parchment-100 text-ink border-parchment-400 hover:bg-parchment-300'
                        }`}
                      >
                        ✓ Affirm (Yes)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setInterrogationAnswers((prev) => ({ ...prev, [idx]: 'no' }))
                        }
                        className={`py-2 px-2 sm:px-3 rounded text-xs font-serif font-bold transition-all border ${
                          currentVal === 'no'
                            ? 'bg-red-900 text-parchment-100 border-red-950 shadow-sm'
                            : 'bg-parchment-100 text-ink border-parchment-400 hover:bg-parchment-300'
                        }`}
                      >
                        ✗ Deny (No)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setInterrogationAnswers((prev) => ({ ...prev, [idx]: 'dont_know' }))
                        }
                        className={`py-2 px-2 sm:px-3 rounded text-xs font-serif font-bold transition-all border ${
                          currentVal === 'dont_know'
                            ? 'bg-amber-900 text-parchment-100 border-amber-950 shadow-sm'
                            : 'bg-parchment-100 text-ink border-parchment-400 hover:bg-parchment-300'
                        }`}
                      >
                        ? I Don't Know
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              variant="wax"
              size="md"
              className="w-full text-xs sm:text-sm font-bold uppercase tracking-wider py-2.5 shadow-md"
              loading={isSubmittingInterrogation}
              onClick={handleSubmitInterrogationAnswers}
            >
              Inscribe & Submit Sworn Testimony
            </Button>
          </ParchmentPanel>
        )}

      {/* Detective Active Inquiry Status Banner: Visible to Detective */}
      {currentRoom.activeInterrogation &&
        secretBriefing?.roleId === 'detective' && (
          <div
            className={`p-3 rounded border text-xs font-serif flex items-center justify-between gap-3 ${
              !currentRoom.activeInterrogation.completed
                ? 'bg-amber-500/15 border-amber-700/60 text-ink'
                : currentRoom.activeInterrogation.lieDetected
                ? 'bg-red-950/15 border-red-800 text-red-950'
                : 'bg-emerald-950/15 border-emerald-800 text-emerald-950'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">⚖️</span>
              <div>
                {!currentRoom.activeInterrogation.completed ? (
                  <span>
                    Inquisition in progress: Summoned suspect{' '}
                    <strong>{currentRoom.activeInterrogation.targetName}</strong> is presently testifying...
                  </span>
                ) : (
                  <span>
                    Inquisition Concluded:{' '}
                    <strong>{currentRoom.activeInterrogation.targetName}</strong> —{' '}
                    {currentRoom.activeInterrogation.lieDetected ? (
                      <strong className="text-red-900">Perjury Detected!</strong>
                    ) : (
                      <strong className="text-emerald-900">Truthful Testimony Recorded.</strong>
                    )}
                    {currentRoom.activeInterrogation.penaltyInflicted === 'execution' &&
                      ' (Subject Executed on the spot for prior crimes)'}
                    {currentRoom.activeInterrogation.penaltyInflicted === 'crime' &&
                      ' (Crime penalty marked against subject)'}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

      {/* View Switcher: Tactical Map vs Known Intel vs Chamber Dispatches */}
      <div className="flex items-center gap-2 border-b border-parchment-400 pb-1 flex-wrap">
        <button
          onClick={() => setActiveSubView('tactical')}
          className={`px-4 py-2 rounded font-serif text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubView === 'tactical'
              ? 'bg-parchment-100 text-manuscript-burgundy border border-parchment-400 shadow-xs'
              : 'text-ink-light hover:text-ink hover:bg-parchment-200/50'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Tactical Map & Decrees</span>
        </button>

        <button
          onClick={() => setActiveSubView('intel')}
          className={`px-4 py-2 rounded font-serif text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubView === 'intel'
              ? 'bg-parchment-100 text-manuscript-burgundy border border-parchment-400 shadow-xs'
              : 'text-ink-light hover:text-ink hover:bg-parchment-200/50'
          }`}
        >
          <Scroll className="w-4 h-4" />
          <span>Known Intelligence & Dossier</span>
        </button>

        <button
          onClick={() => setActiveSubView('chat')}
          className={`px-4 py-2 rounded font-serif text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubView === 'chat'
              ? 'bg-parchment-100 text-manuscript-burgundy border border-parchment-400 shadow-xs'
              : 'text-ink-light hover:text-ink hover:bg-parchment-200/50'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chamber Dispatches (Chat)</span>
        </button>
      </div>

      {activeSubView === 'chat' ? (
        (() => {
          const myMatchPlayer = user?.uid
            ? (currentRoom.matchPlayers?.[user.uid] as any) || (roomPlayers[user.uid] as any)
            : undefined;
          const isHumanModerator =
            roomSettings.gameMode === 'human_host' && currentRoom.hostUid === user?.uid;
          const chatPlayersList = Object.values(roomPlayers).map((p) => ({
            uid: p.uid,
            username: p.username,
          }));

          return (
            <ChamberChat
              roomId={currentRoom.id}
              player={{
                uid: user?.uid || '',
                username:
                  myMatchPlayer?.username ||
                  user?.displayName ||
                  'Citizen',
                isAlive: myMatchPlayer && typeof myMatchPlayer.isAlive === 'boolean' ? myMatchPlayer.isAlive : true,
                isGhost: !!myMatchPlayer?.isGhost,
                isZombie: !!myMatchPlayer?.isZombie,
                team: secretBriefing?.team ?? myMatchPlayer?.team,
                roleId: secretBriefing?.roleId ?? myMatchPlayer?.roleId,
                isHost: isHumanModerator,
                kickedFromTeams: myMatchPlayer?.kickedFromTeams,
                soulboundUid: secretBriefing?.specialKnowledge?.soulboundUid,
              }}
              config={{
                roomId: currentRoom.id,
                allowPrivateMessages: (roomSettings as any).allowPrivateMessages ?? true,
                hasHumanHost: roomSettings.gameMode === 'human_host',
                currentPhase: currentRoom.phase || 'day',
                status: currentRoom.status,
                activeTeams: roomSettings.activeTeams || [],
              }}
              allRoomPlayers={chatPlayersList}
            />
          );
        })()
      ) : activeSubView === 'intel' ? (
        <KnownIntelligenceDossier
          room={currentRoom}
          userUid={user?.uid || ''}
          secretBriefing={secretBriefing}
          isHost={isHost}
        />
      ) : (
        <>
          {/* Secret Role Briefing Component */}
          {loadingBriefing ? (
            <ManuscriptLoading
              label="Unrolling Confidential Imperial Scroll..."
              sublabel="Retrieving your secret faction and role assignment"
            />
          ) : secretBriefing ? (
            <SecretRoleBriefing briefing={secretBriefing} />
          ) : (
            <ParchmentPanel variant="sheet" className="text-center p-6 text-xs font-body text-ink-light">
              Awaiting role dispatch from the presiding tribunal...
            </ParchmentPanel>
          )}

          {/* Special The Fugitive Command Console */}
          {isFugitive && (
            <ParchmentPanel variant="framed" className="space-y-4 border-2 border-amber-900/60">
              <div className="flex items-center justify-between border-b border-parchment-400 pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Skull className="w-6 h-6 text-manuscript-burgundy" />
                  <div>
                    <h3 className="font-serif font-black text-lg text-ink">The Fugitive's Command Console</h3>
                    <span className="text-[10px] font-serif uppercase tracking-wider text-manuscript-burgundy">
                      Current Shelter: Dwelling #{fugitiveShelter || 'Secret'} • Active Spawnpoint: {activeSpawnpoint ? `Dwelling #${activeSpawnpoint}` : 'None'}
                    </span>
                  </div>
                </div>
                {spawnpointCooldown > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/20 text-amber-900 border border-amber-800/40">
                    Spawnpoint Cooldown: {spawnpointCooldown} Round(s)
                  </span>
                )}
              </div>

              {(currentRoom as any).fugitiveDailyActionExecuted ? (
                <div className="p-4 rounded bg-emerald-950/10 border border-emerald-800/40 text-center space-y-1">
                  <p className="font-serif font-bold text-sm text-emerald-950">
                    ✓ Daily Decree Enacted for Round {currentRound}
                  </p>
                  <p className="text-xs font-body text-ink-light">
                    You have already exercised your single daytime action for this round. Await the next dawn to act again.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-body text-ink-light">
                    You may enact exactly <strong>one daily evasion decree</strong> during the Day Phase. Choose your maneuver with care:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* House Relocation & Spawnpoint Creation */}
                    <div className="space-y-2 bg-parchment-100 p-3 rounded border border-parchment-300">
                      <span className="text-xs font-serif font-bold text-ink block">Dwelling Maneuvers</span>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          max={totalHouses}
                          placeholder={`Dwelling (1-${totalHouses})`}
                          value={targetHouseInput}
                          onChange={(e) => setTargetHouseInput(e.target.value)}
                          className="w-full bg-parchment-50 border border-parchment-400 rounded px-2 py-1 text-xs font-mono text-ink"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="parchment"
                          size="sm"
                          className="flex-1"
                          disabled={isExecutingAction || !isDay}
                          onClick={() => handleFugitiveAction('change_house')}
                        >
                          Relocate Shelter
                        </Button>
                        <Button
                          variant="wax"
                          size="sm"
                          className="flex-1"
                          disabled={isExecutingAction || !isDay || spawnpointCooldown > 0}
                          onClick={() => handleFugitiveAction('create_spawnpoint')}
                        >
                          Set Spawnpoint
                        </Button>
                      </div>
                    </div>

                    {/* Pursuer Elimination & Investigation */}
                    <div className="space-y-2 bg-parchment-100 p-3 rounded border border-parchment-300">
                      <span className="text-xs font-serif font-bold text-ink block">Pursuer Infiltration</span>
                      <select
                        value={selectedTargetUid}
                        onChange={(e) => setSelectedTargetUid(e.target.value)}
                        className="w-full bg-parchment-50 border border-parchment-400 rounded px-2 py-1 text-xs font-serif text-ink"
                      >
                        <option value="">Select Target Pursuer...</option>
                        {Object.values(roomPlayers)
                          .filter((p) => {
                            const isDead =
                              (p as any).isAlive === false ||
                              (p as any).status === 'dead' ||
                              currentRoom.matchPlayers?.[p.uid]?.isAlive === false;
                            return p.uid !== user?.uid && !isDead;
                          })
                          .map((p) => (
                            <option key={p.uid} value={p.uid}>
                              {p.username}
                            </option>
                          ))}
                      </select>
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          disabled={isExecutingAction || !isDay}
                          onClick={() => handleFugitiveAction('investigate_player')}
                        >
                          Investigate
                        </Button>
                        <Button
                          variant="wax"
                          size="sm"
                          className="flex-1"
                          disabled={isExecutingAction || !isDay}
                          onClick={() => handleFugitiveAction('eliminate_player')}
                        >
                          Eliminate
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </ParchmentPanel>
          )}

          {/* Sanctioned Role Abilities Console (for Factions & Solos) */}
          {!isFugitive && secretBriefing && secretBriefing.abilities.length > 0 && (() => {
            const myMatchPlayer = user ? currentRoom.matchPlayers?.[user.uid] : undefined;
            const usageRecord = user ? currentRoom.actionUsageByPlayer?.[user.uid] : undefined;
            const usedThisPhase =
              usageRecord && usageRecord.round === currentRound && usageRecord.phase === currentPhase
                ? usageRecord.count
                : 0;
            const isDaredevilActive = !!(myMatchPlayer?.statusEffects?.adrenalineSurge && isDay);
            const allowedThisPhase = isDaredevilActive
              ? Number.MAX_SAFE_INTEGER
              : 1 + (myMatchPlayer?.statusEffects?.extraAbilityUses || 0);
            const hasExhaustedPhaseAction = usedThisPhase >= allowedThisPhase;
            const usedUniqueList = (user && currentRoom.usedUniqueAbilities?.[user.uid]) || [];

            return (
            <ParchmentPanel variant="framed" className="space-y-4 border-2 border-emerald-900/60">
              <div className="flex items-center justify-between border-b border-parchment-400 pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Award className="w-6 h-6 text-manuscript-forest" />
                  <div>
                    <h3 className="font-serif font-black text-lg text-ink">
                      {secretBriefing.roleName}'s Tactical Decrees
                    </h3>
                    <span className="text-[10px] font-serif uppercase tracking-wider text-manuscript-forest">
                      Current Operational Timing: {isDay ? 'Day Phase' : 'Night Phase'}
                    </span>
                  </div>
                </div>
              </div>

              {hasExhaustedPhaseAction ? (
                <div className="p-4 rounded bg-emerald-950/10 border border-emerald-800/40 text-center space-y-1">
                  <p className="font-serif font-bold text-sm text-emerald-950">
                    ✓ Decree Enacted for Round {currentRound} ({isDay ? 'Day' : 'Night'})
                  </p>
                  <p className="text-xs font-body text-ink-light">
                    You have already used your action for this phase. The declaration console will reopen when the next phase begins.
                  </p>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {secretBriefing.abilities
                  .filter((a) => a.timing !== 'passive')
                  .map((ability) => {
                    const isSelected = selectedAbilityId === ability.id;
                    const isUniqueExpended = ability.maxUses === 1 && usedUniqueList.includes(ability.id);
                    const isDaredevilAdrenaline =
                      ability.id === 'adrenaline_rampage' &&
                      !(user && currentRoom.matchPlayers?.[user.uid]?.statusEffects?.adrenalineSurge);
                    const canActivateNow =
                      (ability.timing === currentPhase || ability.timing === 'unique') &&
                      !isDaredevilAdrenaline &&
                      !isUniqueExpended;
                    const isMultiHouse =
                      ability.id === 'sniper_barrage' ||
                      ability.id === 'mortar_barrage' ||
                      ability.id === 'nuclear_strike';
                    const isScientist = ability.id === 'brew_concoction';
                    const isEngineer = ability.id === 'build_contraption';
                    const isAssassin = ability.id === 'calculated_strike';
                    const isGlobalOnly =
                      ability.id === 'eclipse' ||
                      ability.id === 'temporal_rewind' ||
                      ability.id === 'tactical_appraisal' ||
                      ability.id === 'hear_rumors';

                    return (
                      <div
                        key={ability.id}
                        className={`p-3 rounded border transition-all ${
                          isSelected
                            ? 'bg-amber-100/80 border-manuscript-gold ring-1 ring-manuscript-gold shadow-xs'
                            : canActivateNow
                            ? 'bg-parchment-100 border-parchment-300'
                            : 'bg-parchment-200/50 border-parchment-300/60 opacity-80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-serif font-bold text-sm text-ink">{ability.name}</span>
                          <span
                            className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border font-bold ${
                              canActivateNow
                                ? 'bg-parchment-200 border-parchment-400 text-manuscript-burgundy'
                                : 'bg-parchment-300/40 border-parchment-400 text-ink-light'
                            }`}
                          >
                            {ability.timing}
                          </span>
                        </div>
                        <p className="text-xs font-body text-ink-light mb-2">{ability.description}</p>

                        {isSelected ? (
                          <div className="space-y-2 pt-2 border-t border-parchment-300">
                            {!isGlobalOnly && (
                              <div className="flex gap-2 flex-wrap">
                                {!isMultiHouse && (
                                  <select
                                    value={abilityTargetPlayerUid}
                                    onChange={(e) => setAbilityTargetPlayerUid(e.target.value)}
                                    className="flex-1 min-w-[140px] bg-parchment-50 border border-parchment-400 rounded px-2 py-1 text-xs font-serif text-ink"
                                  >
                                    <option value="">Select Target Hunter...</option>
                                    {Object.values(roomPlayers)
                                      .filter((p) => p.uid !== user?.uid)
                                      .map((p) => (
                                        <option key={p.uid} value={p.uid}>
                                          {p.username}
                                        </option>
                                      ))}
                                  </select>
                                )}
                                {(isMultiHouse ||
                                  ability.id === 'plant_bomb' ||
                                  ability.id === 'rifle_fire' ||
                                  ability.id === 'lovers_arrow' ||
                                  ability.id === 'divine_inquiry') && (
                                  <input
                                    type="text"
                                    placeholder={isMultiHouse ? 'Houses (e.g. 5, 12, 18)' : 'House #'}
                                    value={abilityTargetHouse}
                                    onChange={(e) => setAbilityTargetHouse(e.target.value)}
                                    className={`${
                                      isMultiHouse ? 'w-full' : 'w-28'
                                    } bg-parchment-50 border border-parchment-400 rounded px-2 py-1 text-xs font-mono text-ink`}
                                  />
                                )}
                              </div>
                            )}

                            {isScientist && (
                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  value={abilityIngredient1}
                                  onChange={(e) => setAbilityIngredient1(e.target.value as any)}
                                  className="bg-parchment-50 border border-parchment-400 rounded px-2 py-1 text-xs font-serif text-ink"
                                >
                                  <option value="dandelion">Dandelion (Ward)</option>
                                  <option value="lotus">Lotus Flower (Track)</option>
                                  <option value="poison">Poison (Lethal)</option>
                                  <option value="mind_dust">Mind Powder (Crime)</option>
                                </select>
                                <select
                                  value={abilityIngredient2}
                                  onChange={(e) => setAbilityIngredient2(e.target.value as any)}
                                  className="bg-parchment-50 border border-parchment-400 rounded px-2 py-1 text-xs font-serif text-ink"
                                >
                                  <option value="lotus">Lotus Flower (Track)</option>
                                  <option value="dandelion">Dandelion (Ward)</option>
                                  <option value="poison">Poison (Lethal)</option>
                                  <option value="mind_dust">Mind Powder (Crime)</option>
                                </select>
                              </div>
                            )}

                            {isEngineer && (
                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  value={abilityContraptionType}
                                  onChange={(e) => setAbilityContraptionType(e.target.value as any)}
                                  className="bg-parchment-50 border border-parchment-400 rounded px-2 py-1 text-xs font-serif text-ink"
                                >
                                  <option value="turret">Turret (Bombard)</option>
                                  <option value="defibrillator">Defibrillator (Revive)</option>
                                  <option value="disruptor">Disruptor (Silence)</option>
                                </select>
                                <input
                                  type="number"
                                  min="1"
                                  max="5"
                                  value={abilityContraptionCode}
                                  onChange={(e) => setAbilityContraptionCode(parseInt(e.target.value, 10) || 1)}
                                  placeholder="Code 1-5"
                                  className="bg-parchment-50 border border-parchment-400 rounded px-2 py-1 text-xs font-mono text-ink"
                                />
                              </div>
                            )}

                            {isAssassin && (
                              <div className="space-y-2">
                                <select
                                  value={abilityGuessRoleId}
                                  onChange={(e) => setAbilityGuessRoleId(e.target.value)}
                                  className="w-full bg-parchment-50 border border-parchment-400 rounded px-2 py-1 text-xs font-serif text-ink"
                                >
                                  {Object.values(ROLES).map((r) => (
                                    <option key={r.id} value={r.id}>
                                      Nomination 1 Role: {r.name}
                                    </option>
                                  ))}
                                </select>

                                {/* Optional 2nd Nomination */}
                                <div className="grid grid-cols-2 gap-2">
                                  <select
                                    value={abilityTargetPlayerUid2}
                                    onChange={(e) => setAbilityTargetPlayerUid2(e.target.value)}
                                    className="bg-parchment-50 border border-parchment-400 rounded px-2 py-1 text-xs font-serif text-ink"
                                  >
                                    <option value="">(Optional) 2nd Target...</option>
                                    {Object.values(roomPlayers)
                                      .filter((p) => p.uid !== user?.uid)
                                      .map((p) => (
                                        <option key={p.uid} value={p.uid}>
                                          {p.username}
                                        </option>
                                      ))}
                                  </select>
                                  <select
                                    value={abilityGuessRoleId2}
                                    onChange={(e) => setAbilityGuessRoleId2(e.target.value)}
                                    disabled={!abilityTargetPlayerUid2}
                                    className="bg-parchment-50 border border-parchment-400 rounded px-2 py-1 text-xs font-serif text-ink disabled:opacity-50"
                                  >
                                    {Object.values(ROLES).map((r) => (
                                      <option key={r.id} value={r.id}>
                                        Role: {r.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Optional 3rd Nomination */}
                                <div className="grid grid-cols-2 gap-2">
                                  <select
                                    value={abilityTargetPlayerUid3}
                                    onChange={(e) => setAbilityTargetPlayerUid3(e.target.value)}
                                    className="bg-parchment-50 border border-parchment-400 rounded px-2 py-1 text-xs font-serif text-ink"
                                  >
                                    <option value="">(Optional) 3rd Target...</option>
                                    {Object.values(roomPlayers)
                                      .filter((p) => p.uid !== user?.uid)
                                      .map((p) => (
                                        <option key={p.uid} value={p.uid}>
                                          {p.username}
                                        </option>
                                      ))}
                                  </select>
                                  <select
                                    value={abilityGuessRoleId3}
                                    onChange={(e) => setAbilityGuessRoleId3(e.target.value)}
                                    disabled={!abilityTargetPlayerUid3}
                                    className="bg-parchment-50 border border-parchment-400 rounded px-2 py-1 text-xs font-serif text-ink disabled:opacity-50"
                                  >
                                    {Object.values(ROLES).map((r) => (
                                      <option key={r.id} value={r.id}>
                                        Role: {r.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <Button
                                variant="wax"
                                size="sm"
                                className="flex-1"
                                loading={isSubmittingAbility}
                                onClick={() => handleExecuteRoleAbility(ability.id)}
                              >
                                Enact Decree
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedAbilityId('')}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant={canActivateNow ? 'parchment' : 'outline'}
                            size="sm"
                            disabled={!canActivateNow}
                            className="w-full mt-1 disabled:opacity-50"
                            onClick={() => {
                              setSelectedAbilityId(ability.id);
                              setAbilityTargetPlayerUid('');
                              setAbilityTargetHouse('');
                            }}
                          >
                            {isUniqueExpended
                              ? 'Expended (1/1 Used)'
                              : isDaredevilAdrenaline
                              ? 'Dormant (Triggers on Lethal Blow)'
                              : canActivateNow
                              ? 'Prepare Decree'
                              : `Locked (Requires ${ability.timing === 'day' ? 'Day' : 'Night'} Phase)`}
                          </Button>
                        )}
                      </div>
                    );
                  })}
              </div>
              )}
            </ParchmentPanel>
            );
          })()}

          {/* Village Dwellings Grid */}
          <ParchmentPanel variant="sheet" className="space-y-3">
            <div className="flex items-center justify-between border-b border-parchment-400 pb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-manuscript-forest" />
                <h3 className="font-serif font-bold text-base text-ink">
                  The Village Dwellings ({totalHouses} Houses)
                </h3>
              </div>
              <span className="text-xs font-body text-ink-light">
                {currentRoom.housesDestroyedPerRound || 2} Dwellings demolished nightly
              </span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {housesArray.map((houseNum) => {
                const houseData = currentRoom.houses ? currentRoom.houses[houseNum] : null;
                const isDestroyed = houseData?.isDestroyed;
                const isMyShelter = isFugitive && fugitiveShelter === houseNum;
                const isMySpawn = isFugitive && activeSpawnpoint === houseNum;

                let bgColor = 'bg-parchment-100 border-parchment-400';
                let label = 'Intact';
                let labelColor = 'text-emerald-900';

                if (isDestroyed) {
                  bgColor = 'bg-red-950/20 border-red-900/50 line-through';
                  label = 'Ashes';
                  labelColor = 'text-red-950';
                } else if (isMyShelter) {
                  bgColor = 'bg-amber-500/20 border-amber-700 shadow-sm';
                  label = 'Shelter';
                  labelColor = 'text-amber-950 font-black';
                } else if (isMySpawn) {
                  bgColor = 'bg-purple-900/20 border-purple-800';
                  label = 'Spawn';
                  labelColor = 'text-purple-950 font-black';
                }

                return (
                  <div
                    key={houseNum}
                    className={`aspect-square ${bgColor} border rounded flex flex-col items-center justify-center p-1 font-mono text-xs text-ink transition-colors shadow-xs`}
                  >
                    <span className="text-[10px] text-ink-light">#{houseNum}</span>
                    <span className={`text-[8px] font-serif uppercase ${labelColor}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </ParchmentPanel>

          {/* Public Roster */}
          <ParchmentPanel variant="bound" className="space-y-3">
            <div className="flex items-center gap-2 border-b border-parchment-400 pb-2">
              <Users className="w-5 h-5 text-manuscript-burgundy" />
              <h3 className="font-serif font-bold text-base text-ink">
                Public Hunter Roster ({Object.keys(roomPlayers).length} Comrades)
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-serif">
              {Object.values(roomPlayers).map((p) => {
                const isDead =
                  (p as any).isAlive === false ||
                  (p as any).status === 'dead' ||
                  currentRoom.matchPlayers?.[p.uid]?.isAlive === false;

                return (
                  <div
                    key={p.uid}
                    className={`p-2.5 rounded border flex items-center justify-between transition-colors ${
                      isDead
                        ? 'bg-red-950/15 border-red-900/40 text-red-950 opacity-90'
                        : 'bg-parchment-100 border-parchment-300 text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {isDead && <Skull className="w-3.5 h-3.5 text-red-800 shrink-0" />}
                      <span className={`font-bold truncate ${isDead ? 'line-through text-ink-light' : ''}`}>
                        {p.username}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded border font-bold shrink-0 ${
                        isDead
                          ? 'bg-red-950/20 text-red-900 border-red-800/40'
                          : 'bg-emerald-950/20 text-emerald-900 border-emerald-800/30'
                      }`}
                    >
                      {isDead ? 'Slain' : 'Living'}
                    </span>
                  </div>
                );
              })}
            </div>
          </ParchmentPanel>
        </>
      )}
    </div>
  );
};
