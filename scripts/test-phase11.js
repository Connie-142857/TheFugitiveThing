// Phase 11 Test Suite: Localization (EN/ES/CA/FR/JA), Preferences, and Privacy-Safe Notifications
import { TRANSLATIONS, LANGUAGE_LABELS } from '../src/i18n/translations.ts';
import { filterEventsForPlayer, GameEventFactory } from '../src/services/gameEventManager.ts';

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

console.log('=== PHASE 11 SETTINGS, LOCALIZATION & NOTIFICATIONS TEST SUITE ===\n');

// 1. Localization Coverage
console.log('1. Testing Localization (English, Spanish, Catalan, French, Japanese):');
const langs = ['en', 'es', 'ca', 'fr', 'ja'];
for (const code of langs) {
  const dict = TRANSLATIONS[code];
  assert(Boolean(dict && LANGUAGE_LABELS[code]), `Language "${code}" registered with label`);
  assert(
    Boolean(dict?.nav?.home && dict?.settings?.title && dict?.tutorial?.title && dict?.home?.title),
    `Language "${code}" has complete nav, home, settings, and tutorial keys`
  );
}
assert(TRANSLATIONS.en.home.title === 'The Hunt For The Fugitive', 'Default English title preserved');

// 2. Privacy-Filtered Event Notifications
console.log('\n2. Testing Privacy-Filtered Event Notifications:');
const publicEvt = GameEventFactory.playerKilled(1, 'night', 'u_victim', 'Victim', 'Sniper Shot', 'u_sniper');
const secretCrime = GameEventFactory.crimeCommitted(1, 'day', 'u_suspect', 'Suspect', 'Perjury');
const secretIntel = GameEventFactory.abilityUsed(
  1,
  'night',
  'u_detective',
  'Sherlock',
  'detective',
  'Interrogation',
  'Secret Intel',
  false
);

const events = [publicEvt, secretCrime, secretIntel];
const bystanderVisible = filterEventsForPlayer(events, 'u_bystander', 'soldiers', false);
assert(bystanderVisible.some((e) => e.id === publicEvt.id), 'Bystander receives public casualty notification');
assert(!bystanderVisible.some((e) => e.id === secretCrime.id), 'Bystander NEVER receives another player secret crime notification');
assert(!bystanderVisible.some((e) => e.id === secretIntel.id), 'Bystander NEVER receives another player secret ability intel');

const detectiveVisible = filterEventsForPlayer(events, 'u_detective', 'investigators', false);
assert(detectiveVisible.some((e) => e.id === secretIntel.id), 'Detective receives own secret ability intel notification');

console.log(`\n========================================`);
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Phase 11 Settings, Onboarding & Notification Tests Passed!');
}
