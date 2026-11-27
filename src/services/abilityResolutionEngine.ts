// Complete Ability Resolution Engine for The Fugitive
// Covers all 38 roles, team passives, solo roles, abilities, crimes, status effects,
// and simultaneous multi-phase action resolution with automated host decisions.

import type {
  PlayerInMatch,
  HouseRecord,
  GameAction,
  GameEvent,
} from '../types/game.ts';
import type { TeamId } from '../types/rules.ts';
import { TEAMS, ROLES } from '../types/rules.ts';
import { GameEventFactory } from './gameEventManager.ts';
import { triggerSpawnpointTeleport } from './gameEngine.ts';

export interface ExtendedMatchState {
  round: number;
  phase: 'day' | 'night';
  players: Record<string, PlayerInMatch>;
  houses: Record<number, HouseRecord>;
  fugitiveUid: string;
  fugitiveCurrentHouse: number;
  fugitiveSpawnpointHouse: number | null;
  spawnpointCooldownRounds: number;
  spawnpointHistory: any[];
  activeContraptions?: {
    type: 'defibrillator' | 'turret' | 'disruptor';
    secretCode: number;
    ownerUid: string;
    boundPlayerUid?: string;
    isDestroyed: boolean;
  }[];
  activeWar?: {
    declaringTeam: TeamId;
    targetTeam: TeamId;
    active: boolean;
  };
  annihilatorTargetHouse?: number;
  teamChatMessages?: Record<TeamId, string[]>;
  events: GameEvent[];
  updatedAt: number;
}

export interface AbilityResolutionResult {
  deaths: string[];
  revivals: string[];
  transformations: { uid: string; status: 'zombie' | 'ghost' | 'immortal' }[];
  crimesInflicted: string[];
  events: GameEvent[];
}

// -------------------------------------------------------------
// 1. TEAM PASSIVES RESOLUTION
// -------------------------------------------------------------

/**
 * Investigators Team Passive:
 * At the start of the day, intercepts one message sent from each rival team chat.
 */
export function resolveInvestigatorsPassive(
  state: ExtendedMatchState,
  investigatorUids: string[]
): GameEvent[] {
  const events: GameEvent[] = [];
  if (state.phase !== 'day' || investigatorUids.length === 0) return events;

  const rivalTeams: TeamId[] = ['annihilators', 'communists', 'soldiers'];
  for (const team of rivalTeams) {
    const messages = state.teamChatMessages?.[team] || [];
    if (messages.length > 0) {
      const interceptedMsg = messages[messages.length - 1]; // Latest message
      const event = GameEventFactory.abilityUsed(
        state.round,
        'day',
        'system',
        'Imperial Dispatch',
        'intercepted_dispatch',
        'Intercepted Rival Transmission',
        `An intercepted parchment from the ${TEAMS[team].name} reads: "${interceptedMsg}"`,
        false
      );
      event.visibleToTeam = 'investigators';
      events.push(event);
      state.events.push(event);
    }
  }
  return events;
}

/**
 * Annihilators Team Passive:
 * At onset of night, choose a house. If no Annihilator dies during the night
 * and The Fugitive is there, The Fugitive dies. If not there, the house is demolished.
 */
export function resolveAnnihilatorsPassive(
  state: ExtendedMatchState,
  annihilatorDeathsCount: number,
  now: number = Date.now()
): { fugitiveKilled: boolean; houseDemolished?: number; events: GameEvent[] } {
  const events: GameEvent[] = [];
  if (state.phase !== 'night' || !state.annihilatorTargetHouse) {
    return { fugitiveKilled: false, events };
  }

  const targetHouseNum = state.annihilatorTargetHouse;
  const targetHouse = state.houses[targetHouseNum];

  // If an Annihilator died, the passive assault fails
  if (annihilatorDeathsCount > 0) {
    state.annihilatorTargetHouse = undefined;
    return { fugitiveKilled: false, events };
  }

  if (targetHouseNum === state.fugitiveCurrentHouse) {
    // The Fugitive is located there!
    // Check Spawnpoint escape
    const escapeResult = triggerSpawnpointTeleport(state as any, now);
    if (escapeResult.escaped) {
      events.push(escapeResult.event!);
      state.annihilatorTargetHouse = undefined;
      return { fugitiveKilled: false, events };
    }

    // Lethal kill
    state.players[state.fugitiveUid].isAlive = false;
    const killEvt = GameEventFactory.playerKilled(
      state.round,
      'night',
      state.fugitiveUid,
      'The Fugitive',
      `Slain by the Annihilators' Nocturnal Ambush on dwelling ${targetHouseNum}`
    );
    events.push(killEvt);
    state.events.push(killEvt);
    state.annihilatorTargetHouse = undefined;
    return { fugitiveKilled: true, events };
  } else {
    // The Fugitive was not there -> House is demolished, UNLESS it holds an active Spawnpoint or Fugitive shelter
    if (targetHouse && !targetHouse.isDestroyed) {
      const isProtectedFugitiveHouse =
        targetHouseNum === state.fugitiveCurrentHouse ||
        (state.fugitiveSpawnpointHouse !== null &&
          state.fugitiveSpawnpointHouse !== undefined &&
          targetHouseNum === state.fugitiveSpawnpointHouse) ||
        targetHouse.isFugitiveShelter ||
        targetHouse.hasActiveSpawnpoint;

      if (isProtectedFugitiveHouse) {
        // A dwelling with The Fugitive's residence or active Spawnpoint CANNOT be demolished!
        state.annihilatorTargetHouse = undefined;
        return { fugitiveKilled: false, events };
      }

      targetHouse.isDestroyed = true;
      targetHouse.status = 'destroyed';
      targetHouse.destroyedAtRound = state.round;
      targetHouse.destroyedBy = 'ability';

      const demoEvt = GameEventFactory.houseDestroyed(
        state.round,
        'night',
        [targetHouseNum],
        'demolition'
      );
      events.push(demoEvt);
      state.events.push(demoEvt);
      state.annihilatorTargetHouse = undefined;
      return { fugitiveKilled: false, houseDemolished: targetHouseNum, events };
    }
  }

  state.annihilatorTargetHouse = undefined;
  return { fugitiveKilled: false, events };
}

/**
 * Communists Team Passive:
 * At dawn, if a Communist died during the previous night, they rise as a Ghost.
 * Ghosts retain ability usage but do not count toward living headcounts.
 */
export function resolveCommunistsPassive(
  state: ExtendedMatchState,
  nightVictims: string[]
): GameEvent[] {
  const events: GameEvent[] = [];
  if (state.phase !== 'day' && state.phase !== 'night') return events;

  for (const uid of nightVictims) {
    const player = state.players[uid];
    if (player && player.team === 'communists' && !player.isGhost) {
      player.isGhost = true;
      const event = GameEventFactory.playerTransformed(
        state.round,
        'day',
        player.uid,
        player.username,
        'ghost'
      );
      events.push(event);
      state.events.push(event);
    }
  }
  return events;
}

/**
 * Soldiers Team Passive:
 * The first time an attempt is made to kill a Soldier, they have a 50% chance of surviving.
 */
export function evaluateSoldierSurvivalChance(
  player: PlayerInMatch,
  randomRoll: number = Math.random()
): boolean {
  if (player.team !== 'soldiers') return false;

  // Veteran has 2 extra lives before team passive
  if (player.roleId === 'veteran' && (player.survivedAttacksCount || 0) < 2) {
    player.survivedAttacksCount = (player.survivedAttacksCount || 0) + 1;
    return true; // Veteran automatically absorbs first 2 mortal blows
  }

  // 50% roll on the first attempted kill (or 3rd for Veteran)
  if ((player.survivedAttacksCount || 0) === 0 || (player.roleId === 'veteran' && player.survivedAttacksCount === 2)) {
    player.survivedAttacksCount = (player.survivedAttacksCount || 0) + 1;
    return randomRoll < 0.5; // 50% chance of survival
  }

  return false;
}

// -------------------------------------------------------------
// 2. CRIME SYSTEM RESOLUTION
// -------------------------------------------------------------

/**
 * Inflicts a Crime on a player:
 * If the player already has a crime, causes death according to the original rules.
 * Roles with cannotCommitCrimes (e.g. Prisoner) are immune.
 */
export function inflictCrime(
  player: PlayerInMatch,
  reason: string,
  state: ExtendedMatchState
): { playerDied: boolean; event: GameEvent } {
  if (player.cannotCommitCrimes) {
    return {
      playerDied: false,
      event: GameEventFactory.abilityUsed(
        state.round,
        state.phase,
        player.uid,
        player.username,
        player.roleId || 'unknown',
        'Crime Immunity',
        `${player.username} is immune to municipal infractions.`,
        false
      ),
    };
  }

  if ((player.crimes || 0) > 0) {
    // Second crime: penalty death!
    player.isAlive = false;
    const deathEvt = GameEventFactory.playerKilled(
      state.round,
      state.phase,
      player.uid,
      player.username,
      `Executed by law for committing a second Crime (${reason})`
    );
    state.events.push(deathEvt);
    return { playerDied: true, event: deathEvt };
  } else {
    // First crime
    player.crimes = 1;
    const crimeEvt = GameEventFactory.crimeCommitted(
      state.round,
      state.phase,
      player.uid,
      player.username,
      reason
    );
    state.events.push(crimeEvt);
    return { playerDied: false, event: crimeEvt };
  }
}

/**
 * Clears crimes at the end of a round if a player used no abilities.
 * Invariant: Roles with passive abilities CANNOT lose their crimes.
 */
export function evaluateCrimeDecay(
  players: Record<string, PlayerInMatch>,
  usedAbilitiesThisRound: Set<string>,
  crimesInflictedThisRound: Set<string> = new Set()
): string[] {
  const clearedUids: string[] = [];

  for (const player of Object.values(players)) {
    if ((player.crimes || 0) > 0 && !crimesInflictedThisRound.has(player.uid)) {
      // If role has passive abilities, crimes are indelible
      const roleDef = player.roleId ? ROLES[player.roleId] : null;
      const hasPassive =
        roleDef?.abilities.some((a) => a.timing === 'passive') ||
        player.hasPassiveAbility;

      if (!hasPassive && !usedAbilitiesThisRound.has(player.uid)) {
        player.crimes = 0;
        clearedUids.push(player.uid);
      }
    }
  }

  return clearedUids;
}

// -------------------------------------------------------------
// 3. STATUS EFFECTS RESOLUTION
// -------------------------------------------------------------

/**
 * Resolves active status effects at end of phase/day:
 * - Poison: chance to cure or kill (or instant death if 2 doses)
 * - Fire: dies at end of round unless extinguished
 * - Adrenaline: expires Daredevil at end of day
 */
export function resolveStatusEffects(
  state: ExtendedMatchState,
  randomSeed: number = Math.random()
): { deaths: string[]; cured: string[]; events: GameEvent[] } {
  const deaths: string[] = [];
  const cured: string[] = [];
  const events: GameEvent[] = [];

  for (const player of Object.values(state.players)) {
    if (!player.isAlive) continue;
    if (!player.statusEffects) {
      player.statusEffects = { extraAbilityUses: 0 };
    }

    // A. Fire Status
    if (player.statusEffects.burning) {
      // Fire kills at the end of the round if not extinguished
      player.isAlive = false;
      player.statusEffects.burning = false;
      deaths.push(player.uid);
      const fireDeathEvt = GameEventFactory.playerKilled(
        state.round,
        state.phase,
        player.uid,
        player.username,
        'Consumed by raging flames (Fire)'
      );
      events.push(fireDeathEvt);
      state.events.push(fireDeathEvt);
    }

    // B. Poison Status (Day Phase)
    if (player.statusEffects.poisoned && state.phase === 'day') {
      if (randomSeed < 0.5) {
        // Cured
        player.statusEffects.poisoned = false;
        cured.push(player.uid);
      } else {
        // Poison fatality
        player.isAlive = false;
        player.statusEffects.poisoned = false;
        deaths.push(player.uid);
        const poisonDeathEvt = GameEventFactory.playerKilled(
          state.round,
          'day',
          player.uid,
          player.username,
          'Succumbed to lethal poison'
        );
        events.push(poisonDeathEvt);
        state.events.push(poisonDeathEvt);
      }
    }

    // C. Adrenaline Surge (Daredevil extra day concludes)
    if (player.statusEffects.adrenalineSurge && state.phase === 'night') {
      player.isAlive = false;
      player.statusEffects.adrenalineSurge = false;
      deaths.push(player.uid);
      const adrDeathEvt = GameEventFactory.playerKilled(
        state.round,
        'night',
        player.uid,
        player.username,
        'Adrenaline exhausted (Daredevil surge concluded)'
      );
      events.push(adrDeathEvt);
      state.events.push(adrDeathEvt);
    }
  }

  return { deaths, cured, events };
}

// -------------------------------------------------------------
// 4. MASTER ACTION RESOLUTION QUEUE (STRICT PRIORITY PIPELINE)
// -------------------------------------------------------------

/**
 * Shared lethal strike helper enforcing all defensive passives:
 * Immortality, Protection Wards, Watchman Counter-Guard, Daredevil Adrenaline Frenzy,
 * Parasite Role Theft, and Soldier/Veteran Survival Rolls.
 */
function executeLethalStrike(
  attacker: PlayerInMatch | undefined,
  target: PlayerInMatch | undefined,
  state: ExtendedMatchState,
  result: AbilityResolutionResult,
  nightVictims: string[],
  cause: string,
  _now: number
): boolean {
  if (!target || !target.isAlive) return false;
  if (!target.statusEffects) target.statusEffects = { extraAbilityUses: 0 };

  // INVARIANT: The Fugitive cannot be targeted directly as a player by abilities;
  // they can only be struck through their dwelling!
  if (target.isFugitive || (state.fugitiveUid && target.uid === state.fugitiveUid)) {
    return false;
  }

  // 1. Immortality & Protection Wards
  if (target.isImmortal || target.statusEffects.immortal) {
    return false;
  }
  if (target.statusEffects.protected) {
    target.statusEffects.protected = false;
    result.events.push(
      GameEventFactory.playerProtected(state.round, state.phase, target.uid, target.username, 'Protective Ward')
    );
    return false;
  }

  // 2. Watchman Counter-Guard (Attacker dies before striking!)
  if (target.roleId === 'watchman' && attacker && attacker.uid !== target.uid && attacker.isAlive) {
    attacker.isAlive = false;
    result.deaths.push(attacker.uid);
    nightVictims.push(attacker.uid);
    result.events.push(
      GameEventFactory.playerKilled(
        state.round,
        state.phase,
        attacker.uid,
        attacker.username,
        `Intercepted and slain by the Watchman's Vigilant Retaliation`
      )
    );
    return false;
  }

  // 3. Parasite Role Theft (Attacker dies, Parasite assumes attacker's role & team!)
  if (target.roleId === 'parasite' && attacker && attacker.uid !== target.uid) {
    target.isAlive = true;
    target.roleId = attacker.roleId;
    target.team = attacker.team;
    target.statusEffects.parasiteHostUid = attacker.uid;

    attacker.isAlive = false;
    result.deaths.push(attacker.uid);
    nightVictims.push(attacker.uid);
    result.events.push(
      GameEventFactory.playerKilled(
        state.round,
        state.phase,
        attacker.uid,
        attacker.username,
        `Consumed by The Parasite upon attempting assassination`
      )
    );
    return false;
  }

  // 4. Daredevil Adrenaline Frenzy (Survives first lethal blow, gains 1 day of rampage!)
  if (target.roleId === 'daredevil' && !target.statusEffects.adrenalineSurge) {
    target.statusEffects.adrenalineSurge = true;
    target.statusEffects.immortal = true;
    target.isImmortal = true;
    result.events.push(
      GameEventFactory.abilityUsed(
        state.round,
        state.phase,
        target.uid,
        target.username,
        'adrenaline_rampage',
        'Adrenaline Surge Triggered',
        `${target.username} cheated death through an Adrenaline Surge and will rampage through the coming day!`,
        true
      )
    );
    return false;
  }

  // 5. Soldier 50% / Veteran 3x Survival Passive
  if (target.team === 'soldiers' && evaluateSoldierSurvivalChance(target)) {
    return false;
  }

  // 6. Lethal Hit Confirmed
  target.isAlive = false;
  result.deaths.push(target.uid);
  nightVictims.push(target.uid);
  result.events.push(
    GameEventFactory.playerKilled(
      state.round,
      state.phase,
      target.uid,
      target.username,
      cause,
      attacker?.uid
    )
  );

  // 6a. Parasite Death: revive former host if one was stored
  const hostUid = target.statusEffects?.parasiteHostUid;
  if (hostUid) {
    const formerHost = state.players[hostUid];
    if (formerHost && !formerHost.isAlive) {
      formerHost.isAlive = true;
      result.revivals.push(formerHost.uid);
      result.events.push(
        GameEventFactory.playerRevived(
          state.round,
          state.phase,
          formerHost.uid,
          formerHost.username,
          'Parasite Severance'
        )
      );
    }
  }

  // 6b. Lover Soulbound Death: if target is soulbound, their partner also perishes
  const soulboundUid = (target as any).soulboundPartnerUid as string | undefined;
  if (soulboundUid && soulboundUid !== target.uid) {
    const partner = state.players[soulboundUid];
    if (partner && partner.isAlive) {
      partner.isAlive = false;
      result.deaths.push(partner.uid);
      nightVictims.push(partner.uid);
      result.events.push(
        GameEventFactory.playerKilled(
          state.round,
          state.phase,
          partner.uid,
          partner.username,
          'Soulbound Heartbreak'
        )
      );
    }
  }

  return true;
}

/**
 * Helper to shoot a house (checks Fugitive shelter & Spawnpoint teleportation)
 */
function shootDwelling(
  houseNum: number,
  state: ExtendedMatchState,
  result: AbilityResolutionResult,
  nightVictims: string[],
  sourceLabel: string,
  now: number
): void {
  if (houseNum === state.fugitiveCurrentHouse) {
    const spRes = triggerSpawnpointTeleport(state as any, now);
    if (spRes.escaped && spRes.event) {
      result.events.push(spRes.event);
    } else if (state.players[state.fugitiveUid]) {
      state.players[state.fugitiveUid].isAlive = false;
      result.deaths.push(state.fugitiveUid);
      nightVictims.push(state.fugitiveUid);
      result.events.push(
        GameEventFactory.playerKilled(
          state.round,
          state.phase,
          state.fugitiveUid,
          'The Fugitive',
          `Shot down in dwelling ${houseNum} (${sourceLabel})`
        )
      );
    }
  }
}

export function resolveCompleteActionQueue(
  state: ExtendedMatchState,
  actions: GameAction[],
  now: number = Date.now()
): AbilityResolutionResult {
  const result: AbilityResolutionResult = {
    deaths: [],
    revivals: [],
    transformations: [],
    crimesInflicted: [],
    events: [],
  };

  const usedAbilitiesThisRound = new Set<string>();
  const nightVictims: string[] = [];

  // Ensure every player has statusEffects initialized to prevent null-reference crashes
  for (const p of Object.values(state.players)) {
    if (p && !p.statusEffects) {
      p.statusEffects = { extraAbilityUses: 0 };
    }
  }

  // Filter out direct player-targeting against The Fugitive (except explicit info/guess abilities)
  const FUGITIVE_TARGET_ALLOWED_ABILITIES = new Set([
    'divine_inquiry',
    'intelligence_inspection',
    'calculated_strike',
    'contract_assassination',
  ]);
  const sanitizedActions = actions.filter((act) => {
    if (!act.targetPlayerUid) return true;
    const target = state.players[act.targetPlayerUid];
    const isFugitiveTarget =
      target?.isFugitive || (state.fugitiveUid && act.targetPlayerUid === state.fugitiveUid);
    if (isFugitiveTarget && !FUGITIVE_TARGET_ALLOWED_ABILITIES.has(act.abilityId)) {
      return false;
    }
    return true;
  });

  // Group actions by Priority Stages:
  // Stage 0: Pre-Resolution Interrupts (Arrest, Assume Command) - silence/arrest before Stage 1/2 act
  // Stage 1: Protections & Wards & Positive buffs
  // Stage 2: Lethal Attacks, Shootings, Bombs, Arson, Invasions
  // Stage 3: Statuses, Poisons, Crimes
  // Stage 4: Intel, Inspections, Role Inquiries

  // --- STAGE 0: PRE-RESOLUTION INTERRUPTS ---
  for (const act of sanitizedActions) {
    const actor = state.players[act.sourcePlayerUid];
    if (!actor || (!actor.isAlive && !actor.isGhost)) continue;
    if (actor.statusEffects.silenced || actor.statusEffects.arrested) continue;

    // Police Officer: Arrest (arrest)
    if (act.abilityId === 'arrest' && act.targetPlayerUid) {
      usedAbilitiesThisRound.add(act.sourcePlayerUid);
      const target = state.players[act.targetPlayerUid];
      if (target) {
        target.statusEffects.silenced = true;
        target.statusEffects.arrested = true;
        const crimeRes = inflictCrime(target, 'Detained under High Police Warrant', state);
        result.crimesInflicted.push(target.uid);
        if (crimeRes.playerDied) {
          result.deaths.push(target.uid);
          nightVictims.push(target.uid);
        }
      }
    }

    // Lieutenant: Assume Command (assume_command)
    if (act.abilityId === 'assume_command' && act.targetPlayerUid) {
      usedAbilitiesThisRound.add(act.sourcePlayerUid);
      const target = state.players[act.targetPlayerUid];
      if (target) {
        target.statusEffects.silenced = true;
      }
    }
  }

  // --- STAGE 1: PROTECTIONS & WARDS ---
  for (const act of sanitizedActions) {
    const actor = state.players[act.sourcePlayerUid];
    if (!actor || (!actor.isAlive && !actor.isGhost)) continue;
    if (actor.statusEffects.silenced || actor.statusEffects.arrested) continue;

    usedAbilitiesThisRound.add(act.sourcePlayerUid);

    // Peasant: Feed teammate (nourish / feed_teammate)
    if ((act.abilityId === 'feed_teammate' || act.abilityId === 'nourish') && act.targetPlayerUid) {
      const target = state.players[act.targetPlayerUid];
      if (target) {
        target.isImmortal = true;
        target.statusEffects.immortal = true;
        target.statusEffects.poisoned = false;
        target.statusEffects.burning = false;
        target.statusEffects.silenced = false;
        target.statusEffects.arrested = false;
      }
    }

    // Lunamancer: Force night & team immortality (eclipse / lunamancy)
    if (act.abilityId === 'lunamancy' || act.abilityId === 'eclipse') {
      if (actor?.team) {
        for (const p of Object.values(state.players)) {
          if (p.team === actor.team) {
            p.isImmortal = true;
            p.statusEffects.immortal = true;
          }
        }
        result.events.push(
          GameEventFactory.abilityUsed(
            state.round,
            state.phase,
            actor.uid,
            actor.username,
            act.abilityId,
            'Lunar Eclipse',
            `${actor.username} invoked the Lunar Eclipse, shielding the Annihilators!`,
            true
          )
        );
      }
    }

    // Watchman: Vigilant Retaliation (Counter guard)
    if (act.abilityId === 'counter_guard') {
      actor.statusEffects.protected = true;
    }

    // Scientist Potion: brew_concoction / administer_potion
    if ((act.abilityId === 'administer_potion' || act.abilityId === 'brew_concoction') && act.targetPlayerUid) {
      const target = state.players[act.targetPlayerUid];
      if (target) {
        if (act.ingredient1 === 'dandelion' || act.ingredient2 === 'dandelion') {
          const isDouble = act.ingredient1 === 'dandelion' && act.ingredient2 === 'dandelion';
          if (isDouble || Math.random() < 0.75) {
            target.statusEffects.protected = true;
          }
        }
        if (act.ingredient1 === 'poison' || act.ingredient2 === 'poison') {
          target.statusEffects.poisoned = true;
        }
        if (act.ingredient1 === 'mind_dust' || act.ingredient2 === 'mind_dust') {
          const cRes = inflictCrime(target, 'Afflicted by Mind-Devouring Powder', state);
          result.crimesInflicted.push(target.uid);
          if (cRes.playerDied) {
            result.deaths.push(target.uid);
            nightVictims.push(target.uid);
          }
        }
        if (act.ingredient1 === 'lotus' || act.ingredient2 === 'lotus') {
          result.events.push(
            GameEventFactory.abilityUsed(
              state.round,
              state.phase,
              actor.uid,
              actor.username,
              act.abilityId,
              'Lotus Flower Observation',
              `Lotus Elixir reveals ${target.username} (${target.team}) status: ${target.isAlive ? 'Living' : 'Deceased'}.`,
              false
            )
          );
        }
      }
    }

    // Painter: Artistic Inspiration (inspire) & Worker: Distribute Arms (forge_weapon)
    if ((act.abilityId === 'inspire' || act.abilityId === 'forge_weapon') && act.targetPlayerUid) {
      const target = state.players[act.targetPlayerUid];
      if (target && target.isAlive) {
        target.statusEffects.extraAbilityUses = (target.statusEffects.extraAbilityUses || 0) + 1;
        result.events.push(
          GameEventFactory.abilityUsed(
            state.round,
            state.phase,
            target.uid,
            target.username,
            act.abilityId,
            act.abilityId === 'inspire' ? 'Artistic Inspiration' : 'Weapon Forged',
            `${target.username} received +1 bonus ability charge / armament.`,
            false
          )
        );
      }
    }
  }

  // --- STAGE 2: LETHAL ATTACKS, BOMBS, ASSASSINATIONS ---
  for (const act of sanitizedActions) {
    const actor = state.players[act.sourcePlayerUid];
    if (!actor || (!actor.isAlive && !actor.isGhost)) continue;
    if (actor.statusEffects.silenced || actor.statusEffects.arrested) continue;

    // Sniper: sniper_shot, sniper_barrage (houses), sniper_assassinate (player)
    if (act.abilityId === 'sniper_shot' || act.abilityId === 'sniper_barrage' || act.abilityId === 'sniper_assassinate') {
      const housesToShoot = act.targetHouseNumbers || (act.targetHouseNumber ? [act.targetHouseNumber] : []);
      if (housesToShoot.length > 0 && act.abilityId !== 'sniper_assassinate') {
        for (const hNum of housesToShoot.slice(0, 3)) {
          shootDwelling(hNum, state, result, nightVictims, 'Sniper Barrage', now);
        }
      } else if (act.targetPlayerUid) {
        const target = state.players[act.targetPlayerUid];
        executeLethalStrike(actor, target, state, result, nightVictims, 'Eliminated by Sniper shot', now);
        const crimeRes = inflictCrime(actor, 'Discharged sniper rifle at a fellow citizen', state);
        if (crimeRes.playerDied) result.deaths.push(actor.uid);
      }
    }

    // Assassin: contract_assassination / calculated_strike
    if (
      (act.abilityId === 'contract_assassination' || act.abilityId === 'calculated_strike') &&
      act.guessRoles &&
      act.guessRoles.length > 0
    ) {
      const allGuessesCorrect = act.guessRoles.every((guess) => {
        const p = state.players[guess.playerUid];
        return p && p.roleId === guess.roleId;
      });

      if (allGuessesCorrect) {
        for (const guess of act.guessRoles) {
          const target = state.players[guess.playerUid];
          executeLethalStrike(actor, target, state, result, nightVictims, 'Eliminated by Precision Contract', now);
        }
      }
    }

    // Daredevil: Adrenaline Rampage (adrenaline_rampage)
    if (act.abilityId === 'adrenaline_rampage' && act.targetPlayerUid) {
      if (actor.statusEffects.adrenalineSurge) {
        const target = state.players[act.targetPlayerUid];
        // 25% risk of friendly fire hitting an Annihilator teammate
        const teammates = Object.values(state.players).filter(
          (p) => p.isAlive && p.team === actor.team && p.uid !== actor.uid
        );
        if (teammates.length > 0 && Math.random() < 0.25) {
          const collateral = teammates[Math.floor(Math.random() * teammates.length)];
          executeLethalStrike(actor, collateral, state, result, nightVictims, 'Collateral casualty of Daredevil Adrenaline Rampage', now);
        } else if (target) {
          executeLethalStrike(actor, target, state, result, nightVictims, 'Slaughtered in Daredevil Adrenaline Rampage', now);
        }
      }
    }

    // Firefighter: Axe Execution (axe_execution)
    if (act.abilityId === 'axe_execution' && act.targetPlayerUid) {
      const target = state.players[act.targetPlayerUid];
      executeLethalStrike(actor, target, state, result, nightVictims, 'Executed in broad daylight by Firefighter Axe', now);
      const crimeRes = inflictCrime(actor, 'Public Axe Execution', state);
      if (crimeRes.playerDied) result.deaths.push(actor.uid);
    }

    // Prisoner: Nocturnal Execution (shackled_execution) - immune to crime
    if (act.abilityId === 'shackled_execution' && act.targetPlayerUid) {
      const target = state.players[act.targetPlayerUid];
      executeLethalStrike(actor, target, state, result, nightVictims, 'Executed in darkness by The Prisoner', now);
    }

    // Trooper: Rifle Shot (rifle_fire) - immune to crime
    if (act.abilityId === 'rifle_fire') {
      if (act.targetHouseNumber) {
        shootDwelling(act.targetHouseNumber, state, result, nightVictims, 'Trooper Rifle Fire', now);
      } else if (act.targetPlayerUid) {
        const target = state.players[act.targetPlayerUid];
        executeLethalStrike(actor, target, state, result, nightVictims, 'Shot down by Trooper Rifle Fire', now);
      }
    }

    // Lover: Fateful Arrow (lovers_arrow)
    if (act.abilityId === 'lovers_arrow') {
      if (act.targetHouseNumber) {
        shootDwelling(act.targetHouseNumber, state, result, nightVictims, 'Lover Arrow', now);
      } else if (act.targetPlayerUid) {
        const target = state.players[act.targetPlayerUid];
        const killed = executeLethalStrike(actor, target, state, result, nightVictims, 'Pierced by Lover\'s Fateful Arrow', now);
        if (killed) {
          const crimeRes = inflictCrime(actor, 'Took a life with Fateful Arrow', state);
          if (crimeRes.playerDied) result.deaths.push(actor.uid);
        }
      }
    }

    // American President: Nuclear Strike (7 houses)
    if (act.abilityId === 'nuclear_strike') {
      const housesToNuke = act.targetHouseNumbers || (act.targetHouseNumber ? [act.targetHouseNumber] : []);
      for (const hNum of housesToNuke.slice(0, 7)) {
        const h = state.houses[hNum];
        const isFugitiveShelter = hNum === state.fugitiveCurrentHouse || h?.isFugitiveShelter;
        const isFugitiveSpawnpoint =
          (state.fugitiveSpawnpointHouse !== null &&
            state.fugitiveSpawnpointHouse !== undefined &&
            hNum === state.fugitiveSpawnpointHouse) ||
          h?.hasActiveSpawnpoint;

        if (h && !isFugitiveShelter && !isFugitiveSpawnpoint) {
          h.isDestroyed = true;
          h.status = 'destroyed';
        }
        shootDwelling(hNum, state, result, nightVictims, 'Tactical Nuke', now);
      }
      // President dies after launch
      actor.isAlive = false;
      result.deaths.push(actor.uid);
      nightVictims.push(actor.uid);
    }

    // Soldier Mortar: Artillery at 2 houses (mortar_artillery / mortar_barrage)
    if (act.abilityId === 'mortar_artillery' || act.abilityId === 'mortar_barrage') {
      const housesToShell = act.targetHouseNumbers || (act.targetHouseNumber ? [act.targetHouseNumber] : []);
      for (const hNum of housesToShell.slice(0, 2)) {
        const h = state.houses[hNum];
        const isFugitiveShelter = hNum === state.fugitiveCurrentHouse || h?.isFugitiveShelter;
        const isFugitiveSpawnpoint =
          (state.fugitiveSpawnpointHouse !== null &&
            state.fugitiveSpawnpointHouse !== undefined &&
            hNum === state.fugitiveSpawnpointHouse) ||
          h?.hasActiveSpawnpoint;

        if (h && !isFugitiveShelter && !isFugitiveSpawnpoint) {
          h.isDestroyed = true;
          h.status = 'destroyed';
        }
        shootDwelling(hNum, state, result, nightVictims, 'Mortar Artillery', now);
      }
    }

    // Lunatic: Mandatory Kill (mandatory_strike / frenzied_mandate)
    if (act.abilityId === 'mandatory_strike' || act.abilityId === 'frenzied_mandate') {
      if (act.targetPlayerUid) {
        const target = state.players[act.targetPlayerUid];
        const killed = executeLethalStrike(actor, target, state, result, nightVictims, 'Slain by Lunatic Mandatory Bloodshed', now);
        if (!killed) {
          actor.isAlive = false;
          result.deaths.push(actor.uid);
          nightVictims.push(actor.uid);
        }
      } else {
        actor.isAlive = false;
        result.deaths.push(actor.uid);
        nightVictims.push(actor.uid);
      }
    }
  }

  // --- STAGE 3: STATUSES, ARRESTS, BOMBS, REVIVALS ---
  for (const act of sanitizedActions) {
    const actor = state.players[act.sourcePlayerUid];
    if (!actor || (!actor.isAlive && !actor.isGhost)) continue;
    if (actor.statusEffects.silenced || actor.statusEffects.arrested) continue;

    // Detonator: Plant Bomb (plant_bomb)
    if (act.abilityId === 'plant_bomb') {
      if (act.targetHouseNumber && state.houses[act.targetHouseNumber]) {
        state.houses[act.targetHouseNumber].hasActiveBomb = true;
      } else if (act.targetPlayerUid && state.players[act.targetPlayerUid]) {
        (state.players[act.targetPlayerUid].statusEffects as any).hasBomb = true;
      }
    }

    // Arsonist: Set on fire (arson / ignite)
    if ((act.abilityId === 'arson' || act.abilityId === 'ignite') && act.targetPlayerUid) {
      const target = state.players[act.targetPlayerUid];
      const roleDef = target?.roleId ? ROLES[target.roleId] : null;
      const isPassiveOnly = roleDef?.abilities.every((a) => a.timing === 'passive');

      if (target && !isPassiveOnly) {
        target.statusEffects.burning = true;
        target.statusEffects.extraAbilityUses = (target.statusEffects.extraAbilityUses || 0) + 1;
      }
    }

    // Firefighter: Extinguish (extinguish)
    if (act.abilityId === 'extinguish' && act.targetPlayerUid) {
      const target = state.players[act.targetPlayerUid];
      if (target && target.statusEffects.burning) {
        target.statusEffects.burning = false;
        if (target.statusEffects.extraAbilityUses > 0) {
          const cRes = inflictCrime(target, 'Exploited forbidden pyric frenzy', state);
          if (cRes.playerDied) result.deaths.push(target.uid);
        }
      }
    }

    // Necromancer: Revive as Zombie (raise_zombie)
    if (act.abilityId === 'raise_zombie' && act.targetPlayerUid) {
      const target = state.players[act.targetPlayerUid];
      if (target && !target.isAlive) {
        target.isAlive = true;
        target.isZombie = true;
        result.revivals.push(target.uid);
        result.transformations.push({ uid: target.uid, status: 'zombie' });
      }
    }

    // Mutagenic Doctor: Mutagenic Transfusion (mutagenic_transfusion)
    if (act.abilityId === 'mutagenic_transfusion' && act.targetPlayerUid) {
      const target = state.players[act.targetPlayerUid];
      if (target && (!target.isAlive || target.isZombie)) {
        target.isAlive = true;
        target.isZombie = false;
        target.roleId = 'mutagenic_doctor';
        target.team = actor.team || 'annihilators';
        result.revivals.push(target.uid);
      }
    }

    // Communist Engineer: Build Contraption (construct_contraption / build_contraption)
    if ((act.abilityId === 'construct_contraption' || act.abilityId === 'build_contraption') && act.contraptionType && act.contraptionCode) {
      if (!state.activeContraptions) state.activeContraptions = [];
      state.activeContraptions.push({
        type: act.contraptionType,
        secretCode: act.contraptionCode,
        ownerUid: act.sourcePlayerUid,
        boundPlayerUid: act.targetPlayerUid,
        isDestroyed: false,
      });

      if (act.contraptionType === 'defibrillator' && act.targetPlayerUid) {
        const target = state.players[act.targetPlayerUid];
        if (target) {
          target.isAlive = true;
          result.revivals.push(target.uid);
        }
      }
    }

    // Executioner: Convene Tribunal (tribunal_nomination)
    if (act.abilityId === 'tribunal_nomination' && act.targetPlayerUid) {
      const target = state.players[act.targetPlayerUid];
      if (target) {
        result.events.push(
          GameEventFactory.abilityUsed(
            state.round,
            state.phase,
            actor.uid,
            actor.username,
            'tribunal_nomination',
            'Public Tribunal Convened',
            `${actor.username} nominated ${target.username} before the Town Tribunal!`,
            true
          )
        );
      }
    }

    // Dictator: Declare War (declare_war)
    if (act.abilityId === 'declare_war' && act.targetPlayerUid) {
      const target = state.players[act.targetPlayerUid];
      if (target) {
        result.events.push(
          GameEventFactory.abilityUsed(
            state.round,
            state.phase,
            actor.uid,
            actor.username,
            'declare_war',
            'Total War Declared',
            `${actor.username} (Dictator) declared Total War against ${target.team || 'rival faction'}!`,
            true
          )
        );
      }
    }

    // Time Traveler: Temporal Rewind (temporal_rewind)
    if (act.abilityId === 'temporal_rewind') {
      (state as any).fugitiveDailyActionExecuted = false;
      result.events.push(
        GameEventFactory.abilityUsed(
          state.round,
          state.phase,
          actor.uid,
          actor.username,
          'temporal_rewind',
          'Temporal Rewind',
          `${actor.username} rewound the clock to dawn, replenishing daytime actions!`,
          true
        )
      );
    }
  }

  // --- STAGE 4: INTEL, INSPECTIONS & SOLO SWAPS ---
  for (const act of sanitizedActions) {
    const actor = state.players[act.sourcePlayerUid];
    if (!actor || (!actor.isAlive && !actor.isGhost)) continue;

    // Cursed role swap (curse_transference)
    if (act.abilityId === 'curse_transference' && act.targetPlayerUid) {
      const targetPlayer = state.players[act.targetPlayerUid];
      if (targetPlayer && actor.roleId === 'cursed') {
        const tempRole = targetPlayer.roleId;
        const tempTeam = targetPlayer.team;
        targetPlayer.roleId = 'cursed';
        targetPlayer.team = 'solo';
        actor.roleId = tempRole;
        actor.team = tempTeam;
      }
    }

    // Veteran: Reconnaissance (intelligence_inspection)
    if (act.abilityId === 'intelligence_inspection' && act.targetPlayerUid) {
      const target = state.players[act.targetPlayerUid];
      if (target) {
        result.events.push(
          GameEventFactory.abilityUsed(
            state.round,
            state.phase,
            actor.uid,
            actor.username,
            'intelligence_inspection',
            'Veteran Reconnaissance',
            `Classified Intel: ${target.username} belongs to ${target.team || 'Unknown'}.`,
            false
          )
        );
      }
    }

    // Verifier: Authoritative Inquiry (divine_inquiry)
    if (act.abilityId === 'divine_inquiry') {
      const target = act.targetPlayerUid ? state.players[act.targetPlayerUid] : null;
      const msg = target
        ? `Absolute Truth: ${target.username} is ${target.isFugitive ? 'THE FUGITIVE' : `NOT The Fugitive (${target.team})`}.`
        : `Absolute Truth: The Fugitive currently shelters in Sector ${Math.ceil((state.fugitiveCurrentHouse || 1) / 10) * 10 - 9}-${Math.ceil((state.fugitiveCurrentHouse || 1) / 10) * 10}.`;
      result.events.push(
        GameEventFactory.abilityUsed(
          state.round,
          state.phase,
          actor.uid,
          actor.username,
          'divine_inquiry',
          'Verifier Truth',
          msg,
          false
        )
      );
    }

    // General: Tactical Appraisal (tactical_appraisal)
    if (act.abilityId === 'tactical_appraisal') {
      const counts: Record<string, number> = {};
      for (const p of Object.values(state.players)) {
        if (p.isAlive && p.team && p.team !== 'fugitive' && p.team !== 'solo') {
          counts[p.team] = (counts[p.team] || 0) + 1;
        }
      }
      const leader = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      result.events.push(
        GameEventFactory.abilityUsed(
          state.round,
          state.phase,
          actor.uid,
          actor.username,
          'tactical_appraisal',
          'General Situation Report',
          leader ? `Tactical Report: ${leader[0]} currently lead with ${leader[1]} living combatants.` : 'No faction leads.',
          false
        )
      );
    }

    // Gossip: Town Whispers (hear_rumors)
    if (act.abilityId === 'hear_rumors') {
      const recentCrimes = Object.values(state.players)
        .filter((p) => (p.crimes || 0) > 0)
        .map((p) => p.username);
      result.events.push(
        GameEventFactory.abilityUsed(
          state.round,
          state.phase,
          actor.uid,
          actor.username,
          'hear_rumors',
          'Gossip Whispers',
          recentCrimes.length > 0
            ? `Whispers in the alley: Suspects carrying Crimes include ${recentCrimes.join(', ')}.`
            : 'Whispers in the alley: No citizens currently bear known Crimes.',
          false
        )
      );
    }

    // Commander: Commandeer Ability (commandeer_tactics)
    if (act.abilityId === 'commandeer_tactics' && act.targetPlayerUid) {
      const target = state.players[act.targetPlayerUid];
      if (target) {
        result.events.push(
          GameEventFactory.abilityUsed(
            state.round,
            state.phase,
            actor.uid,
            actor.username,
            'commandeer_tactics',
            'Tactics Commandeered',
            `You mirrored ${target.username}'s tactical role (${target.roleId}).`,
            false
          )
        );
      }
    }
  }

  // Detonator Trigger: If Detonator died during this resolution, detonate all planted bombs!
  const deadDetonator = nightVictims.some((uid) => state.players[uid]?.roleId === 'detonator');
  if (deadDetonator) {
    for (const h of Object.values(state.houses)) {
      if (h.hasActiveBomb) {
        h.hasActiveBomb = false;
        const isProtected = h.number === state.fugitiveCurrentHouse || h.number === state.fugitiveSpawnpointHouse;
        if (!isProtected) {
          h.isDestroyed = true;
          h.status = 'destroyed';
        }
        shootDwelling(h.number, state, result, nightVictims, 'Detonator Bomb', now);
      }
    }
    for (const p of Object.values(state.players)) {
      if ((p.statusEffects as any).hasBomb && p.isAlive) {
        (p.statusEffects as any).hasBomb = false;
        executeLethalStrike(undefined, p, state, result, nightVictims, 'Obliterated by Detonator Bomb', now);
      }
    }
  }

  // Communists team ghost transformation for fallen comrades
  resolveCommunistsPassive(state, nightVictims);

  // Clear crimes for idle players from previous rounds
  const crimesInflictedThisRound = new Set(result.crimesInflicted);
  evaluateCrimeDecay(state.players, usedAbilitiesThisRound, crimesInflictedThisRound);

  return result;
}

// -------------------------------------------------------------
// 5. SOLO WIN CONDITIONS EVALUATION
// -------------------------------------------------------------

export function evaluateSoloWinConditions(
  state: ExtendedMatchState
): { soloWinners: string[]; reasons: string[] } {
  const soloWinners: string[] = [];
  const reasons: string[] = [];

  for (const p of Object.values(state.players)) {
    if (p.roleId === 'cursed') {
      if (!p.isAlive) {
        soloWinners.push(p.uid);
        reasons.push(`${p.username} achieved Cursed martyrdom (died as the Cursed).`);
      }
    } else if (p.roleId === 'lucky') {
      if (p.isAlive) {
        soloWinners.push(p.uid);
        reasons.push(`${p.username} alone survived as the Lucky One.`);
      }
    } else if (p.roleId === 'squire') {
      if (p.assignedLordUid) {
        const lord = state.players[p.assignedLordUid];
        if (lord && lord.isAlive) {
          soloWinners.push(p.uid);
          reasons.push(`${p.username} won because their Lord (${lord.username}) survived.`);
        }
      }
    } else if (p.roleId === 'spy') {
      const fugitive = state.players[state.fugitiveUid];
      if (fugitive && fugitive.isAlive) {
        soloWinners.push(p.uid);
        reasons.push(`${p.username} won as the covert Spy alongside The Fugitive.`);
      }
    }
  }

  return { soloWinners, reasons };
}
