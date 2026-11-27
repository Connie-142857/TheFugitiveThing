// Centralized Game Event System for The Fugitive
// Manages match events, announcements, Chronicle logs, and role-scoped notifications.

import type {
  GameEvent,
  GameEventType,
} from '../types/game.ts';
import type { TeamId } from '../types/rules.ts';

export interface CreateEventOptions {
  type: GameEventType;
  round: number;
  phase: 'day' | 'night';
  title: string;
  message: string;
  category: 'announcement' | 'combat' | 'sanctuary' | 'demolition' | 'crime' | 'intel' | 'lifecycle';
  actorUid?: string;
  actorRole?: string;
  targetUid?: string;
  targetRole?: string;
  targetHouse?: number;
  targetHouses?: number[];
  isPublic?: boolean;
  visibleToTeam?: TeamId;
  visibleToPlayerUid?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Recursively strips undefined fields from an object so Firestore accepts it cleanly.
 */
export function cleanFirestoreObject<T extends Record<string, any>>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => (item !== null && typeof item === 'object' ? cleanFirestoreObject(item) : item)) as unknown as T;
  }
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    if (val !== null && typeof val === 'object') {
      cleaned[key] = cleanFirestoreObject(val);
    } else {
      cleaned[key] = val;
    }
  }
  return cleaned as T;
}

/**
 * Creates a structured GameEvent with auto-generated ID and timestamp.
 * Omits undefined fields so Firestore arrayUnion and documents are strictly valid.
 */
export function createGameEvent(options: CreateEventOptions): GameEvent {
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const evt: Record<string, any> = {
    id: eventId,
    type: options.type,
    round: options.round,
    phase: options.phase,
    timestamp: Date.now(),
    title: options.title,
    message: options.message,
    category: options.category,
    isPublic: options.isPublic ?? true,
  };

  if (options.actorUid !== undefined) evt.actorUid = options.actorUid;
  if (options.actorRole !== undefined) evt.actorRole = options.actorRole;
  if (options.targetUid !== undefined) evt.targetUid = options.targetUid;
  if (options.targetRole !== undefined) evt.targetRole = options.targetRole;
  if (options.targetHouse !== undefined) evt.targetHouse = options.targetHouse;
  if (options.targetHouses !== undefined) evt.targetHouses = options.targetHouses;
  if (options.visibleToTeam !== undefined) evt.visibleToTeam = options.visibleToTeam;
  if (options.visibleToPlayerUid !== undefined) evt.visibleToPlayerUid = options.visibleToPlayerUid;
  if (options.metadata !== undefined) evt.metadata = cleanFirestoreObject(options.metadata);

  return evt as GameEvent;
}

/**
 * Filters events visible to a specific player based on their UID, faction, and dead/alive state.
 */
export function filterEventsForPlayer(
  events: GameEvent[],
  playerUid: string,
  playerTeam?: TeamId,
  isHost: boolean = false
): GameEvent[] {
  if (isHost) return events; // Host moderator sees all event records

  return events.filter((evt) => {
    // 1. Public events are visible to everyone
    if (evt.isPublic) return true;

    // 2. Secret intel for a specific player
    if (evt.visibleToPlayerUid && evt.visibleToPlayerUid === playerUid) {
      return true;
    }

    // 3. Faction-exclusive announcements (e.g. Communist whisper, Annihilator plan)
    if (evt.visibleToTeam && playerTeam && evt.visibleToTeam === playerTeam) {
      return true;
    }

    return false;
  });
}

/**
 * Standard factory methods for required game event types
 */
export const GameEventFactory = {
  dayStarted(round: number): GameEvent {
    return createGameEvent({
      type: 'day_started',
      round,
      phase: 'day',
      title: `Dawn of Round ${round}`,
      message: `The morning mist clears over the village. Round ${round} has begun. Citizens assemble in the forum.`,
      category: 'lifecycle',
      isPublic: true,
    });
  },

  nightStarted(round: number): GameEvent {
    return createGameEvent({
      type: 'night_started',
      round,
      phase: 'night',
      title: `Twilight of Round ${round}`,
      message: `Darkness envelops the valley. The gates lock and nocturnal abilities awaken under cover of night.`,
      category: 'lifecycle',
      isPublic: true,
    });
  },

  playerKilled(
    round: number,
    phase: 'day' | 'night',
    victimUid: string,
    victimName: string,
    reason: string,
    actorUid?: string
  ): GameEvent {
    return createGameEvent({
      type: 'player_killed',
      round,
      phase,
      title: 'Fatal Casualty Recorded',
      message: `${victimName} has perished in the darkness (${reason}).`,
      category: 'combat',
      actorUid,
      targetUid: victimUid,
      isPublic: true,
      metadata: { victimName, reason },
    });
  },

  playerProtected(
    round: number,
    phase: 'day' | 'night',
    targetUid: string,
    targetName: string,
    protectorRole: string
  ): GameEvent {
    return createGameEvent({
      type: 'player_protected',
      round,
      phase,
      title: 'Lethal Assault Deflected',
      message: `${targetName} was shielded from mortal peril by ${protectorRole}.`,
      category: 'sanctuary',
      targetUid,
      isPublic: false,
      visibleToPlayerUid: targetUid,
      metadata: { targetName, protectorRole },
    });
  },

  houseDestroyed(
    round: number,
    phase: 'day' | 'night',
    houseNumbers: number[],
    method: 'demolition' | 'bomb' | 'fire' | 'artillery'
  ): GameEvent {
    const houseListStr = houseNumbers.sort((a, b) => a - b).join(', ');
    const titles: Record<string, string> = {
      demolition: 'Nightly Dwellings Condemned',
      bomb: 'Explosive Detonation',
      fire: 'Arson Inferno',
      artillery: 'Artillery Barrage',
    };
    const messages: Record<string, string> = {
      demolition: `By decree of the nocturnal tribunal, dwelling(s) ${houseListStr} have been reduced to ashes.`,
      bomb: `A devastating explosion collapsed dwelling(s) ${houseListStr}.`,
      fire: `Raging flames consumed dwelling(s) ${houseListStr}.`,
      artillery: `Heavy shelling smashed dwelling(s) ${houseListStr}.`,
    };

    return createGameEvent({
      type: 'house_destroyed',
      round,
      phase,
      title: titles[method] || 'Dwelling Destroyed',
      message: messages[method] || `Dwelling(s) ${houseListStr} have been leveled.`,
      category: 'demolition',
      targetHouses: houseNumbers,
      isPublic: true,
      metadata: { method, houses: houseNumbers },
    });
  },

  spawnpointActivated(
    round: number,
    phase: 'day' | 'night',
    teleportClueHouses: number[]
  ): GameEvent {
    const clueListStr = [...teleportClueHouses].sort((a, b) => a - b).join(', ');
    return createGameEvent({
      type: 'spawnpoint_activated',
      round,
      phase,
      title: 'Spawnpoint Teleportation Triggered',
      message: `The Fugitive was struck but evaporated into shadow! The secret Spawnpoint activated. Scent hounds trace their presence to one of these 11 dwellings: [${clueListStr}].`,
      category: 'combat',
      targetHouses: teleportClueHouses,
      isPublic: true,
      metadata: { clueHouses: teleportClueHouses },
    });
  },

  fugitiveEscaped(round: number, phase: 'day' | 'night'): GameEvent {
    return createGameEvent({
      type: 'fugitive_escaped',
      round,
      phase,
      title: 'The Fugitive Slips Away',
      message: 'The Fugitive eluded the encirclement and secured a new safehouse.',
      category: 'combat',
      isPublic: true,
    });
  },

  abilityUsed(
    round: number,
    phase: 'day' | 'night',
    actorUid: string,
    actorName: string,
    roleId: string,
    abilityName: string,
    details: string,
    isPublic: boolean = false
  ): GameEvent {
    return createGameEvent({
      type: 'ability_used',
      round,
      phase,
      title: `${abilityName} Activated`,
      message: isPublic
        ? `${actorName} exercised an authority: ${abilityName}.`
        : `You executed ${abilityName}: ${details}`,
      category: 'intel',
      actorUid,
      actorRole: roleId,
      isPublic,
      visibleToPlayerUid: isPublic ? undefined : actorUid,
      metadata: { abilityName, details },
    });
  },

  crimeCommitted(
    round: number,
    phase: 'day' | 'night',
    suspectUid: string,
    suspectName: string,
    transgression: string
  ): GameEvent {
    return createGameEvent({
      type: 'crime_committed',
      round,
      phase,
      title: 'Transgression Recorded in the High Ledger',
      message: `A foul infraction of municipal law was logged against ${suspectName} (${transgression}).`,
      category: 'crime',
      targetUid: suspectUid,
      isPublic: false, // Crimes are secret unless investigated or executed
      visibleToPlayerUid: suspectUid,
      metadata: { suspectName, transgression },
    });
  },

  playerRevived(
    round: number,
    phase: 'day' | 'night',
    targetUid: string,
    targetName: string,
    benefactorRole: string
  ): GameEvent {
    return createGameEvent({
      type: 'player_revived',
      round,
      phase,
      title: 'Resurrection from the Vale',
      message: `${targetName} has been miraculously restored to life by ${benefactorRole}.`,
      category: 'sanctuary',
      targetUid,
      isPublic: true,
      metadata: { targetName, benefactorRole },
    });
  },

  playerTransformed(
    round: number,
    phase: 'day' | 'night',
    targetUid: string,
    targetName: string,
    newStatus: 'zombie' | 'ghost' | 'immortal'
  ): GameEvent {
    const titles: Record<string, string> = {
      zombie: 'Necromantic Reanimation',
      ghost: 'Ethereal Apparition',
      immortal: 'Divine Inviolability Bestowed',
    };
    return createGameEvent({
      type: 'player_transformed',
      round,
      phase,
      title: titles[newStatus] || 'Corporeal Metamorphosis',
      message: `${targetName} has entered the state of ${newStatus}.`,
      category: 'combat',
      targetUid,
      isPublic: true,
      metadata: { targetName, newStatus },
    });
  },

  teamEliminated(round: number, teamId: TeamId, teamName: string): GameEvent {
    return createGameEvent({
      type: 'team_eliminated',
      round,
      phase: 'night',
      title: 'Faction Annihilated',
      message: `All members of the ${teamName} have fallen. The faction is officially eliminated from the Chronicle.`,
      category: 'combat',
      isPublic: true,
      metadata: { teamId, teamName },
    });
  },

  matchEnded(
    round: number,
    winnerTeam: TeamId | 'draw',
    winningPlayerUids: string[],
    summary: string
  ): GameEvent {
    return createGameEvent({
      type: 'match_ended',
      round,
      phase: 'night',
      title: 'The Chronicle Reaches Final Judgment',
      message: summary,
      category: 'lifecycle',
      isPublic: true,
      metadata: { winnerTeam, winningPlayerUids },
    });
  },
};
