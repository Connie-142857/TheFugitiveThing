// Phase 8 Test Suite: Player Progression, Statistics, XP Curve, Achievements, Match History & Security
import { createDefaultProfile } from '../src/types/player.ts';
import {
  XP_CURVE_CONFIG,
  getXpRequiredForLevel,
  getLevelProgress,
  computeMatchProgression,
} from '../src/services/progressionService.ts';
import { GameEventFactory } from '../src/services/gameEventManager.ts';

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

console.log('=== PHASE 8 PROGRESSION, STATS, XP, ACHIEVEMENTS & HISTORY TEST SUITE ===\n');

// -------------------------------------------------------------
// 1. XP Curve & Level Progression Tests
// -------------------------------------------------------------
console.log('1. Testing XP Curve & Level Progression:');

const lvl1Req = getXpRequiredForLevel(1);
const lvl2Req = getXpRequiredForLevel(2);
const lvl5Req = getXpRequiredForLevel(5);

assert(lvl1Req === XP_CURVE_CONFIG.baseXpPerLevel, `Level 1 requires ${lvl1Req} XP`);
assert(lvl2Req > lvl1Req, `Level 2 requires more XP (${lvl2Req}) than Level 1 (${lvl1Req})`);
assert(lvl5Req > lvl2Req, `Level 5 requires more XP (${lvl5Req}) than Level 2 (${lvl2Req})`);

const prog0 = getLevelProgress(0);
assert(prog0.level === 1 && prog0.currentLevelXp === 0, '0 XP corresponds to Level 1 with 0 progress');

const progLevelUp = getLevelProgress(lvl1Req + 50);
assert(progLevelUp.level === 2, 'Exceeding Level 1 threshold advances to Level 2');
assert(progLevelUp.currentLevelXp === 50, 'Carry-over XP into Level 2 is 50');

// -------------------------------------------------------------
// 2. Match Statistics, XP Awards, Achievements & Match History
// -------------------------------------------------------------
console.log('\n2. Testing Match Completion, Stats, XP & Achievement Unlocks:');

let profile = createDefaultProfile('u_det', 'det@example.com', 'Inquisitor');
const now = Date.now();

const finishedRoom1 = {
  id: 'room_match_1',
  name: 'Citadel Trial 1',
  roomCode: 'ABC123',
  status: 'finished',
  createdById: 'u_det',
  hostUid: 'u_det',
  createdAt: now - 600000, // 10 minutes
  updatedAt: now,
  winnerTeam: 'investigators',
  winningPlayerUids: ['u_det'],
  endReason: 'The Fugitive was eliminated.',
  matchPlayers: {
    u_det: {
      uid: 'u_det',
      username: 'Inquisitor',
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
      survivedAttacksCount: 1,
    },
  },
  events: [
    {
      id: 'ev1',
      round: 1,
      phase: 'day',
      type: 'ability_used',
      category: 'ability',
      actorUid: 'u_det',
      isPublic: false,
      message: 'Interrogated suspect',
      timestamp: now - 300000,
    },
    {
      id: 'ev2',
      round: 1,
      phase: 'night',
      type: 'player_killed',
      category: 'combat',
      actorUid: 'u_det',
      targetUid: 'u_fug',
      isPublic: true,
      message: 'Struck down The Fugitive',
      timestamp: now - 100000,
    },
  ],
  houses: {},
};

const outcome1 = computeMatchProgression(profile, finishedRoom1, 'u_det', 'detective', now);

assert(outcome1.updatedStats.totalMatches === 1, 'totalMatches incremented to 1');
assert(outcome1.updatedStats.wins === 1, 'wins incremented to 1');
assert(outcome1.updatedStats.losses === 0, 'losses remains 0');
assert(outcome1.updatedStats.winRate === 100, 'winRate is 100%');
assert(outcome1.updatedStats.totalPlaytimeMs === 600000, 'Playtime tracked accurately (600,000ms)');
assert(outcome1.updatedStats.teamWins.investigators === 1, 'Investigators team win incremented');
assert(outcome1.updatedStats.roleWins.detective === 1, 'Detective role win incremented');
assert(outcome1.updatedStats.kills === 1, 'Kill count incremented to 1');
assert(outcome1.updatedStats.successfulAbilities === 1, 'Successful abilities incremented to 1');
assert(outcome1.updatedStats.survivalRate === 100, 'Survival rate is 100%');

const unlockedIds1 = outcome1.newlyUnlockedAchievements.map((a) => a.id);
assert(unlockedIds1.includes('first_chronicle'), 'Unlocked First Chronicle achievement');
assert(unlockedIds1.includes('first_victory'), 'Unlocked First Triumph achievement');
assert(unlockedIds1.includes('first_blood'), 'Unlocked First Blood achievement');
assert(unlockedIds1.includes('veteran_fortitude'), 'Unlocked Combat Hardened achievement');

assert(outcome1.xpEarned > 0, `Awarded ${outcome1.xpEarned} XP`);
assert(outcome1.leveledUp === true && outcome1.newLevel >= 2, `Leveled up to Level ${outcome1.newLevel}`);

// Check Match History Record
assert(outcome1.historyRecord.matchId === 'room_match_1', 'History record has matchId');
assert(outcome1.historyRecord.durationMs === 600000, 'History record has durationMs');
assert(outcome1.historyRecord.result === 'victory', 'History record has victory result');
assert(outcome1.historyRecord.playerTeam === 'investigators', 'History record has playerTeam');
assert(outcome1.historyRecord.playerRole === 'detective', 'History record has playerRole');
assert(outcome1.historyRecord.victoryCondition === 'The Fugitive was eliminated.', 'History record has victoryCondition');

// Update profile as Firestore transaction would
profile = {
  ...profile,
  xp: profile.xp + outcome1.xpEarned,
  level: outcome1.newLevel,
  title: outcome1.newRankTitle,
  stats: outcome1.updatedStats,
  achievements: outcome1.updatedAchievements,
  rewardedMatchIds: [...(profile.rewardedMatchIds || []), 'room_match_1'],
};

// -------------------------------------------------------------
// 3. Fugitive & Solo Victory Tracking
// -------------------------------------------------------------
console.log('\n3. Testing Fugitive Survival & Solo Victory Progression:');

const fugitiveRoom = {
  ...finishedRoom1,
  id: 'room_match_2',
  winnerTeam: 'fugitive',
  winningPlayerUids: ['u_det'],
  endReason: 'The Fugitive outlasted all pursuers.',
  spawnpointHistory: [{ round: 1, actualHouse: 15, announcedHouses: [], timestamp: now }],
  matchPlayers: {
    u_det: {
      uid: 'u_det',
      username: 'Inquisitor',
      isHost: false,
      isFugitive: true,
      isAlive: true,
      isZombie: false,
      isGhost: false,
      isImmortal: false,
      crimes: 0,
      consecutiveIdleRounds: 0,
      statusEffects: { extraAbilityUses: 0 },
      team: 'fugitive',
      survivedAttacksCount: 0,
    },
  },
  events: [],
};

const outcome2 = computeMatchProgression(profile, fugitiveRoom, 'u_det', 'fugitive', now);
const unlockedIds2 = outcome2.newlyUnlockedAchievements.map((a) => a.id);
assert(outcome2.updatedStats.fugitiveWins === 1, 'fugitiveWins incremented to 1');
assert(outcome2.updatedStats.spawnpointsTriggered === 1, 'spawnpointsTriggered incremented to 1');
assert(unlockedIds2.includes('the_untraceable'), 'Unlocked The Untraceable achievement');
assert(unlockedIds2.includes('elusive_legend'), 'Unlocked Elusive Legend achievement');

// -------------------------------------------------------------
// 4. Security: Duplicate Reward Prevention & Invalid Requests
// -------------------------------------------------------------
console.log('\n4. Testing Duplicate Reward Prevention & Security Validation:');

assertThrows(
  () => computeMatchProgression(profile, finishedRoom1, 'u_det', 'detective', now),
  'Rejects duplicate match reward claim for already-rewarded matchId'
);

const ongoingRoom = {
  ...finishedRoom1,
  id: 'room_ongoing',
  status: 'in_progress',
};
assertThrows(
  () => computeMatchProgression(profile, ongoingRoom, 'u_det', 'detective', now),
  'Rejects reward claim & history leak for ongoing match'
);

const nonParticipantRoom = {
  ...finishedRoom1,
  id: 'room_other',
  status: 'finished',
};
assertThrows(
  () => computeMatchProgression(profile, nonParticipantRoom, 'u_intruder', 'detective', now),
  'Rejects reward claim from user who did not participate in the match'
);

// -------------------------------------------------------------
// 5. Phase 8 Audit Fixes: Solo Win Isolation & GameEventFactory Kill Attribution
// -------------------------------------------------------------
console.log('\n5. Testing Solo Win Isolation & Kill Attribution:');

const soloWinRoom = {
  ...finishedRoom1,
  id: 'room_solo_audit',
  startedAt: now - 180000, // 3 minutes
  winnerTeam: 'solo',
  winningPlayerUids: ['u_lucky'],
  endReason: 'Lucky survived until match end.',
  matchPlayers: {
    u_lucky: {
      uid: 'u_lucky',
      username: 'LuckyOne',
      isHost: false,
      isFugitive: false,
      isAlive: true,
      isZombie: false,
      isGhost: false,
      isImmortal: false,
      crimes: 0,
      consecutiveIdleRounds: 0,
      statusEffects: { extraAbilityUses: 0 },
      team: 'solo',
      survivedAttacksCount: 0,
    },
    u_spy: {
      uid: 'u_spy',
      username: 'RivalSpy',
      isHost: false,
      isFugitive: false,
      isAlive: true,
      isZombie: false,
      isGhost: false,
      isImmortal: false,
      crimes: 0,
      consecutiveIdleRounds: 0,
      statusEffects: { extraAbilityUses: 0 },
      team: 'solo',
      survivedAttacksCount: 0,
    },
  },
  events: [
    GameEventFactory.playerKilled(1, 'night', 'u_victim', 'Victim', 'Sniper Shot', 'u_lucky'),
  ],
};

const luckyProfile = createDefaultProfile('u_lucky', 'lucky@example.com', 'LuckyOne');
const spyProfile = createDefaultProfile('u_spy', 'spy@example.com', 'RivalSpy');

const luckyOutcome = computeMatchProgression(luckyProfile, soloWinRoom, 'u_lucky', 'lucky', now);
const spyOutcome = computeMatchProgression(spyProfile, soloWinRoom, 'u_spy', 'spy', now);

assert(luckyOutcome.historyRecord.result === 'victory', 'Winning Solo player (Lucky) receives victory');
assert(spyOutcome.historyRecord.result === 'defeat', 'Non-winning Solo player (Spy) does NOT falsely inherit solo team victory');
assert(luckyOutcome.updatedStats.kills === 1, 'GameEventFactory.playerKilled with actorUid increments kill count');
assert(luckyOutcome.historyRecord.durationMs === 180000, 'Match duration prefers startedAt over lobby createdAt');

console.log(`\n========================================`);
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Phase 8 Progression, Stats, XP, Achievements & Security Tests Passed!');
}
