// Authoritative Daily Login Rewards & Consecutive Streak Service
// Strategy: Strict UTC Calendar Days (resets daily at 00:00:00 UTC).
// Protected by immutable `users/{uid}/dailyClaims/{utcDate}` receipts + serverTimestamp().

import {
  doc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config.ts';
import type {
  PlayerProfile,
  DailyClaimRecord,
  DailyStreakState,
} from '../types/player.ts';
import { getLevelProgress } from './progressionService.ts';
import { getCosmeticById } from './shopService.ts';
import { cleanFirestoreObject } from './gameEventManager.ts';

// -------------------------------------------------------------
// 1. CONFIGURABLE DAILY REWARD SCHEDULE & STREAK MILESTONES
// -------------------------------------------------------------

export interface DailyRewardTier {
  day: number; // 1..7
  label: string;
  coins: number;
  xp: number;
  cosmeticItemId?: string;
  specialRewardText?: string;
}

export interface StreakMilestoneConfig {
  streakDays: number;
  title: string;
  bonusCoins: number;
  bonusXp: number;
  cosmeticItemId?: string;
}

export const DAILY_REWARD_RESET_STRATEGY = {
  timezone: 'UTC',
  resetHourUtc: 0,
  resetMinuteUtc: 0,
  description: 'Daily login eligibility resets at 00:00:00 UTC.',
};

export const DAILY_REWARD_SCHEDULE: DailyRewardTier[] = [
  { day: 1, label: 'Day 1 Tribute', coins: 25, xp: 25 },
  { day: 2, label: 'Day 2 Tribute', coins: 50, xp: 35 },
  { day: 3, label: 'Day 3 Tribute', coins: 75, xp: 50 },
  { day: 4, label: 'Day 4 Tribute', coins: 100, xp: 60 },
  { day: 5, label: 'Day 5 Tribute', coins: 150, xp: 75 },
  { day: 6, label: 'Day 6 Tribute', coins: 200, xp: 100 },
  {
    day: 7,
    label: 'Day 7 Royal Grant',
    coins: 500,
    xp: 200,
    cosmeticItemId: 'title_watchman',
    specialRewardText: 'Vigilant Sentinel Title + Royal Treasury Grant',
  },
];

export const STREAK_MILESTONES: StreakMilestoneConfig[] = [
  { streakDays: 3, title: '3-Day Vigilance', bonusCoins: 50, bonusXp: 50 },
  {
    streakDays: 7,
    title: '7-Day Sovereign Seal',
    bonusCoins: 150,
    bonusXp: 100,
    cosmeticItemId: 'avatar_wax_seal',
  },
  { streakDays: 14, title: '14-Day Citadel Veteran', bonusCoins: 300, bonusXp: 250 },
  {
    streakDays: 30,
    title: '30-Day Immortal Warden',
    bonusCoins: 1000,
    bonusXp: 500,
    cosmeticItemId: 'effect_ember_sparks',
  },
];

// -------------------------------------------------------------
// 2. UTC DATE BOUNDARY & STREAK HELPERS
// -------------------------------------------------------------

/**
 * Converts a UTC millisecond timestamp into `YYYY-MM-DD` strictly in UTC.
 * Immune to client local timezone offsets.
 */
export function getUtcDateString(timestampMs: number = Date.now()): string {
  const d = new Date(timestampMs);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses `YYYY-MM-DD` into UTC midnight milliseconds.
 */
export function parseUtcMidnightMs(dateStr: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) {
    throw new Error(`Invalid UTC date format: "${dateStr}". Expected YYYY-MM-DD.`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return Date.UTC(year, month, day);
}

/**
 * Returns exact whole calendar days elapsed from `fromDateStr` to `toDateStr` in UTC.
 */
export function getUtcDayDifference(fromDateStr: string, toDateStr: string): number {
  const fromMs = parseUtcMidnightMs(fromDateStr);
  const toMs = parseUtcMidnightMs(toDateStr);
  return Math.round((toMs - fromMs) / 86400000);
}

/**
 * Returns whether the player is currently eligible to claim today's UTC daily reward.
 */
export function isDailyRewardAvailable(
  profile: PlayerProfile | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!profile) return false;
  const todayUtc = getUtcDateString(nowMs);
  const lastClaim = profile.streak?.lastClaimDate;
  if (!lastClaim) return true;
  return lastClaim !== todayUtc;
}

// -------------------------------------------------------------
// 3. PURE AUTHORITATIVE CLAIM & STREAK LOGIC
// -------------------------------------------------------------

export interface DailyClaimOutcome {
  utcDate: string;
  dayInCycle: number;
  newStreak: number;
  streakReset: boolean;
  coinsAwarded: number;
  xpAwarded: number;
  cosmeticUnlocked?: string;
  milestoneUnlocked?: StreakMilestoneConfig;
  leveledUp: boolean;
  newLevel: number;
  newRankTitle: string;
  claimRecord: DailyClaimRecord;
  updatedProfile: PlayerProfile;
}

/**
 * Pure, deterministic daily login claim computation.
 * Handles:
 * - First-ever claim
 * - Same-day duplicate prevention
 * - Backwards clock manipulation rejection
 * - Consecutive day progression (including month/year/leap-year boundaries)
 * - Missed day streak reset
 * - 7-day reward cycle + streak milestones + cosmetic & XP level-up grants
 */
export function claimDailyRewardPure(
  profile: PlayerProfile,
  todayUtcDate: string,
  nowMs: number = Date.now()
): DailyClaimOutcome {
  const prevStreak: DailyStreakState = profile.streak || {
    currentStreak: 0,
    longestStreak: 0,
    lastClaimDate: '',
    rewardsClaimed: [],
    totalClaims: 0,
    milestonesClaimed: [],
  };

  let newStreak = 1;
  let streakReset = false;

  if (prevStreak.lastClaimDate) {
    const dayDiff = getUtcDayDifference(prevStreak.lastClaimDate, todayUtcDate);

    if (dayDiff === 0) {
      throw new Error('Daily reward for today (UTC) has already been claimed.');
    }
    if (dayDiff < 0) {
      throw new Error('Invalid claim date: client clock appears behind last recorded server claim.');
    }
    if (dayDiff === 1) {
      // Consecutive login!
      newStreak = (prevStreak.currentStreak || 0) + 1;
    } else {
      // Missed 1 or more UTC days -> streak resets to 1
      newStreak = 1;
      streakReset = true;
    }
  }

  const dayInCycle = ((newStreak - 1) % 7) + 1;
  const tier = DAILY_REWARD_SCHEDULE[dayInCycle - 1] || DAILY_REWARD_SCHEDULE[0];

  let coinsAwarded = tier.coins;
  let xpAwarded = tier.xp;
  let cosmeticUnlocked: string | undefined = undefined;
  let milestoneUnlocked: StreakMilestoneConfig | undefined = undefined;

  const updatedInventory = [...(profile.inventory || [])];

  // Grant tier cosmetic if configured and not already owned
  if (tier.cosmeticItemId && !updatedInventory.includes(tier.cosmeticItemId)) {
    const item = getCosmeticById(tier.cosmeticItemId);
    if (item) {
      updatedInventory.push(item.id);
      cosmeticUnlocked = item.id;
    }
  }

  // Check streak milestones
  const claimedMilestones = [...(prevStreak.milestonesClaimed || [])];
  for (const ms of STREAK_MILESTONES) {
    if (newStreak >= ms.streakDays && !claimedMilestones.includes(ms.streakDays)) {
      claimedMilestones.push(ms.streakDays);
      milestoneUnlocked = ms;
      coinsAwarded += ms.bonusCoins;
      xpAwarded += ms.bonusXp;
      if (ms.cosmeticItemId && !updatedInventory.includes(ms.cosmeticItemId)) {
        const item = getCosmeticById(ms.cosmeticItemId);
        if (item) {
          updatedInventory.push(item.id);
          cosmeticUnlocked = cosmeticUnlocked || item.id;
        }
      }
      break; // Award highest newly reached milestone cleanly
    }
  }

  const prevLevelInfo = getLevelProgress(profile.xp || 0);
  const newTotalXp = (profile.xp || 0) + xpAwarded;
  const newLevelInfo = getLevelProgress(newTotalXp);

  const newTotalCoins = (profile.coins || 0) + coinsAwarded;
  const updatedRewardsClaimed =
    streakReset || dayInCycle === 1
      ? [1]
      : Array.from(new Set([...(prevStreak.rewardsClaimed || []), dayInCycle]));

  const updatedStreak: DailyStreakState = {
    currentStreak: newStreak,
    longestStreak: Math.max(prevStreak.longestStreak || 0, newStreak),
    lastClaimDate: todayUtcDate,
    rewardsClaimed: updatedRewardsClaimed,
    totalClaims: (prevStreak.totalClaims || 0) + 1,
    milestonesClaimed: claimedMilestones,
  };

  const claimRecord: DailyClaimRecord = {
    utcDate: todayUtcDate,
    dayInCycle,
    streakAtClaim: newStreak,
    coinsAwarded,
    xpAwarded,
    ...(cosmeticUnlocked ? { cosmeticUnlocked } : {}),
    ...(milestoneUnlocked ? { milestoneUnlocked: milestoneUnlocked.streakDays } : {}),
    claimedAtMs: nowMs,
  };

  const updatedProfile: PlayerProfile = {
    ...profile,
    coins: newTotalCoins,
    xp: newTotalXp,
    level: newLevelInfo.level,
    title: newLevelInfo.level > prevLevelInfo.level ? newLevelInfo.rankTitle : profile.title,
    inventory: updatedInventory,
    streak: updatedStreak,
    updatedAt: nowMs,
  };

  return {
    utcDate: todayUtcDate,
    dayInCycle,
    newStreak,
    streakReset,
    coinsAwarded,
    xpAwarded,
    cosmeticUnlocked,
    milestoneUnlocked,
    leveledUp: newLevelInfo.level > prevLevelInfo.level,
    newLevel: newLevelInfo.level,
    newRankTitle: newLevelInfo.rankTitle,
    claimRecord,
    updatedProfile,
  };
}

// -------------------------------------------------------------
// 4. FIRESTORE TRANSACTIONAL CLAIM & HISTORY QUERIES
// -------------------------------------------------------------

/**
 * Claims the daily login reward atomically in Firestore.
 * Uses `users/{uid}/dailyClaims/{todayUtcDate}` + `serverTimestamp()` to guarantee
 * single-claim-per-UTC-day and prevent replay/duplication.
 */
export async function claimDailyRewardInFirestore(uid: string): Promise<DailyClaimOutcome> {
  const nowMs = Date.now();
  const todayUtc = getUtcDateString(nowMs);
  const userRef = doc(db, 'users', uid);
  const claimRef = doc(db, 'users', uid, 'dailyClaims', todayUtc);

  return runTransaction(db, async (transaction) => {
    const [userSnap, claimSnap] = await Promise.all([
      transaction.get(userRef),
      transaction.get(claimRef),
    ]);

    if (!userSnap.exists()) {
      throw new Error('Player profile not found.');
    }
    if (claimSnap.exists()) {
      throw new Error('Daily reward for today (UTC) has already been claimed.');
    }

    const profile = userSnap.data() as PlayerProfile;
    const outcome = claimDailyRewardPure(profile, todayUtc, nowMs);

    transaction.set(claimRef, {
      ...cleanFirestoreObject(outcome.claimRecord),
      claimedAt: serverTimestamp(),
    });

    transaction.update(userRef, {
      coins: outcome.updatedProfile.coins,
      xp: outcome.updatedProfile.xp,
      level: outcome.updatedProfile.level,
      title: outcome.updatedProfile.title,
      inventory: outcome.updatedProfile.inventory,
      streak: cleanFirestoreObject(outcome.updatedProfile.streak),
      updatedAt: nowMs,
    });

    return outcome;
  });
}

/**
 * Fetches the player's recent daily login claim history.
 */
export async function fetchDailyClaimHistory(
  uid: string,
  maxItems: number = 14
): Promise<DailyClaimRecord[]> {
  const claimsCol = collection(db, 'users', uid, 'dailyClaims');
  const q = query(claimsCol, orderBy('claimedAtMs', 'desc'), limit(maxItems));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as DailyClaimRecord);
}
