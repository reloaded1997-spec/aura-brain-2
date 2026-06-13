# Aura Brain — Competitive Analysis & Build Roadmap

---

## Where You Stand vs. the Field

### The Second Brain Landscape

**Obsidian** is the dominant "second brain" for power users. It's local-first markdown, infinite linking, a graph view, and a massive plugin ecosystem. But it has no relational CRM logic, no queue, no accountability cadence — it's a knowledge *archive*, not a relational *engine*. You have to manually decide what to open. Obsidian requires you to build your own systems from scratch.

**Notion** is a structured database tool dressed as a doc editor. Great for teams and projects, weak for personal spiritual/relational use. It has no push mechanism — nothing tells you who you've neglected. It's also too heavy for mobile-first journaling.

**Roam Research / Logseq** are outliner-first daily-note apps. Bidirectional links and block references are their superpower. But they're for *information*, not *people*. Zero CRM logic.

**Mem.ai / Rewind** are AI-first capture tools — auto-link, auto-summarize. Clever, but passive. They accumulate notes with no prescribed action on them.

**Clay** is the closest to a personal CRM. It auto-enriches contacts from LinkedIn, email, calendar. Powerful but clinical — no spiritual layer, no queue math, expensive, web-only.

---

### Your Unique Position

Aura Brain occupies a genuinely unoccupied niche. None of the above tools do what your queue engine does: **mathematically surface the right people at the right time, without you having to decide**. That is the core value proposition and it's defensible.

| Capability | Obsidian | Notion | Clay | Aura Brain |
|---|---|---|---|---|
| Relationship cadence queue | ✗ | ✗ | partial | ✅ |
| Faith/prayer layer | ✗ | ✗ | ✗ | ✅ |
| AI journal → prayer request extraction | ✗ | ✗ | ✗ | ✅ |
| Habit streaks + achievements | ✗ | partial | ✗ | ✅ |
| Offline-first PWA | plugin | ✗ | ✗ | ✅ |
| Tiered relationship types (People/Acquaintances/Groups) | ✗ | ✗ | partial | ✅ |
| Daily scratch pad / daily notes | plugin | ✗ | ✗ | ✅ |
| Journal history with AI routing feedback | ✗ | ✗ | ✗ | ✅ |
| Graph/knowledge linking | ✅ | partial | ✗ | ✗ |
| Rich text notes | ✅ | ✅ | partial | ✗ |
| Contact enrichment | ✗ | ✗ | ✅ | ✗ |
| Push notifications | ✗ | ✗ | ✅ | ✗ |
| Semantic / AI search | ✗ | ✅ | partial | ✗ |

Your gaps are real, but your foundation is solid and the queue math is a moat.

---

## Current State (What's Shipped)

**Foundation**
- ✅ Auth with invite-code gating
- ✅ Daily Queue with load-balancer math (DST-safe, offline-first)
- ✅ Profiles, Groups, Group accordions, swipe-to-clear
- ✅ Habit Strip (permanent + temporary/achievement types)
- ✅ Profile detail: logs + prayer requests (subcollections)
- ✅ Journal → Gemini Cloud Function → auto-populates profile logs
- ✅ Network view, Search (in-memory, instant)
- ✅ PWA configured, Vercel deployment, Firestore rules

**Phase 3 — Depth (completed items)**
- ✅ 3.1 Push Notifications — FCM token capture, `users/{uid}.fcmTokens[]`, scheduled Cloud Function sends morning queue count
- ✅ 3.2 Profile Notes — freeform `notes` field on profiles, auto-saves with 500ms debounce in ProfileDetail
- ✅ 3.5 Journal History — scrollable past entries below compose area, linked profile name chips, `watchJournalEntries` with 30-entry limit

**Phase 4 — Breadth (completed items)**
- ✅ 4.1 Daily Notes / Scratch Pad — `DailyNoteStrip` on Dashboard between Habit Strip and Queue, `dailyNotes/{uid}_{date}` doc, collapsible with auto-save

**Acquaintances (shipped, outside original phase numbering)**
- ✅ New fourth entity type — lighter than a Profile: no requests, no notes, no openRequestCount
- ✅ `acquaintances/{acqId}` collection + `updates` subcollection (reverse-chron feed)
- ✅ Opt-in queue surfacing (`inQueue` flag + own `priorityRate`/`lastClearedDate`)
- ✅ Connections: `linkedProfileIds[]` ties acquaintances to People bidirectionally
- ✅ Dedicated tab in bottom nav (Queue · Network · Acquaintances · Journal · Search)
- ✅ AcquaintancesPage, AcquaintanceDetailPage, AcquaintanceDetail component
- ✅ `generateDailyQueue` updated to evaluate acquaintances alongside standalone profiles
- ✅ NetworkPage gains Acquaintances section + create segment
- ✅ ProfileDetail gains tappable Connections section

---

## Phase 3 — Depth

These harden and deepen what's already there. No new pages needed.

### ✅ 3.1 Push Notifications
Morning FCM push ("N people in your queue today"). FCM token stored in `users/{uid}.fcmTokens[]`, scheduled Cloud Function sends at 8 AM. **Done.**

### ✅ 3.2 Profile Notes
Persistent `notes` field on the profile doc, auto-saving textarea in ProfileDetail with 500ms debounce. **Done.**

### 3.3 Prayer Request Lifecycle *(up next)*
Requests currently have `isCompleted` but no answer/answered-on date. Add: `answeredAt` (YYYY-MM-DD), `answeredNote` (text). When marked answered, stamp it and show in a collapsible "Answered prayers" section. Spiritually significant UX with zero competition.

### 3.4 Recurring Requests *(up next)*
Add `isRecurring: boolean` to requests. Recurring requests never archive on completion — they stay as persistent burdens. Completes the full prayer lifecycle alongside 3.3.

### ✅ 3.5 Journal History
Scrollable past entries below the compose area — timestamp, text preview, linked profile name chips. `watchJournalEntries` with 30-entry limit. **Done.**

---

## Phase 4 — Breadth

### ✅ 4.1 Daily Notes / Scratch Pad
`DailyNoteStrip` on the Dashboard between Habit Strip and Queue. One collapsible, auto-saving text area per day stored at `dailyNotes/{uid}_{date}`. Competes with Obsidian's daily notes and Roam's daily page. **Done.**

### ✅ Acquaintances *(shipped alongside Phase 4)*
Full fourth entity type — lighter than a Profile, heavier than a contact. Own nav tab, opt-in queue surfacing, reverse-chron Updates feed, bidirectional Connections to People. See design doc for full spec. **Done.**

### 4.2 Tag System *(next up for Phase 4)*
A cross-cutting `tags: string[]` array on profiles, groups, acquaintances, and journal entries. Tags like "family", "college", "cancer prayer", "mentor" let you slice the network in ways groups don't. Add a tag filter to the Network, Acquaintances, and Search pages. Stored as a Firestore array field — queryable with `array-contains`.

### 4.3 Insights / Analytics Page
A pull-up sheet from the Dashboard (to avoid a sixth nav tab) showing: relationship health scores (who has the longest `daysSince`), habit streak records, answered prayer count over time, queue completion rate. All computable from data already stored.

### 4.4 AI Chat Over Your Network
A text input that sends a query + profile/log/acquaintance data to Gemini and returns a natural-language answer. "Who am I forgetting about?", "What prayer requests are unresolved for more than 30 days?", "Who did I last pray for on my birthday?". This is the Mem.ai move applied to relationships. Keep it in the Cloud Function layer — never client-side.

---

## Phase 5 — Scale (Only if you grow beyond personal use)

### 5.1 Shared Groups (Small communities)
Allow a group to be shared with another user (read-only or co-edit). A church small group leader could share a group with co-leaders. This requires a `sharedWith: uid[]` field on groups, updated Firestore rules, and a simple invite-by-email flow. Keep this gated — don't open it to everyone at once.

### 5.2 Contact Sync
On mobile, the Web Contacts API (behind a permission prompt) lets you pull names and phone numbers from the user's address book. This removes the manual friction of adding profiles. Match on name to find existing profiles; otherwise offer to import. No server round-trip needed — it's fully client-side.

### 5.3 Semantic Search
Replace the current substring search with vector-based semantic search. When a journal entry is saved, the Cloud Function generates a Gemini embedding and stores it in Firestore (or Vertex AI Vector Search). Search then finds profiles by meaning, not just name — "who are my friends going through hard things" returns relevant profiles even if the journal entry didn't use their name. This is a 2026 moat.

### 5.4 Native App (React Native / Expo)
The PWA is good enough for now, but iOS push notifications are still second-class for PWAs. When you have users who want a home screen icon with badge counts, port to Expo — it shares most of your business logic and hooks into Firebase natively. The queue math is already framework-agnostic (pure JS), which makes this port straightforward.

---

## Technical Debt to Address Before Phase 4

- **Firestore indexes**: as the dataset grows, the `where('uid', '==', uid)` queries on profiles/groups/habits will need composite indexes if you add ordering or filtering by tag.
- **Cloud Function error handling**: the Gemini pipeline should have retry logic and a dead-letter pattern (e.g., a `processingErrors` subcollection) so failed journal entries don't silently disappear.
- **Firestore rules hardening**: rules currently likely trust `uid` claims — audit them to ensure users can't write to other users' subcollections (requests, logs).
- **Bundle size**: as features grow, consider route-based code splitting (React.lazy + Suspense) to keep the initial load fast on slow mobile connections.
- **Test coverage**: the queue math has tests (good). Add tests for `db.js` write functions using the Firebase emulator.

---

## Suggested Build Order (Updated)

| Priority | Item | Status | Effort | Why now |
|---|---|---|---|---|
| — | Push notifications (3.1) | ✅ Done | — | — |
| — | Profile notes (3.2) | ✅ Done | — | — |
| — | Journal history (3.5) | ✅ Done | — | — |
| — | Daily notes (4.1) | ✅ Done | — | — |
| — | Acquaintances | ✅ Done | — | — |
| 1 | Answered prayer tracking (3.3) | Pending | Low | High emotional resonance, zero competition |
| 2 | Recurring requests (3.4) | Pending | Low | Completes the full prayer lifecycle with 3.3 |
| 3 | Tag system (4.2) | Pending | Medium | Scales the network model across all entity types |
| 4 | Insights / Analytics (4.3) | Pending | Medium | Makes consistency visible and rewarding |
| 5 | AI chat over network (4.4) | Pending | High | Flagship differentiator |
| 6 | Shared groups (5.1) | Pending | High | Opens community/small group use case |
| 7 | Contact sync (5.2) | Pending | Medium | Removes friction from adding new profiles |
| 8 | Semantic search (5.3) | Pending | High | 2026 moat — search by meaning not just name |
| 9 | Native app / Expo (5.4) | Pending | Very High | Only needed when user growth demands it |

---

*Last updated June 2026. Acquaintances, Journal History, Daily Notes, Push Notifications, and Profile Notes shipped ahead of schedule.*
