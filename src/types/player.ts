// Player progression, cosmetics, and user profile data models

export interface CosmeticItem {
  id: string;
  name: string;
  category: 'skin' | 'avatar' | 'nameplate' | 'background' | 'title' | 'effect';
  description: string;
  priceCoins: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  assetPath: string;
  isAvailable: boolean;
  featured?: boolean;
  minLevel?: number;
  requiredAchievementId?: string;
}

export interface PlayerStats {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPlaytimeMs: number;
  teamWins: {
    investigators: number;
    annihilators: number;
    communists: number;
    soldiers: number;
    solo: number;
  };
  fugitiveWins: number;
  soloWins: number;
  roleWins: Record<string, number>;
  kills: number;
  successfulAbilities: number;
  survivedMatches: number;
  survivalRate: number;
  totalCrimesCommitted: number;
  housesDemolished: number;
  spawnpointsTriggered: number;
}

export interface MatchHistoryRecord {
  matchId: string;
  roomName: string;
  date: number;
  durationMs: number;
  result: 'victory' | 'defeat';
  playerTeam: string;
  playerRole: string;
  victoryCondition: string;
  survived: boolean;
  kills: number;
  abilitiesUsed: number;
  xpEarned: number;
  achievementsUnlocked: string[];
}

export interface DailyStreakState {
  currentStreak: number;
  longestStreak: number;
  lastClaimDate: string; // YYYY-MM-DD UTC server-time
  rewardsClaimed: number[];
  totalClaims?: number;
  milestonesClaimed?: number[];
}

export interface DailyClaimRecord {
  utcDate: string; // YYYY-MM-DD
  dayInCycle: number; // 1..7
  streakAtClaim: number;
  coinsAwarded: number;
  xpAwarded: number;
  cosmeticUnlocked?: string;
  milestoneUnlocked?: number;
  claimedAtMs: number;
}

export interface AchievementItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: number;
}

export interface PlayerProfile {
  uid: string;
  email: string;
  username: string;
  normalizedUsername: string; // Lowercase for case-insensitive uniqueness check
  avatarId: string;
  bio?: string;
  title: string;
  level: number;
  xp: number;
  coins: number;
  equippedCosmetics: {
    skin?: string;
    avatar?: string;
    nameplate?: string;
    background?: string;
    title?: string;
    effect?: string;
  };
  inventory: string[]; // cosmetic item ids
  achievements: AchievementItem[];
  stats: PlayerStats;
  streak: DailyStreakState;
  rewardedMatchIds?: string[];
  processedPurchaseIds?: string[];
  createdAt: number;
  lastLoginAt: number;
  updatedAt: number;
}

export const STANDARD_AVATARS = [
  { id: 'avatar_inquisitor', name: 'Grand Inquisitor', icon: 'Eye', role: 'Detective' },
  { id: 'avatar_arsonist', name: 'Pyromancer', icon: 'Flame', role: 'Arsonist' },
  { id: 'avatar_communist', name: 'Proletariat Hero', icon: 'Users', role: 'Worker' },
  { id: 'avatar_soldier', name: 'Garrison Trooper', icon: 'Shield', role: 'Trooper' },
  { id: 'avatar_fugitive', name: 'The Elusive Quarry', icon: 'Skull', role: 'The Fugitive' },
  { id: 'avatar_scholar', name: 'Court Alchemist', icon: 'Feather', role: 'Scientist' },
  { id: 'avatar_knight', name: 'Order Templar', icon: 'Crosshair', role: 'Veteran' },
  { id: 'avatar_spy', name: 'Shadow Infiltrator', icon: 'KeyRound', role: 'Spy' },
];

export const INITIAL_ACHIEVEMENTS: AchievementItem[] = [
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Eliminate The Fugitive or strike down a designated quarry for the first time.',
    icon: 'Skull',
  },
  {
    id: 'the_untraceable',
    name: 'The Untraceable',
    description: 'Successfully evade capture as The Fugitive by triggering a secret Spawnpoint.',
    icon: 'Shield',
  },
  {
    id: 'king_of_ashes',
    name: 'King of Ashes',
    description: 'Demolish 10 houses across your multiplayer career with Annihilator munitions.',
    icon: 'Flame',
  },
  {
    id: 'proletariat_hero',
    name: 'Proletariat Hero',
    description: 'Secure a collective victory while acting as a Communist Ghost.',
    icon: 'Users',
  },
  {
    id: 'veteran_fortitude',
    name: 'Combat Hardened',
    description: 'Survive lethal assassination attempts 3 times using Soldier passives.',
    icon: 'Award',
  },
];

export function createDefaultProfile(uid: string, email: string, username: string): PlayerProfile {
  const now = Date.now();
  return {
    uid,
    email,
    username,
    normalizedUsername: username.toLowerCase(),
    avatarId: 'avatar_inquisitor',
    bio: 'A sworn seeker of truth walking the cobblestones of the realm.',
    title: 'Novice Tracker',
    level: 1,
    xp: 0,
    coins: 100, // Welcome bounty
    equippedCosmetics: {
      skin: 'skin_default',
      avatar: 'avatar_inquisitor',
      nameplate: 'border_parchment',
      title: 'Novice Tracker',
    },
    inventory: ['skin_default', 'avatar_inquisitor', 'border_parchment'],
    achievements: INITIAL_ACHIEVEMENTS,
    stats: {
      totalMatches: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      totalPlaytimeMs: 0,
      teamWins: {
        investigators: 0,
        annihilators: 0,
        communists: 0,
        soldiers: 0,
        solo: 0,
      },
      fugitiveWins: 0,
      soloWins: 0,
      roleWins: {},
      kills: 0,
      successfulAbilities: 0,
      survivedMatches: 0,
      survivalRate: 0,
      totalCrimesCommitted: 0,
      housesDemolished: 0,
      spawnpointsTriggered: 0,
    },
    rewardedMatchIds: [],
    streak: {
      currentStreak: 1,
      longestStreak: 1,
      lastClaimDate: new Date().toISOString().split('T')[0],
      rewardsClaimed: [1],
    },
    createdAt: now,
    lastLoginAt: now,
    updatedAt: now,
  };
}
