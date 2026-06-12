// =============================================================================
// queueMath.test.js — Isolated verification script (no test runner required)
// -----------------------------------------------------------------------------
// Run with:   node test/queueMath.test.js
// (Vite project uses ESM, so `import` works directly under Node 14+.)
//
// This script freezes "today" to a fixed date and prints exactly who lands in
// the Daily Queue and why — proving the load-balancer math without any UI.
// =============================================================================

import { daysBetween, generateDailyQueue } from '../src/utils/queueMath.js';

// ----- Frozen clock ----------------------------------------------------------
const TODAY = '2026-06-11'; // pretend it's June 11, 2026

// ----- Dummy data ------------------------------------------------------------
// 2 groups...
const groups = [
  // 21 days since clear, rate 7 -> WAY overdue, surfaces with its members.
  { id: 'grp_family',  uid: 'u1', name: 'Family',       priorityRate: 7,  lastClearedDate: '2026-05-21' },
  // 2 days since clear, rate 14 -> NOT due yet, stays hidden (and so do its members).
  { id: 'grp_mentees', uid: 'u1', name: 'Mentees',      priorityRate: 14, lastClearedDate: '2026-06-09' },
];

// 6 profiles (mix of grouped + standalone, varied cadence/clear dates).
const profiles = [
  // --- Members of grp_family (should NEVER appear individually) ---
  { id: 'p_mom',   uid: 'u1', name: 'Mom',      groupId: 'grp_family',  priorityRate: 3,  lastClearedDate: '2026-05-01' },
  { id: 'p_dad',   uid: 'u1', name: 'Dad',      groupId: 'grp_family',  priorityRate: 3,  lastClearedDate: '2026-06-10' },

  // --- Member of grp_mentees (group not due -> stays hidden) ---
  { id: 'p_jess',  uid: 'u1', name: 'Jess',     groupId: 'grp_mentees', priorityRate: 7,  lastClearedDate: '2026-01-01' },

  // --- Standalone profiles (evaluated individually) ---
  // 41 days since clear, rate 30 -> overdue by 11, surfaces.
  { id: 'p_pastor', uid: 'u1', name: 'Pastor John', groupId: null, priorityRate: 30, lastClearedDate: '2026-05-01' },
  // 7 days since clear, rate 7 -> due exactly today, surfaces.
  { id: 'p_sam',    uid: 'u1', name: 'Sam',         groupId: null, priorityRate: 7,  lastClearedDate: '2026-06-04' },
  // 3 days since clear, rate 14 -> not due, stays hidden.
  { id: 'p_alex',   uid: 'u1', name: 'Alex',        groupId: null, priorityRate: 14, lastClearedDate: '2026-06-08' },
  // never cleared -> always surfaces (brand new contact).
  { id: 'p_new',    uid: 'u1', name: 'New Contact',  groupId: null, priorityRate: 3,  lastClearedDate: null },
];

// ----- Sanity checks on the date engine -------------------------------------
function assert(label, got, want) {
  const ok = got === want;
  console.log(`  ${ok ? '✓' : '✗'} ${label}: got ${got}${ok ? '' : `, expected ${want}`}`);
  if (!ok) process.exitCode = 1;
}

console.log('\n=== DATE ENGINE CHECKS (daysBetween) ===');
assert('same day', daysBetween('2026-06-11', '2026-06-11'), 0);
assert('one day', daysBetween('2026-06-10', '2026-06-11'), 1);
// Spring-forward DST gap (US: 2026-03-08). A naive local-midnight diff returns
// 0 here because that "day" was only 23h. UTC-noon anchoring returns a clean 1.
assert('across spring DST', daysBetween('2026-03-08', '2026-03-09'), 1);
// Fall-back DST gap (US: 2026-11-01, a 25h day).
assert('across fall DST', daysBetween('2026-11-01', '2026-11-02'), 1);
assert('across month', daysBetween('2026-05-21', '2026-06-11'), 21);
assert('across leap-year Feb', daysBetween('2024-02-28', '2024-03-01'), 2); // 2024 leap year
assert('negative (later first)', daysBetween('2026-06-11', '2026-06-04'), -7);

// ----- Run the queue ---------------------------------------------------------
const queue = generateDailyQueue(profiles, groups, TODAY);

console.log(`\n=== DAILY QUEUE for ${queue.today} ===`);
console.log(`Total entities due: ${queue.totalDue}\n`);

console.log('GROUPS DUE:');
if (queue.groups.length === 0) console.log('  (none)');
for (const g of queue.groups) {
  console.log(`  • [Group] ${g.name} — ${g.reason}`);
  for (const m of g.members) {
    console.log(`      ↳ ${m.name} (cleared with group)`);
  }
}

console.log('\nSTANDALONE PROFILES DUE:');
if (queue.profiles.length === 0) console.log('  (none)');
for (const p of queue.profiles) {
  console.log(`  • [Profile] ${p.name} — ${p.reason}`);
}

// ----- Explicit verification of the tricky rules -----------------------------
console.log('\n=== RULE VERIFICATION ===');
const profileNamesDue = queue.profiles.map((p) => p.name);
const groupNamesDue = queue.groups.map((g) => g.name);

assert("grouped 'Mom' NOT surfaced individually", profileNamesDue.includes('Mom'), false);
assert("grouped 'Dad' NOT surfaced individually", profileNamesDue.includes('Dad'), false);
assert("'Family' group surfaced", groupNamesDue.includes('Family'), true);
assert("'Mentees' group NOT due (hidden)", groupNamesDue.includes('Mentees'), false);
assert("'Jess' hidden (group not due)", profileNamesDue.includes('Jess'), false);
assert("'Pastor John' surfaced (overdue)", profileNamesDue.includes('Pastor John'), true);
assert("'Sam' surfaced (due exactly today)", profileNamesDue.includes('Sam'), true);
assert("'Alex' NOT due (hidden)", profileNamesDue.includes('Alex'), false);
assert("'New Contact' surfaced (never cleared)", profileNamesDue.includes('New Contact'), true);

console.log(
  process.exitCode === 1
    ? '\n✗ SOME CHECKS FAILED\n'
    : '\n✓ ALL CHECKS PASSED\n'
);
