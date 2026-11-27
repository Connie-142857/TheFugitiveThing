// Currency (Coins), Cosmetic Catalogue, Atomic Shop Purchases, Equipment & Daily Rewards Service
// Strictly cosmetic: zero gameplay, role, combat, or information advantages.

import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase/config.ts';
import type { CosmeticItem, PlayerProfile } from '../types/player.ts';
import { cleanFirestoreObject } from './gameEventManager.ts';

// -------------------------------------------------------------
// 1. CONFIGURABLE COIN REWARD SOURCES
// -------------------------------------------------------------

export const COIN_REWARD_CONFIG = {
  matchParticipationCoins: 20,
  matchCompletionCoins: 30,
  victoryCoins: 75,
  soloOrFugitiveVictoryBonusCoins: 50,
  achievementUnlockCoins: 50,
  dailyLoginRewards: [25, 50, 75, 100, 150, 200, 500], // Days 1..7
};

// -------------------------------------------------------------
// 2. COSMETIC CATALOGUE (ALL 6 CATEGORIES)
// -------------------------------------------------------------

export const COSMETIC_CATALOGUE: CosmeticItem[] = [
  // === CHARACTER SKINS ===
  {
    id: 'skin_default',
    name: 'Trainee Vellum Robe',
    category: 'skin',
    priceCoins: 0,
    rarity: 'common',
    assetPath: 'skin-default',
    description: 'Standard-issue parchment tunic worn by initiates of the Citadel.',
    isAvailable: true,
  },
  {
    id: 'skin_arsonist',
    name: 'Cinder Cloak',
    category: 'skin',
    priceCoins: 250,
    rarity: 'rare',
    assetPath: 'skin-cinder',
    description: 'Charred leather smelling faintly of brimstone and scorched earth. Purely cosmetic.',
    isAvailable: true,
  },
  {
    id: 'skin_inquisitor',
    name: 'High Inquisitor Vestments',
    category: 'skin',
    priceCoins: 450,
    rarity: 'epic',
    assetPath: 'skin-inquisitor',
    description: 'Embroidered velvet robes stained in royal ink. Provides zero gameplay advantage.',
    isAvailable: true,
    featured: true,
    minLevel: 2,
  },
  {
    id: 'skin_sovereign_gold',
    name: 'Gilded Sovereign Mantle',
    category: 'skin',
    priceCoins: 900,
    rarity: 'legendary',
    assetPath: 'skin-sovereign',
    description: 'Woven with antique gold thread for legends of the realm. Purely cosmetic.',
    isAvailable: true,
    featured: true,
    minLevel: 5,
  },

  // === AVATARS ===
  {
    id: 'avatar_inquisitor',
    name: 'Grand Inquisitor Emblem',
    category: 'avatar',
    priceCoins: 0,
    rarity: 'common',
    assetPath: 'Eye',
    description: 'Default sigil of the Citadel Watch.',
    isAvailable: true,
  },
  {
    id: 'avatar_wax_seal',
    name: 'Imperial Wax Seal',
    category: 'avatar',
    priceCoins: 150,
    rarity: 'common',
    assetPath: 'Shield',
    description: 'A crimson wax sigil stamped with the insignia of the supreme court.',
    isAvailable: true,
  },
  {
    id: 'avatar_gilded_skull',
    name: 'Gilded Ossuary Skull',
    category: 'avatar',
    priceCoins: 300,
    rarity: 'rare',
    assetPath: 'Skull',
    description: 'Gold-leafed bone discovered in an abandoned catacomb.',
    isAvailable: true,
    featured: true,
  },
  {
    id: 'avatar_phoenix_quill',
    name: 'Phoenix Feather Crest',
    category: 'avatar',
    priceCoins: 550,
    rarity: 'epic',
    assetPath: 'Flame',
    description: 'A glowing crest symbolizing rebirth from ashes.',
    isAvailable: true,
  },

  // === NAMEPLATES ===
  {
    id: 'border_parchment',
    name: 'Antique Monastic Border',
    category: 'nameplate',
    priceCoins: 0,
    rarity: 'common',
    assetPath: 'border-parchment',
    description: 'Classic ink-ruled frame.',
    isAvailable: true,
  },
  {
    id: 'nameplate_illuminated',
    name: 'Illuminated Monastic Border',
    category: 'nameplate',
    priceCoins: 225,
    rarity: 'rare',
    assetPath: 'border-illuminated',
    description: 'Gold-embossed border inspired by 14th-century monastery manuscripts.',
    isAvailable: true,
  },
  {
    id: 'nameplate_crimson_wax',
    name: 'Blood Seal Frame',
    category: 'nameplate',
    priceCoins: 400,
    rarity: 'epic',
    assetPath: 'border-crimson',
    description: 'Deep burgundy border sealed with molten wax.',
    isAvailable: true,
  },

  // === PROFILE BACKGROUNDS ===
  {
    id: 'bg_citadel_library',
    name: 'Citadel Scriptorium',
    category: 'background',
    priceCoins: 200,
    rarity: 'common',
    assetPath: 'bg-scriptorium',
    description: 'Candlelit parchment shelves of the Grand Archive.',
    isAvailable: true,
  },
  {
    id: 'bg_midnight_cobblestones',
    name: 'Midnight Cobblestones',
    category: 'background',
    priceCoins: 375,
    rarity: 'rare',
    assetPath: 'bg-cobblestones',
    description: 'Moonlit alleyways shrouded in twilight mist.',
    isAvailable: true,
  },
  {
    id: 'bg_royal_cathedral',
    name: 'Cathedral of Mirrors',
    category: 'background',
    priceCoins: 750,
    rarity: 'legendary',
    assetPath: 'bg-cathedral',
    description: 'Stained-glass brilliance reserved for high-ranking veterans.',
    isAvailable: true,
    featured: true,
    minLevel: 3,
  },

  // === TITLES ===
  {
    id: 'title_watchman',
    name: 'Vigilant Sentinel',
    category: 'title',
    priceCoins: 120,
    rarity: 'common',
    assetPath: 'Vigilant Sentinel',
    description: 'Honorary title awarded to steadfast keepers of the peace.',
    isAvailable: true,
  },
  {
    id: 'title_untraceable',
    name: 'The Untraceable Shadow',
    category: 'title',
    priceCoins: 600,
    rarity: 'legendary',
    assetPath: 'The Untraceable Shadow',
    description: 'A legendary title reserved for masters of evasion.',
    isAvailable: true,
    featured: true,
  },

  // === COSMETIC EFFECTS ===
  {
    id: 'effect_ember_sparks',
    name: 'Ember Sparks Aura',
    category: 'effect',
    priceCoins: 320,
    rarity: 'rare',
    assetPath: 'effect-embers',
    description: 'Subtle rising hearth embers around your dossier card. Purely visual.',
    isAvailable: true,
  },
  {
    id: 'effect_golden_halo',
    name: 'Gilded Seal Shimmer',
    category: 'effect',
    priceCoins: 680,
    rarity: 'epic',
    assetPath: 'effect-gilded',
    description: 'A warm antique-gold shimmer on your profile emblem. Purely visual.',
    isAvailable: true,
  },

  // === ARCHIVED / UNAVAILABLE ITEM (for availability validation) ===
  {
    id: 'skin_founder_relic',
    name: 'Founder\'s Sealed Relic',
    category: 'skin',
    priceCoins: 1000,
    rarity: 'legendary',
    assetPath: 'skin-founder',
    description: 'No longer available in the Merchant Bazaar.',
    isAvailable: false,
  },
];

export function getCosmeticById(itemId: string): CosmeticItem | undefined {
  return COSMETIC_CATALOGUE.find((item) => item.id === itemId);
}

// -------------------------------------------------------------
// 3. ATOMIC PURCHASE VALIDATION & EXECUTION
// -------------------------------------------------------------

export interface PurchaseResult {
  item: CosmeticItem;
  previousBalance: number;
  newBalance: number;
  purchaseId: string;
  updatedProfile: PlayerProfile;
}

/**
 * Pure authoritative purchase validation & state transition.
 * Enforces:
 * - Item exists & isAvailable
 * - Purchase restrictions (minLevel, requiredAchievementId)
 * - Authoritative server-side price (rejects client price tampering)
 * - Duplicate purchase prevention
 * - Replay attack prevention via unique requestId
 * - Sufficient balance & non-negative balance invariant
 */
export function purchaseCosmeticPure(
  profile: PlayerProfile,
  itemId: string,
  purchaseRequestId: string,
  clientExpectedPrice?: number,
  now: number = Date.now()
): PurchaseResult {
  if (!purchaseRequestId || purchaseRequestId.trim().length < 4) {
    throw new Error('Invalid purchase request identifier.');
  }

  // Replay protection
  if (profile.processedPurchaseIds?.includes(purchaseRequestId)) {
    throw new Error('Duplicate purchase request rejected (replay detected).');
  }

  const item = getCosmeticById(itemId);
  if (!item) {
    throw new Error('Requested cosmetic item does not exist in the Bazaar.');
  }

  if (!item.isAvailable) {
    throw new Error(`"${item.name}" is currently unavailable for purchase.`);
  }

  // Prevent client price manipulation
  if (clientExpectedPrice !== undefined && clientExpectedPrice !== item.priceCoins) {
    throw new Error('Price mismatch: authoritative Bazaar price does not match client request.');
  }

  // Prevent duplicate ownership
  if (profile.inventory?.includes(item.id)) {
    throw new Error(`You already own "${item.name}".`);
  }

  // Enforce purchase restrictions
  if (item.minLevel && (profile.level || 1) < item.minLevel) {
    throw new Error(`Requires Rank Level ${item.minLevel} to acquire "${item.name}".`);
  }

  if (item.requiredAchievementId) {
    const hasAch = profile.achievements?.some(
      (a) => a.id === item.requiredAchievementId && !!a.unlockedAt
    );
    if (!hasAch) {
      throw new Error(`Requires unlocking achievement "${item.requiredAchievementId}".`);
    }
  }

  // Validate balance & prevent negative balance
  const previousBalance = profile.coins || 0;
  if (previousBalance < item.priceCoins || item.priceCoins < 0) {
    throw new Error(
      `Insufficient Silver Coins: requires ${item.priceCoins}, you have ${previousBalance}.`
    );
  }

  const newBalance = previousBalance - item.priceCoins;
  if (newBalance < 0) {
    throw new Error('Negative balance prevented.');
  }

  const updatedProfile: PlayerProfile = {
    ...profile,
    coins: newBalance,
    inventory: [...(profile.inventory || []), item.id],
    processedPurchaseIds: [...(profile.processedPurchaseIds || []), purchaseRequestId],
    updatedAt: now,
  };

  return {
    item,
    previousBalance,
    newBalance,
    purchaseId: purchaseRequestId,
    updatedProfile,
  };
}

/**
 * Executes an atomic cosmetic purchase in Firestore using `runTransaction`.
 */
export async function purchaseCosmeticInFirestore(
  uid: string,
  itemId: string,
  clientExpectedPrice?: number
): Promise<PurchaseResult> {
  const purchaseRequestId = `pur_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const userRef = doc(db, 'users', uid);
  const purchaseRef = doc(db, 'users', uid, 'purchases', purchaseRequestId);
  const now = Date.now();

  return runTransaction(db, async (transaction) => {
    const [userSnap, purchaseSnap] = await Promise.all([
      transaction.get(userRef),
      transaction.get(purchaseRef),
    ]);

    if (!userSnap.exists()) {
      throw new Error('Player profile not found.');
    }
    if (purchaseSnap.exists()) {
      throw new Error('Duplicate purchase request rejected (replay detected).');
    }

    const profile = userSnap.data() as PlayerProfile;
    const result = purchaseCosmeticPure(profile, itemId, purchaseRequestId, clientExpectedPrice, now);

    transaction.set(
      purchaseRef,
      cleanFirestoreObject({
        purchaseId: purchaseRequestId,
        itemId: result.item.id,
        itemName: result.item.name,
        category: result.item.category,
        pricePaid: result.item.priceCoins,
        purchasedAt: now,
      })
    );

    transaction.update(userRef, {
      coins: result.newBalance,
      inventory: result.updatedProfile.inventory,
      processedPurchaseIds: result.updatedProfile.processedPurchaseIds,
      updatedAt: now,
    });

    return result;
  });
}

// -------------------------------------------------------------
// 4. COSMETIC EQUIPMENT (EQUIP / UNEQUIP)
// -------------------------------------------------------------

export function equipCosmeticPure(profile: PlayerProfile, itemId: string): PlayerProfile {
  const item = getCosmeticById(itemId);
  if (!item) {
    throw new Error('Cosmetic item not found.');
  }
  if (!profile.inventory?.includes(itemId)) {
    throw new Error(`You do not own "${item.name}".`);
  }

  const equipped = { ...(profile.equippedCosmetics || {}) };
  equipped[item.category] = item.id;

  const updated: PlayerProfile = {
    ...profile,
    equippedCosmetics: equipped,
    updatedAt: Date.now(),
  };

  if (item.category === 'title') {
    updated.title = item.assetPath || item.name;
  }
  if (item.category === 'avatar') {
    updated.avatarId = item.id;
  }

  return updated;
}

export function unequipCosmeticPure(
  profile: PlayerProfile,
  category: CosmeticItem['category']
): PlayerProfile {
  const equipped = { ...(profile.equippedCosmetics || {}) };
  delete equipped[category];

  const updated: PlayerProfile = {
    ...profile,
    equippedCosmetics: equipped,
    updatedAt: Date.now(),
  };

  if (category === 'title') {
    updated.title = 'Novice Tracker';
  }
  if (category === 'avatar') {
    updated.avatarId = 'avatar_inquisitor';
  }

  return updated;
}

export async function equipCosmeticInFirestore(uid: string, itemId: string): Promise<PlayerProfile> {
  const userRef = doc(db, 'users', uid);
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userRef);
    if (!snap.exists()) throw new Error('Player profile not found.');
    const updated = equipCosmeticPure(snap.data() as PlayerProfile, itemId);
    transaction.update(userRef, {
      equippedCosmetics: cleanFirestoreObject(updated.equippedCosmetics),
      title: updated.title,
      avatarId: updated.avatarId,
      updatedAt: updated.updatedAt,
    });
    return updated;
  });
}

export async function unequipCosmeticInFirestore(
  uid: string,
  category: CosmeticItem['category']
): Promise<PlayerProfile> {
  const userRef = doc(db, 'users', uid);
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userRef);
    if (!snap.exists()) throw new Error('Player profile not found.');
    const updated = unequipCosmeticPure(snap.data() as PlayerProfile, category);
    transaction.update(userRef, {
      equippedCosmetics: cleanFirestoreObject(updated.equippedCosmetics),
      title: updated.title,
      avatarId: updated.avatarId,
      updatedAt: updated.updatedAt,
    });
    return updated;
  });
}

// -------------------------------------------------------------
// 5. DAILY LOGIN COIN REWARDS
// -------------------------------------------------------------

export function claimDailyLoginRewardPure(
  profile: PlayerProfile,
  todayDateStr: string = new Date().toISOString().split('T')[0],
  now: number = Date.now()
): { coinsAwarded: number; newStreak: number; updatedProfile: PlayerProfile } {
  const prevStreak = profile.streak || {
    currentStreak: 0,
    longestStreak: 0,
    lastClaimDate: '',
    rewardsClaimed: [],
  };

  if (prevStreak.lastClaimDate === todayDateStr) {
    throw new Error('Today\'s Citadel treasury tribute has already been claimed.');
  }

  // Determine consecutive day
  const yesterday = new Date(Date.parse(todayDateStr) - 86400000).toISOString().split('T')[0];
  const nextStreak =
    prevStreak.lastClaimDate === yesterday ? (prevStreak.currentStreak % 7) + 1 : 1;

  const rewardIdx = Math.min(6, Math.max(0, nextStreak - 1));
  const coinsAwarded = COIN_REWARD_CONFIG.dailyLoginRewards[rewardIdx] || 25;

  const updatedProfile: PlayerProfile = {
    ...profile,
    coins: (profile.coins || 0) + coinsAwarded,
    streak: {
      currentStreak: nextStreak,
      longestStreak: Math.max(prevStreak.longestStreak || 0, nextStreak),
      lastClaimDate: todayDateStr,
      rewardsClaimed: Array.from(new Set([...(prevStreak.rewardsClaimed || []), nextStreak])),
    },
    updatedAt: now,
  };

  return { coinsAwarded, newStreak: nextStreak, updatedProfile };
}

export async function claimDailyLoginRewardInFirestore(
  uid: string
): Promise<{ coinsAwarded: number; newStreak: number }> {
  const userRef = doc(db, 'users', uid);
  const todayDateStr = new Date().toISOString().split('T')[0];
  const now = Date.now();

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userRef);
    if (!snap.exists()) throw new Error('Player profile not found.');
    const profile = snap.data() as PlayerProfile;
    const res = claimDailyLoginRewardPure(profile, todayDateStr, now);

    transaction.update(userRef, {
      coins: res.updatedProfile.coins,
      streak: cleanFirestoreObject(res.updatedProfile.streak),
      updatedAt: now,
    });

    return { coinsAwarded: res.coinsAwarded, newStreak: res.newStreak };
  });
}
