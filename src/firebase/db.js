// =============================================================================
// firebase/db.js — Firestore service layer (Phase 4)
// -----------------------------------------------------------------------------
// All reads/writes live here so components and context never touch Firestore
// APIs directly. Reads are real-time (onSnapshot) to satisfy the offline-first
// + live-sync directive. Every write stamps dates as strict local YYYY-MM-DD
// strings via getTodayLocal() (the date engine, §3A) — never UTC.
// =============================================================================

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { getTodayLocal } from '../utils/queueMath';

// ----- Generic real-time collection watcher ---------------------------------
// Returns the unsubscribe fn. cb receives an array of { id, ...data }.
function watchOwned(name, uid, cb) {
  const q = query(collection(db, name), where('uid', '==', uid));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export const watchHabits = (uid, cb) => watchOwned('habits', uid, cb);
export const watchGroups = (uid, cb) => watchOwned('groups', uid, cb);
export const watchProfiles = (uid, cb) => watchOwned('profiles', uid, cb);

// ----- Profiles --------------------------------------------------------------
export function addProfile(uid, { name, descriptor = '', kind = 'person', priorityRate = 7, groupId = null }) {
  return addDoc(collection(db, 'profiles'), {
    uid,
    name,
    descriptor,
    kind,
    priorityRate: Number(priorityRate),
    groupId: groupId || null,
    lastClearedDate: null, // never cleared -> surfaces immediately
    openRequestCount: 0,
    createdAt: serverTimestamp(),
  });
}

export function updateProfile(profileId, patch) {
  return updateDoc(doc(db, 'profiles', profileId), patch);
}

// Mark a standalone profile prayed-for today (drops it from the due queue).
export function clearProfile(profileId) {
  return updateDoc(doc(db, 'profiles', profileId), { lastClearedDate: getTodayLocal() });
}

// ----- Groups ----------------------------------------------------------------
export function addGroup(uid, { name, descriptor = '', priorityRate = 7 }) {
  return addDoc(collection(db, 'groups'), {
    uid,
    name,
    descriptor,
    priorityRate: Number(priorityRate),
    lastClearedDate: null,
    createdAt: serverTimestamp(),
  });
}

// Checking the group master clears the group AND stamps every nested member
// (ARCHITECTURE.md §5) — done atomically in one batch.
export function clearGroup(groupId, memberIds = []) {
  const today = getTodayLocal();
  const batch = writeBatch(db);
  batch.update(doc(db, 'groups', groupId), { lastClearedDate: today });
  memberIds.forEach((mid) => batch.update(doc(db, 'profiles', mid), { lastClearedDate: today }));
  return batch.commit();
}

// ----- Habits ----------------------------------------------------------------
export function addHabit(uid, { title, type = 'permanent', targetCount = null, targetDate = null }) {
  return addDoc(collection(db, 'habits'), {
    uid,
    title,
    type,
    targetCount: targetCount ? Number(targetCount) : null,
    targetDate: targetDate || null,
    currentStreak: 0,
    lastCompletedDate: null,
    status: 'active',
    createdAt: serverTimestamp(),
  });
}

// Toggle today's completion. Checking bumps the streak; unchecking reverts it.
export function toggleHabit(habit) {
  const today = getTodayLocal();
  const isDoneToday = habit.lastCompletedDate === today;
  return updateDoc(doc(db, 'habits', habit.id), {
    lastCompletedDate: isDoneToday ? null : today,
    currentStreak: Math.max(0, (habit.currentStreak || 0) + (isDoneToday ? -1 : 1)),
  });
}

// ----- Requests subcollection (profiles/{id}/requests) ----------------------
export function watchRequests(profileId, cb) {
  const q = query(collection(db, 'profiles', profileId, 'requests'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function addRequest(profileId, text) {
  await addDoc(collection(db, 'profiles', profileId, 'requests'), {
    text,
    isCompleted: false,
    createdAt: serverTimestamp(),
  });
  await bumpOpenRequests(profileId, +1);
}

export async function toggleRequest(profileId, requestId, isCompleted) {
  await updateDoc(doc(db, 'profiles', profileId, 'requests', requestId), { isCompleted });
  await bumpOpenRequests(profileId, isCompleted ? -1 : +1);
}

// Keep a denormalized open-request count on the profile so the queue card can
// show "· N requests" without subscribing to every subcollection.
function bumpOpenRequests(profileId, delta) {
  // Read-modify-write would race; a transaction is cleaner, but for a single
  // user's own device the optimistic increment via updateDoc + FieldValue is
  // simplest. We import increment lazily to keep the top tidy.
  return import('firebase/firestore').then(({ increment }) =>
    updateDoc(doc(db, 'profiles', profileId), { openRequestCount: increment(delta) })
  );
}

// ----- Logs subcollection (profiles/{id}/logs) ------------------------------
export function watchLogs(profileId, cb) {
  const q = query(collection(db, 'profiles', profileId, 'logs'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

// ----- Journals --------------------------------------------------------------
// Writing a journal doc triggers the Cloud Function, which routes the note to
// the people/groups it recognizes (§6). The client only writes the raw entry.
export function addJournalEntry(uid, text) {
  return addDoc(collection(db, 'journals'), {
    uid,
    text,
    timestamp: serverTimestamp(),
    aiProcessed: false,
    linkedProfileIds: [],
  });
}
