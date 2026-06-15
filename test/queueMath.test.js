// =============================================================================
// queueMath.test.js — Isolated verification script (no test runner required)
// -----------------------------------------------------------------------------
// Run with:   node test/queueMath.test.js
// (Vite project uses ESM, so `import` works directly under Node 14+.)
//
// This script freezes "today" to a fixed date and prints exactly who lands in
// the Daily Queue and why — proving the load-balancer math without any UI.
// =============================================================================

import { daysBetween, generateDailyQueue, nextPullCandidates } from '../src/utils/queueMath.js';

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

// =============================================================================
// NEW: Pull-for-date feature tests
// =============================================================================

console.log('\n=== PULL FEATURE: generateDailyQueue with pulledForDate ===');

// --- A not-due profile with pulledForDate === today should surface -----------
const pulledProfiles = [
  { id: 'p_pulled', uid: 'u1', name: 'Pulled Alex', groupId: null, priorityRate: 14, lastClearedDate: '2026-06-08', pulledForDate: TODAY },
  { id: 'p_notpulled', uid: 'u1', name: 'Quiet Beth', groupId: null, priorityRate: 14, lastClearedDate: '2026-06-08', pulledForDate: null },
  // Pulled but also cleared today — must NOT surface.
  { id: 'p_pulled_cleared', uid: 'u1', name: 'Done Chris', groupId: null, priorityRate: 14, lastClearedDate: TODAY, pulledForDate: TODAY },
];
const pullQueue1 = generateDailyQueue(pulledProfiles, [], TODAY);
const pullNames1 = pullQueue1.profiles.map((p) => p.name);

assert("pulled not-due profile surfaces", pullNames1.includes('Pulled Alex'), true);
assert("non-pulled not-due profile stays hidden", pullNames1.includes('Quiet Beth'), false);
assert("pulled+cleared-today profile excluded", pullNames1.includes('Done Chris'), false);

// --- Check the `pulled` flag is set correctly --------------------------------
const pulledItem = pullQueue1.profiles.find((p) => p.name === 'Pulled Alex');
assert("pulled flag is true for manually pulled item", pulledItem?.pulled, true);

// --- Acquaintance with inQueue:false but pulledForDate === today surfaces ----
const acqs = [
  { id: 'a_opt_out', uid: 'u1', name: 'Not-In-Queue Dave', inQueue: false, priorityRate: 7, lastClearedDate: '2026-06-04', pulledForDate: TODAY },
  { id: 'a_normal',  uid: 'u1', name: 'Auto-Queue Eve',    inQueue: true,  priorityRate: 7, lastClearedDate: '2026-06-04', pulledForDate: null },
];
const pullQueue2 = generateDailyQueue([], [], TODAY, acqs);
const pullAcqNames = pullQueue2.profiles.map((p) => p.name);

assert("inQueue:false acquaintance with pulledForDate surfaces", pullAcqNames.includes('Not-In-Queue Dave'), true);
assert("inQueue:true acquaintance due naturally also surfaces", pullAcqNames.includes('Auto-Queue Eve'), true);

// --- pulledForDate yesterday does NOT surface --------------------------------
const yestProfiles = [
  { id: 'p_old_pull', uid: 'u1', name: 'Yesterday Pull', groupId: null, priorityRate: 14, lastClearedDate: '2026-06-08', pulledForDate: '2026-06-10' },
];
const pullQueue3 = generateDailyQueue(yestProfiles, [], TODAY);
assert("pulledForDate=yesterday does NOT surface", pullQueue3.profiles.map((p) => p.name).includes('Yesterday Pull'), false);

// =============================================================================
// NEW: nextPullCandidates tests
// =============================================================================

console.log('\n=== PULL FEATURE: nextPullCandidates ===');

// Profiles for candidate ranking:
//   Alex: 3 days since clear, rate 14 -> 11 days until due (score 11)
//   Sam:  7 days since clear, rate 7  -> already due (excluded, in queue)
//   New:  never cleared                -> already due (excluded, in queue)
//   Boss: 10 days since clear, rate 14 -> 4 days until due (score 4)
//   Far:  0 days since clear, rate 30  -> 30 days until due (score 30)
const candProfiles = [
  { id: 'p_alex',  uid: 'u1', name: 'Alex',  groupId: null,         priorityRate: 14, lastClearedDate: '2026-06-08' }, // score 11
  { id: 'p_sam',   uid: 'u1', name: 'Sam',   groupId: null,         priorityRate: 7,  lastClearedDate: '2026-06-04' }, // due -> excluded
  { id: 'p_new',   uid: 'u1', name: 'New',   groupId: null,         priorityRate: 3,  lastClearedDate: null },          // due -> excluded
  { id: 'p_boss',  uid: 'u1', name: 'Boss',  groupId: null,         priorityRate: 14, lastClearedDate: '2026-06-01' }, // score 4
  { id: 'p_far',   uid: 'u1', name: 'Far',   groupId: null,         priorityRate: 30, lastClearedDate: '2026-06-01' }, // score 20 (10 days ago, rate 30)
  { id: 'p_group', uid: 'u1', name: 'Grouped', groupId: 'grp_x',   priorityRate: 7,  lastClearedDate: '2026-06-04' }, // grouped -> excluded
  { id: 'p_pulled_already', uid: 'u1', name: 'Already Pulled', groupId: null, priorityRate: 14, lastClearedDate: '2026-06-08', pulledForDate: TODAY }, // pulled -> excluded
  { id: 'p_cleared_today', uid: 'u1', name: 'Cleared Today', groupId: null, priorityRate: 7, lastClearedDate: TODAY }, // cleared -> excluded
];

// Not-due group: grp_near (score = 14-10 = 4, same as Boss profile)
const candGroups = [
  { id: 'grp_near', uid: 'u1', name: 'Near Group', priorityRate: 14, lastClearedDate: '2026-06-01' }, // score 4
  { id: 'grp_family', uid: 'u1', name: 'Due Group', priorityRate: 7, lastClearedDate: '2026-05-21' }, // due -> excluded
];

// Acquaintances
const candAcqs = [
  { id: 'a_optout', uid: 'u1', name: 'Opt-Out Acq', inQueue: false, priorityRate: 7, lastClearedDate: '2026-06-08' }, // score 4 (not in queue, not due via auto)
  { id: 'a_due',    uid: 'u1', name: 'Due Acq',     inQueue: true,  priorityRate: 7, lastClearedDate: '2026-06-04' }, // inQueue+due -> already surfaced -> excluded
];

const candidates = nextPullCandidates(candProfiles, candGroups, candAcqs, TODAY, 10);
const candNames = candidates.map((c) => c.id);

assert("grouped profile excluded from candidates", !candNames.includes('p_group'), true);
assert("already-pulled profile excluded from candidates", !candNames.includes('p_pulled_already'), true);
assert("cleared-today profile excluded from candidates", !candNames.includes('p_cleared_today'), true);
assert("due profile excluded from candidates (already in queue)", !candNames.includes('p_sam'), true);
assert("due group excluded from candidates", !candNames.includes('grp_family'), true);
assert("inQueue+due acquaintance excluded from candidates", !candNames.includes('a_due'), true);
assert("not-due standalone profile IS a candidate", candNames.includes('p_alex'), true);
assert("not-due group IS a candidate", candNames.includes('grp_near'), true);
assert("inQueue:false acquaintance IS a candidate", candNames.includes('a_optout'), true);

// Verify ordering: Boss (score 4) should come before Alex (score 11), Far (score 30) last.
const bossIdx = candidates.findIndex((c) => c.id === 'p_boss');
const alexIdx = candidates.findIndex((c) => c.id === 'p_alex');
const farIdx  = candidates.findIndex((c) => c.id === 'p_far');
assert("Boss (score 4) ranked before Alex (score 11)", bossIdx < alexIdx, true);
assert("Alex (score 11) ranked before Far (score 30)", alexIdx < farIdx, true);

// Verify n cap works.
const top3 = nextPullCandidates(candProfiles, candGroups, candAcqs, TODAY, 3);
assert("nextPullCandidates respects n=3 cap", top3.length <= 3, true);

// Returns empty when all candidates are exhausted.
const emptyResult = nextPullCandidates([], [], [], TODAY, 3);
assert("returns empty array when no candidates", emptyResult.length, 0);

console.log(
  process.exitCode === 1
    ? '\n✗ SOME CHECKS FAILED\n'
    : '\n✓ ALL CHECKS PASSED\n'
);
