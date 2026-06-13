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
| Graph/knowledge linking | ✅ | partial | ✗ | ✗ |
| Rich text notes | ✅ | ✅ | partial | ✗ |
| Contact enrichment | ✗ | ✗ | ✅ | ✗ |
| Push notifications | ✗ | ✗ | ✅ | ✗ |
| Semantic / AI search | ✗ | ✅ | partial | ✗ |

Your gaps are real, but your foundation is solid and the queue math is a moat.

---

## Current State (What's Shipped)

- ✅ Auth with invite-code gating
- ✅ Daily Queue with load-balancer math (DST-safe, offline-first)
- ✅ Profiles, Groups, Group accordions, swipe-to-clear
- ✅ Habit Strip (permanent + temporary/achievement types)
- ✅ Profile detail: logs + prayer requests (subcollections)
- ✅ Journal → Gemini Cloud Function → auto-populates profile logs
- ✅ Network view, Search (in-memory, instant)
- ✅ PWA configured, Vercel deployment, Firestore rules

---

## Phase 3 — Depth (Build these next)

These harden and deepen what's already there. No new pages needed.

### 3.1 Push Notifications (High leverage)
The queue is meaningless if users don't open the app. A morning push — "7 people in your queue today" — turns a passive tool into an active one. Use Firebase Cloud Messaging (FCM). The Cloud Function already runs daily-adjacent logic; add a scheduled function that reads overdue profiles and sends a notification. iOS requires the PWA to be installed to home screen (which your manifest already handles).

### 3.2 Profile Notes (Rich-ish text)
Right now profiles have a `descriptor` field and a log of journal-extracted entries, but no freeform notes area on the profile detail page. Add a persistent `notes` field (or a dedicated `notes` subcollection) where you can write longer context — backstory, relationship history, how you met. A simple `<textarea>` with auto-save is enough. Don't overbuild; resist the urge to add a markdown editor until this proves insufficient.

### 3.3 Prayer Request Lifecycle
Requests currently have `isCompleted` but no answer/answered-on date. Add: `answeredAt` (date string), `answeredNote` (text). When a request is marked answered, stamp it and show it in a collapsible "Answered prayers" section on the profile. This is spiritually significant UX that no competitor touches.

### 3.4 Recurring Requests
Some prayer needs are ongoing — healing, a job search, a prodigal child. Add a `isRecurring: boolean` flag to requests. Recurring requests stay visible on the profile and never get archived; they're the persistent burden you carry. One-time requests archive on completion.

### 3.5 Journal History
The journal page is write-only right now. Add a scrollable history below the compose area — each past entry with its timestamp, a preview, and a link to the profiles it was routed to. This closes the feedback loop: users can see the AI did something with their words.

---

## Phase 4 — Breadth (Add new surfaces)

### 4.1 Daily Notes / Scratch Pad
A lightweight "today" note separate from the long-form journal — a place for quick morning thoughts, a verse, a short reflection. It auto-dates. This competes directly with Obsidian's daily notes and Roam's daily page. Keep it simple: one text area per day, saved to `dailyNotes/{uid}/{date}`.

### 4.2 Tag System
A cross-cutting `tags: string[]` array on profiles, groups, and journal entries. Tags like "family", "work", "college", "cancer prayer", "mentor" let you slice the network in ways groups don't. Add a tag filter to the Network and Search pages. Store tags as a Firestore array field — they're already queryable with `array-contains`.

### 4.3 Insights / Analytics Page
A fifth nav tab (or a pull-up sheet from the Dashboard) showing:
- Relationship health: who has the longest `daysSince` without being cleared
- Habit streak records
- Prayer answered count over time (monthly)
- Queue completion rate (how often did you clear the full queue?)
All of this is computable from data you already store.

### 4.4 AI Chat Over Your Network
Add a "Ask about your network" mode: a text input that sends a query + your profile/log data to Gemini and returns an answer. "Who am I forgetting about?", "What prayer requests are unresolved for more than 30 days?", "Who did I last pray for on my birthday?". This is the Mem.ai move applied to relationships rather than notes. Keep it in the Cloud Function layer — never client-side.

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

## Suggested Build Order

| Priority | Item | Effort | Why now |
|---|---|---|---|
| 1 | Push notifications | Medium | Retention; without this the app is forgotten |
| 2 | Journal history | Low | Closes AI feedback loop immediately |
| 3 | Profile notes | Low | Most-requested pattern in any CRM |
| 4 | Answered prayer tracking | Low | High emotional resonance, zero competition |
| 5 | Recurring requests | Low | Completes the prayer lifecycle |
| 6 | Insights page | Medium | Shows the value of consistency over time |
| 7 | Tag system | Medium | Scales the network model |
| 8 | Daily notes | Medium | Competes with Obsidian daily notes |
| 9 | AI chat | High | Flagship differentiator |
| 10 | Shared groups | High | Opens community use case |

---

*Generated June 2026 based on current codebase state.*
