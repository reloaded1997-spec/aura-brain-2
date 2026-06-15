// =============================================================================
// queueMath.js — The Load Balancer Engine (Phase 1, pure logic)
// -----------------------------------------------------------------------------
// No React, no Firestore, no side effects. Just deterministic functions that
// decide who surfaces in today's queue.
//
// DATE CONTRACT (per ARCHITECTURE.md §3A):
//   - All daily evaluation uses strict LOCAL date strings: "YYYY-MM-DD".
//   - We NEVER diff raw Date objects or UTC millisecond timestamps directly,
//     because clock time-of-day + DST transitions corrupt day counts.
//   - To diff two calendar dates we re-anchor each one to UTC NOON, where DST
//     does not exist, then divide the millisecond gap by one whole day. Anchoring
//     at noon (not midnight) gives a ±12h safety margin so floating-point and
//     historical offset quirks can never push a result across a day boundary.
// =============================================================================

const MS_PER_DAY = 86_400_000; // 24 * 60 * 60 * 1000

/**
 * Today's date as a strict local "YYYY-MM-DD" string.
 *
 * `toLocaleDateString('en-CA')` is the canonical trick: the en-CA locale
 * formats as ISO (YYYY-MM-DD) and respects the host's LOCAL timezone, so the
 * date flips at the user's local midnight — not UTC midnight.
 *
 * @param {Date} [now=new Date()] - injectable clock for testing.
 * @returns {string} e.g. "2026-06-11"
 */
export function getTodayLocal(now = new Date()) {
  return now.toLocaleDateString('en-CA');
}

/**
 * Parse a "YYYY-MM-DD" string into UTC-noon milliseconds.
 *
 * Using Date.UTC(...) with an explicit noon hour means the value carries no
 * local-timezone or DST baggage — it is a pure calendar anchor. Returns NaN
 * for malformed input so callers can guard.
 *
 * @param {string} dateStr
 * @returns {number} UTC ms at 12:00:00, or NaN if invalid.
 */
function toUtcNoonMs(dateStr) {
  if (typeof dateStr !== 'string') return NaN;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return NaN;
  const year = Number(m[1]);
  const month = Number(m[2]); // 1-12
  const day = Number(m[3]);   // 1-31
  if (month < 1 || month > 12 || day < 1 || day > 31) return NaN;
  // Hour 12 = noon; the ±12h cushion makes the day-diff DST-proof.
  return Date.UTC(year, month - 1, day, 12, 0, 0, 0);
}

/**
 * Whole-day difference (laterStr - earlierStr), DST- and timezone-immune.
 *
 * Positive  => `laterStr` is after `earlierStr`.
 * Zero      => same calendar day.
 * Negative  => `laterStr` is before `earlierStr`.
 *
 * @param {string} earlierStr "YYYY-MM-DD"
 * @param {string} laterStr   "YYYY-MM-DD"
 * @returns {number} integer day count (NaN if either input is invalid).
 */
export function daysBetween(earlierStr, laterStr) {
  const a = toUtcNoonMs(earlierStr);
  const b = toUtcNoonMs(laterStr);
  if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
  // Both anchored at UTC noon, so the gap is an exact multiple of MS_PER_DAY.
  // Math.round defends against any residual float dust.
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * Is an entity due, given its cadence and the last time it was cleared?
 *
 * Rule (ARCHITECTURE.md §3B): due when  today - lastClearedDate >= priorityRate.
 * A never-cleared entity (missing/invalid lastClearedDate) is treated as due.
 *
 * @param {{priorityRate:number, lastClearedDate?:string}} entity
 * @param {string} todayStr "YYYY-MM-DD"
 * @returns {{ due:boolean, daysSince:number|null }}
 */
function evaluateDue(entity, todayStr) {
  const rate = Number(entity.priorityRate);
  const last = entity.lastClearedDate;
  const daysSince = daysBetween(last, todayStr);

  // No valid clear date yet -> surface it (brand new / never touched).
  if (Number.isNaN(daysSince)) {
    return { due: true, daysSince: null };
  }
  return { due: daysSince >= rate, daysSince };
}

/**
 * Build today's Daily Queue.
 *
 * Surfacing rules:
 *   - GROUPS are always evaluated. When a group is due (or manually pulled) it
 *     surfaces and carries its member profiles.
 *   - PROFILES are evaluated individually ONLY when they are standalone, i.e.
 *     have no `groupId`. A profile that belongs to a group is never queued on
 *     its own; clearing the group clears all its members.
 *   - ACQUAINTANCES surface when inQueue === true AND due, OR when manually
 *     pulled (pulledForDate === todayStr) regardless of inQueue.
 *   - Any entity cleared today (lastClearedDate === todayStr) is excluded even
 *     if pulledForDate === todayStr.
 *
 * @param {Array<Object>} profiles      - profile docs.
 * @param {Array<Object>} groups        - group docs.
 * @param {string}        todayStr      - "YYYY-MM-DD" (inject for testing/SSR).
 * @param {Array<Object>} acquaintances - acquaintance docs.
 * @returns {{
 *   today: string,
 *   groups: Array<Object>,
 *   profiles: Array<Object>,
 *   totalDue: number
 * }}
 */
export function generateDailyQueue(profiles = [], groups = [], todayStr = getTodayLocal(), acquaintances = []) {
  // --- Groups -------------------------------------------------------------
  const dueGroups = [];
  for (const group of groups) {
    // Cleared today → done, skip even if pulledForDate matches.
    if (group.lastClearedDate === todayStr) continue;

    const { due, daysSince } = evaluateDue(group, todayStr);
    const isPulled = group.pulledForDate === todayStr;
    if (!due && !isPulled) continue;

    // Attach members so the UI accordion can render / clear them as a unit.
    const members = profiles.filter((p) => p.groupId === group.id);

    dueGroups.push({
      type: 'group',
      id: group.id,
      name: group.name,
      priorityRate: group.priorityRate,
      lastClearedDate: group.lastClearedDate ?? null,
      daysSince,
      reason: reasonText(daysSince, group.priorityRate),
      members,
      pulled: isPulled && !due,
    });
  }

  // --- Standalone profiles (no groupId) -----------------------------------
  const dueProfiles = [];
  for (const profile of profiles) {
    // Grouped profiles surface with their group accordion, never individually.
    if (profile.groupId) continue;

    if (profile.lastClearedDate === todayStr) continue;

    const { due, daysSince } = evaluateDue(profile, todayStr);
    const isPulled = profile.pulledForDate === todayStr;
    if (!due && !isPulled) continue;

    dueProfiles.push({
      entity: 'profile',
      type: 'profile',
      id: profile.id,
      name: profile.name,
      priorityRate: profile.priorityRate,
      lastClearedDate: profile.lastClearedDate ?? null,
      daysSince,
      reason: reasonText(daysSince, profile.priorityRate),
      pulled: isPulled && !due,
    });
  }

  // --- Acquaintances (opt-in or manually pulled) --------------------------
  for (const acq of acquaintances) {
    if (acq.lastClearedDate === todayStr) continue;

    const isPulled = acq.pulledForDate === todayStr;
    const { due, daysSince } = evaluateDue(acq, todayStr);

    // Normal auto-path: inQueue must be true AND entity must be due.
    // Pull override: bypass inQueue gate for one day.
    const surfacedByAuto = acq.inQueue === true && due;
    if (!surfacedByAuto && !isPulled) continue;

    dueProfiles.push({
      entity: 'acquaintance',
      type: 'profile',
      id: acq.id,
      name: acq.name,
      priorityRate: acq.priorityRate,
      lastClearedDate: acq.lastClearedDate ?? null,
      daysSince,
      reason: reasonText(daysSince, acq.priorityRate),
      pulled: isPulled && !surfacedByAuto,
    });
  }

  // Most-overdue first; never-cleared (daysSince null) floats to the very top.
  const overdueScore = (x) => (x.daysSince === null ? Infinity : x.daysSince - x.priorityRate);
  dueGroups.sort((a, b) => overdueScore(b) - overdueScore(a));
  dueProfiles.sort((a, b) => overdueScore(b) - overdueScore(a));

  return {
    today: todayStr,
    groups: dueGroups,
    profiles: dueProfiles,
    totalDue: dueGroups.length + dueProfiles.length,
  };
}

/**
 * Returns the next `n` entities (not currently surfaced today) that are
 * closest to being due on their own cadence — nearest-to-due first.
 *
 * Candidates include standalone profiles, groups, and acquaintances (even those
 * with inQueue !== true — a manual pull is an explicit one-day override).
 * Grouped profiles (groupId set) are excluded; their group represents them.
 *
 * @param {Array<Object>} profiles
 * @param {Array<Object>} groups
 * @param {Array<Object>} acquaintances
 * @param {string} todayStr "YYYY-MM-DD"
 * @param {number} n  max candidates to return
 * @returns {Array<{ entity: 'profile'|'group'|'acquaintance', id: string }>}
 */
export function nextPullCandidates(profiles = [], groups = [], acquaintances = [], todayStr = getTodayLocal(), n = 3) {
  const candidates = [];

  // --- Standalone profiles ------------------------------------------------
  for (const p of profiles) {
    if (p.groupId) continue; // grouped profiles ride with their group
    if (p.lastClearedDate === todayStr) continue; // done today
    if (p.pulledForDate === todayStr) continue; // already pulled
    const { due } = evaluateDue(p, todayStr);
    if (due) continue; // already surfaced organically
    candidates.push({ entity: 'profile', id: p.id, _score: pullScore(p.priorityRate, p.lastClearedDate, todayStr) });
  }

  // --- Groups -------------------------------------------------------------
  for (const g of groups) {
    if (g.lastClearedDate === todayStr) continue;
    if (g.pulledForDate === todayStr) continue;
    const { due } = evaluateDue(g, todayStr);
    if (due) continue;
    candidates.push({ entity: 'group', id: g.id, _score: pullScore(g.priorityRate, g.lastClearedDate, todayStr) });
  }

  // --- Acquaintances (all, inQueue or not) --------------------------------
  for (const a of acquaintances) {
    if (a.lastClearedDate === todayStr) continue;
    if (a.pulledForDate === todayStr) continue;
    const { due } = evaluateDue(a, todayStr);
    // If already surfacing via the auto-path, skip.
    if (a.inQueue === true && due) continue;
    candidates.push({ entity: 'acquaintance', id: a.id, _score: pullScore(a.priorityRate, a.lastClearedDate, todayStr) });
  }

  // Sort ascending by score: smallest "days until due" = most urgent candidate.
  candidates.sort((a, b) => a._score - b._score);

  return candidates.slice(0, n).map(({ entity, id }) => ({ entity, id }));
}

/**
 * "Days until due" score for pull-candidate ranking.
 * Lower (or negative) → closer to or past due → higher priority.
 * Never-cleared (-Infinity) floats to the very top.
 */
function pullScore(priorityRate, lastClearedDate, todayStr) {
  const daysSince = daysBetween(lastClearedDate, todayStr);
  if (Number.isNaN(daysSince)) return -Infinity; // never cleared → highest priority
  return Number(priorityRate) - daysSince;
}

/** Human-readable "why am I in the queue" string. */
function reasonText(daysSince, rate) {
  if (daysSince === null) return `never cleared (rate every ${rate}d)`;
  const overBy = daysSince - rate;
  if (overBy === 0) return `due today (${daysSince}d since clear, rate ${rate}d)`;
  return `overdue by ${overBy}d (${daysSince}d since clear, rate ${rate}d)`;
}

export default {
  getTodayLocal,
  daysBetween,
  generateDailyQueue,
  nextPullCandidates,
};
