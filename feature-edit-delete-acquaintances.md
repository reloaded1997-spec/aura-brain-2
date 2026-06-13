# Feature: Harden & Complete Acquaintance Editing/Deletion (+ Promote to Network)

## Context for you (Claude Code)

This is the "Aura Brain 2" PWA (React 18 + Vite, Tailwind, Firebase/Firestore, React Context).
Follow ARCHITECTURE.md strictly: serif typography, no Redux/Zustand, mobile-first, strict
local `YYYY-MM-DD` date strings (never UTC) via `getTodayLocal()` from `src/utils/queueMath.js`.

### IMPORTANT — read before writing any code

Basic edit and delete for acquaintances **already exists**. Do NOT rebuild it. Verify it first:

- `src/components/EditCardModal.jsx` already handles `type === 'acquaintance'` for edit
  (`updateAcquaintance`) and delete (`deleteAcquaintance`, confirmation step included).
- `src/pages/AcquaintancesPage.jsx` already opens this modal via a pencil button per row.
- `src/pages/AcquaintanceDetailPage.jsx` already opens it via an Edit button, with
  `onDeleted={() => navigate('/acquaintances')}`.
- `src/firebase/db.js` has `updateAcquaintance`, `deleteAcquaintance`,
  `clearAcquaintance`, and `normalizeAcquaintancePatch`.
- `src/components/CardForms.jsx` has `AcquaintanceForm` with `mode="edit"`.

Start by reading those files and confirming the flow works end-to-end. Report what you find
before changing anything.

## Goals

Deliver three improvements on top of the existing edit/delete flow:

### 1. Harden the existing edit/delete (error handling + feedback)

- In `EditCardModal.jsx`, `handleSubmit` is currently fire-and-forget (no `await`, no error
  handling). Make it `async`, `await` the update, show a busy state on the submit button while
  saving, and surface a non-blocking inline error message if the Firestore write rejects (do
  NOT use `alert()` — render an inline error row styled with the existing `#B4502F` error color).
- `handleDelete` already has a `busy` state; confirm it disables the backdrop close and both
  buttons while deleting, and surfaces an inline error on failure instead of silently closing.
- Apply the same async/await + error handling to the acquaintance path specifically, but keep
  the person/group/habit paths working identically (shared code).

### 2. Make edit/delete more discoverable on the detail page

- On `AcquaintanceDetail.jsx`, the Edit button exists in the header. Confirm it is visible and
  tappable on mobile. No new delete button needed on the detail page itself — delete lives
  inside the EditCardModal (consistent with profiles). Just verify the modal's `onDeleted`
  navigates back to `/acquaintances` so the user isn't stranded on a deleted record's page.

### 3. NEW capability — "Promote to network" (the real gap)

Acquaintances live in the `acquaintances` collection and only surface in the Daily Queue when
`inQueue === true`. Sometimes a user wants to fully promote an acquaintance into their core
network as a real `profiles` doc (so it behaves like any other person: requests subcollection,
relational logs, full queue participation, group assignment).

Add a "Promote to network" action:

- **Where:** A button inside `EditCardModal` when `type === 'acquaintance'` (place it above the
  red "Delete acquaintance" button, styled as a secondary/neutral action, not destructive).
  Label: "Promote to person". Add a short helper line: "Moves this person into your network
  so they cycle into the Daily Queue."
- **Behavior:** On confirm (reuse the existing confirmation-step pattern, with copy explaining
  the move is one-way and the acquaintance record + its updates will be removed):
  1. Create a new `profiles` doc via `addProfile(uid, { name, descriptor, kind: 'person',
     priorityRate })` carrying over the acquaintance's `name`, `descriptor`, and `priorityRate`.
     (New profiles get `lastClearedDate: null`, so they surface in the queue immediately — this
     is the desired behavior.)
  2. Migrate the acquaintance's `updates` subcollection entries into the new profile's `logs`
     subcollection (map each `{ text, timestamp }` update to a log via `addLog`-style write, or
     a batch write that preserves the original `timestamp` and sets `fromJournal: false`).
  3. Delete the original acquaintance (and its `updates`) via `deleteAcquaintance`.
  4. Close the modal and navigate to the new profile (`/profile/{newId}`) if invoked from the
     detail page, or just refresh the list if invoked from `AcquaintancesPage`.
- **Implementation:** Add a `promoteAcquaintance(uid, acq)` function to `src/firebase/db.js`
  that performs steps 1–3 atomically where possible. Note Firestore can't batch an `addDoc`
  with a returned ID cleanly across subcollections, so: create the profile first (`await`),
  then batch-write the migrated logs + delete the acquaintance + its updates, then `commit()`.
  Return the new profile's id. Expose it through `DataContext.jsx` actions as
  `promoteAcquaintance: (acq) => dbApi.promoteAcquaintance(user.uid, acq)`.
- Handle the migration's read of the `updates` subcollection with `getDocs` (one-time read,
  not a listener).

## Constraints / acceptance criteria

- No new dependencies, state libraries, or backend providers.
- All dates use `getTodayLocal()` / existing helpers — never raw `Date`/UTC for daily logic.
- Serif typography (`font-['Newsreader']`), existing Tailwind color tokens
  (`#A8845C`, `#B4502F`, `#6F6A60`, `#EBE6DC`, etc.), mobile-first.
- Editing an acquaintance still persists name, descriptor, inQueue, priorityRate, and
  linkedProfileIds (verify against `normalizeAcquaintancePatch`).
- After "Promote to person": the record disappears from the Circle/Acquaintances list, appears
  under "People & requests" on the Network tab, surfaces in the Daily Queue, and its prior
  updates appear in the new profile's relational log.
- Deleting an acquaintance removes it and its `updates` subcollection (already implemented —
  just confirm no orphaned docs).
- Manually test: edit an acquaintance (toggle inQueue on/off, change cycle), delete one, and
  promote one. Confirm queue behavior on the dashboard.

## Files you'll likely touch

- `src/components/EditCardModal.jsx` — async save + error handling, "Promote to person" action.
- `src/firebase/db.js` — new `promoteAcquaintance(uid, acq)`; reuse existing writers.
- `src/context/DataContext.jsx` — expose `promoteAcquaintance` action.
- `src/pages/AcquaintanceDetailPage.jsx` / `src/pages/AcquaintancesPage.jsx` — wire navigation
  after promote (pass an `onPromoted` callback if needed).
- Possibly `src/components/AcquaintanceDetail.jsx` — only if the Edit affordance needs polish.

Do not modify `queueMath.js`, `CardForms.jsx` field sets, or `NetworkPage.jsx` unless a bug
surfaces during testing.
