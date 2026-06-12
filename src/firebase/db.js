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
  deleteDoc,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { getTodayLocal, daysBetween } from '../utils/queueMath';
import { displayName, formatBirthday } from '../utils/identity';

// ----- User account doc (users/{uid}) ---------------------------------------
// The account doc holds identity (name + birth month/day) and createdAt. It is
// provisioned at signup; these helpers let the app watch it live and patch it
// (e.g. when an existing member fills in their details via the prompt).
export function watchUserDoc(uid, cb) {
  return onSnapshot(doc(db, 'users', uid), (snap) =>
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  );
}

// merge:true so a partial legacy doc is patched in place (and a doc that somehow
// never got provisioned is created) without clobbering email/createdAt/settings.
export function updateUserDoc(uid, patch) {
  return setDoc(doc(db, 'users', uid), patch, { merge: true });
}

// Seed a starter profile built from the member's own identity, so a brand-new
// member lands on a populated queue with a worked example they can keep, edit,
// or remove. Guarded on an EMPTY network so it is idempotent and never intrudes
// on an established one — safe to call from signup AND the completion prompt.
export async function seedStarterProfile(uid, identity = {}) {
  const existing = await getDocs(query(collection(db, 'profiles'), where('uid', '==', uid)));
  if (!existing.empty) return null; // already has cards — leave their network alone

  const name = displayName(identity) || 'Your first card';
  const birthday = formatBirthday(identity.birthMonth, identity.birthDay);
  const descriptor = birthday
    ? `Born ${birthday} · example card — edit or remove anytime`
    : 'Example card — edit or remove anytime';

  return addProfile(uid, { name, descriptor, kind: 'person', priorityRate: 7 });
}

// ----- Generic real-time collection watcher ---------------------------------
// Returns the unsubscribe fn. cb receives an array of { id, ...data }.
function watchOwned(name, uid, cb) {
  const q = query(collection(db, name), where('uid', '==', uid));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export const watchHabits = (uid, cb) => watchOwned('habits', uid, cb);
export const watchGroups = (uid, cb) => watchOwned('groups', uid, cb);
export const watchProfiles = (uid, cb) => watchOwned('profiles', uid, cb);

// Coerce form values to the same shapes the add* writers use, so an edit patch
// stores identically to the original create (numbers as numbers, '' -> null).
function normalizeProfilePatch(patch) {
  const out = { ...patch };
  if ('priorityRate' in out) out.priorityRate = Number(out.priorityRate);
  if ('groupId' in out) out.groupId = out.groupId || null;
  return out;
}
function normalizeGroupPatch(patch) {
  const out = { ...patch };
  if ('priorityRate' in out) out.priorityRate = Number(out.priorityRate);
  return out;
}
function normalizeHabitPatch(patch) {
  const out = { ...patch };
  if ('targetCount' in out) out.targetCount = out.targetCount ? Number(out.targetCount) : null;
  if ('targetDate' in out) out.targetDate = out.targetDate || null;
  return out;
}

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
  return updateDoc(doc(db, 'profiles', profileId), normalizeProfilePatch(patch));
}

// Delete a profile AND its requests + logs subcollections. Firestore does not
// cascade subcollection deletes, so we sweep them in the same batch to avoid
// orphaned docs (which would otherwise linger, unreachable, billed, and against
// the rules' parent-owned assumption).
export async function deleteProfile(profileId) {
  const batch = writeBatch(db);
  for (const sub of ['requests', 'logs']) {
    const snap = await getDocs(collection(db, 'profiles', profileId, sub));
    snap.forEach((d) => batch.delete(d.ref));
  }
  batch.delete(doc(db, 'profiles', profileId));
  return batch.commit();
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

export function updateGroup(groupId, patch) {
  return updateDoc(doc(db, 'groups', groupId), normalizeGroupPatch(patch));
}

// Delete a group WITHOUT deleting its people. Members are detached (groupId ->
// null) so they survive as standalone profiles — a removed grouping should never
// silently take the people in it down with it.
export async function deleteGroup(groupId, memberIds = []) {
  const batch = writeBatch(db);
  memberIds.forEach((mid) => batch.update(doc(db, 'profiles', mid), { groupId: null }));
  batch.delete(doc(db, 'groups', groupId));
  return batch.commit();
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

export function updateHabit(habitId, patch) {
  return updateDoc(doc(db, 'habits', habitId), normalizeHabitPatch(patch));
}

export function deleteHabit(habitId) {
  return deleteDoc(doc(db, 'habits', habitId));
}

// Habit logs (habits/{id}/logs) — From-Journal notes appended by the
// routeJournalEntry Cloud Function. Mirrors watchLogs for profiles.
export function watchHabitLogs(habitId, cb) {
  const q = query(collection(db, 'habits', habitId, 'logs'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

// Toggle today's completion.
//   Checking: a PERMANENT habit's streak continues only when the last completion
//   was yesterday — any gap restarts it at 1 (that's what a streak means). A
//   TEMPORARY challenge counts total days done toward its target, so it always
//   increments. We stash the prior values so unchecking can revert exactly.
export function toggleHabit(habit) {
  const today = getTodayLocal();
  const isDoneToday = habit.lastCompletedDate === today;

  if (isDoneToday) {
    // Uncheck — restore the exact pre-check state.
    return updateDoc(doc(db, 'habits', habit.id), {
      lastCompletedDate: habit.prevCompletedDate ?? null,
      currentStreak: habit.prevStreak ?? Math.max(0, (habit.currentStreak || 0) - 1),
    });
  }

  const gap = habit.lastCompletedDate ? daysBetween(habit.lastCompletedDate, today) : null;
  const continues = habit.type === 'temporary' || gap === 1;
  return updateDoc(doc(db, 'habits', habit.id), {
    lastCompletedDate: today,
    currentStreak: continues ? (habit.currentStreak || 0) + 1 : 1,
    prevCompletedDate: habit.lastCompletedDate ?? null,
    prevStreak: habit.currentStreak || 0,
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
// Quick notes typed inline on a queue card (and anywhere else) land here as
// hand-written relational-log entries, alongside the From-Journal ones.
export function addLog(profileId, text) {
  return addDoc(collection(db, 'profiles', profileId, 'logs'), {
    text,
    timestamp: serverTimestamp(),
    fromJournal: false,
  });
}

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
    linkedHabitIds: [],
  });
}
