// Game runtime state, room definition, houses, actions, and events
import type { TeamId } from './rules.ts';

export type GameMode = 'automated' | 'human_host';
export type MatchStateEnum =
  | 'waiting'
  | 'preparing'
  | 'day'
  | 'night'
  | 'resolving'
  | 'paused'
  | 'finished';

// MatchPhase aligns with MatchStateEnum while retaining legacy strings for backwards compatibility
export type MatchPhase =
  | MatchStateEnum
  | 'lobby'
  | 'in_progress'
  | 'ended';

export type PlayerLobbyStatus = 'joining' | 'connected' | 'ready' | 'not_ready' | 'disconnected' | 'left';

export type HouseStatus = 'available' | 'occupied' | 'destroyed' | 'special';

export interface HouseEventSummary {
  round: number;
  phase: 'day' | 'night';
  type: 'shot' | 'bombed' | 'burned' | 'artillery' | 'destroyed' | 'inspected' | 'spawnpoint_teleport';
  sourceRoleOrTeam?: string;
  timestamp: number;
}

export interface HouseRecord {
  id: string; // e.g. "house_1"
  number: number;
  status: HouseStatus;
  isDestroyed: boolean;
  destroyedAtRound?: number;
  destroyedBy?: 'nightly_demolition' | 'bomb' | 'fire' | 'artillery' | 'ability';
  isBurned: boolean;
  hasActiveBomb: boolean;
  bombedByPlayerUid?: string;
  hasActiveSpawnpoint: boolean;
  isFugitiveShelter: boolean; // Server-side truth only!
  history: HouseEventSummary[];
}

export type GameEventType =
  | 'day_started'
  | 'night_started'
  | 'player_killed'
  | 'player_protected'
  | 'house_destroyed'
  | 'spawnpoint_activated'
  | 'fugitive_escaped'
  | 'ability_used'
  | 'crime_committed'
  | 'player_revived'
  | 'player_transformed'
  | 'team_eliminated'
  | 'match_ended';

export interface GameEvent {
  id: string;
  type: GameEventType;
  round: number;
  phase: 'day' | 'night';
  timestamp: number;
  title: string;
  message: string;
  category: 'announcement' | 'combat' | 'sanctuary' | 'demolition' | 'crime' | 'intel' | 'lifecycle';
  actorUid?: string;
  actorRole?: string;
  targetUid?: string;
  targetRole?: string;
  targetHouse?: number;
  targetHouses?: number[];
  isPublic: boolean;
  visibleToTeam?: TeamId;
  visibleToPlayerUid?: string;
  metadata?: Record<string, unknown>;
}

export interface LobbyPlayer {
  uid: string;
  username: string;
  avatarId: string;
  level: number;
  isHost: boolean;
  status: PlayerLobbyStatus;
  joinedAt: number;
  lastSeenAt: number;
}

export interface SecretRoleBriefingData {
  uid: string;
  roleId: string;
  roleName: string;
  team: TeamId;
  publicCoverTeam: TeamId;
  category: 'essential' | 'support' | 'solo' | 'target';
  roleDescription: string;
  teamPassive: {
    name: string;
    description: string;
  };
  abilities: {
    id: string;
    name: string;
    timing: 'day' | 'night' | 'passive' | 'unique';
    description: string;
    maxUses?: number;
    causesCrime?: boolean;
  }[];
  winCondition: string;
  specialKnowledge?: {
    assignedLordUid?: string;
    assignedLordName?: string;
    soulboundUid?: string;
    soulboundName?: string;
    initialHouseNumber?: number;
    notes?: string;
  };
  assignedAt: number;
}

export interface HouseState extends Partial<HouseRecord> {
  id?: string;
  number: number;
  status?: HouseStatus;
  isDestroyed: boolean;
  isBurned: boolean;
  hasActiveBomb?: boolean;
  bombedByPlayerId?: string;
  bombedByPlayerUid?: string;
  destroyedAtRound?: number;
  destroyedBy?: 'nightly_demolition' | 'bomb' | 'fire' | 'artillery' | 'ability';
  hasActiveSpawnpoint?: boolean;
  isFugitiveShelter?: boolean;
  history?: HouseEventSummary[];
}

export interface PlayerInMatch {
  uid: string;
  username: string;
  isHost: boolean;
  isFugitive: boolean;
  isAlive: boolean;
  isZombie: boolean;
  isGhost: boolean;
  isImmortal: boolean;
  crimes: number;
  consecutiveIdleRounds: number;
  hasPassiveAbility?: boolean;
  cannotCommitCrimes?: boolean; // For Prisoner
  survivedAttacksCount: number; // For Veteran & Soldier passive
  statusEffects: {
    poisoned?: boolean;
    burning?: boolean;
    protected?: boolean;
    adrenalineSurge?: boolean;
    silenced?: boolean;
    arrested?: boolean;
    immortal?: boolean;
    extraAbilityUses: number;
    borrowedAbilityId?: string;
    grantedWeapon?: boolean;
    parasiteHostUid?: string;
    stolenAbilityId?: string;
    nominatedForExecution?: boolean;
    executionVotes?: number;
  };
  usedOneTimeAbility?: boolean;
  // Sensitive fields: only accessible server-side and by self/authorized host
  team?: TeamId;
  roleId?: string;
  assignedLordUid?: string; // For Squire
  soulboundUid?: string;    // For Lover
}

export interface GameAction {
  id: string;
  round: number;
  phase: 'day' | 'night';
  sourcePlayerUid: string;
  abilityId: string;
  targetPlayerUid?: string;
  targetPlayerUids?: string[];
  targetHouseNumber?: number;
  targetHouseNumbers?: number[];
  guessRoles?: { playerUid: string; roleId: string }[];
  inquiryText?: string;
  ingredient1?: 'lotus' | 'dandelion' | 'poison' | 'mind_dust';
  ingredient2?: 'lotus' | 'dandelion' | 'poison' | 'mind_dust';
  contraptionType?: 'defibrillator' | 'turret' | 'disruptor';
  contraptionCode?: number; // 1-5
  annihilatorDemolitionHouse?: number; // Annihilator team passive choice
  submittedAt: number;
  resolved: boolean;
}

export type InterrogationAnswer = 'yes' | 'no' | 'dont_know';

export interface InterrogationQuestion {
  id: string;
  subjectUid: string;
  subjectName: string;
  queriedTeam: TeamId;
  questionText: string;
}

export interface InterrogationRecord {
  id: string;
  round: number;
  detectiveUid: string;
  targetUid: string;
  targetName: string;
  questions: {
    question: InterrogationQuestion;
    answer?: InterrogationAnswer;
    isLie?: boolean;
    answeredAt?: number;
  }[];
  completed: boolean;
  lieDetected: boolean;
  penaltyInflicted?: 'crime' | 'execution';
}

export interface SpawnpointClue {
  round: number;
  actualHouse: number; // Server-side truth only!
  announcedHouses: number[]; // 11 houses (1 real + 10 decoys) sent to players
  timestamp: number;
}

export interface MatchEventLog {
  id: string;
  round: number;
  phase: 'day' | 'night';
  timestamp: number;
  category: 'announcement' | 'death' | 'clue' | 'crime' | 'host_action' | 'spawnpoint' | 'demolition';
  message: string;
  targetHouses?: number[];
  isPublic: boolean;
  visibleToTeam?: TeamId;
  visibleToPlayerUid?: string;
}

export interface RoomSettings {
  gameMode: GameMode;
  targetPlayerCount: number; // Regular players (excluding Fugitive) or total
  isRealTime: boolean;
  dayDurationSeconds: number; // e.g. 600 for 10 min accelerated, or 36000 for 10h real-time
  nightDurationSeconds: number; // e.g. 300 for 5 min accelerated, or 50400 for 14h real-time
  activeTeams: TeamId[];
  soloRoleCount: number;
  totalHouses: number;
  housesDestroyedPerRound: number;
  allowHostOverrides: boolean;
}

export interface RoomDocument {
  id: string;
  roomCode: string;
  roomName: string;
  createdById: string;
  hostUid: string | null;
  status: MatchPhase;
  createdAt: number;
  updatedAt: number;
  settings: RoomSettings;
  players: Record<string, LobbyPlayer>;
  playerCount: number;
  minRequiredPlayers: number;
  round?: number;
  phase?: 'day' | 'night';
  phaseEndsAt?: number;
  totalHouses?: number;
  housesDestroyedPerRound?: number;
  fugitivePlayerUid?: string;
  fugitiveCurrentHouse?: number;
  fugitiveSpawnpointHouse?: number | null;
  houses?: Record<number, HouseState>;
  matchPlayers?: Record<string, PlayerInMatch>;
  activeInterrogation?: InterrogationRecord | null;
  actionUsageByPlayer?: Record<string, { round: number; phase: 'day' | 'night'; count: number }>;
  usedUniqueAbilities?: Record<string, string[]>;
}

export interface MatchState extends RoomDocument {
  round: number;
  phaseEndsAt: number;
  
  // Game Board & Progression
  houses: Record<number, HouseState>;
  
  // Fugitive State (server-authoritative)
  fugitivePlayerUid: string;
  fugitiveCurrentHouse: number;
  fugitiveSpawnpointHouse?: number | null;
  spawnpointCooldownRounds: number;
  spawnpointHistory: SpawnpointClue[];
  
  // Roster in active match
  matchPlayers: Record<string, PlayerInMatch>;
  
  // Engineer contraptions
  activeContraptions?: {
    type: 'defibrillator' | 'turret' | 'disruptor';
    secretCode: number;
    ownerUid: string;
    boundPlayerUid?: string;
  }[];
  
  // War state (Dictator ability)
  warfare?: {
    teamA: TeamId;
    teamB: TeamId;
    active: boolean;
  };
  
  // Victory
  winnerTeam?: TeamId | 'draw';
  winningPlayerUids?: string[];
  endReason?: string;
}
