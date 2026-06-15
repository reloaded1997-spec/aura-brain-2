// =============================================================================
// entityDetection.test.js — Unit tests for detectEntities util
// -----------------------------------------------------------------------------
// Run with:   node test/entityDetection.test.js
// (ESM project — import works directly under Node 14+.)
// =============================================================================

import { detectEntities } from '../src/utils/entityDetection.js';

// ----- Helpers ---------------------------------------------------------------
function assert(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`  ${ok ? '✓' : '✗'} ${label}: got ${JSON.stringify(got)}${ok ? '' : `, expected ${JSON.stringify(want)}`}`);
  if (!ok) process.exitCode = 1;
}

function assertContains(label, results, name) {
  const ok = results.some((r) => r.name === name);
  console.log(`  ${ok ? '✓' : '✗'} ${label}`);
  if (!ok) process.exitCode = 1;
}

function assertNotContains(label, results, name) {
  const ok = !results.some((r) => r.name === name);
  console.log(`  ${ok ? '✓' : '✗'} ${label}`);
  if (!ok) process.exitCode = 1;
}

// ----- Test data -------------------------------------------------------------
const profiles = [
  { id: 'p1', name: 'Marcus Bell' },
  { id: 'p2', name: 'Sarah' },
  { id: 'p3', name: 'The Okafors' },
  { id: 'p4', name: 'Jo' }, // 2-char name — should never false-positive on its own token
];

const groups = [
  { id: 'g1', name: 'Fresno Home Church' },
  { id: 'g2', name: 'Small Group' },
];

const habits = [
  { id: 'h1', title: 'Morning Prayer', status: 'active' },
  { id: 'h2', title: 'Run', status: 'active' },           // single 3-char title
  { id: 'h3', title: 'Bible Reading', status: 'active' },
  { id: 'h4', title: 'Archived Habit', status: 'archived_achievement' }, // must not match
];

// ----- Tests -----------------------------------------------------------------
console.log('\n=== detectEntities ===');

// 1. Exact full-name match
console.log('\n1. Exact full-name match');
{
  const r = detectEntities('Had coffee with Marcus Bell today.', profiles, groups, habits);
  assertContains('Marcus Bell matched', r, 'Marcus Bell');
  assert('kind is profile', r.find(e => e.name === 'Marcus Bell')?.kind, 'profile');
  assert('initial is M', r.find(e => e.name === 'Marcus Bell')?.initial, 'M');
}

// 2. Partial first-name — "Marcus" alone does NOT match "Marcus Bell".
//    Local detection is conservative (all significant tokens must appear);
//    partial mentions are deferred to the AI suggestion path.
console.log('\n2. Partial first-name — no false positive');
{
  const r = detectEntities('Praying for Marcus this week.', profiles, groups, habits);
  assertNotContains('"Marcus" alone does NOT trigger Marcus Bell', r, 'Marcus Bell');
}

// 3. No match — unrelated name
console.log('\n3. No match — unrelated text');
{
  const r = detectEntities('Had a great day hiking in the mountains.', profiles, groups, habits);
  assert('no matches on generic text', r.length, 0);
}

// 4. Group name match
console.log('\n4. Group name match');
{
  const r = detectEntities('Went to Fresno Home Church last Sunday.', [], groups, []);
  assertContains('Fresno Home Church matched', r, 'Fresno Home Church');
  assert('kind is group', r.find(e => e.name === 'Fresno Home Church')?.kind, 'group');
}

// 5. Habit title match (active only)
console.log('\n5. Habit title match');
{
  const r = detectEntities('Did my Morning Prayer before sunrise.', [], [], habits);
  assertContains('Morning Prayer matched', r, 'Morning Prayer');
  assert('kind is habit', r.find(e => e.name === 'Morning Prayer')?.kind, 'habit');
}

// 6. Archived habit does NOT match
console.log('\n6. Archived habit ignored');
{
  const r = detectEntities('Completed my Archived Habit today!', [], [], habits);
  assertNotContains('Archived Habit not in results', r, 'Archived Habit');
}

// 7. Short 2-char profile name — should NOT match on its own token
console.log('\n7. Short profile name (Jo) — no false positive');
{
  const r = detectEntities('John went jogging today.', profiles, groups, []);
  assertNotContains('"Jo" not matched inside "John"/"jogging"', r, 'Jo');
}

// 8. Punctuation in text — commas, periods stripped correctly
console.log('\n8. Punctuation in text');
{
  const r = detectEntities('Praying for Sarah, and for the Okafors.', profiles, groups, []);
  assertContains('Sarah matched through comma', r, 'Sarah');
  assertContains('The Okafors matched through punctuation', r, 'The Okafors');
}

// 9. Multiple entities in one entry
console.log('\n9. Multiple entities in one entry');
{
  const r = detectEntities(
    'Marcus Bell and Sarah both came to Small Group tonight.',
    profiles,
    groups,
    habits
  );
  assertContains('Marcus Bell', r, 'Marcus Bell');
  assertContains('Sarah', r, 'Sarah');
  assertContains('Small Group', r, 'Small Group');
  assert('exactly 3 results', r.length, 3);
}

// 10. Deduplication — same profile should not appear twice
console.log('\n10. Deduplication');
{
  const dupeProfiles = [
    { id: 'p1', name: 'Marcus Bell' },
    { id: 'p1', name: 'Marcus Bell' }, // same id
  ];
  const r = detectEntities('Marcus Bell Marcus Bell', dupeProfiles, [], []);
  assert('dedupe by id — only 1 result', r.length, 1);
}

// 11. Empty text → no results
console.log('\n11. Empty text');
{
  assert('empty string → []', detectEntities('', profiles, groups, habits).length, 0);
  assert('whitespace → []', detectEntities('   ', profiles, groups, habits).length, 0);
}

// 12. Case-insensitivity
console.log('\n12. Case-insensitive matching');
{
  const r = detectEntities('had coffee with MARCUS BELL', profiles, groups, habits);
  assertContains('uppercase text still matches Marcus Bell', r, 'Marcus Bell');
}

// 13. Habit "Run" (3-char, single token) matched via substring
console.log('\n13. Short habit title via substring');
{
  const r = detectEntities('I went for a run this morning.', [], [], habits);
  assertContains('"Run" matched in text', r, 'Run');
}

console.log(
  process.exitCode === 1
    ? '\n✗ SOME CHECKS FAILED\n'
    : '\n✓ ALL CHECKS PASSED\n'
);
