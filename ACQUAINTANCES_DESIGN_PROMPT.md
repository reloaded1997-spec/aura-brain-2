# Acquaintances — Feature Design & Claude Code Prompt

A new fourth entity type alongside **People**, **Groups**, and **Habits**. Acquaintances are lighter-weight relationship cards — for friends you know less well, or friends-of-friends — that live on their own screen, can *optionally* surface in the Daily Queue, carry a reverse-chronological "Updates" feed, and can be tagged to People so they show up as **connections** on those People's profiles.

This document is two parts: the **design** (decisions, schema, data flow), and a copy-paste **Claude Code prompt** at the end.

---

## Part 1 — Design

### Decisions locked in
- **Home:** acquaintances live in **both** places — a new fifth bottom-nav tab (`Queue · Network · Acquaintances · Journal · Search`) **and** inside the existing **Network** tab. Network gets a fourth `Acquaintance` segment in its create control plus an "Acquaintances" list section; the dedicated tab is the fuller standalone home. Both surface the same data and route to the same detail page, so they never drift.
- **Queue behavior:** opt-in. An acquaintance only surfaces in the Daily Queue when `inQueue` is true, on its own cadence. When it surfaces, it renders **mixed in with people** in the standalone-profile list (a subtle marker distinguishes it), not in a separate section.
- **Detail:** a **light detail page** (its own route). Name, an optional descriptor, a queue/cadence pill, the reverse-chron **Updates** feed with an add-input pinned at the top, and a **Connections** list of linked People. Deliberately simpler than a Person — no Active Requests, no separate Notes field, no relational-log split.

### Why this shape fits the existing architecture
Acquaintances reuse the load-balancer contract verbatim: a `priorityRate` (3/7/14/30 days) + a `lastClearedDate` (strict `YYYY-MM-DD`), evaluated by the same `evaluateDue` rule (`today − lastClearedDate ≥ priorityRate`). The Updates feed is the same pattern as the existing Relational Log (`orderBy('timestamp', 'desc')` — newest stays on top, older sink). Connections are a single `linkedProfileIds` array on the acquaintance doc, read in **both** directions (the acquaintance shows its People; each Person shows the acquaintances pointing at it) — no denormalization, no two-way write to keep in sync.

### Firestore schema (new)

```
acquaintances/{acqId}: {
  uid,                       // owner — matches the security-rule pattern
  name,                      // "Sarah's brother Mike"
  descriptor,                // optional one-liner: "met at the men's retreat"
  inQueue:        boolean,   // opt-in to the Daily Queue
  priorityRate:   number,    // cadence in days (3|7|14|30); only meaningful when inQueue
  lastClearedDate: string|null,   // YYYY-MM-DD; null => surfaces immediately when inQueue
  linkedProfileIds: string[],     // ids of profiles (kind: 'person') this connects to
  createdAt
}
  // Subcollection — the reverse-chron feed:
  acquaintances/{acqId}/updates/{updateId}: { text, timestamp }
```

No `requests`, no `notes`, no `openRequestCount` — that simplicity is the point.

### Data flow at a glance
- `DataContext` gains a live `acquaintances` array (one more `onSnapshot`) plus actions `addAcquaintance / updateAcquaintance / deleteAcquaintance / clearAcquaintance`. The `updates` subcollection is subscribed per-screen (like `requests`/`logs`), not globally.
- `generateDailyQueue` takes acquaintances as a new **trailing optional** arg, evaluates only the `inQueue` ones, and folds the due ones into the existing standalone-profile list — each tagged `entity: 'acquaintance'` so the queue knows how to clear/open it.
- The **Queue** routes a completed/opened acquaintance to `clearAcquaintance` / `/acquaintance/:id` (vs. `clearProfile` / `/profile/:id` for people); a quick note from the queue card appends to its **Updates** feed.
- **Person profiles** read `acquaintances` from context, filter by `linkedProfileIds.includes(profile.id)`, and render a tappable **Connections** section.

### Files touched
**New:** `src/pages/AcquaintancesPage.jsx`, `src/pages/AcquaintanceDetailPage.jsx`, `src/components/AcquaintanceDetail.jsx`.
**Edited:** `firestore.rules`, `src/firebase/db.js`, `src/context/DataContext.jsx`, `src/utils/queueMath.js`, `src/utils/display.js`, `src/components/CardForms.jsx`, `src/components/EditCardModal.jsx`, `src/components/Navigation.jsx`, `src/pages/DashboardPage.jsx`, `src/pages/NetworkPage.jsx`, `src/components/ProfileDetail.jsx`, `src/pages/ProfilePage.jsx`, `src/App.jsx`.

### Edge cases to honor
- An acquaintance with `inQueue: false` is **never** evaluated by the load balancer (skip before `evaluateDue`).
- Deleting an acquaintance must batch-delete its `updates` subcollection first (Firestore doesn't cascade), exactly like `deleteProfile` sweeps `requests`/`logs`.
- Deleting a **Person** should not corrupt acquaintance connections: a stale id left in `linkedProfileIds` simply resolves to nothing and is filtered out at render time. (Optionally sweep it; not required.)
- The cadence picker is only shown/active when `inQueue` is on.

---

## Part 2 — Claude Code Prompt

> Copy everything below the line into Claude Code.

---

## CONTEXT

You are working on **"Aura Brain 2"**, a React 18 + Vite + Firebase PWA — a personal prayer tracker and relationship CRM. The full architecture is in `ARCHITECTURE.md`. **Read it before touching anything.**

Hard rules (do not violate):
- Styling: **Tailwind only**. Icons: **`lucide-react`**. Display type: `font-['Newsreader']`. Palette: bg `#FAF8F3`, primary text `#1F1D18`/`#26241F`, muted `#9A958A`/`#6F6A60`, borders `#EBE6DC`/`#E2DCD0`, warm accent `#A8845C`, green `#5F7F67`.
- **No Redux/Zustand.** State = React Context + hooks only.
- **All Firestore reads/writes go through `src/firebase/db.js`.** No component imports `firebase/firestore` directly.
- **Date engine:** every daily date is a strict local `YYYY-MM-DD` string via the existing helpers. Never use UTC timestamps for day math.
- Mobile-first; default classes target mobile, `md:` only for desktop scaling.

Read these files **in full** before writing code, and mirror their patterns exactly:
- `src/firebase/db.js` (esp. `addProfile`, `deleteProfile`, `clearProfile`, `watchLogs`, `addLog`, `watchOwned`)
- `src/context/DataContext.jsx`
- `src/utils/queueMath.js` (esp. `generateDailyQueue`, `evaluateDue`)
- `src/utils/display.js` (esp. `decorateProfile`, `priorityLabelFromRate`)
- `src/components/CardForms.jsx`, `src/components/EditCardModal.jsx`
- `src/pages/DashboardPage.jsx`, `src/components/ProfileCard.jsx`
- `src/pages/ProfilePage.jsx`, `src/components/ProfileDetail.jsx`
- `src/components/Navigation.jsx`, `src/App.jsx`, `firestore.rules`

## GOAL

Add a fourth entity type, **Acquaintances** — lighter relationship cards for people you know less well or friends-of-friends. They live on a new bottom-nav tab, can *optionally* surface in the Daily Queue on their own cadence, carry a reverse-chronological **Updates** feed, and can be tagged to People where they appear as **Connections**.

---

## TASK 1 — Firestore schema + security rules

New collection `acquaintances/{acqId}` with subcollection `updates/{updateId}`:

```
acquaintances/{acqId}: {
  uid, name, descriptor,
  inQueue: boolean,
  priorityRate: number,        // 3|7|14|30, only used when inQueue
  lastClearedDate: string|null,
  linkedProfileIds: string[],
  createdAt
}
acquaintances/{acqId}/updates/{updateId}: { text, timestamp }
```

In `firestore.rules`, add a block that **mirrors the `profiles` block exactly** — `read, delete: ownsExisting()`, `create: ownsIncoming()`, `update: ownsExisting() && ownsIncoming()`, and an `updates` subcollection guarded by a transitive `parentOwned()` check against `acquaintances/$(acqId)` (copy the profiles pattern, swapping the path segment).

## TASK 2 — `src/firebase/db.js`

Add, mirroring the profile/log helpers:

```js
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
    uid, name, descriptor,
    inQueue: Boolean(inQueue),
    priorityRate: Number(priorityRate),
    linkedProfileIds: linkedProfileIds || [],
    lastClearedDate: null,
    createdAt: serverTimestamp(),
  });
}

export function updateAcquaintance(acqId, patch) {
  return updateDoc(doc(db, 'acquaintances', acqId), normalizeAcquaintancePatch(patch));
}

export function clearAcquaintance(acqId) {
  return updateDoc(doc(db, 'acquaintances', acqId), { lastClearedDate: getTodayLocal() });
}

// Batch-delete the updates subcollection first, then the doc — Firestore does
// not cascade. Mirror deleteProfile.
export async function deleteAcquaintance(acqId) {
  const batch = writeBatch(db);
  const snap = await getDocs(collection(db, 'acquaintances', acqId, 'updates'));
  snap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'acquaintances', acqId));
  return batch.commit();
}

// Updates feed — newest first, exactly like watchLogs.
export function watchUpdates(acqId, cb) {
  const q = query(collection(db, 'acquaintances', acqId, 'updates'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export function addUpdate(acqId, text) {
  return addDoc(collection(db, 'acquaintances', acqId, 'updates'), {
    text, timestamp: serverTimestamp(),
  });
}
```

## TASK 3 — `src/context/DataContext.jsx`

1. Add `const [acquaintances, setAcquaintances] = useState([])`; reset to `[]` in the signed-out branch.
2. Add `dbApi.watchAcquaintances(user.uid, setAcquaintances)` to the `unsubs` array.
3. Add actions: `addAcquaintance: (data) => dbApi.addAcquaintance(user.uid, data)`, plus `updateAcquaintance`, `deleteAcquaintance`, `clearAcquaintance` (bound like the profile equivalents).
4. Include `acquaintances` in the context `value`.

## TASK 4 — `src/utils/queueMath.js`

Extend `generateDailyQueue` to evaluate acquaintances **without breaking the existing signature or tests**. Add acquaintances as a **trailing optional** parameter:

```js
export function generateDailyQueue(profiles = [], groups = [], todayStr = getTodayLocal(), acquaintances = []) {
```

- Tag each existing due standalone profile object with `entity: 'profile'`.
- After the standalone-profile loop, loop acquaintances; **skip any where `inQueue !== true`**; run the same `evaluateDue`; push due ones into the **same `dueProfiles` array** as objects shaped like the profile entries but with `entity: 'acquaintance'` (include `id`, `name`, `priorityRate`, `lastClearedDate`, `daysSince`, `reason`).
- The existing overdue sort then orders people + acquaintances together. `totalDue` already derives from array lengths.

## TASK 5 — `src/utils/display.js`

Add a decorator mirroring `decorateProfile`:

```js
export function decorateAcquaintance(a) {
  if (!a) return a;
  return {
    ...a,
    initial: initialOf(a.name),
    kind: 'acquaintance',
    sub: a.descriptor || '',
    priorityLabel: priorityLabelFromRate(a.priorityRate),
    cycleLabel: cycleLabelFromRate(a.priorityRate),
    requestCount: 0,
  };
}
```

## TASK 6 — `src/components/CardForms.jsx`

Add an `AcquaintanceForm` mirroring `PersonForm`'s API (`mode`, `initial`, `onSubmit`, `submitLabel`). Fields:
- **Name** (required) and **Descriptor** (optional) — same inputs/classes as PersonForm.
- **Surface in Daily Queue** — a toggle/checkbox bound to `inQueue`.
- **Cycle** — `<RateSelect>`, rendered **only when `inQueue` is true**.
- **Connections** — a `profiles`-driven control to pick linked People. Accept a `profiles` prop; show only `kind === 'person'` profiles; let the user toggle multiple ids into a `linkedProfileIds` array (simple checkbox list or multi-select styled with `fieldCls`).

Submit payload: `{ name, descriptor, inQueue, priorityRate, linkedProfileIds }`. Reset on `mode === 'create'`.

## TASK 7 — `src/components/EditCardModal.jsx`

Extend to support `type === 'acquaintance'`:
- `TITLES.acquaintance = 'Edit acquaintance'`.
- Render `<AcquaintanceForm mode="edit" initial={record} profiles={profiles} onSubmit={handleSubmit} />`.
- `handleSubmit` → `updateAcquaintance(record.id, payload)`.
- `handleDelete` → `deleteAcquaintance(record.id)`.
- Delete warning: e.g. *"'{name}' and all of its updates will be permanently removed. This can't be undone."*

## TASK 8 — Navigation (`src/components/Navigation.jsx`)

Add a fifth nav item **between Network and Journal**:
- `NAV_ITEMS`: `{ key: 'acquaintances', label: 'People+', Icon: Contact }` (import `Contact` from `lucide-react`; pick a label ≤ 7 chars that reads well — `People+` or `Circle`).
- `NAV_PATHS.acquaintances = '/acquaintances'`.
- Confirm five `flex-1` items still fit a ~380px mobile bar (they do; sizes are fine).

## TASK 9 — Routes (`src/App.jsx`)

Add two protected routes:
- `/acquaintances` → `AcquaintancesPage`
- `/acquaintance/:id` → `AcquaintanceDetailPage`

## TASK 10 — `src/pages/AcquaintancesPage.jsx` (new)

The list home (5th tab). Mirror `NetworkPage`'s structure and styling:
- Header eyebrow "Your circle" + title (e.g. "Acquaintances").
- A create card hosting `<AcquaintanceForm onSubmit={addAcquaintance} profiles={profiles} />`.
- A list section of all acquaintances using a `Row`-style item (reuse NetworkPage's Row pattern): round avatar with `initialOf(name)`, name, and a sub line — show `descriptor` and, when `inQueue`, `· every N days`; when not in queue show `· not in queue`. Tapping a row → `navigate('/acquaintance/' + a.id)`. Pencil → open `EditCardModal` with `type="acquaintance"`.
- `<BottomNav active="acquaintances" onNavigate={(key) => navigate(NAV_PATHS[key] || '/')} />`.

## TASK 10b — Acquaintances inside the Network tab (`src/pages/NetworkPage.jsx`)

Acquaintances must **also** appear in the existing Network tab (not only on the new tab). Reuse what's already there:
- Pull `acquaintances`, `addAcquaintance` from `useData()`.
- Add a fourth entry to the `TABS` segmented control: `{ key: 'acquaintance', label: 'Acq.', Icon: Contact }` (import `Contact` from `lucide-react`; keep the label short so four segments fit). When `tab === 'acquaintance'`, render `<AcquaintanceForm onSubmit={addAcquaintance} profiles={profiles} />` in the same white form card.
- Add an **"Acquaintances"** `<Section>` to the list (after "People & requests"). Render each with the existing `Row` component: round avatar `initialOf(a.name)`, name, and a sub line — `descriptor` plus `· every N days` when `inQueue`, else `· not in queue`. `onClick` → `navigate('/acquaintance/' + a.id)`; `onEdit` → `setEditing({ type: 'acquaintance', record: a })`.
- The existing `EditCardModal` at the bottom of NetworkPage already receives `type` from `editing` — since Task 7 taught it `'acquaintance'`, no further wiring is needed beyond passing `profiles` (already passed).

Keep this section thin: it's the same data and the same detail route as the dedicated tab, just surfaced here too.

## TASK 11 — `src/components/AcquaintanceDetail.jsx` (new, dumb) + `src/pages/AcquaintanceDetailPage.jsx` (new)

**`AcquaintanceDetail`** — purely presentational, props in. Model it on `ProfileDetail` but lighter:
- Header: back button, Edit button, round avatar + name + descriptor, and pills — a queue/cadence pill (`IN QUEUE · every N days` when `inQueue`, else a muted `Not in queue`) and a `lastPrayedLabel`-style "last cleared" pill when in queue.
- **Updates** section: an add-update input pinned at the **top**; below it the feed rendered newest-first (the data already arrives `orderBy timestamp desc`), reusing the timeline-rail visual from `ProfileDetail`'s relational log. Empty state: italic "No updates yet."
- **Connections** section: a list of the linked People (passed in as resolved `{ id, name, initial }` objects); each row is tappable → opens that person's profile. Empty state: italic "No connections yet."

**`AcquaintanceDetailPage`** — the live wrapper, modeled on `ProfilePage`:
- Resolve `:id` from `useData().acquaintances`.
- Subscribe to `watchUpdates(id, ...)`.
- Resolve connections: `profiles.filter((p) => acq.linkedProfileIds?.includes(p.id))` → map to `{ id, name, initial: initialOf(p.name) }`.
- Wire `onAddUpdate={(text) => addUpdate(id, text)}`, `onOpenConnection={(pid) => navigate('/profile/' + pid)}`, `onEdit` → `EditCardModal type="acquaintance"`, `onBack` → `navigate(-1)`.
- Render `<BottomNav active="acquaintances" .../>`.

## TASK 12 — Queue integration (`src/pages/DashboardPage.jsx`)

- Pull `acquaintances`, `clearAcquaintance` from `useData()`, and import `addUpdate`, `decorateAcquaintance`.
- Pass acquaintances to the engine: `generateDailyQueue(profiles, groups, today, acquaintances)`.
- When mapping `result.profiles`, branch on `entity`: for `'acquaintance'` look the doc up in `acquaintances` and decorate with `decorateAcquaintance` (carry the `entity` flag onto the decorated object); otherwise keep the existing `decorateProfile` path.
- In the `queueItems` render, for an acquaintance card wire `onComplete={clearAcquaintance}`, `onNote={addUpdate}`, and `onOpen={(id) => navigate('/acquaintance/' + id)}`; people keep `clearProfile` / `addLog` / `/profile/:id`. (Cleanest: give each queue item an `entity` field and pick the handlers from it.)
- Update the `clearedToday` tally to also count acquaintances with `inQueue === true && lastClearedDate === today`, so the progress bar stays accurate.

## TASK 13 — Connections on Person profiles (`ProfilePage.jsx` + `ProfileDetail.jsx`)

- In `ProfilePage`, pull `acquaintances` from `useData()`, compute `connections = acquaintances.filter((a) => a.linkedProfileIds?.includes(id)).map((a) => ({ id: a.id, name: a.name, initial: initialOf(a.name) }))`, and pass `connections` to `ProfileDetail` plus an `onOpenConnection={(aid) => navigate('/acquaintance/' + aid)}`.
- In `ProfileDetail`, add a **Connections** section (same section header style as "Active requests") listing connected acquaintances as tappable rows. Render nothing/empty-state when there are none.

## TASK 14 — Verify

1. `npm run build` must pass clean.
2. Run the existing test suite (`npm test` / vitest); the `generateDailyQueue` change must **not** break existing tests — confirm the new param is purely additive.
3. Manually reason through (or add a small test for): an `inQueue: false` acquaintance never appears in the queue; an `inQueue: true` one with `lastClearedDate: null` surfaces immediately; clearing it stamps today and drops it; an update added from the queue card appears at the top of its detail feed; tagging it to a Person shows it under that Person's Connections and vice-versa.
4. Confirm no component imports `firebase/firestore` directly and every date write is `YYYY-MM-DD`.

## OUT OF SCOPE (do not build)
Promoting an acquaintance into a full Person; AI/journal routing into acquaintance updates; sweeping deleted-person ids out of `linkedProfileIds` (stale ids resolve to nothing and are filtered at render). Note these as future work; do not implement.
