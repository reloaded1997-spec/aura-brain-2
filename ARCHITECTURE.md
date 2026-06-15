# ARCHITECTURE.md - Master Project Context

## 1. Project Overview
This project is a serverless, client-side "Load-Balancing CRM", Prayer Tracker, and Second Brain. It manages relational tracking, daily habits, and unstructured journaling. The app ensures users maintain relationships and routines via a mathematically driven "Daily Queue" to achieve Inbox Zero without cognitive overload.

## 2. Tech Stack & Strict Rules
*   **Frontend:** React 18+ built with Vite.
*   **Styling:** Tailwind CSS. Use `lucide-react` for all icons.
*   **Design/Vibe:** Clean, focused, and minimal. **Typography:** All serif (devotional, book-like feeling). **Tone:** Quietly faith-rooted (present but understated). *Note: Rely on Claude Cue to prototype and handle specific UI/layout decisions within these thematic bounds.*
*   **Backend/Database:** Firebase (Firestore for data, Firebase Auth for auth, Cloud Functions for AI processing).
*   **Hosting:** Vercel (Frontend).
*   **State Management:** React Context API + Custom Hooks. **DO NOT use Redux or Zustand.**
*   **PWA:** Configured via `vite-plugin-pwa` for iOS native-feel (standalone display, no browser UI).
*   **Mobile-First:** All Tailwind classes must default to mobile screens. Use `md:` and `lg:` for desktop scaling.

## 3. Core Business Logic & Directives

### A. The Date Engine (CRITICAL)
*   Do NOT use standard UTC timestamps to calculate daily streaks or queue resets.
*   All daily evaluations MUST use strict local date strings: `YYYY-MM-DD` (e.g., `const today = new Date().toLocaleDateString('en-CA')`).
*   This prevents time-of-day browser bugs and timezone drift.

### B. The Load Balancer Math
*   **Profiles/Groups:** Have a `priorityRate` (integer in days: 3, 7, 14, 30) and a `lastClearedDate` (YYYY-MM-DD).
*   **Queue Logic:** If `Today - lastClearedDate >= priorityRate`, the entity surfaces in the Daily Queue.

### C. Gated Authentication
*   User registration is locked.
*   Before calling `createUserWithEmailAndPassword`, the client must query the `inviteCodes` Firestore collection.
*   If the user's input matches a valid document ID in that collection, proceed with Auth. Otherwise, throw an error.

### D. Habit Achievements
*   Temporary/time-boxed habits (e.g., "30-Day Fast") track their progress. Upon reaching their target date or completion threshold, their status updates to `archived_achievement`. They are removed from the active habit strip and logged permanently in the user's profile history.

### E. Universal Capture (MVP)
*   For now, universal ingestion is handled manually by pasting text directly into the PWA's Journal tab. The architecture should remain open to future webhooks/API expansions.

## 4. Firestore Database Schema (Draft)
The database must be optimized for offline-first capabilities using Firestore's local cache.

*   `users/{uid}`: { email, createdAt, settings, fcmTokens: string[] }
*   `habits/{habitId}`: { uid, title, type: 'permanent' | 'temporary', targetDate: string | null, currentStreak: number, lastCompletedDate: string, status: 'active' | 'archived_achievement' }
*   `groups/{groupId}`: { uid, name, priorityRate: number, lastClearedDate: string, pulledForDate: string | null }
*   `profiles/{profileId}`: { uid, name, groupId: string | null, priorityRate: number, lastClearedDate: string, notes: string, openRequestCount: number, pulledForDate: string | null }
    *   *Subcollection:* `requests/{requestId}`: { text, isCompleted: boolean, createdAt }
    *   *Subcollection:* `logs/{logId}`: { text, timestamp }
*   `acquaintances/{acqId}`: { uid, name, descriptor: string, inQueue: boolean, priorityRate: number, lastClearedDate: string | null, linkedProfileIds: string[], createdAt, pulledForDate: string | null }
    *   *Subcollection:* `updates/{updateId}`: { text, timestamp }
    *   *Lighter than a profile:* no requests, no notes field, no `openRequestCount`. The `updates` feed renders newest-first (`orderBy('timestamp','desc')`). Surfaces in the Daily Queue ONLY when `inQueue` is true, on its own `priorityRate`. `linkedProfileIds` ties it to `profiles` and is read in both directions (the acquaintance shows its people; each person shows its acquaintances as "connections").
*   `journals/{journalId}`: { uid, text, timestamp, aiProcessed: boolean, linkedProfileIds: [] }

## 5. UI / UX Architecture
*   **Bottom Navigation:** Sticky PWA nav bar (Queue, Network, Acquaintances, Journal, Search).
*   **Acquaintances:** A lighter relationship type for friends-of-friends / weaker ties. They live on their own bottom-nav tab AND inside the Network tab (a fourth create segment + list section). Optional Daily Queue surfacing (`inQueue` + cadence); when surfaced they mix in with people in the standalone-profile list. The detail page is intentionally light: a reverse-chron Updates feed (add-input pinned at top) and a Connections list of linked people.
*   **Habit Strip:** Horizontal scrolling `flex overflow-x-auto` strip at the top of the Queue. Checked items drop to 50% opacity and move to the back of the list.
*   **Group Accordions:** Groups in the queue render as headers. Clicking the text expands a nested list of profiles. Checking the master group checkbox sets the `lastClearedDate` to today for ALL nested profiles.
*   **Profile Cards:** Must have an inline input for quick notes. Swiping right marks the card as complete, triggering an auto-collapse (height to 0px) transition before unmounting from the DOM.

## 6. The AI "Second Brain" Pipeline
* AI operations must NEVER happen on the client-side.
* **AI Provider:** Google Gemini API (via Google AI Studio free tier).
* **Trigger:** When a document is added to `journals`, a Firebase Cloud Function triggers `onWrite`.
* **Execution:** Node.js backend uses the `@google/genai` (or `@google/generative-ai`) SDK to send journal text to the Gemini model.
* **Action:** Gemini extracts mentioned names and derived prayer requests and returns them as a structured JSON object. The Cloud Function parses this JSON and directly mutates the respective `profiles/{profileId}/requests` collections.

## 7. Current Shipped State (as of Phase 2–4 + Pull/Bulk additions)
These features are complete and live:
*   Auth with invite-code gating + profile completion prompt
*   Daily Queue with DST-safe load-balancer math (`src/utils/queueMath.js`)
*   Profiles, Groups, Group accordions, swipe-to-clear animation
*   Habit Strip (permanent + temporary/achievement types with streak tracking)
*   Profile detail page: active requests (checkable), relational log (append-only)
*   Journal → Gemini Cloud Function → auto-populates profile logs
*   Network view (all profiles/groups), Search (in-memory, instant)
*   PWA manifest + Workbox service worker, Vercel deployment, Firestore security rules
*   **"Pull more"**: manual one-day queue surfacing via `pulledForDate` field on profiles/groups/acquaintances; `nextPullCandidates()` ranks by nearest-to-due; `pullManyToQueue()` batched write; persists across reload, auto-expires next day
*   **Unified Relationships create form**: the Circle tab's create segment collapses to two tabs — **Relationships** and **Group**. `RelationshipForm` (`CardForms.jsx`) carries a Friend/Acquaintance toggle that swaps type-specific fields (Friend → group picker; Acquaintance → queue opt-in + connections) over shared name/descriptor/cycle. Create-only; editing still routes through the dedicated `PersonForm`/`AcquaintanceForm` in `EditCardModal`. "Friend" creates a `profiles` doc with `kind:'person'` (the standalone-request kind is no longer offered at create time)

## 8. Build Roadmap (Phase 3+)
This app is being actively extended. New features must fit within the existing architecture without introducing new state management libraries, UI frameworks, or backend providers.

### Phase 3 — Depth (In Progress)
Features that deepen existing screens without adding new navigation:

*   **3.1 Push Notifications:** Morning FCM push ("N people in your queue today"). Requires: FCM token capture on the client, token stored in `users/{uid}.fcmTokens[]`, and a scheduled Cloud Function (pubsub, 8 AM local) that queries overdue profiles per user and dispatches notifications.
*   **3.2 Profile Notes:** A persistent freeform `notes` field on each profile (stored on the profile doc itself, not a subcollection). Auto-saves with 500ms debounce. Rendered as a plain textarea below Active Requests in `ProfileDetail.jsx`.
*   **3.3 Answered Prayer Tracking:** Add `answeredAt` (YYYY-MM-DD) and `answeredNote` (string) to the requests schema. When a request is marked complete, prompt for an optional answer note. Show answered requests in a collapsible "Answered prayers" section.
*   **3.4 Recurring Requests:** Add `isRecurring: boolean` to requests. Recurring requests never archive on completion — they stay visible as persistent burdens.
*   **3.5 Journal History:** Display past journal entries (paginated, newest-first) below the compose area in `JournalPage.jsx`. Each entry shows its timestamp and a list of profile names it was routed to.

### Phase 4 — Breadth
*   **Acquaintances (new entity):** A fourth card type alongside People/Groups/Habits for weaker ties. New `acquaintances` collection + `updates` subcollection (see §4). Lives on a new fifth bottom-nav tab and inside the Network tab. Opt-in Daily Queue surfacing via `inQueue` + `priorityRate` (reuses the existing load-balancer math); due acquaintances mix in with people in the queue. Reverse-chron Updates feed, and bidirectional connections to `profiles` via `linkedProfileIds`. `generateDailyQueue` gains a trailing optional `acquaintances` arg (additive — existing tests unaffected). New files: `AcquaintancesPage.jsx`, `AcquaintanceDetailPage.jsx`, `AcquaintanceDetail.jsx`.
*   Daily Notes scratch pad (`dailyNotes/{uid}/{date}`)
*   Tag system (`tags: string[]`) on profiles, groups, journals
*   Insights / Analytics page (queue completion rate, relationship health, streak records)
*   AI chat over the network ("Who am I forgetting about?")

### Phase 5 — Scale
*   Shared groups for small communities
*   Contact sync via Web Contacts API
*   Semantic search via Gemini embeddings
*   React Native / Expo port for true native push on iOS
