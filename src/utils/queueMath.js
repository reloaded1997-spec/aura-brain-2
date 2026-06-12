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
 *   - GROUPS are always evaluated. When a group is due it surfaces and carries
 *     its member profiles (the group "handles" their surfacing — §5 accordions).
 *   - PROFILES are evaluated individually ONLY when they are standalone, i.e.
 *     have no `groupId`. A profile that belongs to a group is never queued on
 *     its own; clearing the group clears all its members.
 *
 * @param {Array<Object>} profiles - profile docs.
 * @param {Array<Object>} groups   - group docs.
 * @param {string} todayStr        - "YYYY-MM-DD" (inject for testing/SSR).
 * @returns {{
 *   today: string,
 *   groups: Array<Object>,
 *   profiles: Array<Object>,
 *   totalDue: number
 * }}
 */
export function generateDailyQueue(profiles = [], groups = [], todayStr = getTodayLocal()) {
  // --- Groups -------------------------------------------------------------
  const dueGroups = [];
  for (const group of groups) {
    const { due, daysSince } = evaluateDue(group, todayStr);
    if (!due) continue;

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
    });
  }

  // --- Standalone profiles ------------------------------------------------
  const dueProfiles = [];
  for (const profile of profiles) {
    // Grouped profiles are surfaced via their group, never individually.
    if (profile.groupId) continue;

    const { due, daysSince } = evaluateDue(profile, todayStr);
    if (!due) continue;

    dueProfiles.push({
      type: 'profile',
      id: profile.id,
      name: profile.name,
      priorityRate: profile.priorityRate,
      lastClearedDate: profile.lastClearedDate ?? null,
      daysSince,
      reason: reasonText(daysSince, profile.priorityRate),
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
};
