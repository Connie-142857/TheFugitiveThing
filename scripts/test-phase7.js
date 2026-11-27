// Phase 7 Validation Test Suite: Real-Time Multi-Channel Chat Permissions,
// Living/Dead Isolation, Ghost/Zombie Rules, Spy Infiltration, Anti-Spoofing & Anti-Spam.

import {
  canPlayerReadChannel,
  canPlayerSendInChannel,
  getTeamChannelId,
  getWhisperChannelId,
  sanitizeAndValidateMessage,
} from '../src/services/chatSecurityEngine.ts';

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

console.log('=== PHASE 7 MULTI-CHANNEL CHAT & SECURITY TEST SUITE ===\n');

// -------------------------------------------------------------
// Test Contexts Factory
// -------------------------------------------------------------
const baseConfig = {
  roomId: 'chamber_test_1',
  allowPrivateMessages: true,
  hasHumanHost: true,
  currentPhase: 'day',
  status: 'in_progress',
  activeTeams: ['investigators', 'annihilators', 'communists', 'soldiers'],
};

const livingInvestigator = {
  uid: 'usr_inv_1',
  username: 'Sherlock',
  isAlive: true,
  isGhost: false,
  isZombie: false,
  team: 'investigators',
  roleId: 'detective',
  isHost: false,
};

const livingAnnihilator = {
  uid: 'usr_ann_1',
  username: 'Pyromaniac',
  isAlive: true,
  isGhost: false,
  isZombie: false,
  team: 'annihilators',
  roleId: 'arsonist',
  isHost: false,
};

const deadPlayer = {
  uid: 'usr_dead_1',
  username: 'Ghostly_Giles',
  isAlive: false,
  isGhost: false,
  isZombie: false,
  team: 'investigators',
  roleId: 'sniper',
  isHost: false,
};

const communistGhost = {
  uid: 'usr_ghost_1',
  username: 'Lenin_Apparition',
  isAlive: false,
  isGhost: true,
  isZombie: false,
  team: 'communists',
  roleId: 'worker',
  isHost: false,
};

const muteZombie = {
  uid: 'usr_zombie_1',
  username: 'Undead_Fred',
  isAlive: true, // Counts as living for team survival
  isZombie: true,
  isGhost: false,
  team: 'annihilators',
  roleId: 'firefighter',
  isHost: false,
};

const prisonerPlayer = {
  uid: 'usr_pris_1',
  username: 'Captive_Karl',
  isAlive: true,
  isGhost: false,
  isZombie: false,
  team: 'communists',
  roleId: 'prisoner',
  isHost: false,
};

const spyPlayer = {
  uid: 'usr_spy_1',
  username: 'Double_Agent',
  isAlive: true,
  isGhost: false,
  isZombie: false,
  team: 'solo',
  roleId: 'spy',
  isHost: false,
  kickedFromTeams: ['soldiers'], // Discovered and banished by Soldiers!
};

const hostPlayer = {
  uid: 'usr_host_1',
  username: 'Grand_Inquisitor',
  isAlive: true,
  isGhost: false,
  isZombie: false,
  team: undefined,
  roleId: undefined,
  isHost: true,
};

// -------------------------------------------------------------
// 1. Global Forum Permissions (Living vs Dead & Curfew)
// -------------------------------------------------------------
console.log('1. Testing Global Forum Permissions:');

// Living player by day
const globLiveDay = canPlayerSendInChannel(livingInvestigator, 'global', 'global', baseConfig);
assert(globLiveDay.canRead === true, 'Living player can read Global chat');
assert(globLiveDay.canSend === true, 'Living player can send in Global chat by day');

// Dead player in Global chat
const globDead = canPlayerSendInChannel(deadPlayer, 'global', 'global', baseConfig);
assert(globDead.canRead === true, 'Dead player can read Global chat to observe');
assert(globDead.canSend === false, 'Dead player is strictly PREVENTED from sending in Global chat');
assert(globDead.reason.includes('dead cannot send'), 'Error cites afterlife barrier');

// Night Curfew (Global silenced at night)
const nightConfig = { ...baseConfig, currentPhase: 'night' };
const globNight = canPlayerSendInChannel(livingInvestigator, 'global', 'global', nightConfig);
assert(globNight.canRead === true, 'Living player can read Global chat at night');
assert(globNight.canSend === false, 'Global chat is silenced during Night curfew');
assert(globNight.reason.includes('Curfew decree'), 'Error cites nocturnal curfew');

// Host can send anytime
const globHostNight = canPlayerSendInChannel(hostPlayer, 'global', 'global', nightConfig);
assert(globHostNight.canSend === true, 'Host moderator can broadcast in Global chat even during night');

// -------------------------------------------------------------
// 2. Team Council Permissions (Faction Isolation, Spy & Prisoner)
// -------------------------------------------------------------
console.log('\n2. Testing Team Council Permissions:');

// Investigator in Investigator channel
const invChanId = getTeamChannelId('investigators');
const invPerm = canPlayerSendInChannel(livingInvestigator, 'team', invChanId, baseConfig);
assert(invPerm.canRead === true && invPerm.canSend === true, 'Investigator can read & write in Investigator council');

// Annihilator trying to access Investigator channel
const annToInv = canPlayerReadChannel(livingAnnihilator, 'team', invChanId, baseConfig);
assert(annToInv.canRead === false, 'Rival faction member cannot peer into Investigator council');

// Dead team member cannot send into living team channel
const deadInv = canPlayerSendInChannel(deadPlayer, 'team', invChanId, baseConfig);
assert(deadInv.canSend === false, 'Dead team member cannot post in team council (no info leaks)');

// Communist Ghost CAN send in Communist team chat as per rulebook
const comChanId = getTeamChannelId('communists');
const ghostCom = canPlayerSendInChannel(communistGhost, 'team', comChanId, baseConfig);
assert(ghostCom.canRead === true && ghostCom.canSend === true, 'Communist Ghost retains council voice in Communist team chat');

// Prisoner is excluded from Communist team chat
const prisCom = canPlayerReadChannel(prisonerPlayer, 'team', comChanId, baseConfig);
assert(prisCom.canRead === false, 'Prisoner is excluded from Communist chat as per rulebook');

// Spy accesses all team chats
const spyToInv = canPlayerReadChannel(spyPlayer, 'team', invChanId, baseConfig);
assert(spyToInv.canRead === true, 'Spy can infiltrate and read Investigator council');
const spyToAnn = canPlayerReadChannel(spyPlayer, 'team', getTeamChannelId('annihilators'), baseConfig);
assert(spyToAnn.canRead === true, 'Spy can infiltrate Annihilator council');

// Spy kicked by Soldiers cannot access Soldier council
const solChanId = getTeamChannelId('soldiers');
const spyToSol = canPlayerReadChannel(spyPlayer, 'team', solChanId, baseConfig);
assert(spyToSol.canRead === false, 'Spy cannot access team council after being discovered and banished');

// -------------------------------------------------------------
// 3. The Sepulchre (Dead Chat) Permissions
// -------------------------------------------------------------
console.log('\n3. Testing Dead Chat (The Sepulchre):');

// Dead player in Dead Chat
const deadInDead = canPlayerSendInChannel(deadPlayer, 'dead', 'dead', baseConfig);
assert(deadInDead.canRead === true && deadInDead.canSend === true, 'Deceased player can read and write in Dead Chat');

// Ghost in Dead Chat
const ghostInDead = canPlayerSendInChannel(communistGhost, 'dead', 'dead', baseConfig);
assert(ghostInDead.canRead === true && ghostInDead.canSend === true, 'Ghost can communicate with other dead souls in Dead Chat');

// Living player in Dead Chat (BLOCKED!)
const livingInDead = canPlayerReadChannel(livingInvestigator, 'dead', 'dead', baseConfig);
assert(livingInDead.canRead === false, 'Living player is strictly BLOCKED from reading Dead Chat');
assert(livingInDead.reason.includes('living cannot peer'), 'Error cites barrier of death');

// Host in Dead Chat
const hostInDead = canPlayerReadChannel(hostPlayer, 'dead', 'dead', baseConfig);
assert(hostInDead.canRead === true && hostInDead.canSend === true, 'Host can observe and moderate Dead Chat');

// -------------------------------------------------------------
// 4. Host Tribunal Permissions
// -------------------------------------------------------------
console.log('\n4. Testing Host Tribunal Permissions:');

// Human host present
const hostChanWithHost = canPlayerSendInChannel(livingInvestigator, 'host', 'host', baseConfig);
assert(hostChanWithHost.canRead === true && hostChanWithHost.canSend === true, 'Players can communicate with Host in Human Host Mode');

// Automated Mode (No human host)
const noHostConfig = { ...baseConfig, hasHumanHost: false };
const hostChanNoHost = canPlayerReadChannel(livingInvestigator, 'host', 'host', noHostConfig);
assert(hostChanNoHost.canRead === false, 'Host channel disabled when match is in Automated Mode');

// -------------------------------------------------------------
// 5. Secret Whispers (Private Missives)
// -------------------------------------------------------------
console.log('\n5. Testing Private Whispers:');

const whisperChanId = getWhisperChannelId('usr_inv_1', 'usr_ann_1');
assert(whisperChanId === 'whisper_usr_ann_1_usr_inv_1', 'Normalizes pairwise channel ID deterministically');

// Sender and recipient can access
const invWhisper = canPlayerSendInChannel(livingInvestigator, 'whisper', whisperChanId, baseConfig);
assert(invWhisper.canRead === true && invWhisper.canSend === true, 'Party A can read and send whisper');

const annWhisper = canPlayerSendInChannel(livingAnnihilator, 'whisper', whisperChanId, baseConfig);
assert(annWhisper.canRead === true && annWhisper.canSend === true, 'Party B can read and send whisper');

// Third party (deadPlayer or spy) CANNOT access
const eavesdropper = canPlayerReadChannel(deadPlayer, 'whisper', whisperChanId, baseConfig);
assert(eavesdropper.canRead === false, 'Third-party citizen strictly barred from private whisper channel');

// When private missives disabled in room settings
const noWhisperConfig = { ...baseConfig, allowPrivateMessages: false };
const disabledWhisper = canPlayerReadChannel(livingInvestigator, 'whisper', whisperChanId, noWhisperConfig);
assert(disabledWhisper.canRead === false, 'Whispers disabled when allowPrivateMessages=false');

// -------------------------------------------------------------
// 6. Anti-Spoofing, Anti-Spam & Sanitization
// -------------------------------------------------------------
console.log('\n6. Testing Anti-Spoofing, Anti-Spam & Sanitization:');

// Impersonation attempt (caller != claimed sender)
const spoofTest = sanitizeAndValidateMessage('Hello comrade', 'real_uid', 'fake_uid');
assert(spoofTest.valid === false, 'Rejects sender identity spoofing');

// Empty or whitespace message
const emptyTest = sanitizeAndValidateMessage('   ', 'usr_1', 'usr_1');
assert(emptyTest.valid === false, 'Rejects empty whitespace message');

// Oversized message (> 500 chars)
const longText = 'A'.repeat(501);
const longTest = sanitizeAndValidateMessage(longText, 'usr_1', 'usr_1');
assert(longTest.valid === false, 'Rejects message exceeding 500 characters');

// Valid message
const validText = '  Meet at dwelling #12 tonight.  ';
const validTest = sanitizeAndValidateMessage(validText, 'usr_1', 'usr_1');
assert(validTest.valid === true, 'Accepts valid text');
assert(validTest.sanitizedText === 'Meet at dwelling #12 tonight.', 'Trims outer whitespace');

// HTML stripping
const htmlText = '<b>Secret attack</b> on <script>alert(1)</script>';
const htmlTest = sanitizeAndValidateMessage(htmlText, 'usr_1', 'usr_1');
assert(htmlTest.valid === true, 'Accepts text containing HTML characters');
assert(!htmlTest.sanitizedText.includes('<script>'), 'HTML brackets properly sanitized');

// Spam rate limiting (< 250ms)
const now = 1000000;
const spamTest = sanitizeAndValidateMessage('Fast message', 'usr_1', 'usr_1', now - 100, now);
assert(spamTest.valid === false, 'Throttles rapid submission faster than 250ms');

// -------------------------------------------------------------
// 7. Zombie Mute, Lovers Sanctuary & Whisper Endpoint Security
// -------------------------------------------------------------
console.log('\n7. Testing Zombie Mute, Lovers Sanctuary & Whisper Endpoint Security:');

const zombieGlobal = canPlayerSendInChannel(muteZombie, 'global', 'global', baseConfig);
assert(zombieGlobal.canRead === true && zombieGlobal.canSend === false, 'Mute Zombie can read Global but cannot send');
assert(zombieGlobal.reason.includes('Zombies are mute'), 'Error cites mute undead restriction');

const loverPlayer = {
  uid: 'usr_lover_1',
  username: 'Romeo',
  isAlive: true,
  isGhost: false,
  isZombie: false,
  team: 'communists',
  roleId: 'lover',
  isHost: false,
  soulboundUid: 'usr_soulmate_1',
};
const soulmatePlayer = {
  uid: 'usr_soulmate_1',
  username: 'Juliet',
  isAlive: true,
  isGhost: false,
  isZombie: false,
  team: 'soldiers',
  roleId: 'trooper',
  isHost: false,
  soulboundUid: 'usr_lover_1',
};

const loverChan = canPlayerSendInChannel(loverPlayer, 'role', 'role_lovers', baseConfig);
assert(loverChan.canRead === true && loverChan.canSend === true, 'Lover can read and send in role_lovers');
const soulmateChan = canPlayerSendInChannel(soulmatePlayer, 'role', 'role_lovers', baseConfig);
assert(soulmateChan.canRead === true && soulmateChan.canSend === true, 'Soulbound partner can read and send in role_lovers');
const outsiderLoverChan = canPlayerReadChannel(livingInvestigator, 'role', 'role_lovers', baseConfig);
assert(outsiderLoverChan.canRead === false, 'Outsider cannot read role_lovers channel');

const substringSpoofer = { ...livingInvestigator, uid: 'ann_1' };
const spoofWhisper = canPlayerReadChannel(substringSpoofer, 'whisper', whisperChanId, baseConfig);
assert(spoofWhisper.canRead === false, 'Substring UID cannot spoof access to whisper channel');

console.log(`\n========================================`);
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Phase 7 Real-Time Chat & Security Tests Passed Successfully!');
}
