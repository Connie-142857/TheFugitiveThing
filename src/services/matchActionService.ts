// Match Action Execution Service for The Fugitive
// Authoritatively receives and processes actions from authenticated players.

import {
  doc,
  getDoc,
  arrayUnion,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { RoomDocument, SecretRoleBriefingData, GameAction } from '../types/game.ts';
import { ROLES } from '../types/rules.ts';
import {
  executeFugitiveDailyAction,
  FugitiveActionPayload,
  FugitiveActionResult,
  EngineMatchState,
  initializeHouses,
  executeNightlyHouseDestruction,
  transitionMatchPhase,
} from './gameEngine.ts';
import {
  resolveCompleteActionQueue,
  resolveStatusEffects,
} from './abilityResolutionEngine.ts';
import { sendSystemChatAnnouncement } from './chatService.ts';
import { cleanFirestoreObject } from './gameEventManager.ts';
import { encodeAuthoritativeRole, decodeAuthoritativeRole } from './matchInitService.ts';

function hydrateRolesIntoPlayers(
  roomId: string,
  players: Record<string, any>,
  authoritativeRoles?: Record<string, string>
): void {
  if (!authoritativeRoles) return;
  for (const [uid, p] of Object.entries(players)) {
    if (p && !p.roleId && authoritativeRoles[uid]) {
      const decoded = decodeAuthoritativeRole(roomId, uid, authoritativeRoles[uid]);
      if (decoded) p.roleId = decoded;
    }
  }
}

function stripRolesAndEncode(
  roomId: string,
  players: Record<string, any>,
  existingEncoded?: Record<string, string>
): { publicPlayers: Record<string, any>; authoritativeRoles: Record<string, string> } {
  const publicPlayers: Record<string, any> = {};
  const authoritativeRoles: Record<string, string> = { ...(existingEncoded || {}) };
  for (const [uid, p] of Object.entries(players)) {
    if (!p) continue;
    if (p.roleId) {
      authoritativeRoles[uid] = encodeAuthoritativeRole(roomId, uid, p.roleId);
    }
    const { roleId: _omit, ...rest } = p;
    publicPlayers[uid] = rest;
  }
  return { publicPlayers: cleanFirestoreObject(publicPlayers), authoritativeRoles };
}

/**
 * Executes The Fugitive's daily action with server validation:
 * Verifies that the caller is truly The Fugitive and executes the action.
 */
export async function executeFugitiveActionInFirestore(
  roomId: string,
  callerUid: string,
  payload: FugitiveActionPayload
): Promise<FugitiveActionResult> {
  const roomRef = doc(db, 'rooms', roomId);
  const secretRef = doc(db, 'rooms', roomId, 'secretRoles', callerUid);

  const result = await runTransaction(db, async (transaction) => {
    const roomSnap = await transaction.get(roomRef);
    const secretSnap = await transaction.get(secretRef);

    if (!roomSnap.exists()) {
      throw new Error('Chamber does not exist.');
    }
    if (!secretSnap.exists()) {
      throw new Error('Secret credentials not found.');
    }

    const room = roomSnap.data() as RoomDocument;
    const secret = secretSnap.data() as SecretRoleBriefingData;

    // Verify caller is actually The Fugitive
    if (secret.category !== 'target' || secret.roleId !== 'fugitive') {
      throw new Error('Only The Fugitive may execute daily evasion decrees.');
    }

    if (room.fugitivePlayerUid && room.fugitivePlayerUid !== callerUid) {
      throw new Error('Identity mismatch: you are not The Fugitive for this chamber.');
    }

    // Build current engine state from Firestore room snapshot
    const totalHouses = room.totalHouses || room.settings.totalHouses || 35;
    const currentHouse = (room as any).fugitiveCurrentHouse || secret.specialKnowledge?.initialHouseNumber || 1;

    // If houses are already in room, preserve their states
    const rawHouses = room.houses || initializeHouses(totalHouses, currentHouse);
    const housesRecord: Record<number, any> = {};
    for (const [k, v] of Object.entries(rawHouses)) {
      housesRecord[Number(k)] = {
        id: `house_${k}`,
        number: Number(k),
        status: v.isDestroyed ? 'destroyed' : v.hasActiveSpawnpoint ? 'special' : (v.number === currentHouse ? 'occupied' : 'available'),
        isDestroyed: v.isDestroyed || false,
        isBurned: v.isBurned || false,
        hasActiveBomb: v.hasActiveBomb || false,
        hasActiveSpawnpoint: v.hasActiveSpawnpoint || false,
        isFugitiveShelter: v.number === currentHouse,
        history: v.history || [],
      };
    }

    const engineState: EngineMatchState = {
      roomId,
      status: (room.status as any) || 'day',
      round: room.round || 1,
      phase: room.phase || 'day',
      phaseEndsAt: room.phaseEndsAt || Date.now() + 600000,
      isPaused: false,
      totalHouses,
      housesDestroyedPerRound: room.housesDestroyedPerRound || room.settings.housesDestroyedPerRound || 2,
      houses: housesRecord,
      fugitiveUid: callerUid,
      fugitiveCurrentHouse: currentHouse,
      fugitiveSpawnpointHouse: (room as any).fugitiveSpawnpointHouse || null,
      spawnpointCooldownRounds: (room as any).spawnpointCooldownRounds || 0,
      spawnpointHistory: (room as any).spawnpointHistory || [],
      fugitiveDailyActionExecuted: (room as any).fugitiveDailyActionExecuted || false,
      players: room.matchPlayers || ({} as any),
      actionQueue: (room as any).actionQueue || [],
      events: (room as any).events || [],
      settings: room.settings,
      updatedAt: Date.now(),
    };

    // Execute engine action
    const result = executeFugitiveDailyAction(engineState, payload, Date.now());
    if (!result.success) {
      throw new Error(result.error || 'Action could not be executed.');
    }

    // Prepare updates
    const updates: Record<string, any> = {
      houses: engineState.houses,
      fugitiveCurrentHouse: engineState.fugitiveCurrentHouse,
      fugitiveSpawnpointHouse: engineState.fugitiveSpawnpointHouse,
      spawnpointCooldownRounds: engineState.spawnpointCooldownRounds,
      fugitiveDailyActionExecuted: engineState.fugitiveDailyActionExecuted,
      matchPlayers: cleanFirestoreObject(engineState.players),
      updatedAt: Date.now(),
    };

    // If a pursuer was eliminated, update player state across the room
    if (payload.type === 'eliminate_player' && payload.targetPlayerUid) {
      if (room.players[payload.targetPlayerUid]) {
        updates[`players.${payload.targetPlayerUid}.isAlive`] = false;
        updates[`players.${payload.targetPlayerUid}.status`] = 'dead';
      }
    }

    if (result.event) {
      updates.events = arrayUnion(cleanFirestoreObject(result.event));
    }

    // Update secret briefing if shelter changed
    if (payload.type === 'change_house' && engineState.fugitiveCurrentHouse) {
      transaction.update(secretRef, {
        'specialKnowledge.initialHouseNumber': engineState.fugitiveCurrentHouse,
      });
    }

    transaction.update(roomRef, updates);
    return result;
  });

  // Post system announcement if an assassination occurred
  if (payload.type === 'eliminate_player' && result.success && payload.targetPlayerUid) {
    try {
      const roomSnap = await getDoc(roomRef);
      const targetUid = payload.targetPlayerUid;
      const targetName = (roomSnap.data()?.players as Record<string, any>)?.[targetUid]?.username || 'A citizen';
      await sendSystemChatAnnouncement(
        roomId,
        'global',
        'global',
        `💀 Blood spills upon the cobblestones! ${targetName} was found struck down by an unseen blade!`
      );
    } catch (e) {
      console.warn('Could not post kill announcement:', e);
    }
  }

  return result;
}

/**
 * Abilities that resolve immediately upon activation (information/questions/immediate decrees)
 * rather than waiting for twilight/dawn queue resolution.
 */
export const INSTANT_ABILITY_IDS = new Set([
  'divine_inquiry',
  'hear_rumors',
  'intelligence_inspection',
  'tactical_appraisal',
  'commandeer_tactics',
  'axe_execution',
  'adrenaline_rampage',
  'eclipse',
  'temporal_rewind',
]);

/**
 * Helper to validate whether a player still has an available action in the current phase
 */
function validateAndComputeActionQuota(
  room: RoomDocument,
  uid: string,
  abilityId: string
): { usedCount: number; isUniqueAbility: boolean } {
  const player = room.matchPlayers?.[uid];
  if (!player || (!player.isAlive && !player.isGhost)) {
    throw new Error('Only living combatants (or Communist Ghosts) may enact decrees.');
  }

  const currentRound = room.round || 1;
  const currentPhase = room.phase || 'day';
  const usageRecord = room.actionUsageByPlayer?.[uid];
  const usedCount =
    usageRecord && usageRecord.round === currentRound && usageRecord.phase === currentPhase
      ? usageRecord.count
      : 0;

  const isDaredevilRampage =
    abilityId === 'adrenaline_rampage' && player.statusEffects?.adrenalineSurge && currentPhase === 'day';

  const allowedCount = isDaredevilRampage
    ? Number.MAX_SAFE_INTEGER
    : 1 + (player.statusEffects?.extraAbilityUses || 0);

  if (usedCount >= allowedCount) {
    throw new Error('You have already enacted your decree for this phase.');
  }

  const roleDef = player.roleId ? ROLES[player.roleId] : undefined;
  const abilityDef = roleDef?.abilities.find((a) => a.id === abilityId);
  const isUniqueAbility = abilityDef?.maxUses === 1;

  if (isUniqueAbility) {
    const usedUnique = room.usedUniqueAbilities?.[uid] || [];
    if (usedUnique.includes(abilityId)) {
      throw new Error('This once-per-match unique decree has already been expended.');
    }
  }

  return { usedCount, isUniqueAbility };
}

/**
 * Executes an immediate role action (e.g. Verifier inquiry, Gossip rumors, Veteran recon,
 * General appraisal, Firefighter axe execution, Daredevil rampage, Lunamancer eclipse, Time Traveler rewind)
 * authoritatively and returns the immediate outcome/events.
 */
export async function executeInstantRoleActionInFirestore(
  roomId: string,
  action: Omit<GameAction, 'id' | 'submittedAt' | 'resolved'>
): Promise<{ success: boolean; summaryText: string; events: any[] }> {
  const roomRef = doc(db, 'rooms', roomId);
  const now = Date.now();

  const txResult = await runTransaction(db, async (transaction) => {
    const roomSnap = await transaction.get(roomRef);
    if (!roomSnap.exists()) {
      throw new Error('Chamber does not exist.');
    }

    const room = roomSnap.data() as RoomDocument;
    const { usedCount, isUniqueAbility } = validateAndComputeActionQuota(
      room,
      action.sourcePlayerUid,
      action.abilityId
    );

    const totalHouses = room.totalHouses || room.settings.totalHouses || 35;
    const rawHouses = room.houses || initializeHouses(totalHouses, 1);
    const housesRecord: Record<number, any> = {};
    for (const [k, v] of Object.entries(rawHouses)) {
      housesRecord[Number(k)] = {
        id: `house_${k}`,
        number: Number(k),
        status: v.isDestroyed ? 'destroyed' : v.hasActiveSpawnpoint ? 'special' : (v.status || 'available'),
        isDestroyed: v.isDestroyed || false,
        isBurned: v.isBurned || false,
        hasActiveBomb: v.hasActiveBomb || false,
        hasActiveSpawnpoint: v.hasActiveSpawnpoint || false,
        isFugitiveShelter: v.isFugitiveShelter || false,
        history: v.history || [],
      };
    }

    const engineState: EngineMatchState = {
      roomId,
      status: (room.status as any) || 'in_progress',
      round: room.round || 1,
      phase: room.phase || 'day',
      phaseEndsAt: room.phaseEndsAt || now,
      isPaused: false,
      totalHouses,
      housesDestroyedPerRound: room.housesDestroyedPerRound || room.settings.housesDestroyedPerRound || 2,
      houses: housesRecord,
      fugitiveUid: room.fugitivePlayerUid || '',
      fugitiveCurrentHouse: (room as any).fugitiveCurrentHouse || 1,
      fugitiveSpawnpointHouse: (room as any).fugitiveSpawnpointHouse || null,
      spawnpointCooldownRounds: (room as any).spawnpointCooldownRounds || 0,
      spawnpointHistory: (room as any).spawnpointHistory || [],
      fugitiveDailyActionExecuted: (room as any).fugitiveDailyActionExecuted || false,
      players: JSON.parse(JSON.stringify(room.matchPlayers || {})),
      actionQueue: [],
      events: [],
      settings: room.settings,
      updatedAt: now,
    };

    const fullAction: GameAction = {
      ...action,
      id: `act_${now}_${Math.random().toString(36).substring(2, 7)}`,
      submittedAt: now,
      resolved: true,
    };

    hydrateRolesIntoPlayers(roomId, engineState.players, (room as any).authoritativeRoles);

    const completeResult = resolveCompleteActionQueue(engineState as any, [fullAction], now);
    const { publicPlayers, authoritativeRoles } = stripRolesAndEncode(
      roomId,
      engineState.players,
      (room as any).authoritativeRoles
    );

    const updates: Record<string, any> = {
      matchPlayers: publicPlayers,
      authoritativeRoles,
      houses: cleanFirestoreObject(engineState.houses),
      [`actionUsageByPlayer.${action.sourcePlayerUid}`]: {
        round: room.round || 1,
        phase: room.phase || 'day',
        count: usedCount + 1,
      },
      updatedAt: now,
    };

    if (isUniqueAbility) {
      updates[`usedUniqueAbilities.${action.sourcePlayerUid}`] = arrayUnion(action.abilityId);
    }

    // Special immediate effects
    if (action.abilityId === 'eclipse' && room.phase === 'day') {
      transitionMatchPhase(engineState, now);
      updates.status = engineState.status;
      updates.phase = engineState.phase;
      updates.phaseEndsAt = engineState.phaseEndsAt;
    } else if (action.abilityId === 'temporal_rewind') {
      updates.fugitiveDailyActionExecuted = false;
      updates.actionUsageByPlayer = {};
    }

    // Sync any casualties
    for (const victimUid of completeResult.deaths) {
      if (engineState.players[victimUid]) {
        engineState.players[victimUid].isAlive = false;
      }
      if (room.players?.[victimUid]) {
        updates[`players.${victimUid}.isAlive`] = false;
        updates[`players.${victimUid}.status`] = 'dead';
      }
    }

    if (completeResult.events.length > 0) {
      const cleaned = completeResult.events.map((e) => cleanFirestoreObject(e));
      updates.events = arrayUnion(...cleaned);
    }

    transaction.update(roomRef, updates);

    const summaryText =
      completeResult.events.map((e) => e.message).filter(Boolean).join(' ') ||
      'Instant decree executed successfully.';

    return {
      success: true,
      summaryText,
      events: completeResult.events,
      deaths: completeResult.deaths,
    };
  });

  // Broadcast public deaths if any occurred (e.g. Firefighter axe execution, Daredevil rampage)
  if (txResult.deaths && txResult.deaths.length > 0) {
    try {
      await sendSystemChatAnnouncement(
        roomId,
        'global',
        'global',
        `💀 Bloodshed in broad daylight! ${txResult.summaryText}`
      );
    } catch (e) {
      console.warn('Could not post instant kill announcement:', e);
    }
  }

  return txResult;
}

/**
 * Submits a phase-queued ability action to the room's actionQueue
 * with strict server-side validation of the 1-action-per-phase limit.
 */
export async function submitRoomAction(
  roomId: string,
  action: Omit<GameAction, 'id' | 'submittedAt' | 'resolved'>
): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId);
  const now = Date.now();

  await runTransaction(db, async (transaction) => {
    const roomSnap = await transaction.get(roomRef);
    if (!roomSnap.exists()) {
      throw new Error('Chamber does not exist.');
    }

    const room = roomSnap.data() as RoomDocument;
    const { usedCount, isUniqueAbility } = validateAndComputeActionQuota(
      room,
      action.sourcePlayerUid,
      action.abilityId
    );

    const fullAction: GameAction = {
      ...action,
      id: `act_${now}_${Math.random().toString(36).substring(2, 7)}`,
      submittedAt: now,
      resolved: false,
    };

    const updates: Record<string, any> = {
      actionQueue: arrayUnion(cleanFirestoreObject(fullAction)),
      [`actionUsageByPlayer.${action.sourcePlayerUid}`]: {
        round: room.round || 1,
        phase: room.phase || 'day',
        count: usedCount + 1,
      },
      updatedAt: now,
    };

    if (isUniqueAbility) {
      updates[`usedUniqueAbilities.${action.sourcePlayerUid}`] = arrayUnion(action.abilityId);
    }

    transaction.update(roomRef, updates);
  });
}

/**
 * Advances the match phase authoritatively in Firestore.
 * Transitions Day -> Night (resolving daytime decrees) or Night -> Day (executing nightly demolitions & incrementing round).
 */
export async function advanceMatchPhaseInFirestore(
  roomId: string,
  callerUid?: string,
  forceManual: boolean = false
): Promise<{ transitioned: boolean; newPhase?: string; newRound?: number }> {
  const roomRef = doc(db, 'rooms', roomId);
  const now = Date.now();

  const result = await runTransaction(db, async (transaction) => {
    const roomSnap = await transaction.get(roomRef);
    if (!roomSnap.exists()) {
      return { transitioned: false };
    }

    const room = roomSnap.data() as RoomDocument;

    // Only active match can transition
    if (room.status === 'lobby' || room.status === 'finished' || room.status === 'ended') {
      return { transitioned: false };
    }

    // Check timer unless forceManual is requested
    if (!forceManual && room.phaseEndsAt && now < room.phaseEndsAt) {
      return { transitioned: false };
    }

    // Permission check for forceManual: only host or chamber creator can force
    if (forceManual && callerUid) {
      const isHost = room.hostUid === callerUid || room.createdById === callerUid;
      if (!isHost) {
        throw new Error('Only the presiding Host Moderator or Chamber Creator may manually advance match phases.');
      }
    }

    // Build current engine state from Firestore room snapshot
    const totalHouses = room.totalHouses || room.settings.totalHouses || 35;
    const rawHouses = room.houses || initializeHouses(totalHouses, 1);
    const housesRecord: Record<number, any> = {};
    for (const [k, v] of Object.entries(rawHouses)) {
      housesRecord[Number(k)] = {
        id: `house_${k}`,
        number: Number(k),
        status: v.isDestroyed ? 'destroyed' : v.hasActiveSpawnpoint ? 'special' : (v.status || 'available'),
        isDestroyed: v.isDestroyed || false,
        isBurned: v.isBurned || false,
        hasActiveBomb: v.hasActiveBomb || false,
        hasActiveSpawnpoint: v.hasActiveSpawnpoint || false,
        isFugitiveShelter: v.isFugitiveShelter || false,
        history: v.history || [],
      };
    }

    const engineState: EngineMatchState = {
      roomId,
      status: (room.status as any) || 'day',
      round: room.round || 1,
      phase: room.phase || 'day',
      phaseEndsAt: room.phaseEndsAt || now,
      isPaused: false,
      totalHouses,
      housesDestroyedPerRound: room.housesDestroyedPerRound || room.settings.housesDestroyedPerRound || 2,
      houses: housesRecord,
      fugitiveUid: room.fugitivePlayerUid || '',
      fugitiveCurrentHouse: (room as any).fugitiveCurrentHouse || 1,
      fugitiveSpawnpointHouse: (room as any).fugitiveSpawnpointHouse || null,
      spawnpointCooldownRounds: (room as any).spawnpointCooldownRounds || 0,
      spawnpointHistory: (room as any).spawnpointHistory || [],
      fugitiveDailyActionExecuted: (room as any).fugitiveDailyActionExecuted || false,
      players: room.matchPlayers || ({} as any),
      actionQueue: (room as any).actionQueue || [],
      events: (room as any).events || [],
      settings: room.settings,
      updatedAt: now,
    };

    // 1. Resolve phase action queue using complete Phase 6 ability pipeline
    const rawQueue = [...engineState.actionQueue];
    engineState.actionQueue = [];

    hydrateRolesIntoPlayers(roomId, engineState.players, (room as any).authoritativeRoles);

    const completeResult = resolveCompleteActionQueue(engineState as any, rawQueue, now);
    const statusResult = resolveStatusEffects(engineState as any, Math.random());

    const allDeaths = new Set<string>([...completeResult.deaths, ...statusResult.deaths]);
    for (const victimUid of allDeaths) {
      if (engineState.players[victimUid]) {
        engineState.players[victimUid].isAlive = false;
      }
    }

    for (const evt of [...completeResult.events, ...statusResult.events]) {
      engineState.events.push(evt);
    }

    const housesDestroyed: number[] = [];
    if (engineState.phase === 'night') {
      const demo = executeNightlyHouseDestruction(engineState, now);
      housesDestroyed.push(...demo.destroyedHouseNumbers);
    }

    const resolutionSummary = {
      round: engineState.round,
      phase: engineState.phase,
      deaths: Array.from(allDeaths),
      housesDestroyed,
    };

    // 2. Transition phase (Day -> Night or Night -> Day with round increment)
    transitionMatchPhase(engineState, now);

    // 3. Write updates to Firestore
    const { publicPlayers, authoritativeRoles } = stripRolesAndEncode(
      roomId,
      engineState.players,
      (room as any).authoritativeRoles
    );

    const updates: Record<string, any> = {
      status: engineState.status,
      phase: engineState.phase,
      round: engineState.round,
      phaseEndsAt: engineState.phaseEndsAt,
      houses: cleanFirestoreObject(engineState.houses),
      fugitiveCurrentHouse: engineState.fugitiveCurrentHouse,
      fugitiveSpawnpointHouse: engineState.fugitiveSpawnpointHouse,
      spawnpointCooldownRounds: engineState.spawnpointCooldownRounds,
      fugitiveDailyActionExecuted: false,
      matchPlayers: publicPlayers,
      authoritativeRoles,
      actionQueue: [], // Cleared on transition
      actionUsageByPlayer: {}, // Reset per-phase action quotas
      updatedAt: now,
    };

    // Reflect any casualties onto room players roster
    for (const [pUid, pState] of Object.entries(engineState.players)) {
      if (!pState.isAlive && room.players[pUid]) {
        updates[`players.${pUid}.isAlive`] = false;
        updates[`players.${pUid}.status`] = 'dead';
      }
    }

    if (engineState.events.length > 0) {
      const cleanedEvents = engineState.events.slice(-5).map((e) => cleanFirestoreObject(e));
      updates.events = arrayUnion(...cleanedEvents);
    }

    if (engineState.status === 'finished') {
      updates.winnerTeam = engineState.winnerTeam;
      updates.winningPlayerUids = engineState.winningPlayerUids;
      updates.endReason = engineState.endReason;
    }

    transaction.update(roomRef, updates);

    return {
      transitioned: true,
      newPhase: engineState.phase,
      newRound: engineState.round,
      deaths: resolutionSummary.deaths,
    };
  });

  // Post system announcement if transitioned
  if (result.transitioned && result.newPhase) {
    try {
      const announcement =
        result.newPhase === 'night'
          ? `Twilight settles upon the village. Night has fallen upon Round ${result.newRound || 1}! Nocturnal conspiracies commence.`
          : `Dawn breaks over the realm! Round ${result.newRound || 2} begins as the morning mist uncovers the night's wreckage.`;
      await sendSystemChatAnnouncement(roomId, 'global', 'global', announcement);

      if (result.deaths && result.deaths.length > 0) {
        await sendSystemChatAnnouncement(
          roomId,
          'global',
          'global',
          `💀 Morning discovery: Casualties were discovered from twilight resolution: ${result.deaths.length} hunter(s) have fallen!`
        );
      }
    } catch (e) {
      console.warn('Could not post phase transition announcement:', e);
    }
  }

  return result;
}
