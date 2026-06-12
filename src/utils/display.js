// =============================================================================
// utils/display.js — Map Firestore schema docs to component props (Phase 4)
// -----------------------------------------------------------------------------
// The Firestore schema (§4) stores only the essentials (name, priorityRate,
// lastClearedDate, groupId). The dumb components want presentational fields
// (initial, sub, priorityLabel, kind). These decorators bridge the two so the
// UI never has to know the storage shape.
// =============================================================================

import { daysBetween } from './queueMath';

// Cadence options surfaced in the create forms (days).
export const PRIORITY_RATES = [3, 7, 14, 30];

// Cycle rate (days) -> human priority label (design language).
export function priorityLabelFromRate(rate) {
  const r = Number(rate);
  if (r <= 3) return 'High';
  if (r <= 7) return 'Medium';
  return 'Low';
}

export function initialOf(name) {
  return (name || '?').trim().charAt(0).toUpperCase() || '?';
}

export function cycleLabelFromRate(rate) {
  return `every ${rate} days`;
}

// Decorate a person/request profile doc for ProfileCard / ProfileDetail.
export function decorateProfile(p) {
  if (!p) return p;
  return {
    ...p,
    initial: p.initial || initialOf(p.name),
    kind: p.kind || 'person',
    sub: p.descriptor || p.sub || '',
    priorityLabel: p.priorityLabel || priorityLabelFromRate(p.priorityRate),
    cycleLabel: cycleLabelFromRate(p.priorityRate),
    // Clamp: the denormalized counter is incremented optimistically and could
    // drift below zero under racy toggles — never show a negative count.
    requestCount: Math.max(0, p.openRequestCount ?? p.requestCount ?? 0),
  };
}

// Decorate a group doc for GroupAccordion.
export function decorateGroup(g, memberCount = 0) {
  if (!g) return g;
  return {
    ...g,
    initial: g.initial || initialOf(g.name),
    sub: g.descriptor || `${memberCount} ${memberCount === 1 ? 'person' : 'people'}`,
    priorityLabel: 'Group',
    memberCount,
  };
}

// "Last prayed N days ago" from a YYYY-MM-DD lastClearedDate.
export function lastPrayedLabel(lastClearedDate, todayStr) {
  if (!lastClearedDate) return 'Not yet prayed';
  const n = daysBetween(lastClearedDate, todayStr);
  if (Number.isNaN(n)) return 'Not yet prayed';
  if (n <= 0) return 'Prayed today';
  if (n === 1) return 'Last prayed yesterday';
  return `Last prayed ${n} days ago`;
}
