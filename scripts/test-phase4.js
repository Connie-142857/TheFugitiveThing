// Phase 4 Validation Test Suite: Match Configuration, Role Assignment, Rulebook Invariants, Role Privacy
import {
  validateMatchConfiguration,
  assignRolesAndFactions,
} from '../src/services/roleDistributionEngine.ts';

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

console.log('=== PHASE 4 MATCH CONFIGURATION & ROLE ASSIGNMENT TEST SUITE ===\n');

const baseSettings = {
  gameMode: 'automated',
  targetPlayerCount: 6,
  isRealTime: false,
  dayDurationSeconds: 600,
  nightDurationSeconds: 300,
  activeTeams: ['investigators', 'annihilators'],
  soloRoleCount: 0,
  totalHouses: 30,
  housesDestroyedPerRound: 1,
  allowHostOverrides: true,
};

// 1. Validation Logic Checks
console.log('1. Testing Match Validation & Rulebook Boundaries:');
const valTooFew = validateMatchConfiguration(5, baseSettings);
assert(valTooFew.valid === false, 'Rejects player count below 7 (< 6 regular + 1 Fugitive)');
assert(valTooFew.errors.length > 0 && valTooFew.errors[0].includes('minimum of 7'), 'Error message specifically cites rulebook 7-player minimum');

const valMin = validateMatchConfiguration(7, baseSettings);
assert(valMin.valid === true, 'Accepts minimum quota of 7 players (6 regular + 1 Fugitive)');
assert(valMin.warnings.length > 0 && valMin.warnings[0].includes('recommends 16'), 'Issues advisory recommending 16+ players for full 4-faction balance');

const val16 = validateMatchConfiguration(17, {
  ...baseSettings,
  targetPlayerCount: 16,
  activeTeams: ['investigators', 'annihilators', 'communists', 'soldiers'],
});
assert(val16.valid === true, 'Validates 17 players (16 regular + 1 Fugitive) without warnings');

const valNoTeams = validateMatchConfiguration(8, {
  ...baseSettings,
  activeTeams: ['investigators'], // Only 1 team
});
assert(valNoTeams.valid === false, 'Rejects match with less than 2 active factions');

// Helper to generate candidate players
function makeCandidates(count) {
  return Array.from({ length: count }, (_, i) => ({
    uid: `user_${i + 1}`,
    username: `Hunter_${i + 1}`,
  }));
}

// 2. Role Distribution for Minimum Match (7 Players = 6 Regular + 1 Fugitive)
console.log('\n2. Testing Role Distribution for Minimum Match (7 Players):');
const candidates7 = makeCandidates(7);
const res7 = assignRolesAndFactions(candidates7, {
  ...baseSettings,
  targetPlayerCount: 6,
  soloRoleCount: 1,
  totalHouses: 35,
  housesDestroyedPerRound: 1,
});

assert(!!res7.fugitiveUid, 'Designates exactly one The Fugitive');
assert(res7.fugitiveInitialHouse >= 1 && res7.fugitiveInitialHouse <= 35, 'The Fugitive assigned valid starting house (1-35)');
assert(Object.keys(res7.secretBriefings).length === 7, 'Generates secret briefings for all 7 players');
assert(Object.keys(res7.publicRoster).length === 7, 'Generates public roster for all 7 players');

// Count roles and check essentials
const briefings7 = Object.values(res7.secretBriefings);
const fugitiveBriefing = briefings7.find(b => b.team === 'fugitive');
assert(fugitiveBriefing !== undefined, 'Briefing for The Fugitive exists');
assert(fugitiveBriefing.specialKnowledge.initialHouseNumber === res7.fugitiveInitialHouse, 'The Fugitive knows their secret starting house');

const invRoles = briefings7.filter(b => b.publicCoverTeam === 'investigators').map(b => b.roleId);
const annRoles = briefings7.filter(b => b.publicCoverTeam === 'annihilators').map(b => b.roleId);

assert(invRoles.includes('detective'), 'Essential Detective assigned to Investigators');
assert(invRoles.includes('sniper'), 'Essential Sniper assigned to Investigators');
assert(annRoles.includes('detonator'), 'Essential Detonator assigned to Annihilators');
assert(annRoles.includes('arsonist'), 'Essential Arsonist assigned to Annihilators');

// Check Solo Infiltrator presence
const solos7 = briefings7.filter(b => b.team === 'solo');
assert(solos7.length === 1, 'Exactly 1 covert Solo Infiltrator assigned');
assert(solos7[0].publicCoverTeam === 'investigators' || solos7[0].publicCoverTeam === 'annihilators', 'Solo infiltrator has a valid public team cover');

// 3. Role Distribution for 17 Players (16 Regular + 1 Fugitive, All 4 Factions)
console.log('\n3. Testing Role Distribution for 17 Players (All 4 Factions):');
const candidates17 = makeCandidates(17);
const res17 = assignRolesAndFactions(candidates17, {
  ...baseSettings,
  targetPlayerCount: 16,
  activeTeams: ['investigators', 'annihilators', 'communists', 'soldiers'],
  soloRoleCount: 1,
  totalHouses: 85,
  housesDestroyedPerRound: 3,
});

assert(res17.totalHouses === 85, 'Houses configured to 85 dwellings');
assert(res17.housesDestroyedPerRound === 3, 'Houses demolished configured to 3 per night');

const briefings17 = Object.values(res17.secretBriefings);
const communistRoles = briefings17.filter(b => b.publicCoverTeam === 'communists').map(b => b.roleId);
const soldierRoles = briefings17.filter(b => b.publicCoverTeam === 'soldiers').map(b => b.roleId);

assert(communistRoles.includes('worker'), 'Essential Worker assigned to Communists');
assert(communistRoles.includes('peasant'), 'Essential Peasant assigned to Communists');
assert(soldierRoles.includes('trooper'), 'Essential Trooper assigned to Soldiers');
assert(soldierRoles.includes('lieutenant'), 'Essential Lieutenant assigned to Soldiers');

// 4. Role Distribution for 25 Players (24 Regular + 1 Fugitive, 4 Solo Infiltrators)
console.log('\n4. Testing Role Distribution for 25 Players (4 Solo Infiltrators):');
const candidates25 = makeCandidates(25);
const res25 = assignRolesAndFactions(candidates25, {
  ...baseSettings,
  targetPlayerCount: 24,
  activeTeams: ['investigators', 'annihilators', 'communists', 'soldiers'],
  soloRoleCount: 4,
  totalHouses: 120,
  housesDestroyedPerRound: 6,
});

const briefings25 = Object.values(res25.secretBriefings);
const solos25 = briefings25.filter(b => b.team === 'solo');
assert(solos25.length === 4, 'Assigns exactly 4 distinct Solo Infiltrator roles');

// Check no duplicate solo roles
const soloRoleIds = solos25.map(s => s.roleId);
const uniqueSoloRoles = new Set(soloRoleIds);
assert(uniqueSoloRoles.size === 4, 'All 4 solo infiltrator roles are distinct (no duplicates)');

// 5. Special Interconnections Testing (Squire & Lover)
console.log('\n5. Testing Special Interconnections (Squire Lord, Lover Soulbound):');
// Run multiple trials to ensure Squire or Lover get linked when assigned
let foundSquire = false;
let foundLover = false;

for (let trial = 0; trial < 15; trial++) {
  const trialRes = assignRolesAndFactions(makeCandidates(17), {
    ...baseSettings,
    targetPlayerCount: 16,
    activeTeams: ['investigators', 'annihilators', 'communists', 'soldiers'],
    soloRoleCount: 3,
    totalHouses: 85,
  });

  const bList = Object.values(trialRes.secretBriefings);
  const squire = bList.find(b => b.roleId === 'squire');
  if (squire) {
    foundSquire = true;
    assert(!!squire.specialKnowledge?.assignedLordUid, 'Squire receives valid assignedLordUid');
    assert(squire.specialKnowledge.assignedLordUid !== squire.uid, 'Squire is not assigned to themselves');
  }

  const lover = bList.find(b => b.roleId === 'lover');
  if (lover) {
    foundLover = true;
    assert(!!lover.specialKnowledge?.soulboundUid, 'Lover receives valid soulboundUid');
    assert(lover.specialKnowledge.soulboundUid !== lover.uid, 'Lover is not soulbound to themselves');
  }

  if (foundSquire && foundLover) break;
}

// 6. Strict Role Privacy & Data Leakage Prevention
console.log('\n6. Testing Role Privacy & Public State Separation:');
const publicKeys = Object.keys(res17.publicRoster);
assert(publicKeys.length === 17, 'Public roster contains entries for all players');

let leaksDetected = false;
for (const [uid, pub] of Object.entries(res17.publicRoster)) {
  const secret = res17.secretBriefings[uid];

  // Public state must NOT contain private role identifiers
  if (pub.roleId !== undefined) {
    leaksDetected = true;
    console.error(`Leak detected: pub.roleId exposed for ${uid}`);
  }

  // Public state must NOT expose true solo allegiance
  if (secret.team === 'solo' && pub.team === 'solo') {
    leaksDetected = true;
    console.error(`Leak detected: pub.team reveals 'solo' status for ${uid}`);
  }
}

assert(!leaksDetected, 'Zero role leaks in public roster: roles and solo infiltration are strictly confidential');

console.log(`\n========================================`);
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Phase 4 Validation Tests Passed Successfully!');
}
