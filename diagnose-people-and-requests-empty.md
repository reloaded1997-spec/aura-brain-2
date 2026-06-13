# Diagnose: profiles appear in Search but NOT under "People & requests" on the Network tab

## The decisive clue (already isolated — start here, don't re-investigate the data layer)

`src/pages/SearchPage.jsx` and `src/pages/NetworkPage.jsx` consume the **same** `profiles`
array from `useData()`. Firestore reads/writes are now working (a profile created shows up in
Search). So the data is present in the shared array. The ONLY difference in how the two pages
render people is the filter:

- SearchPage (`results.people`): `profiles.filter((p) => matches(q, p.name, p.descriptor))`
  — no `groupId` filter, shows every matching profile.
- NetworkPage (`standalone`, line ~38): `profiles.filter((p) => !p.groupId)`
  — shows ONLY profiles whose `groupId` is falsy.

Therefore: a profile that is searchable but missing from "People & requests" has a **truthy
`groupId`**. Note that NetworkPage never renders grouped profiles individually — they only
contribute to a group's "N members" count — so a profile carrying a stray/dangling `groupId`
(especially one pointing at a non-existent group) is invisible on the Network tab entirely.

## Step 1 — Confirm the hypothesis (instrument, don't guess)

Add a temporary diagnostic to `src/pages/NetworkPage.jsx`, right after the `standalone`
computation:

```js
const standalone = profiles.filter((p) => !p.groupId);
console.table(
  profiles.map((p) => ({
    name: p.name,
    groupId: p.groupId,
    typeofGroupId: typeof p.groupId,
    kind: p.kind,
    groupExists: p.groupId ? groups.some((g) => g.id === p.groupId) : '(standalone)',
  }))
);
console.log('profiles total:', profiles.length, 'standalone:', standalone.length);
```

Run `npm run dev`, go to the Network tab, open the console, and read the table. Expected
finding: the newly created profiles have a `groupId` that is a non-empty string (and very
likely `groupExists: false`). Report the exact `groupId` value and its `typeof` before fixing.

Also confirm in the Firebase console what the profile doc's `groupId` field actually stores
(`null` vs `""` vs a string id).

## Step 2 — Trace where the bad `groupId` comes from

The profile is created through `addProfile` in `src/firebase/db.js`:

```js
groupId: groupId || null,
```

This stores `null` when given `''`, `null`, or `undefined`. So a truthy `groupId` means a real
string is being passed in. Find the call path that supplies it. Check, in priority order:

1. **The Circle tab's "Person" form** (`src/pages/AcquaintancesPage.jsx`, added in the previous
   fix). Confirm how it renders `PersonForm` and what it passes for `groups`/initial. If it
   passes a non-empty `groups` list AND the `<select>` ends up defaulting to a real group id
   (rather than `''`), every person added there inherits that group. Verify the form's
   `groupId` state initializes to `''` and the "— none (standalone) —" option has `value=""`.
2. **`PersonForm` in `src/components/CardForms.jsx`**: `useState(initial?.groupId || '')`.
   Confirm create-mode `initial` is null/undefined so the default is `''`. Confirm the group
   `<select>`'s placeholder option is `<option value="">— none (standalone) —</option>` and
   that nothing pre-selects a real group.
3. **`normalizeProfilePatch`** (edit path) — `out.groupId = out.groupId || null`. Fine, but
   confirm the EditCardModal/PersonForm edit flow isn't writing a stale group id.
4. **Any leftover data** from the broken-rules period or seeding — a profile written earlier
   with a bad `groupId`. (One-off; clean it up, but the live bug is in the create path.)

## Step 3 — Fix

### Primary fix (the create path)
Wherever the stray `groupId` originates, ensure standalone people are stored with
`groupId: null`. Most likely the Circle-tab Person form should pass `groups={[]}` (the Circle
tab has no group-assignment UI), or the `<select>` default must be `''`. Make the form
guarantee `groupId` is `null` unless the user explicitly selects an existing group.

### Defensive fix (so this class of bug can never hide a person again)
In `src/pages/NetworkPage.jsx`, treat a profile whose `groupId` points to a non-existent group
as standalone, so it can't vanish:

```js
const groupIds = new Set(groups.map((g) => g.id));
const standalone = profiles.filter((p) => !p.groupId || !groupIds.has(p.groupId));
```

This keeps genuinely grouped people out of the list (they show via their group) while surfacing
orphaned profiles instead of silently dropping them.

### Optional: one-time data repair
If Step 1 shows existing profiles with dangling `groupId`s, write a small repair (a temporary
admin action or a guarded effect) that sets `groupId: null` on any profile whose `groupId`
isn't in the current groups set. Confirm with the user before mutating data.

## Step 4 — Verify and clean up

- Remove the `console.table`/`console.log` diagnostics added in Step 1.
- Add a Person from BOTH the Network tab and the Circle tab; confirm each appears immediately
  under "People & requests" and in the Daily Queue, and is still findable in Search.
- Add a Person and assign them to a real group; confirm they do NOT appear under
  "People & requests" (correct) but DO count toward that group's member total and appear in the
  Dashboard group accordion.
- Confirm `groupId` is `null` in Firestore for standalone people.

## Files likely touched

- `src/pages/AcquaintancesPage.jsx` — Circle-tab Person form passing a stray group (most likely source).
- `src/components/CardForms.jsx` — `PersonForm` group `<select>` default / initial.
- `src/pages/NetworkPage.jsx` — defensive `standalone` filter (and remove diagnostics).
- `src/firebase/db.js` — only if the create/normalize path needs tightening.

Report the Step 1 finding (the actual `groupId` value) before applying the Step 3 fix.
