# Feature: Manual "Pull more" into the Queue + Bulk-add People & Acquaintances

Two related additions to Aura Brain 2. Follow `ARCHITECTURE.md` and `DESIGN_LANGUAGE.md` exactly:
React 18 + Vite, Tailwind, `lucide-react`, serif/`Newsreader` type, React Context + custom hooks
(NO Redux/Zustand), Firebase/Firestore, strict local `YYYY-MM-DD` dates via the existing
`getTodayLocal()` in `src/utils/queueMath.js`. Mobile-first. Match the existing component look
(the `#A8845C` accent, `#FAF8F3`/`#171511` surfaces, rounded `[18px]` cards, segmented controls).

There are two independent features below. Implement both. Keep all date logic going through
`getTodayLocal()` / `daysBetween()` — never diff raw Dates.

---

## FEATURE 1 — Manually pull more cards into the Daily Queue

### Goal
The Queue (`src/pages/DashboardPage.jsx`) only shows entities the load balancer says are due
(`generateDailyQueue` in `src/utils/queueMath.js`). I want a **"Pull more" button** at the
bottom of the Queue that **auto-surfaces the next N entities** that are closest to being due,
without waiting for their cadence. Pulled cards must **persist for the day** (survive reload),
and disappear naturally tomorrow.

### Behavior
- A "Pull more" button renders below the queue list (and also inside the "When the queue is
  clear, rest." empty state, so I can pull even when nothing is due).
- Each tap surfaces the **next N = 3** entities that are NOT currently in the queue, ranked by
  **nearest-to-due first** (smallest `priorityRate - daysSince`, i.e. fewest days until they'd
  surface on their own). Ties: most-overdue/oldest `lastClearedDate` first.
- Candidates include standalone profiles, groups, AND acquaintances — even acquaintances whose
  `inQueue !== true` (a manual pull is an explicit one-day override). Grouped profiles
  (those with a `groupId`) are still represented by their group, never individually, consistent
  with the existing queue rules.
- Pulling is idempotent per entity (pulling something already surfaced does nothing).
- When there are no more candidates to pull, hide/disable the button with a quiet
  "Everyone's surfaced" caption in the existing muted serif-italic style.

### Persistence model (persist for the day)
Add a `pulledForDate` field (`"YYYY-MM-DD" | null`) to the relevant docs and treat an entity as
surfaced today when **either** it is due **or** `pulledForDate === today`.

Schema additions (document, in `ARCHITECTURE.md §4` style — please also update that file):
- `profiles/{profileId}`: add `pulledForDate: string | null`
- `groups/{groupId}`: add `pulledForDate: string | null`
- `acquaintances/{acqId}`: add `pulledForDate: string | null`

Rules:
- A pulled card that gets **cleared today** must drop out. Since clearing already stamps
  `lastClearedDate = today`, the queue builder must treat `lastClearedDate === today` as
  "done today" and exclude it **even if** `pulledForDate === today`.
- No cleanup job needed: tomorrow `pulledForDate !== today`, so it falls out automatically.

### Code changes

**`src/utils/queueMath.js`** — keep it pure/deterministic (it has tests in
`test/queueMath.test.js`).
1. Extend `evaluateDue` (or `generateDailyQueue`) so an entity surfaces when it is due **or**
   `entity.pulledForDate === todayStr`, AND `entity.lastClearedDate !== todayStr`. Add a
   `pulled: boolean` flag to each emitted queue item so the UI can label it if desired.
2. Apply this for groups, standalone profiles, and acquaintances. For acquaintances, the
   manual-pull override means: surface when `pulledForDate === todayStr` regardless of the
   existing `inQueue` gate (keep the `inQueue` opt-in path working as-is for the auto path).
3. Export a new pure helper:
   ```js
   // Returns the next `n` entities (not currently surfaced today) closest to due,
   // each as { entity: 'profile'|'group'|'acquaintance', id }, nearest-to-due first.
   export function nextPullCandidates(profiles, groups, acquaintances, todayStr, n = 3)
   ```
   - Exclude anything already surfaced today (due or `pulledForDate === todayStr`) and anything
     `lastClearedDate === todayStr`.
   - Exclude grouped profiles (`groupId` set) — they ride with their group.
   - Rank by `priorityRate - daysSince` ascending (never-cleared → most negative/most ready,
     so treat as highest priority). Reuse existing date helpers.

**`src/firebase/db.js`** — add writers next to `clearProfile` / `clearGroup` / `clearAcquaintance`:
```js
export function pullProfileToQueue(profileId)   { return updateDoc(doc(db,'profiles',profileId),      { pulledForDate: getTodayLocal() }); }
export function pullGroupToQueue(groupId)        { return updateDoc(doc(db,'groups',groupId),          { pulledForDate: getTodayLocal() }); }
export function pullAcquaintanceToQueue(acqId)   { return updateDoc(doc(db,'acquaintances',acqId),     { pulledForDate: getTodayLocal() }); }
```
(Use a small batched helper if you prefer; a single multi-entity `pullManyToQueue(items)` using
`writeBatch` is welcome since each "Pull more" tap writes up to 3 docs.)

**`src/context/DataContext.jsx`** — expose the new actions through `useData()` (e.g.
`pullProfileToQueue`, `pullGroupToQueue`, `pullAcquaintanceToQueue`, or a single `pullToQueue`).

**`src/pages/DashboardPage.jsx`** —
- Compute candidates with `nextPullCandidates(profiles, groups, acquaintances, today)`.
- Add a "Pull more" button (lucide `Plus` or `ArrowDownToLine`, accent `#A8845C`) below the
  queue list and inside the empty state. On tap, pull the next 3 candidate ids via the new
  action(s). The live snapshot will re-surface them automatically.
- Disable/hide with "Everyone's surfaced" caption when `nextPullCandidates` returns empty.
- Keep the existing interleave/sort and the cleared/total progress math working — pulled cards
  count toward `remaining` and `total` just like naturally-due ones.

**`firestore.rules`** — confirm owner-update rules permit writing `pulledForDate` on owned
`profiles`, `groups`, `acquaintances` docs. If the rules whitelist specific fields, add
`pulledForDate`. Otherwise no change.

### Tests (`test/queueMath.test.js`)
Add cases:
- A not-due profile with `pulledForDate === today` surfaces; with `pulledForDate` = yesterday it
  does not.
- A pulled profile that also has `lastClearedDate === today` does NOT surface.
- An acquaintance with `inQueue: false` but `pulledForDate === today` surfaces.
- `nextPullCandidates` returns the correct nearest-to-due ordering, excludes already-surfaced and
  cleared-today and grouped profiles, and respects `n`.

---

## FEATURE 2 — Bulk-add People and Acquaintances

### Goal
On the Circle tab (`src/pages/NetworkPage.jsx`) let me **paste many names at once** and create
them in one go — choosing whether the whole batch is **People** or **Acquaintances** and a single
default **cycle (`priorityRate`)** for the batch.

### Behavior
- Add a fourth option to the existing segmented control (`TABS` in `NetworkPage.jsx`):
  `{ key: 'bulk', label: 'Bulk', Icon: <lucide ListPlus or Rows> }`.
- The Bulk panel contains:
  - A **textarea**: one entry per line. Accept `Name` or `Name, descriptor` (split on the first
    comma; trim both; ignore blank lines; de-dupe exact-duplicate names within the paste).
  - A **type** selector: `Person` | `Acquaintance` (whole batch).
  - A **cycle** selector reusing the existing `RateSelect` from `CardForms.jsx`
    (default = `settings.defaultPriorityRate`). For Acquaintances, also a checkbox
    **"Surface in Daily Queue"** (maps to `inQueue`); when unchecked, `inQueue: false` and cycle
    is irrelevant (still store the chosen rate, harmless).
  - A live **preview/review list** of parsed rows (count + each parsed name/descriptor) so I can
    confirm before saving. Show "12 people will be added" style count.
  - A submit button: "Add N people" / "Add N acquaintances".
- On submit, write all rows in a **single Firestore `writeBatch`** (not a loop of awaits), then
  clear the textarea. The live listeners refresh the lists below. Surface any error inline in the
  same red style the existing forms use (`#B4502F`).

### Code changes

**`src/components/CardForms.jsx`** — add an exported `BulkAddForm` component that follows the
same conventions as `PersonForm` / `AcquaintanceForm` (uses `fieldCls`, `labelCls`,
`SubmitButton`, `RateSelect`; `mode='create'` reset behavior; inline `submitError`). Props:
`{ defaultPriorityRate, onSubmit }` where `onSubmit(payload)` receives
`{ type: 'person'|'acquaintance', priorityRate, inQueue, rows: [{ name, descriptor }] }`.

**`src/firebase/db.js`** — add batched writers mirroring the single-add field shapes already in
`addProfile` and `addAcquaintance` (same defaults: profile `kind:'person'`, acquaintance
`inQueue`, `linkedProfileIds: []`, `createdAt`, `uid`):
```js
export async function bulkAddProfiles(uid, rows, { priorityRate = 7 } = {})       // rows: [{name, descriptor}]
export async function bulkAddAcquaintances(uid, rows, { priorityRate = 7, inQueue = false } = {})
```
Use `writeBatch(db)` + `doc(collection(db, ...))` for ids, commit once. Keep `Number()` /
`Boolean()` normalization consistent with the existing add/normalize functions.

**`src/context/DataContext.jsx`** — expose `bulkAddProfiles` / `bulkAddAcquaintances` bound to
`user.uid` through `useData()`, next to `addProfile` / `addAcquaintance`.

**`src/pages/NetworkPage.jsx`** — render `<BulkAddForm>` when `tab === 'bulk'`, wiring its
`onSubmit` to dispatch to the right bulk action based on the chosen `type`. Pass
`settings.defaultPriorityRate`.

### Edge cases
- Empty textarea or all-blank lines → disabled submit (no-op), no write.
- Lines with only a comma / no name → skipped.
- Very large pastes: Firestore batches cap at 500 writes; chunk into multiple commits if a paste
  exceeds ~450 rows.

---

## Acceptance criteria
1. "Pull more" surfaces 3 nearest-to-due entities per tap, persists across reload (same calendar
   day), and they vanish the next day or when cleared today.
2. Acquaintances not opted into the queue can still be pulled in for the day.
3. Button hides/disables with a quiet caption when nothing is left to pull.
4. Bulk panel parses pasted lines (`Name` / `Name, descriptor`), previews the count, and creates
   all rows in one batch as the chosen type with the chosen cycle.
5. No new state libraries or providers; all date logic via `getTodayLocal()`/`daysBetween()`.
6. `test/queueMath.test.js` passes including the new cases; run `npm test` and confirm green.
7. `ARCHITECTURE.md §4` (schema) and `§7/§8` (shipped state / roadmap) updated to note both
   additions.

## Out of scope
- No editing of bulk-created entries inline (use existing edit flow afterward).
- No per-row type/cycle in the bulk paste (whole-batch only).
- No notification/FCM changes.
