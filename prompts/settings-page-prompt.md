# Claude Code Task — Build a User Settings Page (Aura Brain 2)

You are working in the **Aura Brain 2** repo. Read `ARCHITECTURE.md` first and treat it as binding. Match the existing conventions exactly — do not introduce new dependencies, state libraries, UI frameworks, or backend providers.

## Goal
Build a **User Settings page** and a way to navigate to it. The page must contain **functional, persisted settings** that actually change app behavior — not placeholder toggles.

## Hard constraints (from ARCHITECTURE.md — do not violate)
- **Stack:** React 18 + Vite, Tailwind CSS, `lucide-react` for icons. Serif typography, clean/minimal/quietly faith-rooted tone.
- **State:** React Context API + custom hooks only. **No Redux, no Zustand.**
- **Backend:** Firebase (Firestore + Auth). All settings persist to `users/{uid}.settings`. Use the offline-first Firestore cache like the rest of the app.
- **Dates:** Never use UTC for daily logic. Use strict local date strings: `new Date().toLocaleDateString('en-CA')` → `YYYY-MM-DD`.
- **Mobile-first:** Tailwind classes default to mobile; use `md:` / `lg:` for scaling. Must feel native inside the standalone PWA.

## Access / Navigation
- The bottom nav (Queue, Network, Journal, Search) is full — **do not add a fifth tab.**
- Instead, add a **gear icon (`Settings` from lucide-react)** in the top-right header of the app (or the Network/Queue header, wherever the existing top bar lives). Tapping it routes to the Settings screen.
- Settings is a full screen with a back affordance (chevron-left) returning to the previous view. Reuse the app's existing routing/navigation pattern — inspect how screens currently transition and follow it.

## Settings to implement (all functional + persisted)
Persist each to `users/{uid}.settings` with sensible defaults; write on change with the same debounce/save pattern used elsewhere (e.g. the 500ms debounce noted for Profile Notes).

1. **Display name** — editable text input, saved to `users/{uid}.settings.displayName`. Used in greetings/headers.
2. **Default priority rate for new profiles** — select of `3 / 7 / 14 / 30` days. New profiles created afterward should default their `priorityRate` to this value.
3. **Morning notification toggle** — boolean (`settings.notificationsEnabled`). When turned on, capture the FCM token and append to `users/{uid}.fcmTokens[]` (ties into Phase 3.1); when off, mark disabled. If FCM wiring isn't present yet, gate the actual token capture behind a clear TODO but still persist the preference and reflect state in the UI.
4. **Evening reminder toggle** — boolean (`settings.eveningReminderEnabled`, default off). This is a **new feature**: an evening FCM push that only fires **if the user's Daily Queue has not been fully cleared** that day. See the "Evening notification feature" section below for the backend behavior. The setting also exposes an editable **reminder time** (`settings.eveningReminderTime`, default `"20:00"`, stored as a `HH:mm` local-time string) shown only when the toggle is on. Persist both fields.
5. **Show answered prayers** — boolean (`settings.showAnswered`) controlling whether the "Answered prayers" section is visible on profile detail (Phase 3.3). Default on.
6. **Font size** — small / medium / large select that adjusts a root text-scale class (respecting the serif design). Persist as `settings.fontScale`.
7. **Sign out** — calls Firebase Auth `signOut`, returns user to the gated login screen.

Include a small read-only line showing the signed-in **email** and account `createdAt`.

## Evening notification feature (new)
Add an **evening reminder** alongside the existing morning push (Phase 3.1), reusing the same FCM + scheduled Cloud Function machinery — do not invent a parallel system.

- **Condition to send:** fire only if the user's Daily Queue is **not fully cleared** for today. Determine this with the existing load-balancer math (`src/utils/queueMath.js`) and the strict local date string (`YYYY-MM-DD`). The queue is "cleared" when no profiles/groups are still overdue for today (i.e. nothing would surface in the queue). If anything remains, send; otherwise skip silently.
- **Respect the setting:** only consider users with `settings.eveningReminderEnabled === true`, and schedule against their `settings.eveningReminderTime` (default `20:00`, local time). Reuse the same local-time handling the morning job uses — never UTC for the day boundary.
- **Trigger:** a scheduled Cloud Function (pubsub), consistent with the 8 AM morning job. Query overdue profiles per eligible user and dispatch to that user's `fcmTokens[]`.
- **Copy:** quietly faith-rooted and understated, e.g. *"N still waiting in your queue tonight."* Pluralize correctly; if exactly the morning count is unhelpful, base the number on what remains uncleared at send time.
- If the morning job already abstracts "find overdue profiles for a user," factor that logic out and share it between both jobs rather than duplicating it.

## Implementation notes
- Create a `SettingsPage.jsx` (match existing file naming/location of pages like `ProfileDetail.jsx`, `JournalPage.jsx`).
- Read/write settings through a custom hook + Context, consistent with how the app already exposes user data. If a `useUser`/`useAuth`/settings context already exists, extend it rather than creating a parallel one. Inspect first.
- Ensure settings load from the Firestore cache on mount so the screen works offline.
- Keep styling minimal and serif: simple labeled rows, generous spacing, subtle dividers. Match existing component styling — read a couple of current screens before writing yours.
- Apply `fontScale` and `showAnswered` live so the user sees the effect immediately.

## Definition of done
- Gear icon visible and routes to Settings; back button returns.
- Every setting persists to Firestore and survives reload.
- Default priority rate, font size, show-answered, and notification toggles each demonstrably change app behavior.
- Evening reminder: toggle + editable time persist; the scheduled function sends only when the queue is uncleared at that time and only for users who enabled it; reuses the morning FCM/scheduling machinery and the existing queue math.
- Sign out works.
- No new state-management or UI dependencies added; mobile-first; serif typography preserved.

After implementing, run the app, verify each setting persists and takes effect, and summarize what changed and which files you touched.
