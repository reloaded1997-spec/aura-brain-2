// =============================================================================
// utils/identity.js — User identity helpers (name + birthday)
// -----------------------------------------------------------------------------
// The account doc (users/{uid}) carries the member's first/last name and the
// month + day of their birth (no year — we only celebrate the date). These pure
// helpers keep the "is it filled in?" and "how do we show it?" logic in one
// place so the signup form, the completion modal, and the dashboard all agree.
// =============================================================================

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// How many days each month can hold (index 0 = January). February gets 29 so a
// Feb-29 birthday is selectable; we never store a year, so leap-year math is moot.
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Valid day options (1..N) for a given 1-based month. Falls back to 31.
export function daysForMonth(month) {
  const n = DAYS_IN_MONTH[Number(month) - 1] || 31;
  return Array.from({ length: n }, (_, i) => i + 1);
}

// A profile is "complete" once we have a name and a birth month+day. Everything
// is coerced loosely because legacy docs may store partial / string values.
export function isProfileComplete(userDoc) {
  if (!userDoc) return false;
  const { firstName, lastName, birthMonth, birthDay } = userDoc;
  return Boolean(
    firstName && String(firstName).trim() &&
    lastName && String(lastName).trim() &&
    birthMonth && birthDay
  );
}

// "Peter Smith" | "Peter" | '' — best name we can build from what's stored.
export function displayName(userDoc) {
  if (!userDoc) return '';
  return [userDoc.firstName, userDoc.lastName].filter(Boolean).join(' ').trim();
}

// Single uppercase initial for the avatar bubble.
export function initialFor(userDoc, fallbackEmail = '') {
  const first = userDoc?.firstName?.[0] || fallbackEmail?.[0] || 'A';
  return first.toUpperCase();
}

// "March 14" from a 1-based month + day. Returns '' if either is missing.
export function formatBirthday(birthMonth, birthDay) {
  const name = MONTHS[Number(birthMonth) - 1];
  if (!name || !birthDay) return '';
  return `${name} ${birthDay}`;
}
