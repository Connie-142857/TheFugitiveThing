// Authoritative Server-Side Game Engine for The Fugitive
// Governs state transitions, time systems, house demolition, The Fugitive's actions,
// spawnpoint teleportation with 11-clue generation, action priority resolution, and victory checks.

import type {
  MatchStateEnum,
  RoomSettings,
  HouseRecord,
  PlayerInMatch,
  GameAction,
  GameEvent,
  SpawnpointClue,
} from '../types/game.ts';
import type { TeamId } from '../types/rules.ts';
import { GameEventFactory } from './gameEventManager.ts';

export interface EngineMatchState {
  roomId: string;
  status: MatchStateEnum;
  round: number;
  phase: 'day' | 'night';
  phaseEndsAt: number;
  isPaused: boolean;
  pausedAt?: number;
  
  // Board & Progression
  totalHouses: number;
  housesDestroyedPerRound: number;
  houses: Record<number, HouseRecord>;

  // The Fugitive Authoritative State
  fugitiveUid: string;
  fugitiveCurrentHouse: number;
  fugitiveSpawnpointHouse: number | null;
  spawnpointCooldownRounds: number;
  spawnpointHistory: SpawnpointClue[];
  fugitiveDailyActionExecuted: boolean;

  // Active Players Roster
  players: Record<string, PlayerInMatch>;

  // Queued Actions for Current Phase
  actionQueue: GameAction[];

  // Event Ledger
  events: GameEvent[];

  // Victory
  winnerTeam?: TeamId | 'draw';
  winningPlayerUids?: string[];
  endReason?: string;
  
  settings: RoomSettings;
  updatedAt: number;
}

export type FugitiveActionType =
  | 'change_house'
  | 'eliminate_player'
  | 'investigate_player'
  | 'create_spawnpoint';

export interface FugitiveActionPayload {
  type: FugitiveActionType;
  targetHouseNumber?: number;
  targetPlayerUid?: string;
}

// -------------------------------------------------------------
// 1. TIME SYSTEM (Real-Time vs Accelerated & Interruption Recovery)
// -------------------------------------------------------------

/**
 * Calculates transition in Real-Time Mode:
 * Day: 08:00 to 18:00 (10 hours)
 * Night: 18:00 to 08:00 (14 hours)
 */
export function calculateNextRealTimeTransition(fromTimestamp: number): {
  currentPhase: 'day' | 'night';
  nextPhase: 'day' | 'night';
  phaseEndsAt: number;
} {
  const date = new Date(fromTimestamp);
  const hour = date.getHours();
  const minute = date.getMinutes();

  const currentTimeInMinutes = hour * 60 + minute;
  const dayStartMinutes = 8 * 60;   // 08:00 = 480
  const nightStartMinutes = 18 * 60; // 18:00 = 1080

  const isDay = currentTimeInMinutes >= dayStartMinutes && currentTimeInMinutes < nightStartMinutes;

  const targetDate = new Date(fromTimestamp);
  targetDate.setSeconds(0, 0);

  if (isDay) {
    // Current is Day, next is Night at 18:00 today
    targetDate.setHours(18, 0, 0, 0);
    return {
      currentPhase: 'day',
      nextPhase: 'night',
      phaseEndsAt: targetDate.getTime(),
    };
  } else {
    // Current is Night, next is Day at 08:00 (today or tomorrow)
    if (currentTimeInMinutes >= nightStartMinutes) {
      // After 18:00: day starts tomorrow at 08:00
      targetDate.setDate(targetDate.getDate() + 1);
    }
    targetDate.setHours(8, 0, 0, 0);
    return {
      currentPhase: 'night',
      nextPhase: 'day',
      phaseEndsAt: targetDate.getTime(),
    };
  }
}

/**
 * Calculates transition in Accelerated Mode based on room settings
 */
export function calculateNextAcceleratedTransition(
  currentPhase: 'day' | 'night',
  settings: RoomSettings,
  now: number
): {
  nextPhase: 'day' | 'night';
  phaseEndsAt: number;
} {
  const nextPhase = currentPhase === 'day' ? 'night' : 'day';
  const durationSec =
    currentPhase === 'day'
      ? settings.dayDurationSeconds || 600
      : settings.nightDurationSeconds || 300;

  return {
    nextPhase,
    phaseEndsAt: now + durationSec * 1000,
  };
}

/**
 * Checks if current phase expired and returns next schedule
 */
export function computePhaseTransition(
  settings: RoomSettings,
  currentPhase: 'day' | 'night',
  now: number = Date.now()
): {
  nextPhase: 'day' | 'night';
  phaseEndsAt: number;
} {
  if (settings.isRealTime) {
    const rt = calculateNextRealTimeTransition(now);
    return {
      nextPhase: rt.nextPhase,
      phaseEndsAt: rt.phaseEndsAt,
    };
  } else {
    return calculateNextAcceleratedTransition(currentPhase, settings, now);
  }
}

// -------------------------------------------------------------
// 2. HOUSE SYSTEM INITIALIZATION & MUTATIONS
// -------------------------------------------------------------

/**
 * Initializes dwellings from 1 to totalHouses
 */
export function initializeHouses(
  totalHouses: number,
  fugitiveShelterHouse: number
): Record<number, HouseRecord> {
  const houses: Record<number, HouseRecord> = {};
  for (let num = 1; num <= totalHouses; num++) {
    const isFugitive = num === fugitiveShelterHouse;
    houses[num] = {
      id: `house_${num}`,
      number: num,
      status: isFugitive ? 'occupied' : 'available',
      isDestroyed: false,
      isBurned: false,
      hasActiveBomb: false,
      hasActiveSpawnpoint: false,
      isFugitiveShelter: isFugitive,
      history: [],
    };
  }
  return houses;
}

/**
 * Retrieves valid, non-destroyed house numbers.
 * INVARIANT: Houses where The Fugitive resides or has an active Spawnpoint
 * can be excluded from targeting/demolition pools.
 */
export function getValidUndestroyedHouses(
  houses: Record<number, HouseRecord>,
  excludeFugitiveHouse: boolean = false,
  fugitiveHouseNum?: number,
  excludeSpawnpointHouse: boolean = false,
  spawnpointHouseNum?: number | null
): number[] {
  return Object.values(houses)
    .filter((h) => {
      if (h.isDestroyed) return false;
      if (
        excludeFugitiveHouse &&
        (h.isFugitiveShelter || (fugitiveHouseNum !== undefined && h.number === fugitiveHouseNum))
      ) {
        return false;
      }
      if (
        excludeSpawnpointHouse &&
        (h.hasActiveSpawnpoint ||
          (spawnpointHouseNum !== undefined && spawnpointHouseNum !== null && h.number === spawnpointHouseNum))
      ) {
        return false;
      }
      return true;
    })
    .map((h) => h.number);
}

// -------------------------------------------------------------
// 3. THE FUGITIVE ACTIONS & SPAWNPOINT TELEPORTATION
// -------------------------------------------------------------

export interface FugitiveActionResult {
  success: boolean;
  error?: string;
  intel?: {
    targetUid: string;
    targetName: string;
    targetRole?: string;
    targetTeam?: TeamId;
  };
  event?: GameEvent;
}

/**
 * Executes The Fugitive's daily action
 */
export function executeFugitiveDailyAction(
  state: EngineMatchState,
  action: FugitiveActionPayload,
  now: number = Date.now()
): FugitiveActionResult {
  if (state.phase !== 'day') {
    return { success: false, error: 'The Fugitive actions may only be performed during the Day phase.' };
  }

  if (state.fugitiveDailyActionExecuted) {
    return { success: false, error: 'The Fugitive has already exercised their daily action for this round.' };
  }

  switch (action.type) {
    case 'change_house': {
      if (!action.targetHouseNumber) {
        return { success: false, error: 'Target dwelling number is required to relocate.' };
      }
      const targetHouse = state.houses[action.targetHouseNumber];
      if (!targetHouse) {
        return { success: false, error: `Dwelling ${action.targetHouseNumber} does not exist.` };
      }
      if (targetHouse.isDestroyed) {
        return { success: false, error: `Cannot relocate to destroyed dwelling ${action.targetHouseNumber}.` };
      }
      if (targetHouse.number === state.fugitiveCurrentHouse) {
        return { success: false, error: 'The Fugitive is already sheltering in this dwelling.' };
      }

      // Evacuate old dwelling
      const oldHouse = state.houses[state.fugitiveCurrentHouse];
      if (oldHouse) {
        oldHouse.status = oldHouse.hasActiveSpawnpoint ? 'special' : 'available';
        oldHouse.isFugitiveShelter = false;
      }

      // Occupy new dwelling
      state.fugitiveCurrentHouse = targetHouse.number;
      targetHouse.status = 'occupied';
      targetHouse.isFugitiveShelter = true;
      targetHouse.history.push({
        round: state.round,
        phase: state.phase,
        type: 'inspected',
        sourceRoleOrTeam: 'fugitive',
        timestamp: now,
      });

      state.fugitiveDailyActionExecuted = true;
      state.updatedAt = now;

      const event = GameEventFactory.fugitiveEscaped(state.round, state.phase);
      state.events.push(event);

      return { success: true, event };
    }

    case 'create_spawnpoint': {
      if (!action.targetHouseNumber) {
        return { success: false, error: 'Target dwelling number is required to set Spawnpoint.' };
      }
      if (state.spawnpointCooldownRounds > 0) {
        return {
          success: false,
          error: `Spawnpoint ability is on cooldown for ${state.spawnpointCooldownRounds} more round(s).`,
        };
      }

      const targetHouse = state.houses[action.targetHouseNumber];
      if (!targetHouse) {
        return { success: false, error: `Dwelling ${action.targetHouseNumber} does not exist.` };
      }
      if (targetHouse.isDestroyed) {
        return { success: false, error: `Cannot establish Spawnpoint in destroyed dwelling ${action.targetHouseNumber}.` };
      }
      if (targetHouse.number === state.fugitiveCurrentHouse) {
        return { success: false, error: 'Cannot establish Spawnpoint in the dwelling you currently occupy.' };
      }

      // Remove old spawnpoint if one exists
      if (state.fugitiveSpawnpointHouse !== null && state.houses[state.fugitiveSpawnpointHouse]) {
        const oldSpawn = state.houses[state.fugitiveSpawnpointHouse];
        oldSpawn.hasActiveSpawnpoint = false;
        if (oldSpawn.status === 'special') oldSpawn.status = 'available';
      }

      // Set new spawnpoint
      state.fugitiveSpawnpointHouse = targetHouse.number;
      targetHouse.hasActiveSpawnpoint = true;
      targetHouse.status = 'special';
      targetHouse.history.push({
        round: state.round,
        phase: state.phase,
        type: 'spawnpoint_teleport',
        sourceRoleOrTeam: 'fugitive_spawnpoint',
        timestamp: now,
      });

      state.fugitiveDailyActionExecuted = true;
      state.updatedAt = now;

      // Secret notification event for The Fugitive
      const event = GameEventFactory.abilityUsed(
        state.round,
        state.phase,
        state.fugitiveUid,
        'The Fugitive',
        'fugitive',
        'Establish Spawnpoint',
        `Secret Spawnpoint designated at dwelling ${targetHouse.number}.`,
        false
      );
      state.events.push(event);

      return { success: true, event };
    }

    case 'eliminate_player': {
      if (!action.targetPlayerUid) {
        return { success: false, error: 'Target player UID is required for elimination.' };
      }
      const targetPlayer = state.players[action.targetPlayerUid];
      if (!targetPlayer) {
        return { success: false, error: 'Target player was not found in match.' };
      }
      if (!targetPlayer.isAlive) {
        return { success: false, error: 'Target player is already dead.' };
      }

      // Queue assassination for resolution or resolve immediately if day
      // According to rulebook, The Fugitive can eliminate a player.
      // We check protection
      if (targetPlayer.statusEffects.protected) {
        targetPlayer.statusEffects.protected = false;
        state.fugitiveDailyActionExecuted = true;
        state.updatedAt = now;

        const protEvent = GameEventFactory.playerProtected(
          state.round,
          state.phase,
          targetPlayer.uid,
          targetPlayer.username,
          'Guardian Protection'
        );
        state.events.push(protEvent);
        return { success: true, event: protEvent };
      }

      // Execute elimination
      targetPlayer.isAlive = false;
      state.fugitiveDailyActionExecuted = true;
      state.updatedAt = now;

      const killEvent = GameEventFactory.playerKilled(
        state.round,
        state.phase,
        targetPlayer.uid,
        targetPlayer.username,
        'Eliminated by The Fugitive'
      );
      state.events.push(killEvent);

      return { success: true, event: killEvent };
    }

    case 'investigate_player': {
      if (!action.targetPlayerUid) {
        return { success: false, error: 'Target player UID is required for investigation.' };
      }
      const targetPlayer = state.players[action.targetPlayerUid];
      if (!targetPlayer) {
        return { success: false, error: 'Target player was not found in match.' };
      }

      state.fugitiveDailyActionExecuted = true;
      state.updatedAt = now;

      const intelEvent = GameEventFactory.abilityUsed(
        state.round,
        state.phase,
        state.fugitiveUid,
        'The Fugitive',
        'fugitive',
        'Investigate Citizen',
        `Intel confirmed: ${targetPlayer.username} belongs to ${targetPlayer.team || 'Unknown'} (Role: ${targetPlayer.roleId || 'Unknown'}).`,
        false
      );
      state.events.push(intelEvent);

      return {
        success: true,
        intel: {
          targetUid: targetPlayer.uid,
          targetName: targetPlayer.username,
          targetRole: targetPlayer.roleId,
          targetTeam: targetPlayer.team,
        },
        event: intelEvent,
      };
    }

    default:
      return { success: false, error: `Unknown Fugitive action type.` };
  }
}

/**
 * Teleports The Fugitive when struck if a Spawnpoint is active.
 * Generates an 11-house clue containing the new shelter + 10 distinct decoys.
 */
export function triggerSpawnpointTeleport(
  state: EngineMatchState,
  now: number = Date.now()
): {
  escaped: boolean;
  clueHouses?: number[];
  event?: GameEvent;
} {
  // If no active spawnpoint, lethal hit cannot be deflected
  if (state.fugitiveSpawnpointHouse === null) {
    return { escaped: false };
  }

  const spawnHouseNum = state.fugitiveSpawnpointHouse;
  const destinationHouse = state.houses[spawnHouseNum];

  // If destination was somehow destroyed, teleport fails
  if (!destinationHouse || destinationHouse.isDestroyed) {
    state.fugitiveSpawnpointHouse = null;
    return { escaped: false };
  }

  // 1. Evacuate current house
  const oldHouse = state.houses[state.fugitiveCurrentHouse];
  if (oldHouse) {
    oldHouse.isFugitiveShelter = false;
    oldHouse.status = 'available';
  }

  // 2. Teleport to Spawnpoint
  state.fugitiveCurrentHouse = spawnHouseNum;
  destinationHouse.isFugitiveShelter = true;
  destinationHouse.status = 'occupied';
  destinationHouse.hasActiveSpawnpoint = false;

  // 3. Consume spawnpoint and set cooldown
  state.fugitiveSpawnpointHouse = null;
  state.spawnpointCooldownRounds = 1;

  // 4. Generate 11-house clue (1 real + 10 decoys)
  const validHouses = getValidUndestroyedHouses(state.houses);
  const decoysPool = validHouses.filter((h) => h !== spawnHouseNum);

  // Shuffle decoys
  for (let i = decoysPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [decoysPool[i], decoysPool[j]] = [decoysPool[j], decoysPool[i]];
  }

  // Pick up to 10 decoys
  const selectedDecoys = decoysPool.slice(0, 10);
  const clueHouses = [spawnHouseNum, ...selectedDecoys];

  // Shuffle the final 11 houses so the real house position is obfuscated
  for (let i = clueHouses.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [clueHouses[i], clueHouses[j]] = [clueHouses[j], clueHouses[i]];
  }

  // Record spawnpoint history
  const clueEntry: SpawnpointClue = {
    round: state.round,
    actualHouse: spawnHouseNum,
    announcedHouses: clueHouses,
    timestamp: now,
  };
  state.spawnpointHistory.push(clueEntry);

  // 5. Emit public event
  const event = GameEventFactory.spawnpointActivated(state.round, state.phase, clueHouses);
  state.events.push(event);

  state.updatedAt = now;
  return {
    escaped: true,
    clueHouses,
    event,
  };
}

// -------------------------------------------------------------
// 4. NIGHTLY RANDOM HOUSE DESTRUCTION (RULEBOOK BOUNDARY)
// -------------------------------------------------------------

/**
 * At the end of each night, destroy the configured number of random eligible houses.
 * INVARIANT: Neither the house containing The Fugitive nor a house with an active
 * Spawnpoint may EVER be destroyed by house destruction.
 */
export function executeNightlyHouseDestruction(
  state: EngineMatchState,
  now: number = Date.now()
): {
  destroyedHouseNumbers: number[];
  event?: GameEvent;
} {
  const quota = state.housesDestroyedPerRound || 1;

  // Filter eligible houses: strictly NOT destroyed, NOT The Fugitive's current shelter,
  // and NOT The Fugitive's active spawnpoint.
  const eligibleHouses = getValidUndestroyedHouses(
    state.houses,
    true, // excludeFugitiveHouse
    state.fugitiveCurrentHouse,
    true, // excludeSpawnpointHouse
    state.fugitiveSpawnpointHouse
  );

  if (eligibleHouses.length === 0) {
    return { destroyedHouseNumbers: [] };
  }

  // Shuffle eligible houses
  const shuffled = [...eligibleHouses];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Select up to quota
  const candidates = shuffled.slice(0, Math.min(quota, shuffled.length));
  const housesToDestroy: number[] = [];

  for (const houseNum of candidates) {
    // HARD IMMUNITY CHECK: A house where The Fugitive resides or has a spawnpoint CANNOT be destroyed!
    if (
      houseNum === state.fugitiveCurrentHouse ||
      (state.fugitiveSpawnpointHouse !== null &&
        state.fugitiveSpawnpointHouse !== undefined &&
        houseNum === state.fugitiveSpawnpointHouse) ||
      state.houses[houseNum]?.isFugitiveShelter ||
      state.houses[houseNum]?.hasActiveSpawnpoint
    ) {
      continue;
    }

    const h = state.houses[houseNum];
    if (h && !h.isDestroyed) {
      h.isDestroyed = true;
      h.status = 'destroyed';
      h.destroyedAtRound = state.round;
      h.destroyedBy = 'nightly_demolition';
      h.history.push({
        round: state.round,
        phase: state.phase,
        type: 'destroyed',
        sourceRoleOrTeam: 'nightly_demolition',
        timestamp: now,
      });
      housesToDestroy.push(houseNum);
    }
  }

  const event = GameEventFactory.houseDestroyed(
    state.round,
    state.phase,
    housesToDestroy,
    'demolition'
  );
  state.events.push(event);
  state.updatedAt = now;

  return {
    destroyedHouseNumbers: housesToDestroy,
    event,
  };
}

// -------------------------------------------------------------
// 5. ACTION QUEUE & PRIORITY RESOLUTION
// -------------------------------------------------------------

export interface ResolutionSummary {
  round: number;
  phase: 'day' | 'night';
  deaths: string[];
  escapes: number[];
  housesDestroyed: number[];
  crimesRecorded: string[];
}

/**
 * Resolves all actions submitted during the phase according to strict priority ordering:
 * 1. Protection / Shields / Wards
 * 2. Lethal Attacks / Bombs / Shooting
 * 3. Statuses / Arrests / Crimes
 * 4. Investigations / Inquiries
 */
export function resolvePhaseActionQueue(
  state: EngineMatchState,
  now: number = Date.now()
): ResolutionSummary {
  state.status = 'resolving';

  const summary: ResolutionSummary = {
    round: state.round,
    phase: state.phase,
    deaths: [],
    escapes: [],
    housesDestroyed: [],
    crimesRecorded: [],
  };

  const queue = [...state.actionQueue];
  state.actionQueue = []; // Clear queue for next phase

  // Sort by priority categories
  // 1. Protection
  const protectionActions = queue.filter(
    (a) => a.abilityId === 'protect' || a.abilityId === 'counter_guard' || a.abilityId === 'bodyguard'
  );
  // 2. Lethal & House Attacks
  const attackActions = queue.filter(
    (a) =>
      a.abilityId === 'shoot_house' ||
      a.abilityId === 'eliminate' ||
      a.abilityId === 'sniper_shot' ||
      a.abilityId === 'detonate' ||
      a.abilityId === 'arson'
  );
  // 3. Statuses & Arrests
  const statusActions = queue.filter(
    (a) => a.abilityId === 'arrest' || a.abilityId === 'poison' || a.abilityId === 'silence'
  );
  // 4. Investigations
  const intelActions = queue.filter(
    (a) => a.abilityId === 'inspect' || a.abilityId === 'divine_inquiry' || a.abilityId === 'inquire'
  );

  // --- Step 1: Protection ---
  for (const act of protectionActions) {
    if (act.targetPlayerUid && state.players[act.targetPlayerUid]) {
      state.players[act.targetPlayerUid].statusEffects.protected = true;
    }
  }

  // --- Step 2: Lethal Attacks & House Attacks ---
  for (const act of attackActions) {
    // A. House shooting (e.g. Detective, Sniper, Citizen)
    if (act.targetHouseNumber) {
      const houseNum = act.targetHouseNumber;
      const targetHouse = state.houses[houseNum];

      if (targetHouse && !targetHouse.isDestroyed) {
        targetHouse.history.push({
          round: state.round,
          phase: state.phase,
          type: 'shot',
          sourceRoleOrTeam: act.abilityId,
          timestamp: now,
        });

        // Did they shoot The Fugitive's dwelling?
        if (targetHouse.number === state.fugitiveCurrentHouse) {
          // Check Spawnpoint escape
          const teleport = triggerSpawnpointTeleport(state, now);
          if (teleport.escaped && teleport.clueHouses) {
            summary.escapes.push(...teleport.clueHouses);
          } else {
            // Lethal hit on The Fugitive without active Spawnpoint
            state.players[state.fugitiveUid].isAlive = false;
            summary.deaths.push(state.fugitiveUid);

            const killEvent = GameEventFactory.playerKilled(
              state.round,
              state.phase,
              state.fugitiveUid,
              'The Fugitive',
              `Shot down in dwelling ${houseNum}`
            );
            state.events.push(killEvent);
          }
        }
      }
    }

    // B. Player direct attacks
    if (act.targetPlayerUid && state.players[act.targetPlayerUid]) {
      const target = state.players[act.targetPlayerUid];
      if (target.isAlive) {
        if (target.statusEffects.protected) {
          target.statusEffects.protected = false; // Shield absorbs hit
          const protEvent = GameEventFactory.playerProtected(
            state.round,
            state.phase,
            target.uid,
            target.username,
            'Nocturnal Wards'
          );
          state.events.push(protEvent);
        } else {
          target.isAlive = false;
          summary.deaths.push(target.uid);
          const killEvent = GameEventFactory.playerKilled(
            state.round,
            state.phase,
            target.uid,
            target.username,
            `Assassinated by ${act.abilityId}`
          );
          state.events.push(killEvent);
        }
      }
    }
  }

  // --- Step 3: Statuses & Arrests ---
  for (const act of statusActions) {
    if (act.targetPlayerUid && state.players[act.targetPlayerUid]) {
      const target = state.players[act.targetPlayerUid];
      if (act.abilityId === 'arrest') {
        target.crimes = (target.crimes || 0) + 1;
        summary.crimesRecorded.push(target.uid);
        const crimeEvt = GameEventFactory.crimeCommitted(
          state.round,
          state.phase,
          target.uid,
          target.username,
          'Municipal Detention / High Arrest'
        );
        state.events.push(crimeEvt);
      }
    }
  }

  // --- Step 4: Intel & Investigations ---
  for (const act of intelActions) {
    if (act.targetPlayerUid && state.players[act.targetPlayerUid]) {
      const target = state.players[act.targetPlayerUid];
      const intelEvt = GameEventFactory.abilityUsed(
        state.round,
        state.phase,
        act.sourcePlayerUid,
        'Investigator',
        act.abilityId,
        'Target Inspection',
        `Classified Record: ${target.username} holds allegiance to ${target.team}.`,
        false
      );
      state.events.push(intelEvt);
    }
  }

  // --- Step 5: Nightly Demolition (if concluding Night phase) ---
  if (state.phase === 'night') {
    const demo = executeNightlyHouseDestruction(state, now);
    summary.housesDestroyed.push(...demo.destroyedHouseNumbers);
  }

  state.updatedAt = now;
  return summary;
}

// -------------------------------------------------------------
// 6. VICTORY CHECK & MATCH LIFECYCLE STATE MACHINE
// -------------------------------------------------------------

export interface VictoryCheckResult {
  isOver: boolean;
  winnerTeam?: TeamId | 'draw';
  winningPlayerUids?: string[];
  reason?: string;
}

/**
 * Evaluates solo role win conditions at match conclusion (Lucky, Cursed, Squire, Spy).
 */
function evaluateSoloWinnersInMatch(state: EngineMatchState): {
  luckyWinners: string[];
  coSoloWinners: string[];
  soloReasons: string[];
} {
  const luckyWinners: string[] = [];
  const coSoloWinners: string[] = [];
  const soloReasons: string[] = [];
  const fugitive = state.players[state.fugitiveUid];

  for (const p of Object.values(state.players)) {
    if (p.roleId === 'lucky' && p.isAlive) {
      luckyWinners.push(p.uid);
      soloReasons.push(`${p.username} survived until match end as Lucky and claims solo victory.`);
    } else if (p.roleId === 'cursed' && !p.isAlive) {
      coSoloWinners.push(p.uid);
      soloReasons.push(`${p.username} achieved Cursed martyrdom.`);
    } else if (p.roleId === 'squire' && p.assignedLordUid) {
      const lord = state.players[p.assignedLordUid];
      if (lord && lord.isAlive) {
        coSoloWinners.push(p.uid);
        soloReasons.push(`${p.username} triumphed as Squire because ${lord.username} survived.`);
      }
    } else if (p.roleId === 'spy' && fugitive && fugitive.isAlive) {
      coSoloWinners.push(p.uid);
      soloReasons.push(`${p.username} won as the covert Spy alongside The Fugitive.`);
    }
  }

  return { luckyWinners, coSoloWinners, soloReasons };
}

/**
 * Checks all win conditions against the living players
 */
export function checkVictoryConditions(state: EngineMatchState): VictoryCheckResult {
  const fugitive = state.players[state.fugitiveUid];
  const regularPlayers = Object.values(state.players).filter((p) => !p.isFugitive);
  const livingRegulars = regularPlayers.filter((p) => p.isAlive);

  // 1. All regular hunters are dead -> The Fugitive wins
  if (livingRegulars.length === 0 && fugitive.isAlive) {
    const solo = evaluateSoloWinnersInMatch(state);
    if (solo.luckyWinners.length > 0) {
      return {
        isOver: true,
        winnerTeam: 'solo',
        winningPlayerUids: solo.luckyWinners,
        reason: solo.soloReasons.join(' '),
      };
    }
    const winners = Array.from(new Set([state.fugitiveUid, ...solo.coSoloWinners]));
    const baseReason = 'The Fugitive has outlasted all pursuers. Complete survival achieved.';
    return {
      isOver: true,
      winnerTeam: 'fugitive',
      winningPlayerUids: winners,
      reason: solo.soloReasons.length > 0 ? `${baseReason} ${solo.soloReasons.join(' ')}` : baseReason,
    };
  }

  // 2. The Fugitive is slain -> Hunters win based on headcount
  if (!fugitive.isAlive) {
    const solo = evaluateSoloWinnersInMatch(state);
    if (solo.luckyWinners.length > 0) {
      return {
        isOver: true,
        winnerTeam: 'solo',
        winningPlayerUids: solo.luckyWinners,
        reason: solo.soloReasons.join(' '),
      };
    }

    // Count living members per team
    const teamCounts: Record<string, number> = {};
    for (const p of livingRegulars) {
      if (p.team && p.team !== 'solo' && p.team !== 'fugitive') {
        teamCounts[p.team] = (teamCounts[p.team] || 0) + 1;
      }
    }

    let highestCount = -1;
    let leadingTeam: TeamId | 'draw' = 'draw';
    let isDraw = false;

    for (const [team, count] of Object.entries(teamCounts)) {
      if (count > highestCount) {
        highestCount = count;
        leadingTeam = team as TeamId;
        isDraw = false;
      } else if (count === highestCount) {
        isDraw = true;
      }
    }

    if (isDraw || leadingTeam === 'draw' || highestCount <= 0) {
      const winners = Array.from(new Set([...livingRegulars.map((p) => p.uid), ...solo.coSoloWinners]));
      const baseReason = 'The Fugitive fell, but living faction headcounts ended in a deadlock draw.';
      return {
        isOver: true,
        winnerTeam: 'draw',
        winningPlayerUids: winners,
        reason: solo.soloReasons.length > 0 ? `${baseReason} ${solo.soloReasons.join(' ')}` : baseReason,
      };
    }

    const winningUids = Array.from(
      new Set([
        ...livingRegulars.filter((p) => p.team === leadingTeam).map((p) => p.uid),
        ...solo.coSoloWinners,
      ])
    );
    const baseReason = `The Fugitive was defeated. The ${leadingTeam} command greatest living headcount (${highestCount} survivors).`;

    return {
      isOver: true,
      winnerTeam: leadingTeam,
      winningPlayerUids: winningUids,
      reason: solo.soloReasons.length > 0 ? `${baseReason} ${solo.soloReasons.join(' ')}` : baseReason,
    };
  }

  return { isOver: false };
}

/**
 * Advances the match to the next phase/round or concludes the match
 */
export function transitionMatchPhase(
  state: EngineMatchState,
  now: number = Date.now()
): EngineMatchState {
  // Check victory first
  const victory = checkVictoryConditions(state);
  if (victory.isOver) {
    state.status = 'finished';
    state.winnerTeam = victory.winnerTeam;
    state.winningPlayerUids = victory.winningPlayerUids;
    state.endReason = victory.reason;
    state.updatedAt = now;

    state.events.push(
      GameEventFactory.matchEnded(
        state.round,
        victory.winnerTeam || 'draw',
        victory.winningPlayerUids || [],
        victory.reason || 'Match ended.'
      )
    );
    return state;
  }

  // Transition Day -> Night or Night -> Day
  if (state.phase === 'day') {
    state.phase = 'night';
    state.status = 'night';
    state.fugitiveDailyActionExecuted = false; // Reset for next day
  } else {
    // Night concludes: advance round
    state.round += 1;
    state.phase = 'day';
    state.status = 'day';
    state.fugitiveDailyActionExecuted = false;

    // Decay spawnpoint cooldown
    if (state.spawnpointCooldownRounds > 0) {
      state.spawnpointCooldownRounds -= 1;
    }

    // Reset temporary protections
    for (const p of Object.values(state.players)) {
      if (!p.statusEffects) p.statusEffects = { extraAbilityUses: 0 };
      p.statusEffects.protected = false;
    }
  }

  // Compute next phase deadline
  const nextSchedule = computePhaseTransition(state.settings, state.phase, now);
  state.phaseEndsAt = nextSchedule.phaseEndsAt;
  state.updatedAt = now;

  // Emit phase announcement event
  const phaseEvt =
    state.phase === 'day'
      ? GameEventFactory.dayStarted(state.round)
      : GameEventFactory.nightStarted(state.round);
  state.events.push(phaseEvt);

  return state;
}

/**
 * Recovers and handles server interruptions or pause/resume states
 */
export function processEngineTick(
  state: EngineMatchState,
  now: number = Date.now()
): {
  state: EngineMatchState;
  didTransition: boolean;
} {
  if (state.isPaused || state.status === 'finished' || state.status === 'waiting') {
    return { state, didTransition: false };
  }

  // If time elapsed past phaseEndsAt, execute resolution & transition
  if (now >= state.phaseEndsAt) {
    resolvePhaseActionQueue(state, now);
    transitionMatchPhase(state, now);
    return { state, didTransition: true };
  }

  return { state, didTransition: false };
}
