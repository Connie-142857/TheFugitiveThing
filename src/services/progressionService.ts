// Authoritative Player Progression, XP Curve, Achievements & Match History Service
// Ensures server-validated rewards, privacy preservation, and duplicate-reward prevention.

import {
  doc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../firebase/config.ts';
import type {
  PlayerProfile,
  PlayerStats,
  AchievementItem,
  MatchHistoryRecord,
} from '../types/player.ts';
import type { RoomDocument, GameEvent } from '../types/game.ts';
import { decodeAuthoritativeRole } from './matchInitService.ts';
import { cleanFirestoreObject } from './gameEventManager.ts';
import { COIN_REWARD_CONFIG } from './shopService.ts';

// -------------------------------------------------------------
// 1. CONFIGURABLE XP & LEVEL PROGRESSION CURVE
// -------------------------------------------------------------

export const XP_CURVE_CONFIG = {
  baseXpPerLevel: 250,
  exponent: 1.35,
  matchCompletionXp: 50,
  victoryBonusXp: 100,
  soloOrFugitiveVictoryBonusXp: 50,
  survivalBonusXp: 25,
  achievementUnlockXp: 75,
};

export const RANK_TITLES: { minLevel: number; title: string }[] = [
  { minLevel: 1, title: 'Novice Tracker' },
  { minLevel: 3, title: 'Sworn Watchman' },
  { minLevel: 5, title: 'Citadel Investigator' },
  { minLevel: 8, title: 'High Inquisitor' },
  { minLevel: 12, title: 'Shadow Marshal' },
  { minLevel: 16, title: 'Grand Arbiter' },
  { minLevel: 20, title: 'Legend of the Realm' },
];

/**
 * XP required to advance FROM `level` TO `level + 1`
 */
export function getXpRequiredForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.floor(
    XP_CURVE_CONFIG.baseXpPerLevel * Math.pow(safeLevel, XP_CURVE_CONFIG.exponent)
  );
}

export function getRankTitleForLevel(level: number): string {
  let current = RANK_TITLES[0].title;
  for (const entry of RANK_TITLES) {
    if (level >= entry.minLevel) {
      current = entry.title;
    }
  }
  return current;
}

export interface LevelProgressInfo {
  level: number;
  currentLevelXp: number;
  xpRequiredForNext: number;
  progressPercent: number;
  rankTitle: string;
}

/**
 * Computes current level, XP within current level, XP needed for next level,
 * progress percentage, and rank title from cumulative total XP.
 */
export function getLevelProgress(totalXp: number): LevelProgressInfo {
  let remainingXp = Math.max(0, Math.floor(totalXp));
  let level = 1;

  while (true) {
    const needed = getXpRequiredForLevel(level);
    if (remainingXp < needed) {
      const progressPercent = Math.min(100, Math.floor((remainingXp / needed) * 100));
      return {
        level,
        currentLevelXp: remainingXp,
        xpRequiredForNext: needed,
        progressPercent,
        rankTitle: getRankTitleForLevel(level),
      };
    }
    remainingXp -= needed;
    level += 1;
  }
}

// -------------------------------------------------------------
// 2. ACHIEVEMENTS CATALOGUE
// -------------------------------------------------------------

export const ACHIEVEMENT_CATALOGUE: AchievementItem[] = [
  {
    id: 'first_chronicle',
    name: 'First Chronicle',
    description: 'Complete your first multiplayer match in the realm.',
    icon: 'Compass',
  },
  {
    id: 'first_victory',
    name: 'First Triumph',
    description: 'Secure your very first multiplayer victory.',
    icon: 'Trophy',
  },
  {
    id: 'investigator_master',
    name: 'Grand Inquisitor',
    description: 'Win 3 matches as a member of the Investigators.',
    icon: 'Eye',
  },
  {
    id: 'annihilator_master',
    name: 'King of Ashes',
    description: 'Win 3 matches as a member of the Annihilators.',
    icon: 'Flame',
  },
  {
    id: 'communist_master',
    name: 'Proletariat Hero',
    description: 'Win 3 matches as a member of the Communists.',
    icon: 'Users',
  },
  {
    id: 'soldier_master',
    name: 'Iron Garrison',
    description: 'Win 3 matches as a member of the Soldiers.',
    icon: 'Shield',
  },
  {
    id: 'the_untraceable',
    name: 'The Untraceable',
    description: 'Evade capture as The Fugitive by triggering a secret Spawnpoint.',
    icon: 'Shield',
  },
  {
    id: 'elusive_legend',
    name: 'Elusive Legend',
    description: 'Win a multiplayer match playing as The Fugitive.',
    icon: 'Skull',
  },
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Eliminate an opponent or The Fugitive during a match.',
    icon: 'Skull',
  },
  {
    id: 'master_strategist',
    name: 'Master Tactician',
    description: 'Successfully enact 10 or more role abilities across your career.',
    icon: 'Award',
  },
  {
    id: 'survivor_spirit',
    name: 'Last Breath',
    description: 'Survive until the conclusion of 3 multiplayer matches.',
    icon: 'Shield',
  },
  {
    id: 'solo_usurper',
    name: 'Lone Usurper',
    description: 'Achieve a Solo Infiltrator victory.',
    icon: 'KeyRound',
  },
  {
    id: 'veteran_fortitude',
    name: 'Combat Hardened',
    description: 'Survive a lethal attack attempt via Soldier, Daredevil, or Ward passives.',
    icon: 'Award',
  },
];

// -------------------------------------------------------------
// 3. AUTHORITATIVE MATCH PROGRESSION VALIDATION & COMPUTATION
// -------------------------------------------------------------

export interface MatchProgressionOutcome {
  xpEarned: number;
  coinsEarned: number;
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
  newRankTitle: string;
  newlyUnlockedAchievements: AchievementItem[];
  updatedStats: PlayerStats;
  updatedAchievements: AchievementItem[];
  historyRecord: MatchHistoryRecord;
}

/**
 * Pure, deterministic progression computation validated against authoritative room state.
 * Rejects ongoing matches, non-participants, and duplicate match reward claims.
 */
export function computeMatchProgression(
  profile: PlayerProfile,
  room: RoomDocument,
  playerUid: string,
  verifiedRoleId?: string,
  now: number = Date.now()
): MatchProgressionOutcome {
  // 1. Validate match conclusion (never record/leak ongoing matches)
  if (room.status !== 'finished' && room.status !== 'ended') {
    throw new Error('Cannot claim progression rewards for an ongoing match.');
  }

  // 2. Prevent duplicate match rewards
  if (profile.rewardedMatchIds?.includes(room.id)) {
    throw new Error('Progression rewards for this match have already been claimed.');
  }

  // 3. Validate participant presence in authoritative match roster
  const matchPlayer = room.matchPlayers?.[playerUid];
  if (!matchPlayer) {
    throw new Error('Player was not an authoritative participant in this match.');
  }

  const playerTeam = matchPlayer.team || 'unknown';
  const playerRole = verifiedRoleId || matchPlayer.roleId || 'unknown';
  const winnerTeam = (room as any).winnerTeam as string | undefined;
  const winningPlayerUids = ((room as any).winningPlayerUids as string[] | undefined) || [];
  const endReason = ((room as any).endReason as string | undefined) || 'Match concluded.';

  const won =
    winningPlayerUids.includes(playerUid) ||
    (winnerTeam !== undefined &&
      winnerTeam !== 'draw' &&
      winnerTeam !== 'solo' &&
      winnerTeam === playerTeam);

  const survived = matchPlayer.isAlive === true;
  const events: GameEvent[] = ((room as any).events as GameEvent[]) || [];

  // Reliably count player's kills, ability uses, and special feats from authoritative events/state
  const kills = events.filter(
    (e) => e.type === 'player_killed' && e.actorUid === playerUid
  ).length;

  const abilitiesUsed = events.filter(
    (e) => e.type === 'ability_used' && e.actorUid === playerUid
  ).length;

  const spawnpointsTriggered =
    matchPlayer.isFugitive && Array.isArray((room as any).spawnpointHistory)
      ? ((room as any).spawnpointHistory as any[]).length
      : 0;

  const housesDemolishedByPlayer = events
    .filter((e) => e.type === 'house_destroyed' && e.actorUid === playerUid)
    .reduce((sum, e) => sum + (e.targetHouses?.length || 1), 0);

  const matchStart = (room as any).startedAt || room.createdAt || now;
  const durationMs = Math.max(0, (room.updatedAt || now) - matchStart);

  // Merge existing stats safely
  const prev = profile.stats || ({} as PlayerStats);
  const totalMatches = (prev.totalMatches || 0) + 1;
  const wins = (prev.wins || 0) + (won ? 1 : 0);
  const losses = (prev.losses || 0) + (won ? 0 : 1);
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  const survivedMatches = (prev.survivedMatches || 0) + (survived ? 1 : 0);
  const survivalRate = totalMatches > 0 ? Math.round((survivedMatches / totalMatches) * 100) : 0;

  const teamWins = {
    investigators: (prev.teamWins?.investigators || 0) + (won && playerTeam === 'investigators' ? 1 : 0),
    annihilators: (prev.teamWins?.annihilators || 0) + (won && playerTeam === 'annihilators' ? 1 : 0),
    communists: (prev.teamWins?.communists || 0) + (won && playerTeam === 'communists' ? 1 : 0),
    soldiers: (prev.teamWins?.soldiers || 0) + (won && playerTeam === 'soldiers' ? 1 : 0),
    solo: (prev.teamWins?.solo || 0) + (won && playerTeam === 'solo' ? 1 : 0),
  };

  const fugitiveWins = (prev.fugitiveWins || 0) + (won && playerTeam === 'fugitive' ? 1 : 0);
  const soloWins = (prev.soloWins || 0) + (won && playerTeam === 'solo' ? 1 : 0);

  const roleWins: Record<string, number> = { ...(prev.roleWins || {}) };
  if (won && playerRole && playerRole !== 'unknown') {
    roleWins[playerRole] = (roleWins[playerRole] || 0) + 1;
  }

  const updatedStats: PlayerStats = {
    totalMatches,
    wins,
    losses,
    winRate,
    totalPlaytimeMs: (prev.totalPlaytimeMs || 0) + durationMs,
    teamWins,
    fugitiveWins,
    soloWins,
    roleWins,
    kills: (prev.kills || 0) + kills,
    successfulAbilities: (prev.successfulAbilities || 0) + abilitiesUsed,
    survivedMatches,
    survivalRate,
    totalCrimesCommitted: (prev.totalCrimesCommitted || 0) + (matchPlayer.crimes || 0),
    housesDemolished: (prev.housesDemolished || 0) + housesDemolishedByPlayer,
    spawnpointsTriggered: (prev.spawnpointsTriggered || 0) + spawnpointsTriggered,
  };

  // Evaluate achievements
  const existingMap = new Map<string, AchievementItem>();
  for (const a of profile.achievements || []) {
    existingMap.set(a.id, a);
  }

  const newlyUnlockedAchievements: AchievementItem[] = [];
  const updatedAchievements: AchievementItem[] = ACHIEVEMENT_CATALOGUE.map((cat) => {
    const existing = existingMap.get(cat.id);
    if (existing?.unlockedAt) {
      return { ...cat, unlockedAt: existing.unlockedAt };
    }

    let shouldUnlock = false;
    switch (cat.id) {
      case 'first_chronicle':
        shouldUnlock = updatedStats.totalMatches >= 1;
        break;
      case 'first_victory':
        shouldUnlock = updatedStats.wins >= 1;
        break;
      case 'investigator_master':
        shouldUnlock = updatedStats.teamWins.investigators >= 3;
        break;
      case 'annihilator_master':
        shouldUnlock = updatedStats.teamWins.annihilators >= 3;
        break;
      case 'communist_master':
        shouldUnlock = updatedStats.teamWins.communists >= 3;
        break;
      case 'soldier_master':
        shouldUnlock = updatedStats.teamWins.soldiers >= 3;
        break;
      case 'the_untraceable':
        shouldUnlock = updatedStats.spawnpointsTriggered >= 1;
        break;
      case 'elusive_legend':
        shouldUnlock = updatedStats.fugitiveWins >= 1;
        break;
      case 'first_blood':
        shouldUnlock = updatedStats.kills >= 1;
        break;
      case 'master_strategist':
        shouldUnlock = updatedStats.successfulAbilities >= 10;
        break;
      case 'survivor_spirit':
        shouldUnlock = updatedStats.survivedMatches >= 3;
        break;
      case 'solo_usurper':
        shouldUnlock = updatedStats.soloWins >= 1;
        break;
      case 'veteran_fortitude':
        shouldUnlock = (matchPlayer.survivedAttacksCount || 0) >= 1;
        break;
    }

    if (shouldUnlock) {
      const unlocked: AchievementItem = { ...cat, unlockedAt: now };
      newlyUnlockedAchievements.push(unlocked);
      return unlocked;
    }

    return { ...cat };
  });

  // Compute XP earned
  let xpEarned = XP_CURVE_CONFIG.matchCompletionXp;
  if (won) {
    xpEarned += XP_CURVE_CONFIG.victoryBonusXp;
    if (playerTeam === 'solo' || playerTeam === 'fugitive') {
      xpEarned += XP_CURVE_CONFIG.soloOrFugitiveVictoryBonusXp;
    }
  }
  if (survived) {
    xpEarned += XP_CURVE_CONFIG.survivalBonusXp;
  }
  xpEarned += newlyUnlockedAchievements.length * XP_CURVE_CONFIG.achievementUnlockXp;

  // Compute Silver Coins earned
  let coinsEarned =
    COIN_REWARD_CONFIG.matchParticipationCoins + COIN_REWARD_CONFIG.matchCompletionCoins;
  if (won) {
    coinsEarned += COIN_REWARD_CONFIG.victoryCoins;
    if (playerTeam === 'solo' || playerTeam === 'fugitive') {
      coinsEarned += COIN_REWARD_CONFIG.soloOrFugitiveVictoryBonusCoins;
    }
  }
  coinsEarned += newlyUnlockedAchievements.length * COIN_REWARD_CONFIG.achievementUnlockCoins;

  const prevProgress = getLevelProgress(profile.xp || 0);
  const newTotalXp = (profile.xp || 0) + xpEarned;
  const newProgress = getLevelProgress(newTotalXp);

  const historyRecord: MatchHistoryRecord = {
    matchId: room.id,
    roomName: (room as any).name || (room as any).title || 'Unnamed Chamber',
    date: now,
    durationMs,
    result: won ? 'victory' : 'defeat',
    playerTeam,
    playerRole,
    victoryCondition: endReason,
    survived,
    kills,
    abilitiesUsed,
    xpEarned,
    achievementsUnlocked: newlyUnlockedAchievements.map((a) => a.id),
  };

  return {
    xpEarned,
    coinsEarned,
    previousLevel: prevProgress.level,
    newLevel: newProgress.level,
    leveledUp: newProgress.level > prevProgress.level,
    newRankTitle: newProgress.rankTitle,
    newlyUnlockedAchievements,
    updatedStats,
    updatedAchievements,
    historyRecord,
  };
}

// -------------------------------------------------------------
// 4. FIRESTORE TRANSACTIONAL PERSISTENCE & HISTORY QUERIES
// -------------------------------------------------------------

/**
 * Claims and persists match progression rewards atomically in Firestore.
 * Prevents duplicate match rewards via both `rewardedMatchIds` and `matchHistory/{roomId}` existence check.
 */
export async function claimMatchProgressionInFirestore(
  roomId: string,
  playerUid: string
): Promise<MatchProgressionOutcome> {
  const roomRef = doc(db, 'rooms', roomId);
  const userRef = doc(db, 'users', playerUid);
  const historyRef = doc(db, 'users', playerUid, 'matchHistory', roomId);
  const secretRef = doc(db, 'rooms', roomId, 'secretRoles', playerUid);
  const now = Date.now();

  return runTransaction(db, async (transaction) => {
    const [roomSnap, userSnap, historySnap, secretSnap] = await Promise.all([
      transaction.get(roomRef),
      transaction.get(userRef),
      transaction.get(historyRef),
      transaction.get(secretRef),
    ]);

    if (!roomSnap.exists()) {
      throw new Error('Chamber record does not exist.');
    }
    if (!userSnap.exists()) {
      throw new Error('Player profile does not exist.');
    }
    if (historySnap.exists()) {
      throw new Error('Progression rewards for this match have already been claimed.');
    }

    const room = roomSnap.data() as RoomDocument;
    const profile = userSnap.data() as PlayerProfile;

    let verifiedRoleId: string | undefined = secretSnap.exists()
      ? (secretSnap.data() as any).roleId
      : undefined;
    if (!verifiedRoleId && (room as any).authoritativeRoles?.[playerUid]) {
      verifiedRoleId = decodeAuthoritativeRole(
        roomId,
        playerUid,
        (room as any).authoritativeRoles[playerUid]
      );
    }

    const outcome = computeMatchProgression(profile, room, playerUid, verifiedRoleId, now);

    const newTotalXp = (profile.xp || 0) + outcome.xpEarned;
    const newTotalCoins = (profile.coins || 0) + outcome.coinsEarned;
    const updatedRewardedIds = [...(profile.rewardedMatchIds || []), roomId];

    transaction.set(historyRef, cleanFirestoreObject(outcome.historyRecord));
    transaction.update(userRef, {
      xp: newTotalXp,
      coins: newTotalCoins,
      level: outcome.newLevel,
      title: outcome.newRankTitle,
      stats: cleanFirestoreObject(outcome.updatedStats),
      achievements: outcome.updatedAchievements.map((a) => cleanFirestoreObject(a)),
      rewardedMatchIds: updatedRewardedIds,
      updatedAt: now,
    });

    return outcome;
  });
}

/**
 * Fetches the authenticated player's immutable match history records.
 */
export async function fetchPlayerMatchHistory(
  playerUid: string,
  maxItems: number = 25
): Promise<MatchHistoryRecord[]> {
  const historyCol = collection(db, 'users', playerUid, 'matchHistory');
  const q = query(historyCol, orderBy('date', 'desc'), limit(maxItems));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as MatchHistoryRecord);
}
