// =============================================================================
// functions/index.js — Journal → profile + habit routing via Gemini (Phase 5.2)
// -----------------------------------------------------------------------------
// Trigger: a new doc in `journals` (2nd-gen Firestore trigger).
// Job: send the entry to Gemini (gemini-2.5-flash), which extracts (a) the
// people named + a derived prayer request / relational note for each, and (b)
// which of the user's tracked habits the entry references and whether each was
// done. We match each extracted name to one of the SAME USER's profiles (write
// the request into its `requests` subcollection) and each habit reference to one
// of the user's habits (append a From-Journal note to its `logs` subcollection,
// and mark it complete for the day when the entry says it was done). Finally we
// mark the journal aiProcessed.
//
// uid ISOLATION: every profile lookup is filtered by `uid == journal.uid`, so a
// journal can only ever route to its own author's profiles. No cross-tenant
// writes are possible even if Gemini returns a name that exists for another user.
//
// Uses the current Google Gen AI SDK (`@google/genai`). The GEMINI_API_KEY is a
// Secret Manager secret (defineSecret) bound to this function only.
// =============================================================================

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { GoogleGenAI } = require('@google/genai');

initializeApp();
const db = getFirestore();

// Secret — set with: firebase functions:secrets:set GEMINI_API_KEY
const geminiApiKey = defineSecret('GEMINI_API_KEY');

// --- Strict extraction system prompt ----------------------------------------
const SYSTEM_PROMPT = `You are a Data Extraction Assistant for a prayer-journaling app.

You read a single journal entry and extract two things:
  1. The people mentioned and, for each, the specific prayer request or
     relational note derived from the text.
  2. Which of the user's TRACKED HABITS (a fixed list is provided with the
     entry) the entry references, whether the entry indicates the user actually
     did/completed that habit, and a short note grounded in the text.

RULES:
- Return ONLY a strict, valid JSON object. No markdown, no code fences, no
  commentary, no explanation — JSON and nothing else.
- The JSON MUST match this exact schema:
  {
    "extractedData": [ { "name": "Exact Name Mentioned", "request": "The specific prayer request or derived relational note" } ],
    "habitUpdates": [ { "title": "Exact tracked-habit title from the provided list", "note": "Short note grounded in the text", "completed": true } ]
  }
- "name" must be the name exactly as it appears in the entry (e.g. "Marcus",
  "Marcus Bell", "Fresno Home Church"). Do not invent or normalize names.
- "request" must be a concise, specific request or note grounded in the text.
  Never fabricate details that are not present.
- For "habitUpdates": ONLY use titles that appear verbatim in the provided
  tracked-habits list. Never invent a habit or flag one that is not on the list.
  If no tracked-habits list is provided, return "habitUpdates": [].
- Habits belong to the JOURNAL'S AUTHOR (the user). ONLY include a habit when the
  entry says the USER themselves did or engaged with it — signalled by
  first-person language ("I", "me", "my", "myself") or by the user's own name
  (provided with the entry). If the action belongs to someone else (e.g. "Marcus
  went for a run"), DO NOT include that habit, even if its title matches.
- "completed" must be true ONLY when the entry clearly states the user DID the
  habit (e.g. "I prayed this morning", "got my run in"). If the entry only
  mentions wanting to, struggling with, or skipping the habit, set it to false.
- If a person is mentioned but no request/note can be derived, omit them.
- If nothing is found, return { "extractedData": [], "habitUpdates": [] }.`;

// --- Robust JSON parsing -----------------------------------------------------
// Gemini is asked for raw JSON, but we defensively strip stray code fences and
// validate the shape so a hallucinated response can never crash us.
function parseExtraction(raw) {
  if (!raw || typeof raw !== 'string') return { extractedData: [], habitUpdates: [] };
  let cleaned = raw.trim();

  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    // Last-ditch: grab the first {...} block and try again.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`Unparseable model output: ${cleaned.slice(0, 200)}`);
    parsed = JSON.parse(match[0]);
  }

  const people = Array.isArray(parsed?.extractedData) ? parsed.extractedData : [];
  const habits = Array.isArray(parsed?.habitUpdates) ? parsed.habitUpdates : [];
  return {
    extractedData: people
      .filter((it) => it && typeof it.name === 'string' && typeof it.request === 'string')
      .map((it) => ({ name: it.name.trim(), request: it.request.trim() }))
      .filter((it) => it.name && it.request),
    habitUpdates: habits
      .filter((it) => it && typeof it.title === 'string')
      .map((it) => ({
        title: it.title.trim(),
        note: typeof it.note === 'string' ? it.note.trim() : '',
        completed: it.completed === true,
      }))
      .filter((it) => it.title),
  };
}

// --- Self-reference gate -----------------------------------------------------
// Habits are the user's OWN practices, so a habit only connects to a journal
// entry when the entry is actually about the user: it contains a first-person
// reference ("I", "me", "my", …) OR the user's own name. This deterministic gate
// backs up the model's per-habit attribution (and lets us skip habit extraction
// entirely when there's no self-reference).

// First-person markers, matched as whole words (case-insensitive). Apostrophe
// contractions ("I'm", "I've") are caught by the bare "i" with a word boundary.
const FIRST_PERSON = /\b(i|me|my|mine|myself|i'm|i've|i'll|i'd)\b/i;

// Mirror of identity.js displayName(): "First Last" from the users/{uid} doc.
// (The function is CommonJS and can't import the client ESM util, so we rebuild
// the same name here.) Returns the names worth scanning for: full + first.
function userNamesOf(userDoc) {
  if (!userDoc) return [];
  const full = [userDoc.firstName, userDoc.lastName].filter(Boolean).join(' ').trim();
  return [full, (userDoc.firstName || '').trim()].filter((n) => n.length > 1);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasSelfReference(text, names = []) {
  if (FIRST_PERSON.test(text)) return true;
  return names.some((n) => new RegExp(`\\b${escapeRegex(n)}\\b`, 'i').test(text));
}

// --- Forgiving name matching -------------------------------------------------
// Tiered match against the user's OWN profiles (already uid-scoped by the
// caller, so isolation is preserved):
//   1. exact, case-insensitive full-name match;
//   2. token overlap — "Marcus" -> "Marcus Bell", "the Okafors" -> "The Okafors";
//      when several profiles share a token we pick the one with the MOST
//      overlapping tokens, and only if that best score is unambiguous (a single
//      clear winner) — ties are skipped so we never route to the wrong person.
// Returns the matched profile, or null.
function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s&]/g, '') // drop punctuation
    .trim();
}

function tokensOf(name) {
  return normalizeName(name)
    .split(/[\s&]+/)
    .filter((t) => t.length > 2); // ignore tiny words like "of", "&", initials
}

// Generic over the labeled field: profiles match on `name`, habits on `title`.
function matchByName(items, extractedName, nameOf = (it) => it.name) {
  const target = normalizeName(extractedName);
  if (!target) return null;

  // Tier 1 — exact (case-insensitive) full name.
  const exact = items.find((it) => normalizeName(nameOf(it)) === target);
  if (exact) return exact;

  // Tier 2 — token overlap, scored.
  const targetTokens = new Set(tokensOf(extractedName));
  if (targetTokens.size === 0) return null;

  let best = null;
  let bestScore = 0;
  let bestIsTie = false;

  for (const it of items) {
    const pTokens = tokensOf(nameOf(it));
    const score = pTokens.filter((t) => targetTokens.has(t)).length;
    if (score === 0) continue;
    if (score > bestScore) {
      best = it;
      bestScore = score;
      bestIsTie = false;
    } else if (score === bestScore) {
      bestIsTie = true; // another item is equally good -> ambiguous
    }
  }

  // Only accept an unambiguous winner.
  return best && !bestIsTie ? best : null;
}

// Today's date as a strict YYYY-MM-DD string, matching the client's
// getTodayLocal() (queueMath §3A). Cloud Functions run in UTC, so set the
// APP_TZ env var (e.g. "America/Los_Angeles") to pin completion stamps to the
// user's local calendar day; otherwise this falls back to the server's day.
function getTodayLocal() {
  const tz = process.env.APP_TZ;
  return new Date().toLocaleDateString('en-CA', tz ? { timeZone: tz } : undefined);
}

// --- Gemini call -------------------------------------------------------------
// `habitTitles` is the user's own tracked-habit titles; we hand them to the
// model so it only ever flags habits that actually exist (no invention).
async function extractWithGemini(text, habitTitles = [], userName = '') {
  const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });

  const whoLine = userName ? `\n\nThe journal's author (the user) is "${userName}".` : '';
  const contents =
    habitTitles.length > 0
      ? `Journal entry:\n${text}${whoLine}\n\nThe user's tracked habits (only flag these exact titles):\n${habitTitles
          .map((t) => `- ${t}`)
          .join('\n')}`
      : `Journal entry:\n${text}${whoLine}\n\nThe user has no tracked habits.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0, // deterministic extraction
      responseMimeType: 'application/json', // ask for raw JSON, not prose
    },
  });
  return parseExtraction(response.text);
}

// --- Queue-aware date diff ---------------------------------------------------
// Mirrors the client's daysBetween(). Uses local date objects (not UTC epoch
// subtraction) so DST transitions don't produce off-by-one results.
function daysDiff(lastClearedDate, todayStr) {
  if (!lastClearedDate) return Infinity;
  const [ly, lm, ld] = lastClearedDate.split('-').map(Number);
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const last = new Date(ly, lm - 1, ld);
  const today = new Date(ty, tm - 1, td);
  return Math.round((today - last) / 86400000);
}

// --- Shared: count overdue items for one user --------------------------------
// Used by both the morning and evening notification jobs. Returns the number of
// profiles + groups that surface in the daily queue using the same isDue logic
// as the client's generateDailyQueue (queueMath.js).
async function getOverdueCount(uid, today) {
  const [profilesSnap, groupsSnap] = await Promise.all([
    db.collection('profiles').where('uid', '==', uid).get(),
    db.collection('groups').where('uid', '==', uid).get(),
  ]);
  const isDue = (item) =>
    daysDiff(item.lastClearedDate, today) >= (item.priorityRate || 7);
  return (
    profilesSnap.docs.filter((d) => isDue(d.data())).length +
    groupsSnap.docs.filter((d) => isDue(d.data())).length
  );
}

// --- Shared: prune stale FCM tokens -----------------------------------------
async function pruneStaleTokens(uid, tokens, responses) {
  const staleTokens = responses
    .map((r, i) => (!r.success ? tokens[i] : null))
    .filter(Boolean);
  if (staleTokens.length > 0) {
    await db
      .collection('users')
      .doc(uid)
      .update({ fcmTokens: FieldValue.arrayRemove(...staleTokens) });
  }
}

exports.sendDailyQueueNotifications = onSchedule(
  { schedule: '0 8 * * *', timeZone: 'America/New_York' },
  async () => {
    const today = getTodayLocal();
    const usersSnap = await db.collection('users').get();

    for (const userDoc of usersSnap.docs) {
      const data = userDoc.data();
      const tokens = data.fcmTokens || [];
      if (tokens.length === 0) continue;
      // Respect explicit opt-out; treat missing/undefined as opted-in (backward compat).
      if (data.settings?.notificationsEnabled === false) continue;

      const uid = userDoc.id;
      const dueCount = await getOverdueCount(uid, today);
      if (dueCount === 0) continue;

      const body =
        dueCount === 1
          ? '1 person is waiting in your queue.'
          : `${dueCount} people are in your queue today.`;

      const response = await getMessaging().sendEachForMulticast({
        tokens,
        notification: { title: 'Your queue is ready', body },
      });

      await pruneStaleTokens(uid, tokens, response.responses);
    }
  }
);

exports.sendEveningQueueReminders = onSchedule(
  { schedule: '0 20 * * *', timeZone: 'America/New_York' },
  async () => {
    const today = getTodayLocal();
    const usersSnap = await db.collection('users').get();

    for (const userDoc of usersSnap.docs) {
      const data = userDoc.data();
      const tokens = data.fcmTokens || [];
      if (tokens.length === 0) continue;
      // Only send to users who explicitly opted in to evening reminders.
      if (data.settings?.eveningReminderEnabled !== true) continue;

      const uid = userDoc.id;
      const remaining = await getOverdueCount(uid, today);
      // Skip silently if queue is fully cleared.
      if (remaining === 0) continue;

      const body =
        remaining === 1
          ? '1 still waiting in your queue tonight.'
          : `${remaining} still waiting in your queue tonight.`;

      const response = await getMessaging().sendEachForMulticast({
        tokens,
        notification: { title: 'Before you rest', body },
      });

      await pruneStaleTokens(uid, tokens, response.responses);
    }
  }
);

// --- AI suggestion callable --------------------------------------------------
// Client calls this when the user taps "Suggest with AI" in the journal.
// Reads only — never writes to Firestore. Returns prayer-request suggestions
// matched to the user's profiles, and habit suggestions matched to active
// habits (gated by the same self-reference check as the trigger).
exports.suggestJournalEntities = onCall(
  { secrets: [geminiApiKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }
    const uid = request.auth.uid; // never trust uid from payload
    const { text } = request.data;
    if (!text || typeof text !== 'string' || !text.trim()) {
      throw new HttpsError('invalid-argument', 'text is required');
    }

    const [userSnap, profilesSnap, habitsSnap] = await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('profiles').where('uid', '==', uid).get(),
      db.collection('habits').where('uid', '==', uid).get(),
    ]);

    const profiles = profilesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const habits = habitsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const activeHabits = habits.filter((h) => h.status === 'active');

    // Same self-reference gate as the trigger — habits are the user's own
    // practices and only surface when the entry is about the user.
    const userNames = userNamesOf(userSnap.exists ? userSnap.data() : null);
    const selfReferenced = hasSelfReference(text, userNames);
    const habitTitles = selfReferenced ? activeHabits.map((h) => h.title).filter(Boolean) : [];

    const { extractedData, habitUpdates } = await extractWithGemini(
      text,
      habitTitles,
      userNames[0] || ''
    );

    // Match each extracted person to one of the user's profiles (uid-scoped).
    const suggestions = extractedData.map((item) => {
      const matched = matchByName(profiles, item.name);
      return {
        name: item.name,
        request: item.request,
        matchedProfileId: matched ? matched.id : null,
        matchedProfileName: matched ? matched.name : null,
      };
    });

    // Match each habit reference to one of the user's active habits.
    const habitSuggestions = (selfReferenced ? habitUpdates : []).map((update) => {
      const matched = matchByName(activeHabits, update.title, (h) => h.title);
      return {
        title: update.title,
        note: update.note,
        completed: update.completed,
        matchedHabitId: matched ? matched.id : null,
        matchedHabitTitle: matched ? matched.title : null,
      };
    });

    return { suggestions, habitSuggestions };
  }
);

exports.routeJournalEntry = onDocumentCreated(
  { document: 'journals/{journalId}', secrets: [geminiApiKey] },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const journal = snap.data() || {};
    const { uid, text, aiProcessed } = journal;
    const journalId = event.params.journalId;

    if (aiProcessed) return; // idempotent guard
    if (!uid || !text) {
      console.error('journal missing uid/text — marking error', { journalId });
      await snap.ref.update({ aiProcessed: 'error', aiError: 'missing uid or text' }).catch(() => {});
      return;
    }

    try {
      // -----------------------------------------------------------------------
      // GATED PATH — user confirmed their targets in the UI; skip Gemini.
      // -----------------------------------------------------------------------
      if (journal.gated === true) {
        const confirmedProfileIds = Array.isArray(journal.confirmedProfileIds)
          ? journal.confirmedProfileIds
          : [];
        const confirmedRequests = Array.isArray(journal.confirmedRequests)
          ? journal.confirmedRequests
          : [];
        const confirmedHabits = Array.isArray(journal.confirmedHabits)
          ? journal.confirmedHabits
          : [];

        const today = getTodayLocal();
        const linkedProfileIds = new Set();
        const linkedHabitIds = new Set();

        // Re-fetch profiles and habits with uid filter (isolation).
        const [profilesSnap, habitsSnap] = await Promise.all([
          db.collection('profiles').where('uid', '==', uid).get(),
          db.collection('habits').where('uid', '==', uid).get(),
        ]);
        const profiles = profilesSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
        const habits = habitsSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));

        // --- Route to confirmed profiles ---
        for (const profileId of confirmedProfileIds) {
          const profile = profiles.find((p) => p.id === profileId);
          if (!profile) {
            console.log(`[${journalId}] confirmed profile ${profileId} not found or not owned`);
            continue;
          }

          const profileRef = profile.ref;
          const stamp = FieldValue.serverTimestamp();

          // Append From-Journal log to the relational log.
          await profileRef.collection('logs').add({
            text,
            timestamp: stamp,
            fromJournal: true,
            journalId,
          });

          // Write any AI-confirmed requests for this profile.
          const profileRequests = confirmedRequests.filter((r) => r.profileId === profileId);
          for (const req of profileRequests) {
            await profileRef.collection('requests').add({
              text: req.text,
              isCompleted: false,
              createdAt: stamp,
              fromJournal: true,
              journalId,
            });
            await profileRef.update({ openRequestCount: FieldValue.increment(1) });
          }

          linkedProfileIds.add(profileId);
        }

        // --- Route to confirmed habits ---
        for (const confirmedHabit of confirmedHabits) {
          const habit = habits.find((h) => h.id === confirmedHabit.habitId);
          if (!habit) {
            console.log(`[${journalId}] confirmed habit ${confirmedHabit.habitId} not found or not owned`);
            continue;
          }

          const habitRef = habit.ref;

          await habitRef.collection('logs').add({
            text,
            note: confirmedHabit.note || '',
            timestamp: FieldValue.serverTimestamp(),
            fromJournal: true,
            completed: !!confirmedHabit.completed,
            journalId,
          });

          // Bump streak only when the user marked it done AND it isn't already
          // stamped for today (idempotent — never double-bumps).
          if (confirmedHabit.completed && habit.lastCompletedDate !== today) {
            await habitRef.update({
              lastCompletedDate: today,
              currentStreak: (habit.currentStreak || 0) + 1,
            });
          }

          linkedHabitIds.add(confirmedHabit.habitId);
        }

        await snap.ref.update({
          aiProcessed: true,
          linkedProfileIds: [...linkedProfileIds],
          linkedHabitIds: [...linkedHabitIds],
          processedAt: FieldValue.serverTimestamp(),
        });
        console.log(
          `[${journalId}] gated — routed to ${linkedProfileIds.size} profile(s), ${linkedHabitIds.size} habit(s)`
        );
        return;
      }

      // -----------------------------------------------------------------------
      // LEGACY PATH — no gated field; auto-route via Gemini (backward compat).
      // -----------------------------------------------------------------------

      // 1) Load THIS USER's account doc, profiles AND habits once (uid filter =
      //    isolation). Habit titles are fed to the model so it only flags real
      //    habits; the account doc gives us the user's name for the self gate.
      const [userSnap, profilesSnap, habitsSnap] = await Promise.all([
        db.collection('users').doc(uid).get(),
        db.collection('profiles').where('uid', '==', uid).get(),
        db.collection('habits').where('uid', '==', uid).get(),
      ]);
      const profiles = profilesSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
      const habits = habitsSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));

      // Self-reference gate: habits only connect when the entry is about the
      // user (first-person OR their own name). When it isn't, we don't even ask
      // the model about habits — saving tokens and ruling out false positives.
      const userNames = userNamesOf(userSnap.exists ? userSnap.data() : null);
      const selfReferenced = hasSelfReference(text, userNames);
      const habitTitles = selfReferenced ? habits.map((h) => h.title).filter(Boolean) : [];

      // 2) Extract with Gemini (people always; habits only when self-referenced).
      const { extractedData, habitUpdates } = await extractWithGemini(
        text,
        habitTitles,
        userNames[0] || ''
      );
      console.log(
        `[${journalId}] gemini extracted ${extractedData.length} person(s), ${habitUpdates.length} habit(s)` +
          (selfReferenced ? '' : ' (habits skipped — no self-reference)')
      );

      // 3) Route each extracted name to one of the user's profiles.
      const linkedProfileIds = new Set();

      for (const item of extractedData) {
        const profile = matchByName(profiles, item.name);
        if (!profile) {
          console.log(`[${journalId}] no profile match for "${item.name}"`);
          continue;
        }

        const profileRef = profile.ref;
        const stamp = FieldValue.serverTimestamp();

        // The derived prayer request.
        await profileRef.collection('requests').add({
          text: item.request,
          isCompleted: false,
          createdAt: stamp,
          fromJournal: true,
          journalId,
        });

        // Append a From-Journal entry to the relational log (design §6) and keep
        // the denormalized open-request counter in sync with the client UI.
        await profileRef.collection('logs').add({
          text,
          timestamp: stamp,
          fromJournal: true,
          journalId,
        });
        await profileRef.update({ openRequestCount: FieldValue.increment(1) });

        linkedProfileIds.add(profileRef.id);
      }

      // 4) Route each habit reference: append a From-Journal note to the habit's
      //    log, and — when the entry says it was done — mark it complete today
      //    (bump streak + stamp lastCompletedDate, mirroring toggleHabit).
      const today = getTodayLocal();
      const linkedHabitIds = new Set();

      // The self-reference gate also guards the writes themselves, so a stray
      // model response can never connect a habit to an entry that isn't the
      // user's own. (habitUpdates is already empty in that case; this is belt-
      // and-braces.)
      for (const update of selfReferenced ? habitUpdates : []) {
        const habit = matchByName(habits, update.title, (h) => h.title);
        if (!habit) {
          console.log(`[${journalId}] no habit match for "${update.title}"`);
          continue;
        }

        const habitRef = habit.ref;

        // Always log the mention so the journal is tied to the habit.
        await habitRef.collection('logs').add({
          text,
          note: update.note,
          timestamp: FieldValue.serverTimestamp(),
          fromJournal: true,
          completed: update.completed,
          journalId,
        });

        // Mark complete only if the model says it was done AND it isn't already
        // counted today (idempotent — never double-bumps the streak).
        if (update.completed && habit.lastCompletedDate !== today) {
          await habitRef.update({
            lastCompletedDate: today,
            currentStreak: (habit.currentStreak || 0) + 1,
          });
        }

        linkedHabitIds.add(habitRef.id);
      }

      // 5) Mark the journal processed.
      await snap.ref.update({
        aiProcessed: true,
        linkedProfileIds: [...linkedProfileIds],
        linkedHabitIds: [...linkedHabitIds],
        processedAt: FieldValue.serverTimestamp(),
      });
      console.log(
        `[${journalId}] routed to ${linkedProfileIds.size} profile(s), ${linkedHabitIds.size} habit(s)`
      );
    } catch (err) {
      // Robust failure handling: log loudly, mark 'error' so a bad/hallucinated
      // response or API outage never loops or crashes silently.
      console.error(`[${journalId}] journal routing failed:`, err);
      await snap.ref
        .update({ aiProcessed: 'error', aiError: err.message || 'unknown error' })
        .catch((markErr) => console.error(`[${journalId}] failed to mark error:`, markErr));
    }
  }
);
