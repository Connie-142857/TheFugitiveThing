// Phase 9 Test Suite: Currency (Coins), Cosmetic Catalogue, Purchases, Equipment & Security
import { createDefaultProfile } from '../src/types/player.ts';
import {
  COIN_REWARD_CONFIG,
  COSMETIC_CATALOGUE,
  purchaseCosmeticPure,
  equipCosmeticPure,
  unequipCosmeticPure,
  claimDailyLoginRewardPure,
} from '../src/services/shopService.ts';
import { computeMatchProgression } from '../src/services/progressionService.ts';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

function assertThrows(fn, message) {
  try {
    fn();
    console.error(`  [FAIL] ${message} (did not throw)`);
    failed++;
  } catch (err) {
    console.log(`  [PASS] ${message} (${err.message})`);
    passed++;
  }
}

console.log('=== PHASE 9 CURRENCY, SHOP, INVENTORY & EQUIPMENT TEST SUITE ===\n');

// -------------------------------------------------------------
// 1. Cosmetic Catalogue & Restrictions
// -------------------------------------------------------------
console.log('1. Testing Cosmetic Catalogue Categories & Restrictions:');

const categories = new Set(COSMETIC_CATALOGUE.map((i) => i.category));
for (const reqCat of ['skin', 'avatar', 'nameplate', 'background', 'title', 'effect']) {
  assert(categories.has(reqCat), `Catalogue contains category "${reqCat}"`);
}
const ids = COSMETIC_CATALOGUE.map((i) => i.id);
assert(new Set(ids).size === ids.length, 'All cosmetic item IDs are strictly unique');
assert(
  COSMETIC_CATALOGUE.every((i) => i.priceCoins >= 0 && typeof i.isAvailable === 'boolean'),
  'All items define valid non-negative price and availability'
);

// -------------------------------------------------------------
// 2. Coin Earnings (Match Rewards & Daily Login)
// -------------------------------------------------------------
console.log('\n2. Testing Coin Rewards & Daily Login Streaks:');

let profile = createDefaultProfile('u_shop', 'shop@example.com', 'MerchantTester');
const now = Date.now();

const finishedMatch = {
  id: 'room_coin_1',
  name: 'Bazaar Match',
  roomCode: 'XYZ999',
  status: 'finished',
  createdById: 'u_shop',
  hostUid: 'u_shop',
  createdAt: now - 300000,
  updatedAt: now,
  winnerTeam: 'investigators',
  winningPlayerUids: ['u_shop'],
  endReason: 'The Fugitive was eliminated.',
  matchPlayers: {
    u_shop: {
      uid: 'u_shop',
      username: 'MerchantTester',
      isHost: false,
      isFugitive: false,
      isAlive: true,
      isZombie: false,
      isGhost: false,
      isImmortal: false,
      crimes: 0,
      consecutiveIdleRounds: 0,
      statusEffects: { extraAbilityUses: 0 },
      team: 'investigators',
      survivedAttacksCount: 0,
    },
  },
  events: [],
  houses: {},
};

const matchOutcome = computeMatchProgression(profile, finishedMatch, 'u_shop', 'detective', now);
const expectedCoins =
  COIN_REWARD_CONFIG.matchParticipationCoins +
  COIN_REWARD_CONFIG.matchCompletionCoins +
  COIN_REWARD_CONFIG.victoryCoins +
  matchOutcome.newlyUnlockedAchievements.length * COIN_REWARD_CONFIG.achievementUnlockCoins;

assert(matchOutcome.coinsEarned === expectedCoins, `Awarded exact ${expectedCoins} Coins for match victory & achievements`);

profile = {
  ...profile,
  coins: profile.coins + matchOutcome.coinsEarned,
  level: 5, // Allow testing high-level cosmetics too
  achievements: matchOutcome.updatedAchievements,
};

// Daily Login Reward
const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const dailyRes = claimDailyLoginRewardPure(profile, tomorrowStr, now);
assert(dailyRes.coinsAwarded > 0, `Daily login awarded ${dailyRes.coinsAwarded} Coins`);
profile = dailyRes.updatedProfile;

assertThrows(
  () => claimDailyLoginRewardPure(profile, tomorrowStr, now),
  'Prevents duplicate daily login claim on the same UTC date'
);

// -------------------------------------------------------------
// 3. Atomic Purchases & Security Validation
// -------------------------------------------------------------
console.log('\n3. Testing Atomic Purchases & Security Validation:');

const startCoins = profile.coins;
const pur1 = purchaseCosmeticPure(profile, 'avatar_wax_seal', 'req_001', 150, now);
assert(pur1.newBalance === startCoins - 150, 'Deducted exact 150 Coins atomically');
assert(pur1.updatedProfile.inventory.includes('avatar_wax_seal'), 'Added item to inventory');
profile = pur1.updatedProfile;

assertThrows(
  () => purchaseCosmeticPure(profile, 'avatar_gilded_skull', 'req_001', 300, now),
  'Rejects replay attack using already-processed purchaseRequestId'
);

assertThrows(
  () => purchaseCosmeticPure(profile, 'avatar_wax_seal', 'req_002', 150, now),
  'Prevents duplicate purchase of already-owned cosmetic'
);

assertThrows(
  () => purchaseCosmeticPure(profile, 'avatar_gilded_skull', 'req_003', 1, now),
  'Rejects client-side price tampering (client sent 1 instead of 300)'
);

assertThrows(
  () => purchaseCosmeticPure(profile, 'skin_founder_relic', 'req_004', 1000, now),
  'Rejects purchase of unavailable item'
);

const lowLevelProfile = { ...profile, level: 1, coins: 2000 };
assertThrows(
  () => purchaseCosmeticPure(lowLevelProfile, 'skin_sovereign_gold', 'req_005', 900, now),
  'Enforces minLevel purchase restriction'
);

const brokeProfile = { ...profile, coins: 10 };
assertThrows(
  () => purchaseCosmeticPure(brokeProfile, 'avatar_gilded_skull', 'req_006', 300, now),
  'Rejects insufficient balance & prevents negative balance'
);

// -------------------------------------------------------------
// 4. Equipment (Equip / Unequip) & Persistence
// -------------------------------------------------------------
console.log('\n4. Testing Cosmetic Equipment (Equip / Unequip):');

const equippedProfile = equipCosmeticPure(profile, 'avatar_wax_seal');
assert(equippedProfile.equippedCosmetics.avatar === 'avatar_wax_seal', 'Equipped owned avatar');
assert(equippedProfile.avatarId === 'avatar_wax_seal', 'Updated avatarId on profile');

assertThrows(
  () => equipCosmeticPure(profile, 'title_untraceable'),
  'Rejects equipping an unowned cosmetic item'
);

const unequippedProfile = unequipCosmeticPure(equippedProfile, 'avatar');
assert(unequippedProfile.equippedCosmetics.avatar === undefined, 'Unequipped avatar category');
assert(unequippedProfile.avatarId === 'avatar_inquisitor', 'Restored default avatarId on unequip');

// Unequipping a cosmetic title at Level 5 restores earned rank title ('Citadel Investigator')
const lvl5TitleProfile = { ...profile, level: 5, title: 'Vigilant Sentinel', equippedCosmetics: { ...profile.equippedCosmetics, title: 'title_watchman' } };
const unequippedTitleProfile = unequipCosmeticPure(lvl5TitleProfile, 'title');
assert(unequippedTitleProfile.equippedCosmetics.title === undefined, 'Unequipped title category');
assert(unequippedTitleProfile.title === 'Citadel Investigator', 'Restored earned Level 5 rank title on unequip');

console.log(`\n========================================`);
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Phase 9 Currency, Shop, Inventory & Equipment Tests Passed!');
}
