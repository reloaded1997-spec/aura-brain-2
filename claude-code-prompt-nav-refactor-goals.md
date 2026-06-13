# Claude Code Execution Prompt — Navigation Refactor + Goals Feature

> Paste everything below the line into Claude Code (Sonnet 4.6). It is written to be run from the root of the Aura Brain 2 repo.

---

## Role & Working Agreement

You are working on **Aura Brain 2**, a client-side React + Tailwind + Firebase "Load-Balancing CRM / Prayer Tracker / Second Brain" PWA. I am an analyst, not a professional developer, so follow these working rules for **every** step of this task:

1. **Explain your logic before you change anything.** For each file you touch, first tell me in plain English: what the file currently does, what you're changing, and *why* the change is safe.
2. **Give me complete files, not fragments.** When you modify a component, output the **entire updated file** (top to bottom), not a diff or a "...rest stays the same" snippet. I need to be able to copy-paste the whole thing with zero guesswork.
3. **Change routing and state carefully.** Trace every place a tab/route name is referenced before renaming it. A rename that misses one reference will silently break navigation — find them all first.
4. **Work in safe, reviewable phases.** Do the work in the ordered phases below. After each phase, stop, summarize what changed, and list what I should manually click-test before we continue.
5. **Don't introduce new dependencies.** No Redux, no Zustand, no new UI framework, no new backend. State stays on React Context + custom hooks. Icons stay `lucide-react`. Styling stays Tailwind, mobile-first (base classes target mobile; `md:`/`lg:` for larger screens). Typography stays serif.
6. **Preserve the Date Engine rules.** Any date logic must use local date strings `YYYY-MM-DD` via `new Date().toLocaleDateString('en-CA')`. Never use raw UTC timestamps for daily/streak/queue logic.

---

## Phase 0 — Discovery & Map (DO THIS FIRST, change nothing)

Before editing, build me a map of the current navigation so we both understand the blast radius:

1. Locate the **bottom navigation** component (sticky PWA nav bar — Queue, Network, Journal, Search) and any routing config (React Router routes, or a state-driven tab switcher — tell me which pattern this app uses).
2. Find the **sub-tab** components currently rendered inside the **"Network"** tab and inside the **"Circle"** tab. List, for each tab:
   - The exact file path of the tab screen.
   - The sub-tabs it renders today (you should expect Network to contain Person, Group, Acquaintance, **and Habits**; and the Circle tab to contain duplicate Person/Acquaintances plus Habits — confirm what's actually there).
   - Where the sub-tab labels/strings and their routes/keys are defined.
3. Produce a short table: **Tab → file → sub-tabs → where each label string lives → where each route/key is referenced.** Include every reference (nav bar, route definitions, deep links, `activeTab` state defaults, conditional renders, tests).
4. Confirm whether navigation is **URL-route-based** or **local-state/`activeTab`-based**, because the rename strategy differs. State your finding before proceeding.

**Stop after Phase 0** and show me the map. Wait for my confirmation, or proceed if the map is unambiguous — but flag anything surprising.

---

## Phase 1 — Refactor the "Network" tab → **"Circle"**

Goal: the current Network tab becomes the *relationships* hub.

1. **Rename the bottom tab** from "Network" to **"Circle"**. Use a responsive label so it doesn't overflow on small screens: show **"Circle"** on mobile (base) and **"Relationship Circles"** on wider screens (`md:` and up) — e.g. a short span visible by default and a longer span revealed at `md:`. Pick the `lucide-react` icon that best fits "circle of people" (e.g. `Users` or `CircleUser`) and tell me which you chose and why.
2. **Remove the "Habits" sub-tab** from this section. It is *moving*, not being deleted — do not delete the Habits component itself, just stop rendering/registering it here. (It gets re-homed in Phase 2.)
3. **Retain only** the relational sub-tabs: **Person**, **Group**, **Acquaintance**. Make sure the default selected sub-tab still resolves to a valid one (if Habits was the default, repoint the default to Person).
4. Update **all** references found in Phase 0: nav label, route path/key, `activeTab` enums/defaults, any deep links, any conditional logic keyed on the old name. If the route path changes (e.g. `/network` → `/circle`), add a **redirect** from the old path to the new one so existing PWA shortcuts / bookmarks don't 404.
5. Output the complete updated files. Then list the manual click-tests for me (e.g. "tap Circle → confirm Person/Group/Acquaintance show, Habits is gone").

---

## Phase 2 — Refactor the "Circle" tab → **"Rhythms & Tasks"** + re-home Habits

Goal: the current Circle tab becomes the *routines* hub.

1. **Rename the bottom tab** from "Circle" to **"Rhythms & Tasks"**. Provide a responsive label: a compact form for mobile (e.g. **"Rhythms"**) and the full **"Rhythms & Tasks"** at `md:` and up, so the nav bar stays readable on a phone. Choose a fitting `lucide-react` icon (e.g. `Repeat`, `CalendarCheck`, or `ListChecks`) and explain the choice.
2. **Remove the duplicate "Person" and "Acquaintances" sub-tabs** from this tab. These relational views now live only in the Circle tab (Phase 1) — eliminate the duplication so there's a single source of truth. If those duplicates were separate components, tell me whether to delete them or whether the Circle tab already imports the canonical ones (don't leave dead/duplicate components lying around — call out anything orphaned).
3. **Move the "Habits" sub-tab here.** Re-register the existing Habits sub-tab (the one removed in Phase 1) inside "Rhythms & Tasks". Reuse the existing Habit component and Habit Strip logic exactly — do not rewrite the streak/achievement logic. Confirm the Habit data flow (Firestore `habits/{habitId}`, streak tracking, `archived_achievement` lifecycle) is untouched.
4. Carefully reconcile the **naming collision**: the *old* Circle tab is becoming "Rhythms & Tasks", while the *old* Network tab is becoming "Circle". Make sure no route key, enum value, or string ends up pointing at the wrong screen after both renames. Walk me through this mapping explicitly (old name → new name → file) so I can verify nothing crossed wires. Add old-path redirects as in Phase 1.
5. Output complete updated files and the manual click-tests.

---

## Phase 3 — New **"Goals"** feature inside "Rhythms & Tasks"

Goal: I can create overarching goals, and link Habits to a parent Goal so habits "outflow" from goals.

### 3a. Firebase data model (propose first, then implement)

Before writing UI, **propose the Firestore schema** and wait for me to read it. It must fit the existing offline-first, per-user model. Suggested shape — adapt to match existing conventions in the repo:

```
goals/{goalId}: {
  uid: string,                 // owner, same pattern as other collections
  title: string,
  description: string,         // optional longer "why"
  status: 'active' | 'achieved' | 'archived',
  targetDate: string | null,  // 'YYYY-MM-DD', local-date-string rule
  createdAt: <server/local per repo convention>,
  color: string | null         // optional, for UI grouping
}
```

For the **Goal → Habit relationship**, present me the trade-off between two options and recommend one:

- **Option A (recommended for this app): a `goalId` field on the habit.** Add `goalId: string | null` to `habits/{habitId}`. One habit belongs to at most one parent goal. Simple, cheap to query ("give me all habits where `goalId == X`"), and matches the existing flat-collection style. A habit with `goalId: null` is just a standalone habit (fully backward compatible — existing habits keep working untouched).
- **Option B: an array of `habitIds` on the goal.** Supports many-to-many but is harder to keep in sync and worse for offline writes.

Recommend **Option A** unless you find a reason in the codebase to prefer otherwise. Whatever we pick, the change to existing habits must be **non-breaking**: existing habit docs without the new field must continue to render and function (treat missing `goalId` as `null`).

Also tell me:
- Whether **Firestore security rules** need updating (add a `goals` collection rule mirroring the existing per-`uid` ownership pattern; allow the new `goalId` field on habit writes). Show me the exact rule additions.
- Whether any **composite index** is needed for the "habits by goalId for this user" query, and if so, give me the index definition.

### 3b. Goals UI & logic

Build a **"Goals" sub-tab inside "Rhythms & Tasks"**, consistent with the app's clean/minimal serif aesthetic, Tailwind mobile-first, `lucide-react` icons:

1. A **list of goals** (newest or active-first), each card showing title, optional target date, status, and a count/preview of the habits linked to it ("3 habits feeding this goal").
2. A **create-goal** flow (title, optional description, optional `YYYY-MM-DD` target date) — follow the Date Engine rule for the date input. Use a custom hook + Context for state, consistent with how the rest of the app manages data; **no new state libraries**.
3. A **goal detail view** where I can see the linked habits and **link/unlink habits to this goal** (e.g. a multi-select of my existing habits). Linking sets the habit's `goalId`; unlinking sets it back to `null`.
4. From the **Habit** side, add a lightweight way to see/set a habit's parent goal (e.g. a "Part of goal: ___" selector on the habit), so the relationship is editable from either direction without divergence.
5. Reflect the relationship visually so it reads as **"goals outflow to habits"** — e.g. on the Goal card, show the linked habits; on the Habit, show its parent goal badge.
6. Keep all reads/writes **offline-cache friendly** (optimistic UI consistent with how the rest of the app writes to Firestore). Do **not** add any client-side AI calls — that's out of scope here.

Output the complete new files and the complete updated files (Habit schema usage, Rhythms & Tasks tab registration, Context/hook, security rules snippet, index if needed). Provide the manual click-tests.

---

## Phase 4 — Verification & Safety Pass

After all phases, do a final sweep and report back:

1. **Grep for orphans:** search the codebase for the old strings/keys ("Network", old "Circle" route, removed duplicate sub-tabs) and confirm there are no stale references, dead imports, or unrendered components left behind. List anything found.
2. **Routing integrity:** confirm every bottom tab and every sub-tab resolves to a real screen, default sub-tabs are valid, and old paths redirect correctly. Confirm no two route keys collide after the double-rename.
3. **State integrity:** confirm `activeTab`/route state initializes to a valid value and no component reads a tab key that no longer exists.
4. **Backward compatibility:** confirm existing Firestore docs (habits without `goalId`, etc.) still render without errors.
5. **PWA / build check:** if there's a lint or build script, run it (or tell me the exact command to run) and confirm a clean build. Note if the service worker / manifest references any renamed route that needs updating.
6. Give me a **final consolidated test checklist** I can walk through on my phone, organized by tab.

---

## Output format I want from you each phase

- Plain-English explanation of the change and why it's safe.
- The **complete** updated/new file(s).
- The exact manual tests I should run before we move on.
- Any open questions or risks, called out explicitly rather than assumed away.

Begin with **Phase 0** now. Do not modify any files until you've shown me the navigation map.
