// Phase 5 Test Suite: Server-Authoritative Game Engine, Time System,
// House Demolition, The Fugitive Actions, Spawnpoint Teleportation & 11-Clue Generator

import {
  calculateNextRealTimeTransition,
  calculateNextAcceleratedTransition,
  initializeHouses,
  getValidUndestroyedHouses,
  executeFugitiveDailyAction,
  triggerSpawnpointTeleport,
  executeNightlyHouseDestruction,
  resolvePhaseActionQueue,
  checkVictoryConditions,
  transitionMatchPhase,
  processEngineTick,
} from '../src/services/gameEngine.ts';
import {
  createGameEvent,
  filterEventsForPlayer,
  GameEventFactory,
} from '../src/services/gameEventManager.ts';

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

console.log('=== PHASE 5 SERVER-SIDE GAME ENGINE & TIME SYSTEM TEST SUITE ===\n');

// -------------------------------------------------------------
// Helper Factory for Mock Match State
// -------------------------------------------------------------
function createMockEngineState(overrides = {}) {
  const totalHouses = overrides.totalHouses || 35;
  const fugitiveHouse = overrides.fugitiveHouse || 12;
  const houses = initializeHouses(totalHouses, fugitiveHouse);

  const players = {
    fugitive_uid: {
      uid: 'fugitive_uid',
      username: 'The_Shadow',
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
      roleId: 'fugitive',
      survivedAttacksCount: 0,
    },
    hunter_1: {
      uid: 'hunter_1',
      username: 'Sherlock',
      isHost: true,
      isFugitive: false,
      isAlive: true,
      isZombie: false,
      isGhost: false,
      isImmortal: false,
      crimes: 0,
      consecutiveIdleRounds: 0,
      statusEffects: { extraAbilityUses: 0 },
      team: 'investigators',
      roleId: 'detective',
      survivedAttacksCount: 0,
    },
    hunter_2: {
      uid: 'hunter_2',
      username: 'Pyromaniac_Pete',
      isHost: false,
      isFugitive: false,
      isAlive: true,
      isZombie: false,
      isGhost: false,
      isImmortal: false,
      crimes: 0,
      consecutiveIdleRounds: 0,
      statusEffects: { extraAbilityUses: 0 },
      team: 'annihilators',
      roleId: 'arsonist',
      survivedAttacksCount: 0,
    },
    hunter_3: {
      uid: 'hunter_3',
      username: 'Trooper_Tom',
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
      roleId: 'sniper',
      survivedAttacksCount: 0,
    },
  };

  return {
    roomId: 'room_test_1',
    status: overrides.status || 'day',
    round: overrides.round || 1,
    phase: overrides.phase || 'day',
    phaseEndsAt: overrides.phaseEndsAt || Date.now() + 600000,
    isPaused: false,
    totalHouses,
    housesDestroyedPerRound: overrides.housesDestroyedPerRound || 2,
    houses,
    fugitiveUid: 'fugitive_uid',
    fugitiveCurrentHouse: fugitiveHouse,
    fugitiveSpawnpointHouse: overrides.fugitiveSpawnpointHouse !== undefined ? overrides.fugitiveSpawnpointHouse : null,
    spawnpointCooldownRounds: overrides.spawnpointCooldownRounds || 0,
    spawnpointHistory: [],
    fugitiveDailyActionExecuted: overrides.fugitiveDailyActionExecuted || false,
    players,
    actionQueue: overrides.actionQueue || [],
    events: [],
    settings: {
      gameMode: 'automated',
      targetPlayerCount: 6,
      isRealTime: overrides.isRealTime || false,
      dayDurationSeconds: 600,
      nightDurationSeconds: 300,
      activeTeams: ['investigators', 'annihilators'],
      soloRoleCount: 0,
      totalHouses,
      housesDestroyedPerRound: overrides.housesDestroyedPerRound || 2,
      allowHostOverrides: true,
    },
    updatedAt: Date.now(),
    ...overrides,
  };
}

// -------------------------------------------------------------
// 1. Time System Tests
// -------------------------------------------------------------
console.log('1. Testing Time System (Real-Time 08:00-18:00 & Accelerated):');

// A. Real-Time Day Check: 10:30 AM
const mock10am = new Date();
mock10am.setHours(10, 30, 0, 0);
const rtDay = calculateNextRealTimeTransition(mock10am.getTime());
assert(rtDay.currentPhase === 'day', 'Identifies 10:30 as Day phase');
assert(rtDay.nextPhase === 'night', 'Transitions to Night next');
const rtDayEnd = new Date(rtDay.phaseEndsAt);
assert(rtDayEnd.getHours() === 18 && rtDayEnd.getMinutes() === 0, 'Real-time Day phase concludes at exactly 18:00');

// B. Real-Time Night Check: 21:00 PM
const mock9pm = new Date();
mock9pm.setHours(21, 0, 0, 0);
const rtNight = calculateNextRealTimeTransition(mock9pm.getTime());
assert(rtNight.currentPhase === 'night', 'Identifies 21:00 as Night phase');
assert(rtNight.nextPhase === 'day', 'Transitions to Day next');
const rtNightEnd = new Date(rtNight.phaseEndsAt);
assert(rtNightEnd.getHours() === 8 && rtNightEnd.getMinutes() === 0, 'Real-time Night phase concludes at exactly 08:00 tomorrow');

// C. Accelerated Mode Transitions
const mockNow = 1000000000;
const accDay = calculateNextAcceleratedTransition('day', { dayDurationSeconds: 400, nightDurationSeconds: 200 }, mockNow);
assert(accDay.nextPhase === 'night', 'Accelerated Day schedules Night next');
assert(accDay.phaseEndsAt === mockNow + 400 * 1000, 'Accelerated Day deadline adheres to dayDurationSeconds');

const accNight = calculateNextAcceleratedTransition('night', { dayDurationSeconds: 400, nightDurationSeconds: 200 }, mockNow);
assert(accNight.nextPhase === 'day', 'Accelerated Night schedules Day next');
assert(accNight.phaseEndsAt === mockNow + 200 * 1000, 'Accelerated Night deadline adheres to nightDurationSeconds');

// D. Backend Interruption & Tick Recovery
const pastDeadlineState = createMockEngineState({
  phaseEndsAt: Date.now() - 5000, // 5 seconds expired
  phase: 'day',
  status: 'day',
});
const tickRes = processEngineTick(pastDeadlineState, Date.now());
assert(tickRes.didTransition === true, 'Engine detects expired phase and triggers transition upon server tick');
assert(pastDeadlineState.phase === 'night', 'State automatically progressed from Day to Night during recovery');

// -------------------------------------------------------------
// 2. House System & Nightly Destruction Tests
// -------------------------------------------------------------
console.log('\n2. Testing House System & Nightly Destruction (Rulebook Safeguards):');

const houseState = createMockEngineState({ totalHouses: 30, fugitiveHouse: 7, housesDestroyedPerRound: 3 });
assert(Object.keys(houseState.houses).length === 30, 'Initializes 30 dwellings');
assert(houseState.houses[7].isFugitiveShelter === true, 'Dwelling 7 is correctly flagged as The Fugitive shelter');
assert(houseState.houses[7].status === 'occupied', 'Dwelling 7 status is occupied');
assert(houseState.houses[1].status === 'available', 'Dwelling 1 status is available');

// Test Nightly Demolition with Active Spawnpoint
houseState.fugitiveSpawnpointHouse = 18;
houseState.houses[18].hasActiveSpawnpoint = true;

const demoResult = executeNightlyHouseDestruction(houseState);
assert(demoResult.destroyedHouseNumbers.length === 3, 'Demolishes exactly 3 dwellings per configured quota');
for (const hNum of demoResult.destroyedHouseNumbers) {
  assert(hNum !== 7, `Demolished dwelling ${hNum} is NOT The Fugitive shelter (Dwelling 7)`);
  assert(hNum !== 18, `Demolished dwelling ${hNum} is NOT The Fugitive active spawnpoint (Dwelling 18)`);
  assert(houseState.houses[hNum].isDestroyed === true, `Dwelling ${hNum} marked isDestroyed=true`);
  assert(houseState.houses[hNum].status === 'destroyed', `Dwelling ${hNum} status updated to destroyed`);
}
assert(houseState.houses[7].isDestroyed === false, 'CRITICAL INVARIANT: The Fugitive shelter was NOT destroyed');
assert(houseState.houses[18].isDestroyed === false, 'CRITICAL INVARIANT: The Fugitive active spawnpoint was NOT destroyed');

// Exhaustion Fallback Test: Only 1 eligible house left, quota is 3
for (let n = 1; n <= 30; n++) {
  if (n !== 7 && n !== 15 && n !== 18) {
    houseState.houses[n].isDestroyed = true;
  }
}
houseState.houses[15].isDestroyed = false;
houseState.houses[15].status = 'available';
const demoFallback = executeNightlyHouseDestruction(houseState);
assert(demoFallback.destroyedHouseNumbers.length === 1, 'Safely demolishes remaining eligible house without throwing');
assert(demoFallback.destroyedHouseNumbers[0] === 15, 'Dwelling 15 was destroyed');
assert(houseState.houses[7].isDestroyed === false, 'The Fugitive shelter (7) preserved even when pool exhausted');
assert(houseState.houses[18].isDestroyed === false, 'The Fugitive spawnpoint (18) preserved even when pool exhausted');

// -------------------------------------------------------------
// 3. The Fugitive Daily Actions Tests
// -------------------------------------------------------------
console.log('\n3. Testing The Fugitive Daily Actions:');

// A. Change House
const fState = createMockEngineState({ fugitiveHouse: 10, round: 1 });
const moveRes = executeFugitiveDailyAction(fState, { type: 'change_house', targetHouseNumber: 14 });
assert(moveRes.success === true, 'The Fugitive relocates from Dwelling 10 to Dwelling 14');
assert(fState.fugitiveCurrentHouse === 14, 'fugitiveCurrentHouse updated to 14');
assert(fState.houses[10].isFugitiveShelter === false, 'Old dwelling vacated');
assert(fState.houses[14].isFugitiveShelter === true, 'New dwelling marked as shelter');

// Test cannot move to already destroyed house
fState.houses[20].isDestroyed = true;
fState.fugitiveDailyActionExecuted = false; // reset for test
const invalidMove = executeFugitiveDailyAction(fState, { type: 'change_house', targetHouseNumber: 20 });
assert(invalidMove.success === false, 'Blocks relocation to destroyed dwelling');

// Test daily action limit (one per day)
fState.fugitiveDailyActionExecuted = true;
const limitTest = executeFugitiveDailyAction(fState, { type: 'change_house', targetHouseNumber: 12 });
assert(limitTest.success === false, 'Enforces strictly 1 action per day for The Fugitive');

// B. Investigate Citizen
const invState = createMockEngineState({ fugitiveDailyActionExecuted: false });
const invRes = executeFugitiveDailyAction(invState, { type: 'investigate_player', targetPlayerUid: 'hunter_1' });
assert(invRes.success === true, 'The Fugitive successfully investigates hunter_1');
assert(invRes.intel?.targetRole === 'detective', 'Receives true secret role (Detective)');
assert(invRes.intel?.targetTeam === 'investigators', 'Receives true faction fealty (Investigators)');

// C. Eliminate Player
const elimState = createMockEngineState({ fugitiveDailyActionExecuted: false });
const elimRes = executeFugitiveDailyAction(elimState, { type: 'eliminate_player', targetPlayerUid: 'hunter_2' });
assert(elimRes.success === true, 'The Fugitive strikes down hunter_2');
assert(elimState.players.hunter_2.isAlive === false, 'Target player marked dead');

// Protected player deflects assassination
const protState = createMockEngineState({ fugitiveDailyActionExecuted: false });
protState.players.hunter_2.statusEffects.protected = true;
const deflRes = executeFugitiveDailyAction(protState, { type: 'eliminate_player', targetPlayerUid: 'hunter_2' });
assert(deflRes.success === true, 'Action executed');
assert(protState.players.hunter_2.isAlive === true, 'Protected player survives assassination');
assert(protState.players.hunter_2.statusEffects.protected === false, 'Shield consumed');

// -------------------------------------------------------------
// 4. Spawnpoint Creation, Replacement, Activation & 11-Clue Generation
// -------------------------------------------------------------
console.log('\n4. Testing Spawnpoint System (Creation, Replacement, Teleportation & 11-Clue):');

const spState = createMockEngineState({ fugitiveHouse: 5, totalHouses: 40 });

// A. Create Spawnpoint
const sp1 = executeFugitiveDailyAction(spState, { type: 'create_spawnpoint', targetHouseNumber: 18 });
assert(sp1.success === true, 'The Fugitive creates Spawnpoint at Dwelling 18');
assert(spState.fugitiveSpawnpointHouse === 18, 'fugitiveSpawnpointHouse set to 18');
assert(spState.houses[18].hasActiveSpawnpoint === true, 'Dwelling 18 flagged hasActiveSpawnpoint=true');

// B. Spawnpoint Replacement (Only 1 may exist)
spState.fugitiveDailyActionExecuted = false; // simulate next day
const sp2 = executeFugitiveDailyAction(spState, { type: 'create_spawnpoint', targetHouseNumber: 25 });
assert(sp2.success === true, 'The Fugitive establishes new Spawnpoint at Dwelling 25');
assert(spState.fugitiveSpawnpointHouse === 25, 'Active spawnpoint updated to 25');
assert(spState.houses[18].hasActiveSpawnpoint === false, 'Old Spawnpoint at Dwelling 18 was removed');
assert(spState.houses[25].hasActiveSpawnpoint === true, 'New Spawnpoint at Dwelling 25 is active');

// C. Spawnpoint Teleportation & 11-Clue Generation
// Shoot The Fugitive's dwelling (5)
spState.actionQueue = [
  {
    id: 'act_shot',
    round: 1,
    phase: 'night',
    sourcePlayerUid: 'hunter_1',
    abilityId: 'shoot_house',
    targetHouseNumber: 5,
    submittedAt: Date.now(),
    resolved: false,
  },
];

const resSummary = resolvePhaseActionQueue(spState);
assert(spState.fugitiveCurrentHouse === 25, 'The Fugitive teleports to Spawnpoint (Dwelling 25)');
assert(spState.players.fugitive_uid.isAlive === true, 'The Fugitive survives the lethal strike');
assert(spState.fugitiveSpawnpointHouse === null, 'Spawnpoint is consumed upon activation');
assert(spState.spawnpointCooldownRounds === 1, 'Spawnpoint ability placed on 1-round cooldown');

// Verify 11-Clue Invariants
const lastClue = spState.spawnpointHistory[0];
assert(lastClue !== undefined, 'Spawnpoint clue recorded in history');
assert(lastClue.announcedHouses.length === 11, 'Clue consists of exactly 11 dwellings');
assert(lastClue.announcedHouses.includes(25), 'Clue strictly includes The Fugitive new shelter (25)');
const uniqueClueSet = new Set(lastClue.announcedHouses);
assert(uniqueClueSet.size === 11, 'Clue contains zero duplicate dwellings');
assert(lastClue.actualHouse === 25, 'Server internally records actual shelter');

// D. Cooldown Enforcement
spState.status = 'day';
spState.fugitiveDailyActionExecuted = false;
const cdAttempt = executeFugitiveDailyAction(spState, { type: 'create_spawnpoint', targetHouseNumber: 30 });
assert(cdAttempt.success === false, 'Blocks Spawnpoint creation while cooldown is active');
assert(cdAttempt.error.includes('cooldown'), 'Error cites cooldown');

// Advance round: cooldown decays
transitionMatchPhase(spState); // Day -> Night
transitionMatchPhase(spState); // Night -> Day (Round 2)
assert(spState.spawnpointCooldownRounds === 0, 'Cooldown decays to 0 upon entering next day');

const cdReadyAttempt = executeFugitiveDailyAction(spState, { type: 'create_spawnpoint', targetHouseNumber: 30 });
assert(cdReadyAttempt.success === true, 'Spawnpoint creation permitted once cooldown reaches 0');

// -------------------------------------------------------------
// 5. Centralized Game Event System Tests
// -------------------------------------------------------------
console.log('\n5. Testing Centralized Game Event System:');

const evtDay = GameEventFactory.dayStarted(2);
assert(evtDay.type === 'day_started', 'Creates day_started event');
assert(evtDay.isPublic === true, 'day_started is public');

const evtKill = GameEventFactory.playerKilled(2, 'night', 'hunter_2', 'Pyromaniac_Pete', 'Sniper Shot');
assert(evtKill.type === 'player_killed', 'Creates player_killed event');
assert(evtKill.targetUid === 'hunter_2', 'Associates victim UID');

const evtSpawn = GameEventFactory.spawnpointActivated(2, 'night', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
assert(evtSpawn.type === 'spawnpoint_activated', 'Creates spawnpoint_activated event');
assert(evtSpawn.targetHouses.length === 11, 'Stores 11 clue houses');

const evtSecret = GameEventFactory.crimeCommitted(2, 'night', 'hunter_1', 'Sherlock', 'Illegal Search');
assert(evtSecret.isPublic === false, 'Crime committed is private');
assert(evtSecret.visibleToPlayerUid === 'hunter_1', 'Visible only to the suspect and host');

// Filter Events for player vs host
const allEvents = [evtDay, evtKill, evtSpawn, evtSecret];
const hunter1Events = filterEventsForPlayer(allEvents, 'hunter_1', 'investigators', false);
assert(hunter1Events.length === 4, 'hunter_1 sees public events and their own crime');

const hunter2Events = filterEventsForPlayer(allEvents, 'hunter_2', 'annihilators', false);
assert(hunter2Events.length === 3, 'hunter_2 does NOT see hunter_1 secret crime');

const hostEvents = filterEventsForPlayer(allEvents, 'host_user', undefined, true);
assert(hostEvents.length === 4, 'Host moderator sees all events including private crimes');

// -------------------------------------------------------------
// 6. Victory Condition Check Tests
// -------------------------------------------------------------
console.log('\n6. Testing Victory Condition Checks:');

// A. The Fugitive Wins when all regular pursuers dead
const fugWinState = createMockEngineState();
fugWinState.players.hunter_1.isAlive = false;
fugWinState.players.hunter_2.isAlive = false;
fugWinState.players.hunter_3.isAlive = false;
const vic1 = checkVictoryConditions(fugWinState);
assert(vic1.isOver === true, 'Match concludes when all hunters dead');
assert(vic1.winnerTeam === 'fugitive', 'The Fugitive declared victor');

// B. Hunters Win when The Fugitive dies (highest headcount)
const huntWinState = createMockEngineState();
huntWinState.players.fugitive_uid.isAlive = false;
// 2 living investigators (hunter_1, hunter_3) vs 1 living annihilator (hunter_2)
const vic2 = checkVictoryConditions(huntWinState);
assert(vic2.isOver === true, 'Match concludes when The Fugitive dies');
assert(vic2.winnerTeam === 'investigators', 'Investigators win with greatest living headcount');

console.log(`\n========================================`);
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Phase 5 Engine & Time System Tests Passed Successfully!');
}
