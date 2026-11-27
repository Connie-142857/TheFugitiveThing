// Phase 10 Test Suite: Daily Login Rewards, Consecutive Streaks, UTC Boundaries & Security
import { createDefaultProfile } from '../src/types/player.ts';
import {
  DAILY_REWARD_SCHEDULE,
  STREAK_MILESTONES,
  getUtcDateString,
  getUtcDayDifference,
  isDailyRewardAvailable,
  claimDailyRewardPure,
} from '../src/services/dailyRewardService.ts';

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

console.log('=== PHASE 10 DAILY LOGIN REWARDS & STREAKS TEST SUITE ===\n');

// -------------------------------------------------------------
// 1. Configurable Schedule & UTC Boundary Helpers
// -------------------------------------------------------------
console.log('1. Testing UTC Date Boundaries, Leap Years & Timezone Edge Cases:');

assert(DAILY_REWARD_SCHEDULE.length === 7, 'Reward calendar has 7 configurable days');
assert(STREAK_MILESTONES.length >= 4, 'Streak milestones configured (3, 7, 14, 30 days)');

const beforeMidnight = Date.UTC(2026, 10, 26, 23, 59, 59); // 2026-11-26 23:59:59 UTC
const afterMidnight = Date.UTC(2026, 10, 27, 0, 0, 1);    // 2026-11-27 00:00:01 UTC
assert(getUtcDateString(beforeMidnight) === '2026-11-26', '23:59:59 UTC resolves to 2026-11-26');
assert(getUtcDateString(afterMidnight) === '2026-11-27', '00:00:01 UTC resolves to 2026-11-27');

assert(getUtcDayDifference('2026-12-31', '2027-01-01') === 1, 'Year rollover 2026-12-31 -> 2027-01-01 is 1 day');
assert(getUtcDayDifference('2024-02-28', '2024-02-29') === 1, 'Leap year 2024-02-28 -> 2024-02-29 is 1 day');
assert(getUtcDayDifference('2024-02-29', '2024-03-01') === 1, 'Leap year 2024-02-29 -> 2024-03-01 is 1 day');

// -------------------------------------------------------------
// 2. First Claim & Consecutive Streak Progression (Days 1..8)
// -------------------------------------------------------------
console.log('\n2. Testing First Claim, Consecutive Progression, Milestones & Cycle Wrap:');

let profile = createDefaultProfile('u_daily', 'daily@example.com', 'Warden');
// Clear initial streak to test fresh first-ever claim
profile.streak = {
  currentStreak: 0,
  longestStreak: 0,
  lastClaimDate: '',
  rewardsClaimed: [],
  totalClaims: 0,
  milestonesClaimed: [],
};

assert(isDailyRewardAvailable(profile, Date.UTC(2026, 10, 1)) === true, 'Fresh profile has daily reward available');

const dates = [
  '2026-11-01',
  '2026-11-02',
  '2026-11-03',
  '2026-11-04',
  '2026-11-05',
  '2026-11-06',
  '2026-11-07',
  '2026-11-08',
];

let day3Outcome;
let day7Outcome;
let day8Outcome;

for (let i = 0; i < dates.length; i++) {
  const res = claimDailyRewardPure(profile, dates[i], Date.UTC(2026, 10, i + 1, 12, 0, 0));
  profile = res.updatedProfile;
  if (i === 0) {
    assert(res.newStreak === 1 && res.dayInCycle === 1, 'First claim sets streak=1, dayInCycle=1');
  }
  if (i === 2) day3Outcome = res;
  if (i === 6) day7Outcome = res;
  if (i === 7) day8Outcome = res;
}

assert(day3Outcome.newStreak === 3 && day3Outcome.milestoneUnlocked?.streakDays === 3, 'Day 3 unlocks 3-Day Vigilance milestone');
assert(day7Outcome.newStreak === 7 && day7Outcome.dayInCycle === 7, 'Day 7 reaches Day 7 of cycle');
assert(day7Outcome.cosmeticUnlocked === 'title_watchman', 'Day 7 grants Vigilant Sentinel cosmetic');
assert(day7Outcome.milestoneUnlocked?.streakDays === 7, 'Day 7 unlocks 7-Day Sovereign Seal milestone');
assert(day8Outcome.newStreak === 8 && day8Outcome.dayInCycle === 1, 'Day 8 increments streak to 8 while wrapping cycle to Day 1');
assert(profile.streak.longestStreak === 8 && profile.streak.totalClaims === 8, 'longestStreak and totalClaims tracked accurately');

// -------------------------------------------------------------
// 3. Repeated Requests & Clock Manipulation Prevention
// -------------------------------------------------------------
console.log('\n3. Testing Duplicate Claim & Clock Manipulation Prevention:');

const sameDayMs = Date.UTC(2026, 10, 8, 22, 0, 0);
assert(isDailyRewardAvailable(profile, sameDayMs) === false, 'isDailyRewardAvailable returns false after claiming today');

assertThrows(
  () => claimDailyRewardPure(profile, '2026-11-08', sameDayMs),
  'Rejects duplicate claim on the same UTC day'
);

assertThrows(
  () => claimDailyRewardPure(profile, '2026-11-07', Date.UTC(2026, 10, 7)),
  'Rejects backwards client clock manipulation'
);

// -------------------------------------------------------------
// 4. Missed Days & Returning Player Streak Reset
// -------------------------------------------------------------
console.log('\n4. Testing Missed Days & Returning Player Streak Reset:');

// Player last claimed 2026-11-08, returns on 2026-11-10 (missed 2026-11-09)
const returnOutcome = claimDailyRewardPure(profile, '2026-11-10', Date.UTC(2026, 10, 10, 10, 0, 0));
assert(returnOutcome.streakReset === true, 'Detects missed UTC day and flags streakReset=true');
assert(returnOutcome.newStreak === 1 && returnOutcome.dayInCycle === 1, 'Resets currentStreak back to 1');
assert(returnOutcome.updatedProfile.streak.longestStreak === 8, 'Preserves historical longestStreak of 8');
assert(returnOutcome.updatedProfile.streak.totalClaims === 9, 'Increments totalClaims to 9');

console.log(`\n========================================`);
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Phase 10 Daily Login Rewards & Streak Tests Passed!');
}
