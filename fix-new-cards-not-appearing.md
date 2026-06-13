# Bug: Newly created People and Acquaintances don't appear in the UI

## Symptom

After adding a Person (Network tab) or an Acquaintance (Circle tab), the new card does NOT
appear in the list. The Acquaintances list still shows "No acquaintances yet — add your first
one above." and "People & requests" still shows its empty state. The write may be reaching
Firestore, but the live UI never updates.

## What I (the human) already verified — do NOT re-investigate these, they are correct

- `src/main.jsx`: `<DataProvider>` wraps `<App/>` above the Router, so it never unmounts on tab
  navigation. Good.
- `src/context/DataContext.jsx`: `watchProfiles → setProfiles` and `watchAcquaintances →
  setAcquaintances` are wired correctly; the `useEffect([user])` subscribes all listeners.
- `src/firebase/db.js`: the writers (`addProfile`, `addAcquaintance`) stamp a `uid` field, and
  the listener queries (`watchOwned`) filter on `where('uid','==',uid)` — the field names match.
- The page-level empty-state conditions (`acquaintances.length === 0`, `profiles.filter(p =>
  !p.groupId)`) are correct.

So the React data flow is logically sound. The failure is almost certainly a **silently
swallowed Firestore error** (a rejected write or a denied/failed listen), because the code has
no error surface. This task is: expose the real error, diagnose it, and fix it.

## Context

React 18 + Vite, Firebase/Firestore (`initializeFirestore` with `persistentLocalCache` +
`persistentMultipleTabManager` in `src/firebase/config.js`), React Context state (no Redux).
Follow ARCHITECTURE.md. Security rules live in `firestore.rules`.

## Step 1 — Un-mask the errors (do this first, it makes the cause visible)

### 1a. Add an error callback to every `onSnapshot` listener

In `src/firebase/db.js`, the generic watcher swallows listen failures:

```js
function watchOwned(name, uid, cb) {
  const q = query(collection(db, name), where('uid', '==', uid));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
```

Add an error handler so a denied/failed listen is logged loudly instead of leaving the array
empty forever:

```js
function watchOwned(name, uid, cb) {
  const q = query(collection(db, name), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error(`[watchOwned:${name}] listen failed:`, err.code, err.message)
  );
}
```

Apply the same third-argument error callback to the OTHER `onSnapshot` calls in `db.js`
(`watchUserDoc`, `watchRequests`, `watchLogs`, `watchHabitLogs`, `watchUpdates`,
`watchJournalEntries`, `watchDailyNote`) — log `err.code` and `err.message` with a clear prefix.

### 1b. Make the create actions await + surface failures

The form submit handlers fire-and-forget the write, so a rejected write looks like success.
In `src/components/CardForms.jsx`, make `PersonForm` and `AcquaintanceForm` `submit` handlers
`async`, `await` the `onSubmit(...)` call inside a `try/catch`, and on error: (a) `console.error`
the failure, and (b) render an inline error message (use existing `#B4502F` color styling — do
NOT use `alert()`), and (c) do NOT clear the form fields when the write failed. Only reset the
form on success.

Keep the change minimal and shared-safe — `onSubmit` may return a promise (create) or be a sync
update (edit); `await` handles both (awaiting a non-promise is a no-op).

## Step 2 — Reproduce and read the real error

Run the app (`npm run dev`), open the browser devtools Console, sign in, and add one Person and
one Acquaintance. You will now see exactly one of these:

- **`permission-denied` on a `create`** (from the form catch in 1b): the WRITE is being rejected
  → go to Step 3a.
- **`permission-denied` / `failed-precondition` on a listen** (from `[watchOwned:...]` in 1a):
  the READ/LIST subscription is being rejected → go to Step 3a (rules) / 3b (index).
- **No Firestore error, write succeeds, doc visible in Firebase console, but listener never logs
  the new doc**: go to Step 3c (client cache / subscription).

Report which case occurred before applying a fix.

## Step 3 — Fix based on the actual error

### 3a. Permission denied (most likely)

The `firestore.rules` in the repo look correct (`allow create: if ownsIncoming()`,
`allow read: if ownsExisting()`, and the `where('uid','==',uid)` queries satisfy the `list`
rule). The likely problem is that the rules are **not deployed**, or the live project is running
different/locked rules.

- Confirm the deployed rules match the repo: `firebase deploy --only firestore:rules`
  (and verify the active project with `firebase use`).
- Double-check `firebase.json` points `firestore.rules` at the correct file.
- If a write is rejected despite correct rules, log `request.resource.data` and confirm the
  `uid` field equals `request.auth.uid` (it should — `addProfile`/`addAcquaintance` set
  `uid: user.uid`). Confirm the user is actually authenticated (`auth.currentUser` non-null) at
  write time.

### 3b. Failed-precondition (missing index) on a listen

`watchProfiles`/`watchAcquaintances` use a single `where` with no `orderBy`, so they need no
composite index. But `watchJournalEntries` uses `where('uid','==') + orderBy('timestamp')`. If
the failing listener is one with `where + orderBy`, create the composite index Firestore's error
links to (or add it to `firestore.indexes.json` and deploy). This should NOT affect profiles or
acquaintances, but confirm which listener logged the error.

### 3c. Write succeeds but listener never delivers (client cache / subscription)

If the doc is confirmed in the Firebase console but the listener never fires for it:

- Check the `persistentMultipleTabManager` setup in `src/firebase/config.js`. Multi-tab
  persistence can wedge if IndexedDB is unavailable (Safari private mode) or if multiple tabs
  conflict. Temporarily switch to `persistentLocalCache({})` (single-tab) or `memoryLocalCache()`
  and retest. If it works, the multi-tab manager + environment was the cause; decide whether to
  keep single-tab cache or guard initialization.
- Confirm React 18 StrictMode double-mount isn't tearing down the listener: the
  `useEffect([user])` cleanup in `DataContext.jsx` should unsubscribe and the re-mount should
  re-subscribe. Verify the listeners are live after mount settles (add a temporary log in the
  snapshot callback counting docs received).
- Confirm there is only ONE `DataProvider` and all pages import `useData` from the same
  `src/context/DataContext.jsx` (no duplicate context module).

## Acceptance criteria

- Adding a Person on the Network tab makes them appear immediately under "People & requests" and
  surface in the Daily Queue.
- Adding an Acquaintance on the Circle tab makes them appear immediately in the Acquaintances list.
- Any future Firestore listen failure logs a clear `err.code`/`err.message` to the console.
- Any failed create surfaces an inline error in the form and does NOT clear the user's input.
- No new state libraries; rules/index changes deployed; ARCHITECTURE.md conventions preserved.

## Files likely touched

- `src/firebase/db.js` — onSnapshot error callbacks.
- `src/components/CardForms.jsx` — async/await + inline error + no-reset-on-failure.
- `firestore.rules` / `firestore.indexes.json` + a deploy — only if Step 2 shows a rules/index error.
- `src/firebase/config.js` — only if Step 3c implicates the multi-tab cache.

Start with Step 1, run Step 2, and report the actual error before applying a Step 3 fix.
