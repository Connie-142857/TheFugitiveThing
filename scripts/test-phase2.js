// Phase 2 Validation Test Suite: Auth, Profile Schema, Username Validation, Security Guards
import { validateUsername, normalizeUsername } from '../src/utils/usernameValidation.ts';
import { createDefaultProfile } from '../src/types/player.ts';

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

console.log('=== PHASE 2 AUTH & USERNAME VALIDATION TEST SUITE ===\n');

// 1. Username Format & Length Validation Tests
console.log('1. Testing Username Validation Rules:');
assert(validateUsername('Iron_Knight').valid === true, 'Accepts valid alphanumeric with underscore ("Iron_Knight")');
assert(validateUsername('Hunter99').valid === true, 'Accepts valid alphanumeric ("Hunter99")');
assert(validateUsername('Sir').valid === true, 'Accepts 3 character minimum ("Sir")');
assert(validateUsername('a_valid_20_chars_01').valid === true, 'Accepts up to 20 characters');

assert(validateUsername('').valid === false, 'Rejects empty username');
assert(validateUsername('ab').valid === false, 'Rejects username shorter than 3 characters');
assert(validateUsername('this_name_is_way_too_long_for_citadel').valid === false, 'Rejects username longer than 20 characters');
assert(validateUsername('Hunter With Space').valid === false, 'Rejects spaces in username');
assert(validateUsername('Hunter!@#').valid === false, 'Rejects special symbols');
assert(validateUsername('admin').valid === false, 'Rejects forbidden name "admin"');
assert(validateUsername('enric').valid === false, 'Rejects forbidden legacy target name "enric"');
assert(validateUsername('fugitive').valid === false, 'Rejects reserved name "fugitive"');

// 2. Case-Insensitive Normalization Tests
console.log('\n2. Testing Case-Insensitive Normalization:');
const norm1 = normalizeUsername('Shadow_Wolf');
const norm2 = normalizeUsername('SHADOW_WOLF');
const norm3 = normalizeUsername('  shadow_wolf  ');
assert(norm1 === 'shadow_wolf', 'Normalizes mixed case to lowercase');
assert(norm1 === norm2, 'Matches case-insensitively across uppercase and lowercase');
assert(norm1 === norm3, 'Trims whitespace before normalization');

// 3. Default Profile Creation & Invariants
console.log('\n3. Testing Default Profile Schema & Invariants:');
const profile = createDefaultProfile('test_uid_999', 'hunter@citadel.realm', 'Vanguard_01');
assert(profile.uid === 'test_uid_999', 'Profile UID matches');
assert(profile.username === 'Vanguard_01', 'Profile username preserved');
assert(profile.normalizedUsername === 'vanguard_01', 'Normalized username generated accurately');
assert(profile.coins === 100, 'Awards 100 silver coins welcome bounty');
assert(profile.level === 1 && profile.xp === 0, 'Initializes at Rank 1 with 0 XP');
assert(profile.stats.totalMatches === 0, 'Total matches initialized to 0');
assert(profile.stats.wins === 0 && profile.stats.losses === 0, 'Win/Loss records initialized to 0');
assert(typeof profile.stats.teamWins === 'object', 'Includes team-specific win records');
assert(profile.streak.currentStreak === 1, 'Initializes daily streak to Day 1');
assert(Array.isArray(profile.achievements) && profile.achievements.length > 0, 'Populates initial achievement list');

// 4. Data Security & Unauthorized Field Tampering Prevention Test
console.log('\n4. Testing Unauthorized Field Modification Prevention (Firestore Rules Simulation):');
const PROTECTED_FIELDS = ['coins', 'xp', 'level', 'stats', 'streak', 'achievements', 'inventory', 'createdAt', 'uid'];

function simulateFirestoreUpdateCheck(attemptedUpdates) {
  const attemptedKeys = Object.keys(attemptedUpdates);
  const violates = attemptedKeys.some(key => PROTECTED_FIELDS.includes(key));
  return !violates;
}

assert(
  simulateFirestoreUpdateCheck({ username: 'New_Name', avatarId: 'avatar_soldier', bio: 'New creed' }) === true,
  'Permits legitimate updates (username, avatar, bio)'
);

assert(
  simulateFirestoreUpdateCheck({ coins: 999999 }) === false,
  'Blocks client tampering with coins'
);

assert(
  simulateFirestoreUpdateCheck({ xp: 50000, level: 99 }) === false,
  'Blocks client tampering with XP and Level'
);

assert(
  simulateFirestoreUpdateCheck({ stats: { wins: 100 } }) === false,
  'Blocks client tampering with match stats'
);

assert(
  simulateFirestoreUpdateCheck({ inventory: ['cheat_item'] }) === false,
  'Blocks client tampering with inventory'
);

console.log(`\n========================================`);
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Phase 2 Validation Tests Passed Successfully!');
}
