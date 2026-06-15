# Claude Code Prompt — Journal tab: live "Aura noticed" + entry delete

You are working in the **Aura Brain 2** repo (React 18 + Vite, Firebase, Firestore offline-first). Read `ARCHITECTURE.md` first and obey it: serif typography, mobile-first Tailwind, React Context + custom hooks only (no Redux/Zustand), strict `YYYY-MM-DD` local date strings, and **AI never runs client-side** — it runs in Cloud Functions.

This task fixes two problems in the Journal tab:

1. The **"Aura noticed"** panel in `src/components/JournalCapture.jsx` is dead UI. It renders from a `draft` prop (`detected` + `entities`) that `src/pages/JournalPage.jsx` never supplies, so it always shows empty. Today, routing happens *automatically* server-side in `functions/index.js → routeJournalEntry` with **no confirmation step**.
2. **Past entries cannot be deleted.** `src/components/JournalHistory.jsx` is read-only; there is no `deleteJournalEntry` in `db.js` or `DataContext.jsx`, and no delete control.

## Decisions already made (do not re-litigate)

- **Detection = hybrid.** Instant client-side name-matching against the user's own profiles, groups, AND habits, PLUS an optional "Suggest with AI" button that calls a new HTTPS-callable Cloud Function for prayer-request suggestions and habit-completion detection. Local matching is plain string matching (NOT AI) and is allowed client-side; all Gemini calls stay in functions.
- **Confirm-to-route gate — people AND habits.** A note ties to a person, group, OR habit ONLY if the user checks it in "Aura noticed". The journal doc carries the confirmed selections; the trigger honors them instead of auto-matching anything. This replaces today's autonomous habit routing (the self-reference gate + auto-streak-bump) with explicit user confirmation.
- **Cascade delete.** Deleting a past entry also removes every request/log that entry created (the ones stamped with its `journalId`), and decrements `openRequestCount` accordingly.

Keep all existing behavior that isn't explicitly changed below (notifications, etc.). Note: habit routing IS explicitly changed — it becomes confirm-gated like people.

---

## FEATURE A — Make "Aura noticed" a real confirm-before-route gate

### A1. New client util: `src/utils/entityDetection.js`
Pure, synchronous, no AI. Export `detectEntities(text, profiles, groups, habits)` returning an array of matched entities:
`{ id, kind: 'profile' | 'group' | 'habit', name, initial }`. For habits, match on the habit `title` (and only `status === 'active'` habits).

- Reuse the same normalization/token approach as `functions/index.js` (`normalizeName`, `tokensOf`: lowercase, strip punctuation, split on whitespace/`&`, drop tokens ≤2 chars).
- An entity matches if **all** of its significant name tokens appear as whole-word tokens in the journal text, OR the full normalized name appears as a substring of the normalized text. Match case-insensitively. Avoid false positives on 1–2 char tokens.
- Dedupe by id. Keep it fast — this runs on every (debounced) keystroke.
- Add a unit test `test/entityDetection.test.js` mirroring the style of `test/queueMath.test.js` (exact match, partial "Marcus" → "Marcus Bell", no-match, group names, habit-title match, punctuation).

### A2. New HTTPS-callable Cloud Function: `suggestJournalEntities` in `functions/index.js`
- Use `onCall` from `firebase-functions/v2/https`, with `secrets: [geminiApiKey]`. Enforce `request.auth` (throw `HttpsError('unauthenticated', …)` if missing). Use `request.auth.uid` as the uid — never trust a uid from the payload.
- Input: `{ text }`. Reject empty text.
- Load that uid's profiles AND habits (uid-filtered, same isolation pattern as the trigger). Run Gemini reusing the **existing extraction logic** (`extractWithGemini` / `parseExtraction` / `matchByName`). Apply the existing self-reference gate (`hasSelfReference` + `userNamesOf` from the user doc) to decide whether to pass `habitTitles` — same as the trigger does today — so habit suggestions only appear when the entry is about the user.
- For each extracted person, run `matchByName` against profiles; for each `habitUpdate`, run `matchByName` against habits. Return:
  ```
  {
    suggestions: [ { name, request, matchedProfileId: string|null, matchedProfileName: string|null } ],
    habitSuggestions: [ { title, note, completed: boolean, matchedHabitId: string|null, matchedHabitTitle: string|null } ]
  }
  ```
- **This function only reads and returns — it must NOT write anything to Firestore** (no logs, no streak bumps). All writing happens later, on save, gated by user confirmation.

### A3. Export callable client in `src/firebase/config.js`
Add `getFunctions` and export `functions` (e.g. `export const functions = getFunctions(app);`). The existing 2nd-gen functions use the default region (`us-central1`); keep the callable in the same region so no region arg is needed. Confirm by checking `firebase.json` / deployed region before assuming.

### A4. Rework `src/components/JournalCapture.jsx`
The panel must reflect **live local detection** plus **optional AI suggestions**, all confirm-gated.

- Accept new props from the page: `profiles`, `groups`, `habits`, and `analyzeDraft` (async fn that calls the callable). Keep `draft` support for backward compat but it's no longer required.
- **Local detection:** on `text` change, debounce ~400ms, call `detectEntities(text, profiles, groups, habits)`. Render `profile`/`group` results as the "Logging this note to" chips, and `habit` results in a separate **"Habits mentioned"** sub-section. Each chip/row is a **toggle that starts UNCHECKED** — consistent with the existing copy "Nothing reaches a profile without your nod." A note routes only to checked entities. Visually distinguish checked vs unchecked (reuse the existing green-confirmed / neutral styling).
- **Habit completion toggle:** each detected/suggested habit row needs a **second control: "mark done today?"** (a small toggle, default OFF). Checking the habit row ties the note to that habit's log; additionally turning ON "done today" is what bumps the streak + stamps `lastCompletedDate` on save. A habit can be checked (logged) without being marked done. Keep this visually quiet and serif.
- **AI suggestions:** add a subtle "Suggest with AI" button inside the "Aura noticed" panel (lucide `Sparkles`, serif, understated). On tap: set a loading state, call `analyzeDraft(text)`, then:
  - populate the "Prayer requests" list from `suggestions` — each a checkable row showing the request text and which person it's for (`matchedProfileName`, or "no match in your network" when `matchedProfileId` is null — disabled/greyed, can't route);
  - populate/augment the "Habits mentioned" rows from `habitSuggestions` (merge with locally-detected ones by `matchedHabitId`; pre-fill the "done today?" toggle from the suggestion's `completed`, but leave it user-editable). Habit suggestions with `matchedHabitId === null` are shown disabled/greyed.
  - Handle errors gracefully (inline "Couldn't reach Aura — try again", never crash).
- Replace the single-subject assumption (`subjectName` / `subjectFullName`) with the per-suggestion person label. The "Prayer requests · for {subjectName}" header should become per-person or a generic "Suggested prayer requests".
- `handleSave` must emit the confirmed selections:
  ```
  onSave({
    text,
    confirmedProfileIds,                 // checked profile chips (kind === 'profile')
    confirmedGroupIds,                   // checked group chips (kind === 'group')
    confirmedRequests,                   // checked AI suggestions WITH a matchedProfileId:
                                         //   [{ profileId, text }]
    confirmedHabits,                     // checked habit rows:
                                         //   [{ habitId, completed: boolean, note: string }]
  })
  ```
- Keep the existing "Saved & routed" confirmation screen, but drive its summary from the confirmed selections (count of confirmed requests + names of confirmed entities + habits marked done) instead of the old static `entities`/`detected`.

### A5. Wire `src/pages/JournalPage.jsx`
- Pass `profiles`, `groups`, `habits`, and an `analyzeDraft` callback (wrapping `httpsCallable(functions, 'suggestJournalEntities')`) into `JournalCapture`. Pull `habits` from `useData()` (already available).
- Update `onSave` to forward the confirmed payload into `addJournalEntry` (see A6). Remove the stale comment claiming the panel is "illustrative".

### A6. Update `addJournalEntry` in `src/firebase/db.js`
Change signature to accept the confirmed payload and persist it on the journal doc:
```
addJournalEntry(uid, { text, confirmedProfileIds = [], confirmedGroupIds = [], confirmedRequests = [], confirmedHabits = [] })
```
Write these fields plus `gated: true` on the doc (alongside existing `aiProcessed:false`, `linkedProfileIds:[]`, `linkedHabitIds:[]`). Update the `DataContext` binding `addJournalEntry` accordingly. `gated: true` is the signal the trigger uses to switch from auto-routing to confirm-routing.

### A7. Update `routeJournalEntry` in `functions/index.js` to honor the gate
- If `journal.gated === true`:
  - **Do NOT run any Gemini extraction** (both people AND habit routing are now user-confirmed). Skip the self-reference gate and `extractWithGemini` entirely for gated entries.
  - **People:** route ONLY to `confirmedProfileIds`. For each confirmed profile (re-fetch/validate it belongs to this uid):
    - append a From-Journal **log** (`{ text, timestamp, fromJournal:true, journalId }`),
    - write any `confirmedRequests` whose `profileId` matches as a **request** (`{ text, isCompleted:false, createdAt, fromJournal:true, journalId }`) and `increment(openRequestCount)` once per request written.
    - Set `linkedProfileIds` to the confirmed profiles actually written.
  - **Habits:** route ONLY to `confirmedHabits`. For each (re-fetch/validate the habit belongs to this uid):
    - append a From-Journal **log** to `habits/{id}/logs` (`{ text, note, timestamp, fromJournal:true, completed, journalId }`),
    - if `completed === true` AND `habit.lastCompletedDate !== today`, mark complete exactly like the existing code: `lastCompletedDate = today`, `currentStreak = (currentStreak||0) + 1` (idempotent — never double-bump).
    - Set `linkedHabitIds` to the confirmed habits actually written.
- If `gated` is falsy (legacy entries): keep the current auto-routing behavior exactly as-is (self-reference gate + Gemini people + habit extraction).
- Preserve all existing idempotency (`aiProcessed` guard), error handling, and uid isolation. The autonomous habit code path (self-reference gate, `habitUpdates` extraction) stays in the file — it's only bypassed for gated entries.

---

## FEATURE B — Delete past journal entries (cascade)

### B1. New `deleteJournalEntry(entry)` in `src/firebase/db.js`
Accept the full entry object (has `id`, `linkedProfileIds`, `linkedHabitIds`). Do NOT use collection-group queries — iterate the known linked IDs:
- For each `profileId` in `entry.linkedProfileIds`:
  - query `profiles/{profileId}/requests where journalId == entry.id` → delete each; count how many had `isCompleted === false`.
  - query `profiles/{profileId}/logs where journalId == entry.id` → delete each.
  - `updateDoc(profile, { openRequestCount: increment(-openCount) })` where `openCount` = number of *open* (incomplete) requests removed (completed ones were already decremented when completed — do NOT double-decrement).
- For each `habitId` in `entry.linkedHabitIds`: delete `habits/{habitId}/logs where journalId == entry.id`. (Do not alter habit streaks — reverting a streak from a deleted journal is out of scope.)
- Batch deletes (chunk if a batch exceeds 500 ops). Finally `deleteDoc(journals/{entry.id})`.
- Firestore rules already allow these deletes (`journals` delete via `ownsExisting`; subcollection writes via `parentOwned`/`habitParentOwned`). **No rules changes needed** — verify but don't edit unless a deploy proves otherwise.

### B2. Expose in `src/context/DataContext.jsx`
Add `deleteJournalEntry: (entry) => dbApi.deleteJournalEntry(entry)` to the actions object.

### B3. Delete UI in `src/components/JournalHistory.jsx`
- Add a small delete control to each `EntryCard` (lucide `Trash2`, understated, serif aesthetic, top-right or on a swipe — match the app's swipe-to-clear pattern if practical, otherwise a tap target).
- Because cascade is destructive, require an explicit **confirm step** inline (e.g. tap → "Delete this entry and N linked notes?" with Confirm / Cancel). Compute N from `entry.linkedProfileIds.length` (+ linked habits) so the user sees the blast radius.
- Call `deleteJournalEntry(entry)` from `useData()`. The live `onSnapshot` will drop the card automatically; add an optimistic collapse transition if easy, but don't hand-roll local list state that fights the listener.
- Keep the empty-state copy.

---

## Constraints & non-goals
- Do not introduce new state libraries, UI frameworks, or backend providers.
- Do not run Gemini or any AI on the client — the only AI path is the `onCall` function.
- Keep serif typography and the existing warm color tokens; match current Tailwind class style.
- Do not change notification functions or unrelated screens.

## Verification (do all of these)
1. `npm run build` (root) succeeds; `cd functions && npm run build`/lint if configured.
2. Run the new `test/entityDetection.test.js` and existing `test/queueMath.test.js` — all green.
3. Trace the gated path by reading the code end-to-end: confirmed-only people get logs/requests and confirmed-only habits get logs; unconfirmed people/habits get nothing; a habit's streak bumps only when its "done today" flag is true and it wasn't already completed today.
4. Confirm legacy (non-`gated`) journals still auto-route both people and habits (backward compat).
5. Confirm cascade delete removes exactly the `journalId`-stamped requests/logs (profile AND habit logs) and decrements `openRequestCount` only for open requests.
6. Provide a short manual test script: write an entry mentioning a known profile and a tracked habit, leave both unchecked → verify nothing routes; check the profile and the habit (mark it done) → verify the profile log/request, the habit log, and the streak bump appear; then delete the entry → verify the request and both logs disappear and the count drops.

## Suggested commit slices
1. Client local detection util + test.
2. Callable function + config export.
3. JournalCapture/JournalPage rework + `addJournalEntry` fields.
4. `routeJournalEntry` gate handling.
5. Cascade delete (db + context + JournalHistory UI).

Work in small, reviewable commits. Ask before deploying functions or changing Firestore rules.
