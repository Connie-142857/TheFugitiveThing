// Phase 3 Validation Test Suite: Multiplayer Lobbies, Room Scaling, Host Transfer, State Invariants
import { generateRoomCode, getActiveTeamsForCount } from '../src/utils/roomUtils.ts';
import { getConfigForPlayerCount } from '../src/types/rules.ts';

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

console.log('=== PHASE 3 LOBBY & MATCH ROOM TEST SUITE ===\n');

// 1. Room Code Generation & Format
console.log('1. Testing Room Code Generation & Uniqueness:');
const code1 = generateRoomCode();
const code2 = generateRoomCode();
assert(code1.startsWith('FUG-'), 'Room code begins with "FUG-" seal prefix');
assert(code1.length >= 7 && code1.length <= 10, 'Room code has appropriate length');
assert(code1 !== code2, 'Generates unique distinct room codes');
assert(/^[A-Z0-9-]+$/.test(code1), 'Room code contains only alphanumeric uppercase characters and dashes');

// 2. Rulebook Player Scaling & House Configuration
console.log('\n2. Testing Rulebook Player-Count Scaling Invariants:');
const config6 = getConfigForPlayerCount(6);
assert(config6 !== null, '6 players config exists');
assert(config6.activeTeams === 2 && config6.playersPerTeam === 3, '6 players = 2 teams of 3');
assert(config6.soloCount === 0, '6 players = 0 solo roles');
assert(config6.totalHouses === 30, '6 players = 30 total houses');
assert(config6.housesDestroyedPerRound === 1, '6 players = 1 house destroyed per round');

const config16 = getConfigForPlayerCount(16);
assert(config16 !== null, '16 players config exists');
assert(config16.activeTeams === 4 && config16.playersPerTeam === 4, '16 players = 4 teams of 4');
assert(config16.soloCount === 0, '16 players = 0 solo roles');
assert(config16.totalHouses === 80, '16 players = 80 total houses');
assert(config16.housesDestroyedPerRound === 3, '16 players = 3 houses destroyed per round');

const config24 = getConfigForPlayerCount(24);
assert(config24 !== null, '24 players config exists');
assert(config24.activeTeams === 4 && config24.playersPerTeam === 5, '24 players = 4 teams of 5');
assert(config24.soloCount === 4, '24 players = 4 solo infiltrator roles');
assert(config24.totalHouses === 120, '24 players = 120 total houses');
assert(config24.housesDestroyedPerRound === 6, '24 players = 6 houses destroyed per round');

// 3. Active Teams Mapping
console.log('\n3. Testing Faction Derivation:');
const teams2 = getActiveTeamsForCount(2);
assert(teams2.length === 2 && teams2[0] === 'investigators' && teams2[1] === 'annihilators', '2 active teams = Investigators & Annihilators');
const teams4 = getActiveTeamsForCount(4);
assert(teams4.length === 4, '4 active teams = All 4 factions active');

// 4. Host Transfer & Fallback Logic Simulation
console.log('\n4. Testing Host Transfer Fallback on Departure:');
function simulateHostDeparture(currentHostUid, playersMap) {
  const active = Object.values(playersMap).filter(p => p.status !== 'left' && p.uid !== currentHostUid);
  if (active.length === 0) return null;
  active.sort((a, b) => a.joinedAt - b.joinedAt);
  return active[0].uid;
}

const mockPlayers = {
  user_host: { uid: 'user_host', joinedAt: 1000, status: 'connected' },
  user_two: { uid: 'user_two', joinedAt: 1050, status: 'connected' },
  user_three: { uid: 'user_three', joinedAt: 1100, status: 'ready' },
};

const newHostUid = simulateHostDeparture('user_host', mockPlayers);
assert(newHostUid === 'user_two', 'Transfers host to next senior player (user_two)');

const lastRemaining = {
  user_solo: { uid: 'user_solo', joinedAt: 1000, status: 'connected' }
};
const emptyHost = simulateHostDeparture('user_solo', lastRemaining);
assert(emptyHost === null, 'Sets host to null when room is emptied');

// 5. Room Capacity & Ready Invariants
console.log('\n5. Testing Room Capacity & Ready Invariants:');
function canJoin(currentActiveCount, targetCount) {
  const maxCapacity = targetCount + 1; // +1 for The Fugitive
  return currentActiveCount < maxCapacity;
}

assert(canJoin(5, 6) === true, 'Permits join when under capacity (5 < 7)');
assert(canJoin(7, 6) === false, 'Blocks join when at max capacity (7 == 7)');
assert(canJoin(16, 16) === true, 'Permits join for 17th player (The Fugitive slot)');
assert(canJoin(17, 16) === false, 'Blocks 18th player when target is 16');

// 6. Host Permission Check Simulation
console.log('\n6. Testing Host Settings Permission Checks:');
function canModifySettings(gameMode, hostUid, callerUid) {
  if (gameMode === 'human_host') {
    return hostUid === callerUid;
  }
  return true; // In Automated Mode, settings don't require human host
}

assert(canModifySettings('human_host', 'host_123', 'host_123') === true, 'Allows host to modify settings in Human Host Mode');
assert(canModifySettings('human_host', 'host_123', 'intruder_456') === false, 'Blocks non-host from modifying settings in Human Host Mode');
assert(canModifySettings('automated', null, 'any_user') === true, 'Allows permitted operations in Automated Mode without human host');

console.log(`\n========================================`);
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Phase 3 Validation Tests Passed Successfully!');
}
