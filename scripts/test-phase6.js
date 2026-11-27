// Phase 6 Comprehensive Validation Test Suite:
// All 38 Roles, Team Passives, Solo Infiltrators, Crimes, Status Effects,
// Detective Interrogation, Simultaneous Action Priority, and Victory Conditions.

import { ROLES, TEAMS } from '../src/types/rules.ts';
import {
  resolveInvestigatorsPassive,
  resolveAnnihilatorsPassive,
  resolveCommunistsPassive,
  evaluateSoldierSurvivalChance,
  inflictCrime,
  evaluateCrimeDecay,
  resolveStatusEffects,
  resolveCompleteActionQueue,
  evaluateSoloWinConditions,
} from '../src/services/abilityResolutionEngine.ts';
import {
  createInterrogationSession,
  doesPlayerKnowTeam,
  evaluateInterrogationAnswer,
} from '../src/services/interrogationService.ts';

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

console.log('=== PHASE 6 COMPLETE ROLES, PASSIVES & ABILITIES TEST SUITE ===\n');

// -------------------------------------------------------------
// Helper Factory for Extended Match State
// -------------------------------------------------------------
function makePlayer(uid, roleId, team, overrides = {}) {
  const roleDef = ROLES[roleId];
  const hasPassive = roleDef?.abilities.some((a) => a.timing === 'passive') || false;
  return {
    uid,
    username: `User_${uid}`,
    isHost: false,
    isFugitive: roleId === 'fugitive',
    isAlive: true,
    isZombie: false,
    isGhost: false,
    isImmortal: false,
    crimes: 0,
    consecutiveIdleRounds: 0,
    hasPassiveAbility: hasPassive,
    cannotCommitCrimes: roleId === 'prisoner',
    survivedAttacksCount: 0,
    statusEffects: {
      extraAbilityUses: 0,
    },
    team,
    roleId,
    ...overrides,
  };
}

function makeHouses(count = 40) {
  const houses = {};
  for (let i = 1; i <= count; i++) {
    houses[i] = {
      id: `house_${i}`,
      number: i,
      status: 'available',
      isDestroyed: false,
      isBurned: false,
      hasActiveBomb: false,
      hasActiveSpawnpoint: false,
      isFugitiveShelter: i === 10,
      history: [],
    };
  }
  return houses;
}

// -------------------------------------------------------------
// 1. Role Catalogue Completeness Check
// -------------------------------------------------------------
console.log('1. Testing Role Catalogue Invariants (All 38 Roles):');
assert(Object.keys(ROLES).length === 38, 'Catalogue contains exactly 38 distinct roles');

const investigatorRoles = ['detective', 'sniper', 'verifier', 'police_officer', 'watchman', 'gossip', 'assassin', 'scientist'];
const annihilatorRoles = ['detonator', 'arsonist', 'firefighter', 'daredevil', 'president', 'necromancer', 'mutagenic_doctor', 'lunamancer'];
const communistRoles = ['worker', 'peasant', 'time_traveler', 'engineer', 'commander', 'painter', 'lover', 'prisoner'];
const soldierRoles = ['trooper', 'lieutenant', 'dictator', 'mortar', 'veteran', 'general', 'executioner', 'lunatic'];
const soloRoles = ['cursed', 'lucky', 'parasite', 'squire', 'spy'];

for (const r of investigatorRoles) assert(ROLES[r] && ROLES[r].team === 'investigators', `Role ${r} registered as Investigator`);
for (const r of annihilatorRoles) assert(ROLES[r] && ROLES[r].team === 'annihilators', `Role ${r} registered as Annihilator`);
for (const r of communistRoles) assert(ROLES[r] && ROLES[r].team === 'communists', `Role ${r} registered as Communist`);
for (const r of soldierRoles) assert(ROLES[r] && ROLES[r].team === 'soldiers', `Role ${r} registered as Soldier`);
for (const r of soloRoles) assert(ROLES[r] && ROLES[r].team === 'solo', `Role ${r} registered as Solo Infiltrator`);
assert(ROLES['fugitive'] && ROLES['fugitive'].team === 'fugitive', 'Role fugitive registered as Target');

// -------------------------------------------------------------
// 2. Team Passives
// -------------------------------------------------------------
console.log('\n2. Testing Team Passives:');

// A. Investigators: Intercept rival dispatch
const mockState = {
  round: 1,
  phase: 'day',
  players: {},
  houses: makeHouses(30),
  fugitiveUid: 'fugitive_1',
  fugitiveCurrentHouse: 10,
  fugitiveSpawnpointHouse: null,
  spawnpointCooldownRounds: 0,
  spawnpointHistory: [],
  teamChatMessages: {
    annihilators: ['We will burn down house 4 tonight!'],
    communists: ['Share the weapon with comrade 2.'],
    soldiers: ['Mortar targeted on sector north.'],
  },
  events: [],
  updatedAt: Date.now(),
};
const intercepted = resolveInvestigatorsPassive(mockState, ['inv_1']);
assert(intercepted.length === 3, 'Investigators intercept messages from all 3 rival teams');
assert(intercepted.some((e) => e.message.includes('burn down house 4')), 'Accurately captured Annihilator message');

// B. Annihilators: Nightly Ambush & House Demolition
mockState.phase = 'night';
mockState.annihilatorTargetHouse = 15; // not fugitive house (10)
mockState.players['fugitive_1'] = makePlayer('fugitive_1', 'fugitive', 'fugitive');
const annRes1 = resolveAnnihilatorsPassive(mockState, 0); // 0 deaths
assert(annRes1.fugitiveKilled === false, 'Fugitive not killed when wrong house targeted');
assert(annRes1.houseDemolished === 15, 'Selected house 15 was demolished');
assert(mockState.houses[15].isDestroyed === true, 'Dwelling 15 marked destroyed');

// Now target Fugitive house (10) with 0 deaths
mockState.annihilatorTargetHouse = 10;
const annRes2 = resolveAnnihilatorsPassive(mockState, 0);
assert(annRes2.fugitiveKilled === true, 'The Fugitive slain when Annihilators guess correct house with 0 casualties');

// Annihilator died tonight -> passive assault fails
mockState.annihilatorTargetHouse = 10;
mockState.players['fugitive_1'].isAlive = true;
const annRes3 = resolveAnnihilatorsPassive(mockState, 1); // 1 Annihilator died
assert(annRes3.fugitiveKilled === false, 'Assault fails when an Annihilator perished during the night');

// C. Communists: Rise as Ghost
mockState.phase = 'day';
mockState.players['com_dead'] = makePlayer('com_dead', 'worker', 'communists', { isAlive: false });
const ghostEvents = resolveCommunistsPassive(mockState, ['com_dead']);
assert(mockState.players['com_dead'].isGhost === true, 'Dead Communist rises as Ghost upon morning');
assert(ghostEvents.length === 1, 'Ghost transformation event emitted');

// D. Soldiers: 50% Survival Chance
const soldier1 = makePlayer('soldier_1', 'trooper', 'soldiers');
const survived = evaluateSoldierSurvivalChance(soldier1, 0.4); // roll 0.4 < 0.5 -> survives!
assert(survived === true, 'Soldier survives lethal attack on 50% roll (roll 0.4)');
assert(soldier1.survivedAttacksCount === 1, 'survivedAttacksCount incremented to 1');
const secondAttempt = evaluateSoldierSurvivalChance(soldier1, 0.1); // passive only works once
assert(secondAttempt === false, 'Soldier passive does not trigger on second lethal attempt');

// Veteran survives first 2 times automatically, then rolls 50% on 3rd!
const veteran = makePlayer('vet_1', 'veteran', 'soldiers');
assert(evaluateSoldierSurvivalChance(veteran) === true, 'Veteran survives 1st attack');
assert(evaluateSoldierSurvivalChance(veteran) === true, 'Veteran survives 2nd attack');
assert(evaluateSoldierSurvivalChance(veteran, 0.4) === true, 'Veteran survives 3rd attack using soldier passive');
assert(evaluateSoldierSurvivalChance(veteran, 0.1) === false, 'Veteran expires on 4th attempt');

// -------------------------------------------------------------
// 3. Crime System Invariants
// -------------------------------------------------------------
console.log('\n3. Testing Crime System & Penalties:');

const citizen = makePlayer('cit_1', 'worker', 'communists');
const crime1 = inflictCrime(citizen, 'Illegal curfew breach', mockState);
assert(crime1.playerDied === false, 'First crime applies penalty without death');
assert(citizen.crimes === 1, 'Crime counter set to 1');

// Second crime = Death!
const crime2 = inflictCrime(citizen, 'Disobeyed tribunal summons', mockState);
assert(crime2.playerDied === true, 'Second crime causes immediate execution');
assert(citizen.isAlive === false, 'Player marked dead');

// Crime Immunity (Prisoner)
const prisoner = makePlayer('pris_1', 'prisoner', 'communists');
const prisCrime = inflictCrime(prisoner, 'Escaped perimeter', mockState);
assert(prisCrime.playerDied === false, 'Prisoner is immune to crime execution');
assert(prisoner.crimes === 0, 'Prisoner crimes remain 0');

// Crime Decay (clearing crimes if idle)
const activeCriminal = makePlayer('crim_1', 'detective', 'investigators', { crimes: 1 });
const idleCriminal = makePlayer('crim_2', 'detective', 'investigators', { crimes: 1 });
const passiveCriminal = makePlayer('crim_3', 'watchman', 'investigators', { crimes: 1, hasPassiveAbility: true });

const playersPool = {
  crim_1: activeCriminal,
  crim_2: idleCriminal,
  crim_3: passiveCriminal,
};
const usedAbilities = new Set(['crim_1']); // crim_1 acted, crim_2 and crim_3 were idle
evaluateCrimeDecay(playersPool, usedAbilities);

assert(activeCriminal.crimes === 1, 'Active criminal retains crime');
assert(idleCriminal.crimes === 0, 'Idle criminal without passive abilities has crime cleared');
assert(passiveCriminal.crimes === 1, 'Criminal with passive abilities CANNOT lose their crime');

// -------------------------------------------------------------
// 4. Status Effects
// -------------------------------------------------------------
console.log('\n4. Testing Status Effects (Poison, Fire, Adrenaline):');

const statusState = {
  round: 1,
  phase: 'day',
  players: {
    poison_victim: makePlayer('poison_victim', 'worker', 'communists', {
      statusEffects: { extraAbilityUses: 0, poisoned: true },
    }),
    fire_victim: makePlayer('fire_victim', 'worker', 'communists', {
      statusEffects: { extraAbilityUses: 0, burning: true },
    }),
    adrenaline_man: makePlayer('adrenaline_man', 'daredevil', 'annihilators', {
      statusEffects: { extraAbilityUses: 0, adrenalineSurge: true },
    }),
  },
  events: [],
};

// Fire kills at round end
const fireRes = resolveStatusEffects(statusState, 0.8);
assert(fireRes.deaths.includes('fire_victim'), 'Player on fire dies at end of round');
assert(statusState.players.fire_victim.isAlive === false, 'Fire victim marked dead');

// Poison lethal roll (> 0.5)
assert(fireRes.deaths.includes('poison_victim'), 'Poisoned player dies when roll fails');

// Adrenaline Daredevil expires at night
statusState.phase = 'night';
const adrRes = resolveStatusEffects(statusState, 0.8);
assert(adrRes.deaths.includes('adrenaline_man'), 'Daredevil adrenaline surge concludes at night');

// -------------------------------------------------------------
// 5. Detective Interrogation & Structured Questions
// -------------------------------------------------------------
console.log('\n5. Testing Detective Interrogation & Truth Evaluation:');

const detective = makePlayer('det_1', 'detective', 'investigators');
const targetSameTeam = makePlayer('tgt_1', 'sniper', 'investigators'); // Investigator
const subjectInTeam = makePlayer('sub_1', 'police_officer', 'investigators'); // Investigator
const subjectOtherTeam = makePlayer('sub_2', 'arsonist', 'annihilators'); // Annihilator

// A. Does player know ground truth?
assert(doesPlayerKnowTeam(targetSameTeam, subjectInTeam) === true, 'Teammate knows fellow teammate faction');
assert(doesPlayerKnowTeam(targetSameTeam, subjectOtherTeam) === false, 'Does NOT know rival player faction');

// B. Detective starts interrogation session
const session = createInterrogationSession(1, detective.uid, targetSameTeam, subjectInTeam);
assert(session.questions.length <= 3, 'Interrogation limited to up to 3 questions');

// Question 0: "Does subject belong to Investigators?" (Ground truth = YES)
// Target knows truth. If target says 'yes' -> Truth (not a lie)
const ans1 = evaluateInterrogationAnswer(session, 0, 'yes', targetSameTeam, subjectInTeam);
assert(ans1.isLie === false, 'Truthful affirmative answer accepted as truth');
assert(ans1.crimeCommitted === false, 'No crime committed on truth');

// If target knows truth and says 'no' to Question 0 -> LIE!
const sessionLie = createInterrogationSession(1, detective.uid, targetSameTeam, subjectInTeam);
const ans2 = evaluateInterrogationAnswer(sessionLie, 0, 'no', targetSameTeam, subjectInTeam);
assert(ans2.isLie === true, 'False answer when knowing the truth is evaluated as LIE');
assert(ans2.crimeCommitted === true, 'Target incurs Crime penalty for lying');
assert(targetSameTeam.crimes === 1, 'Target now has 1 crime');

// Target lies AGAIN while already carrying 1 crime -> EXECUTED!
// Question 1: "Does subject belong to Annihilators?" (Ground truth = NO)
// Target says 'yes' -> LIE!
const ans3 = evaluateInterrogationAnswer(sessionLie, 1, 'yes', targetSameTeam, subjectInTeam);
assert(ans3.isLie === true, 'False assertion is a LIE');
assert(ans3.targetKilled === true, 'Target executed by Detective for lying while carrying an existing Crime');
assert(targetSameTeam.isAlive === false, 'Target player is dead');

// C. Target who does NOT know says "I don't know" -> NOT A LIE!
const ignorantTarget = makePlayer('ign_1', 'arsonist', 'annihilators');
const session2 = createInterrogationSession(1, detective.uid, ignorantTarget, subjectInTeam);
const ansIgnorant = evaluateInterrogationAnswer(session2, 0, 'dont_know', ignorantTarget, subjectInTeam);
assert(ansIgnorant.isLie === false, '"I don\'t know" is truthful when player is ignorant of rival faction');
assert(ansIgnorant.crimeCommitted === false, 'No crime on honest ignorance');

// -------------------------------------------------------------
// 6. Simultaneous Action Resolution & Priority Pipeline
// -------------------------------------------------------------
console.log('\n6. Testing Simultaneous Action Resolution Pipeline:');

const simState = {
  round: 1,
  phase: 'night',
  players: {
    peasant_1: makePlayer('peasant_1', 'peasant', 'communists'),
    target_protected: makePlayer('target_protected', 'worker', 'communists'),
    sniper_1: makePlayer('sniper_1', 'sniper', 'investigators'),
    police_1: makePlayer('police_1', 'police_officer', 'investigators'),
    rival_victim: makePlayer('rival_victim', 'detonator', 'annihilators'),
    fugitive_1: makePlayer('fugitive_1', 'fugitive', 'fugitive'),
  },
  houses: makeHouses(35),
  fugitiveUid: 'fugitive_1',
  fugitiveCurrentHouse: 10,
  fugitiveSpawnpointHouse: 22, // Active spawnpoint!
  spawnpointCooldownRounds: 0,
  spawnpointHistory: [],
  events: [],
  updatedAt: Date.now(),
};

// Simultaneous actions:
// 1. Peasant feeds target_protected (Stage 1: Grants immortality)
// 2. Sniper shoots target_protected (Stage 2: Should be deflected by immortality!)
// 3. Sniper also shoots dwelling 10 (Stage 2: Hits Fugitive, triggers Spawnpoint!)
// 4. Police arrests rival_victim (Stage 3: Applies crime & silence)
const simActions = [
  {
    id: 'a1',
    round: 1,
    phase: 'night',
    sourcePlayerUid: 'peasant_1',
    abilityId: 'feed_teammate',
    targetPlayerUid: 'target_protected',
    submittedAt: Date.now(),
    resolved: false,
  },
  {
    id: 'a2',
    round: 1,
    phase: 'night',
    sourcePlayerUid: 'sniper_1',
    abilityId: 'sniper_shot',
    targetPlayerUid: 'target_protected',
    submittedAt: Date.now(),
    resolved: false,
  },
  {
    id: 'a3',
    round: 1,
    phase: 'night',
    sourcePlayerUid: 'sniper_1',
    abilityId: 'sniper_shot',
    targetHouseNumbers: [10],
    submittedAt: Date.now(),
    resolved: false,
  },
  {
    id: 'a4',
    round: 1,
    phase: 'night',
    sourcePlayerUid: 'police_1',
    abilityId: 'arrest',
    targetPlayerUid: 'rival_victim',
    submittedAt: Date.now(),
    resolved: false,
  },
];

const simResult = resolveCompleteActionQueue(simState, simActions);

// Verification:
assert(simState.players.target_protected.isAlive === true, 'Protected target survives Sniper shot due to Peasant priority');
assert(simState.players.fugitive_1.isAlive === true, 'The Fugitive survives shot at dwelling 10 via Spawnpoint');
assert(simState.fugitiveCurrentHouse === 22, 'The Fugitive teleports to Spawnpoint (dwelling 22)');
assert(simState.players.rival_victim.statusEffects.silenced === true, 'Police arrest silences rival');
assert(simState.players.rival_victim.crimes === 1, 'Police arrest inflicts Crime');

// -------------------------------------------------------------
// 7. Solo Roles & Victory Invariants
// -------------------------------------------------------------
console.log('\n7. Testing Solo Win Conditions:');

const soloState = {
  round: 5,
  phase: 'day',
  players: {
    cursed_dead: makePlayer('cursed_dead', 'cursed', 'solo', { isAlive: false }),
    cursed_alive: makePlayer('cursed_alive', 'cursed', 'solo', { isAlive: true }),
    lucky_player: makePlayer('lucky_player', 'lucky', 'solo', { isAlive: true }),
    lord_player: makePlayer('lord_player', 'worker', 'communists', { isAlive: true }),
    squire_player: makePlayer('squire_player', 'squire', 'solo', { isAlive: false, assignedLordUid: 'lord_player' }),
    spy_player: makePlayer('spy_player', 'spy', 'solo', { isAlive: true }),
    fugitive_player: makePlayer('fugitive_player', 'fugitive', 'fugitive', { isAlive: true }),
  },
  fugitiveUid: 'fugitive_player',
};

const soloWins = evaluateSoloWinConditions(soloState);

assert(soloWins.soloWinners.includes('cursed_dead'), 'Dead Cursed player achieves martyrdom win');
assert(!soloWins.soloWinners.includes('cursed_alive'), 'Living Cursed player does NOT win');
assert(soloWins.soloWinners.includes('lucky_player'), 'Living Lucky player achieves solo victory');
assert(soloWins.soloWinners.includes('squire_player'), 'Squire wins because assigned Lord survived (even though Squire died)');
assert(soloWins.soloWinners.includes('spy_player'), 'Spy wins because The Fugitive survived');

// -------------------------------------------------------------
// 8. Parasite Transformation
// -------------------------------------------------------------
console.log('\n8. Testing Parasite Role Stealing & Retaliation:');

const paraState = {
  round: 2,
  phase: 'night',
  players: {
    attacker_sniper: makePlayer('attacker_sniper', 'sniper', 'investigators'),
    parasite_target: makePlayer('parasite_target', 'parasite', 'solo'),
  },
  houses: makeHouses(30),
  fugitiveUid: 'fug',
  events: [],
  updatedAt: Date.now(),
};

const paraActions = [
  {
    id: 'p_act',
    round: 2,
    phase: 'night',
    sourcePlayerUid: 'attacker_sniper',
    abilityId: 'sniper_shot',
    targetPlayerUid: 'parasite_target',
    submittedAt: Date.now(),
    resolved: false,
  },
];

const paraResult = resolveCompleteActionQueue(paraState, paraActions);
assert(paraState.players.attacker_sniper.isAlive === false, 'Attacker dies attempting to kill Parasite');
assert(paraState.players.parasite_target.isAlive === true, 'Parasite survives lethal assault');
assert(paraState.players.parasite_target.roleId === 'sniper', 'Parasite adopts attacker role (Sniper)');
assert(paraState.players.parasite_target.team === 'investigators', 'Parasite adopts attacker team (Investigators)');

// -------------------------------------------------------------
// 9. Assassin Precision Contract (1, 2, or 3 Nominations)
// -------------------------------------------------------------
console.log('\n9. Testing Assassin Precision Contract (1, 2, or 3 Nominations):');

// Case A: 1 player nominated correctly -> dies
const assnState1 = {
  round: 1,
  phase: 'night',
  players: {
    assn_1: makePlayer('assn_1', 'assassin', 'investigators'),
    t1: makePlayer('t1', 'arsonist', 'annihilators'),
  },
  houses: makeHouses(30),
  fugitiveUid: 'fug',
  events: [],
  updatedAt: Date.now(),
};
resolveCompleteActionQueue(assnState1, [
  {
    id: 'a1',
    round: 1,
    phase: 'night',
    sourcePlayerUid: 'assn_1',
    abilityId: 'calculated_strike',
    guessRoles: [{ playerUid: 't1', roleId: 'arsonist' }],
    submittedAt: Date.now(),
    resolved: false,
  },
]);
assert(assnState1.players.t1.isAlive === false, 'Assassin: 1 nominated player dies when role guess is correct');

// Case B: 2 players nominated, 1 correct and 1 wrong -> neither dies
const assnState2 = {
  round: 1,
  phase: 'night',
  players: {
    assn_1: makePlayer('assn_1', 'assassin', 'investigators'),
    t1: makePlayer('t1', 'arsonist', 'annihilators'),
    t2: makePlayer('t2', 'detonator', 'annihilators'),
  },
  houses: makeHouses(30),
  fugitiveUid: 'fug',
  events: [],
  updatedAt: Date.now(),
};
resolveCompleteActionQueue(assnState2, [
  {
    id: 'a2',
    round: 1,
    phase: 'night',
    sourcePlayerUid: 'assn_1',
    abilityId: 'calculated_strike',
    guessRoles: [
      { playerUid: 't1', roleId: 'arsonist' },
      { playerUid: 't2', roleId: 'sniper' }, // wrong!
    ],
    submittedAt: Date.now(),
    resolved: false,
  },
]);
assert(assnState2.players.t1.isAlive === true && assnState2.players.t2.isAlive === true, 'Assassin: no one dies if one of 2 nominated guesses is incorrect');

// Case C: 3 players nominated, all 3 correct -> all 3 die
const assnState3 = {
  round: 1,
  phase: 'night',
  players: {
    assn_1: makePlayer('assn_1', 'assassin', 'investigators'),
    t1: makePlayer('t1', 'arsonist', 'annihilators'),
    t2: makePlayer('t2', 'detonator', 'annihilators'),
    t3: makePlayer('t3', 'worker', 'communists'),
  },
  houses: makeHouses(30),
  fugitiveUid: 'fug',
  events: [],
  updatedAt: Date.now(),
};
resolveCompleteActionQueue(assnState3, [
  {
    id: 'a3',
    round: 1,
    phase: 'night',
    sourcePlayerUid: 'assn_1',
    abilityId: 'calculated_strike',
    guessRoles: [
      { playerUid: 't1', roleId: 'arsonist' },
      { playerUid: 't2', roleId: 'detonator' },
      { playerUid: 't3', roleId: 'worker' },
    ],
    submittedAt: Date.now(),
    resolved: false,
  },
]);
assert(
  assnState3.players.t1.isAlive === false &&
    assnState3.players.t2.isAlive === false &&
    assnState3.players.t3.isAlive === false,
  'Assassin: all 3 nominated players die when all 3 guesses are correct'
);

// -------------------------------------------------------------
// 10. Phase 6 Audit Fixes: Arrest Stage 0, Crime Decay, Parasite Host Revival, Lover Soulbound, Communists Night-to-Dawn
// -------------------------------------------------------------
console.log('\n10. Testing Phase 6 Audit Fixes:');

// 10a. Police Arrest in Stage 0 blocks target's Stage 2 lethal shot + preserves actor's crime (usedAbilitiesThisRound)
const arrestBlockState = {
  round: 2,
  phase: 'night',
  players: {
    police_1: makePlayer('police_1', 'police_officer', 'investigators', { crimes: 1 }),
    sniper_bad: makePlayer('sniper_bad', 'sniper', 'annihilators'),
    innocent_1: makePlayer('innocent_1', 'peasant', 'citizens'),
  },
  houses: makeHouses(30),
  fugitiveUid: 'fug',
  events: [],
  updatedAt: Date.now(),
};
resolveCompleteActionQueue(arrestBlockState, [
  {
    id: 'arr_1',
    round: 2,
    phase: 'night',
    sourcePlayerUid: 'police_1',
    abilityId: 'arrest',
    targetPlayerUid: 'sniper_bad',
    submittedAt: Date.now(),
    resolved: false,
  },
  {
    id: 'snp_1',
    round: 2,
    phase: 'night',
    sourcePlayerUid: 'sniper_bad',
    abilityId: 'sniper_shot',
    targetPlayerUid: 'innocent_1',
    submittedAt: Date.now(),
    resolved: false,
  },
]);
assert(arrestBlockState.players.innocent_1.isAlive === true, 'Police arrest in Stage 0 blocks target sniper_shot in Stage 2');
assert(arrestBlockState.players.police_1.crimes === 1, 'Active ability user retains prior Crimes (not cleared as idle)');

// 10b. Parasite death revives former host & Lover death kills soulbound partner
const paraReviveState = {
  round: 3,
  phase: 'night',
  players: {
    former_host: makePlayer('former_host', 'sniper', 'investigators', { isAlive: false }),
    parasite_form: makePlayer('parasite_form', 'sniper', 'investigators', {
      statusEffects: { extraAbilityUses: 0, parasiteHostUid: 'former_host' },
    }),
    lover_a: makePlayer('lover_a', 'lover', 'citizens', { soulboundPartnerUid: 'lover_b' }),
    lover_b: makePlayer('lover_b', 'peasant', 'citizens', { soulboundPartnerUid: 'lover_a' }),
    killer_1: makePlayer('killer_1', 'sniper', 'annihilators'),
    killer_2: makePlayer('killer_2', 'hitman', 'annihilators'),
  },
  houses: makeHouses(30),
  fugitiveUid: 'fug',
  events: [],
  updatedAt: Date.now(),
};
resolveCompleteActionQueue(paraReviveState, [
  {
    id: 'kill_para',
    round: 3,
    phase: 'night',
    sourcePlayerUid: 'killer_1',
    abilityId: 'sniper_shot',
    targetPlayerUid: 'parasite_form',
    submittedAt: Date.now(),
    resolved: false,
  },
  {
    id: 'kill_lover',
    round: 3,
    phase: 'night',
    sourcePlayerUid: 'killer_2',
    abilityId: 'sniper_shot',
    targetPlayerUid: 'lover_a',
    submittedAt: Date.now(),
    resolved: false,
  },
]);
assert(paraReviveState.players.parasite_form.isAlive === false, 'Parasite can be killed after stealing a role');
assert(paraReviveState.players.former_host.isAlive === true, 'Former host revives when Parasite dies');
assert(paraReviveState.players.lover_a.isAlive === false && paraReviveState.players.lover_b.isAlive === false, 'Lover death propagates to soulbound partner');

// 10c. Communists passive triggers at end-of-night resolution (phase === 'night')
const commNightState = {
  round: 2,
  phase: 'night',
  players: {
    comm_victim: makePlayer('comm_victim', 'worker', 'communists'),
    comm_leader: makePlayer('comm_leader', 'commander', 'communists'),
    ann_1: makePlayer('ann_1', 'sniper', 'annihilators'),
  },
  houses: makeHouses(30),
  fugitiveUid: 'fug',
  events: [],
  updatedAt: Date.now(),
};
resolveCompleteActionQueue(commNightState, [
  {
    id: 'kill_comm',
    round: 2,
    phase: 'night',
    sourcePlayerUid: 'ann_1',
    abilityId: 'sniper_shot',
    targetPlayerUid: 'comm_victim',
    submittedAt: Date.now(),
    resolved: false,
  },
]);
assert(commNightState.players.comm_victim.isAlive === false && commNightState.players.comm_victim.isGhost === true, 'Fallen Communist transforms into Ghost during end-of-night resolution');

console.log(`\n========================================`);
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Phase 6 Complete Roles & Abilities Tests Passed Successfully!');
}
