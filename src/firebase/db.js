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
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
  increment,
} from 'firebase/firestore';
import { db } from './config';
import { getTodayLocal, daysBetween } from '../utils/queueMath';
import { displayName, formatBirthday } from '../utils/identity';

// ----- User account doc (users/{uid}) ---------------------------------------
// The account doc holds identity (name + birth month/day) and createdAt. It is
// provisioned at signup; these helpers let the app watch it live and patch it
// (e.g. when an existing member fills in their details via the prompt).
export function watchUserDoc(uid, cb) {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => cb(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (err) => console.error('[watchUserDoc] listen failed:', err.code, err.message)
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

// ----- FCM token management (users/{uid}.fcmTokens) -------------------------
export function saveFcmToken(uid, token) {
  return setDoc(doc(db, 'users', uid), { fcmTokens: arrayUnion(token) }, { merge: true });
}

export function removeFcmToken(uid, token) {
  return setDoc(doc(db, 'users', uid), { fcmTokens: arrayRemove(token) }, { merge: true });
}

// ----- Generic real-time collection watcher ---------------------------------
// Returns the unsubscribe fn. cb receives an array of { id, ...data }.
function watchOwned(name, uid, cb) {
  const q = query(collection(db, name), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error(`[watchOwned:${name}] listen failed:`, err.code, err.message)
  );
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
  if ('goalId' in out) out.goalId = out.goalId || null;
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

export function bulkAddProfiles(uid, items, { priorityRate = 7, groupId = null } = {}) {
  const batch = writeBatch(db);
  for (const { name, descriptor = '' } of items) {
    const ref = doc(collection(db, 'profiles'));
    batch.set(ref, {
      uid,
      name,
      descriptor,
      kind: 'person',
      priorityRate: Number(priorityRate),
      groupId: groupId || null,
      lastClearedDate: null,
      openRequestCount: 0,
      createdAt: serverTimestamp(),
    });
  }
  return batch.commit();
}

export function updateProfile(profileId, patch) {
  return updateDoc(doc(db, 'profiles', profileId), normalizeProfilePatch(patch));
}

// Dedicated single-field update for freeform notes — intentionally separate
// from updateProfile so normalizeProfilePatch never touches this field.
export function updateProfileNotes(profileId, notes) {
  return updateDoc(doc(db, 'profiles', profileId), { notes: notes ?? '' });
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

// Manually surface a profile in today's queue regardless of cadence.
export function pullProfileToQueue(profileId) {
  return updateDoc(doc(db, 'profiles', profileId), { pulledForDate: getTodayLocal() });
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

// Manually surface a group in today's queue regardless of cadence.
export function pullGroupToQueue(groupId) {
  return updateDoc(doc(db, 'groups', groupId), { pulledForDate: getTodayLocal() });
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
export function addHabit(uid, { title, type = 'permanent', targetCount = null, targetDate = null, goalId = null }) {
  return addDoc(collection(db, 'habits'), {
    uid,
    title,
    type,
    targetCount: targetCount ? Number(targetCount) : null,
    targetDate: targetDate || null,
    goalId: goalId || null,
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
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error('[watchHabitLogs] listen failed:', err.code, err.message)
  );
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
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error('[watchRequests] listen failed:', err.code, err.message)
  );
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
  return updateDoc(doc(db, 'profiles', profileId), { openRequestCount: increment(delta) });
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
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error('[watchLogs] listen failed:', err.code, err.message)
  );
}

// ----- Acquaintances ---------------------------------------------------------
export const watchAcquaintances = (uid, cb) => watchOwned('acquaintances', uid, cb);

function normalizeAcquaintancePatch(patch) {
  const out = { ...patch };
  if ('priorityRate' in out) out.priorityRate = Number(out.priorityRate);
  if ('inQueue' in out) out.inQueue = Boolean(out.inQueue);
  if ('linkedProfileIds' in out) out.linkedProfileIds = out.linkedProfileIds || [];
  return out;
}

export function addAcquaintance(uid, { name, descriptor = '', inQueue = false, priorityRate = 7, linkedProfileIds = [] }) {
  return addDoc(collection(db, 'acquaintances'), {
    uid,
    name,
    descriptor,
    inQueue: Boolean(inQueue),
    priorityRate: Number(priorityRate),
    linkedProfileIds: linkedProfileIds || [],
    lastClearedDate: null,
    createdAt: serverTimestamp(),
  });
}

export function bulkAddAcquaintances(uid, items, { inQueue = false, priorityRate = 7 } = {}) {
  const batch = writeBatch(db);
  for (const { name, descriptor = '' } of items) {
    const ref = doc(collection(db, 'acquaintances'));
    batch.set(ref, {
      uid,
      name,
      descriptor,
      inQueue: Boolean(inQueue),
      priorityRate: Number(priorityRate),
      linkedProfileIds: [],
      lastClearedDate: null,
      createdAt: serverTimestamp(),
    });
  }
  return batch.commit();
}

export function updateAcquaintance(acqId, patch) {
  return updateDoc(doc(db, 'acquaintances', acqId), normalizeAcquaintancePatch(patch));
}

export function clearAcquaintance(acqId) {
  return updateDoc(doc(db, 'acquaintances', acqId), { lastClearedDate: getTodayLocal() });
}

// Manually surface an acquaintance in today's queue regardless of inQueue/cadence.
export function pullAcquaintanceToQueue(acqId) {
  return updateDoc(doc(db, 'acquaintances', acqId), { pulledForDate: getTodayLocal() });
}

// Pull up to ~3 entities in one batched write (profiles, groups, acquaintances mixed).
export function pullManyToQueue(items) {
  const today = getTodayLocal();
  const batch = writeBatch(db);
  for (const { entity, id } of items) {
    const collName = entity === 'group' ? 'groups' : entity === 'acquaintance' ? 'acquaintances' : 'profiles';
    batch.update(doc(db, collName, id), { pulledForDate: today });
  }
  return batch.commit();
}

export async function deleteAcquaintance(acqId) {
  const batch = writeBatch(db);
  const snap = await getDocs(collection(db, 'acquaintances', acqId, 'updates'));
  snap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'acquaintances', acqId));
  return batch.commit();
}

export function watchUpdates(acqId, cb) {
  const q = query(collection(db, 'acquaintances', acqId, 'updates'), orderBy('timestamp', 'desc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error('[watchUpdates] listen failed:', err.code, err.message)
  );
}

export function addUpdate(acqId, text) {
  return addDoc(collection(db, 'acquaintances', acqId, 'updates'), {
    text,
    timestamp: serverTimestamp(),
  });
}

// ----- Goals -----------------------------------------------------------------
export const watchGoals = (uid, cb) => watchOwned('goals', uid, cb);

function normalizeGoalPatch(patch) {
  const out = { ...patch };
  if ('targetDate' in out) out.targetDate = out.targetDate || null;
  return out;
}

export function addGoal(uid, { title, description = '', status = 'active', targetDate = null }) {
  return addDoc(collection(db, 'goals'), {
    uid,
    title,
    description,
    status,
    targetDate: targetDate || null,
    color: null, // reserved for future use
    createdAt: serverTimestamp(),
  });
}

export function updateGoal(goalId, patch) {
  return updateDoc(doc(db, 'goals', goalId), normalizeGoalPatch(patch));
}

export function deleteGoal(goalId) {
  return deleteDoc(doc(db, 'goals', goalId));
}

// ----- Journals --------------------------------------------------------------
// Writing a journal doc triggers routeJournalEntry. When gated:true, the
// trigger routes ONLY to the confirmed IDs/requests/habits; it skips Gemini
// entirely. Legacy docs (no gated field) continue to auto-route via Gemini.
export function addJournalEntry(uid, {
  text,
  confirmedProfileIds = [],
  confirmedGroupIds = [],
  confirmedRequests = [],
  confirmedHabits = [],
} = {}) {
  return addDoc(collection(db, 'journals'), {
    uid,
    text,
    timestamp: serverTimestamp(),
    aiProcessed: false,
    linkedProfileIds: [],
    linkedHabitIds: [],
    gated: true,
    confirmedProfileIds,
    confirmedGroupIds,
    confirmedRequests,
    confirmedHabits,
  });
}

// Cascade-delete a journal entry:
//   • queries each linked profile's requests and logs subcollections for docs
//     stamped with this journalId and removes them;
//   • decrements openRequestCount only for OPEN (not yet completed) requests
//     (completed ones were already decremented when they were answered);
//   • queries each linked habit's logs subcollection and removes those docs;
//   • finally deletes the journal doc itself.
// Batches are chunked at 500 ops to respect Firestore limits.
export async function deleteJournalEntry(entry) {
  const { id: journalId, linkedProfileIds = [], linkedHabitIds = [] } = entry;

  // Collect everything that needs to be deleted / updated.
  const deleteRefs = [];
  const profileDecrements = []; // { ref, amount }

  for (const profileId of linkedProfileIds) {
    const profileRef = doc(db, 'profiles', profileId);

    const [reqSnap, logSnap] = await Promise.all([
      getDocs(query(collection(db, 'profiles', profileId, 'requests'), where('journalId', '==', journalId))),
      getDocs(query(collection(db, 'profiles', profileId, 'logs'), where('journalId', '==', journalId))),
    ]);

    let openCount = 0;
    reqSnap.forEach((d) => {
      if (!d.data().isCompleted) openCount++;
      deleteRefs.push(d.ref);
    });
    logSnap.forEach((d) => deleteRefs.push(d.ref));

    if (openCount > 0) {
      profileDecrements.push({ ref: profileRef, amount: openCount });
    }
  }

  for (const habitId of linkedHabitIds) {
    const logSnap = await getDocs(
      query(collection(db, 'habits', habitId, 'logs'), where('journalId', '==', journalId))
    );
    logSnap.forEach((d) => deleteRefs.push(d.ref));
  }

  // Add the journal doc itself.
  deleteRefs.push(doc(db, 'journals', journalId));

  // Build a flat list of all Firestore operations.
  const ops = [
    ...deleteRefs.map((ref) => ({ kind: 'delete', ref })),
    ...profileDecrements.map(({ ref, amount }) => ({ kind: 'decrement', ref, amount })),
  ];

  // Commit in chunks of 500 (Firestore batch limit).
  for (let i = 0; i < ops.length; i += 500) {
    const batch = writeBatch(db);
    for (const op of ops.slice(i, i + 500)) {
      if (op.kind === 'delete') {
        batch.delete(op.ref);
      } else {
        batch.update(op.ref, { openRequestCount: increment(-op.amount) });
      }
    }
    await batch.commit();
  }
}

export function watchJournalEntries(uid, cb) {
  const q = query(
    collection(db, 'journals'),
    where('uid', '==', uid),
    orderBy('timestamp', 'desc'),
    limit(30)
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error('[watchJournalEntries] listen failed:', err.code, err.message)
  );
}

// ----- User settings (users/{uid}.settings.*) --------------------------------
// Writes only the keys present in `patch` using Firestore dot-notation so other
// settings fields are never clobbered (merge: true handles the outer doc).
export function updateUserSettings(uid, patch) {
  const dotted = {};
  for (const [k, v] of Object.entries(patch)) {
    dotted[`settings.${k}`] = v;
  }
  // updateDoc correctly interprets dot-notation strings as nested field paths.
  // setDoc+merge would treat them as literal key names (with dots), writing to
  // the wrong location and bypassing the watchUserDoc listener.
  return updateDoc(doc(db, 'users', uid), dotted);
}

// ----- Daily Notes -----------------------------------------------------------
// One doc per user per day: ID is `{uid}_{YYYY-MM-DD}`. Composite key means
// upserts need no query — just getDoc/setDoc by ID.
export function watchDailyNote(uid, dateStr, cb) {
  const ref = doc(db, 'dailyNotes', `${uid}_${dateStr}`);
  return onSnapshot(
    ref,
    (snap) => cb(snap.exists() ? (snap.data().text ?? '') : ''),
    (err) => console.error('[watchDailyNote] listen failed:', err.code, err.message)
  );
}

export function saveDailyNote(uid, dateStr, text) {
  const ref = doc(db, 'dailyNotes', `${uid}_${dateStr}`);
  return setDoc(ref, { uid, date: dateStr, text, updatedAt: serverTimestamp() }, { merge: true });
}
