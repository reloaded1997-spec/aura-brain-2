# Claude Code Prompt — Phase 3.5 & 4.1

Copy and paste the following prompt into Claude Code:

---

## CONTEXT

You are working on "Aura Brain 2", a React 18 + Vite + Firebase PWA — a personal prayer tracker and relationship CRM. The full architecture is in `ARCHITECTURE.md`. Read it before touching anything.

Key rules:
- Styling: Tailwind CSS only. Icons: `lucide-react`. Typography: `font-['Newsreader']` for display text, `text-[#FAF8F3]` bg, `text-[#1F1D18]` primary text, `text-[#9A958A]` muted, `text-[#EBE6DC]` borders, `text-[#A8845C]` warm accent.
- No Redux, no Zustand. State = React Context + hooks only.
- All Firestore reads/writes go through `src/firebase/db.js`. No component imports Firebase directly.
- Mobile-first. All classes default to mobile; use `md:` only for desktop scaling.

Read these files in full before writing any code:
- `src/firebase/db.js`
- `src/context/DataContext.jsx`
- `src/pages/JournalPage.jsx`
- `src/components/JournalCapture.jsx`
- `src/pages/DashboardPage.jsx`
- `src/components/Navigation.jsx`

---

## TASK 1 — Journal History (Phase 3.5)

Right now the Journal page is write-only. A user has no way to see past entries or know which profiles were linked. Add a scrollable, read-only history below the compose area.

### 1A — Add `watchJournalEntries` to `db.js`

Add this function. It watches the `journals` collection for the signed-in user, ordered newest-first, limited to 30 entries:

```js
export function watchJournalEntries(uid, cb) {
  const q = query(
    collection(db, 'journals'),
    where('uid', '==', uid),
    orderBy('timestamp', 'desc'),
    limit(30)
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}
```

Import `limit` from `firebase/firestore` at the top of the file (it may already be imported — check first).

### 1B — Add `journals` to DataContext

In `src/context/DataContext.jsx`:

1. Add a `journals` state: `const [journals, setJournals] = useState([])`.
2. Inside the `useEffect` that sets up Firestore listeners, add a fourth listener:
   ```js
   dbApi.watchJournalEntries(user.uid, setJournals),
   ```
   Add it to the `unsubs` array so it's torn down on cleanup.
3. Expose `journals` in the context value object.

### 1C — Create `src/components/JournalHistory.jsx`

This is a new purely presentational component. Props:
- `entries: Array<{ id, text, timestamp, linkedProfileIds }>` — the journal docs
- `profiles: Array<{ id, name }>` — the full profile list (to resolve names from IDs)
- `onEntryPress?: (entry) => void` — optional, reserved for a future detail view

Behavior:
- If `entries` is empty, render a quiet empty state: a centered italic line `"Your journal is empty. Start writing."` in `font-['Newsreader'] text-[15px] italic text-[#B6B0A2]`.
- Otherwise, render a list of entry cards.

Each entry card:
- A date/time label at the top: format `timestamp` (a Firestore Timestamp) using `.toDate()` then `toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })` + ` · ` + `toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })`. While `timestamp` is still null (pending write), show `"Just now"`.
- A text preview: show the first 120 characters of `entry.text`, followed by `"…"` if truncated. Use `font-['Newsreader'] text-[15px] leading-[1.55] text-[#3A372F]`.
- A "Linked to" chip row: map `entry.linkedProfileIds` to profile names by looking them up in the `profiles` prop. Render each name as a small pill: `rounded-full bg-[#F1ECE2] px-[9px] py-[3px] text-[11px] text-[#6F6A60]`. If `linkedProfileIds` is empty or the array is missing, show nothing.
- Card styling: `rounded-[18px] border border-[#EBE6DC] bg-white px-[15px] py-[13px] shadow-[0_1px_2px_rgba(40,36,31,0.03)]`
- Stack the cards with `flex flex-col gap-3`.

Do NOT add edit or delete buttons. This is an append-only log.

### 1D — Update `JournalPage.jsx`

1. Pull `journals` and `profiles` from `useData()`.
2. Below the `<JournalCapture>` component (inside the `flex-1` div, after it), add:

```jsx
{/* History */}
<div className="px-4 pb-6 pt-2">
  <div className="mb-3 text-[10px] font-semibold uppercase tracking-[1.8px] text-[#9A958A]">
    Past entries
  </div>
  <JournalHistory entries={journals} profiles={profiles} />
</div>
```

Import `JournalHistory` at the top of the file.

The page already has `flex min-h-screen flex-col` with `flex-1` wrapping `JournalCapture` — restructure so the page is scrollable: wrap the entire content area in a single scrollable column rather than two separate `flex-1` divs. The `BottomNav` stays sticky at the bottom.

---

## TASK 2 — Daily Notes Scratch Pad (Phase 4.1)

A lightweight, auto-saving "today" note that lives on the Dashboard — separate from the long-form Journal. One note per day per user. Think morning verse, a short intention, a reflection. It sits between the Habit Strip and the Queue.

### 2A — Add Daily Notes functions to `db.js`

The daily note doc ID is `{uid}_{date}` (e.g. `"abc123_2026-06-13"`) in a top-level `dailyNotes` collection. Using a composite doc ID means we can `getDoc` and `setDoc` by ID with no query — fast and offline-friendly.

Add these two functions:

```js
// Subscribe to today's daily note. Calls cb with the note text (string) or ''
// if no doc exists yet. Returns unsubscribe fn.
export function watchDailyNote(uid, dateStr, cb) {
  const ref = doc(db, 'dailyNotes', `${uid}_${dateStr}`);
  return onSnapshot(ref, (snap) => cb(snap.exists() ? (snap.data().text ?? '') : ''));
}

// Write (upsert) today's daily note.
export function saveDailyNote(uid, dateStr, text) {
  const ref = doc(db, 'dailyNotes', `${uid}_${dateStr}`);
  return setDoc(ref, { uid, date: dateStr, text, updatedAt: serverTimestamp() }, { merge: true });
}
```

`setDoc` and `serverTimestamp` are already imported in `db.js` — confirm before adding imports.

### 2B — Create `src/components/DailyNoteStrip.jsx`

This is a new self-contained, smart-ish component (it manages its own local state and calls db directly — it is simple enough that threading it through DataContext would be overkill). Props:
- `uid: string`
- `dateStr: string` — today's YYYY-MM-DD string (passed from the parent)

Internal state:
- `text` — the note text, initialized from Firestore via `watchDailyNote`.
- `isExpanded: boolean` — whether the textarea is open. Defaults to `false`.
- `saveStatus: 'idle' | 'saving' | 'saved'` — for the ambient save indicator.

Firestore subscription:
- On mount, call `watchDailyNote(uid, dateStr, (t) => setText(t))`. Store the unsubscribe fn in a `useEffect` cleanup.

Auto-save with debounce:
- Use a `useRef` timer. When `text` changes (but not on the initial load from Firestore — guard with a `didMount` ref), clear the timer and schedule `saveDailyNote(uid, dateStr, text)` after 600ms. On save start set `saveStatus` to `'saving'`; on resolution set it to `'saved'`; after 2 seconds reset to `'idle'`.

Collapsed state (default):
- Render a tappable row that spans the full width:
  ```
  [ BookOpen icon ]  Today's note  [ text preview or "Tap to add…" ]  [ ChevronDown ]
  ```
  - Outer: `flex items-center gap-3 rounded-[16px] border border-[#EBE6DC] bg-white px-[14px] py-[12px]`
  - Icon: `BookOpen` from lucide-react, `h-[16px] w-[16px] text-[#A8845C]` strokeWidth 1.6
  - Label: `font-['Newsreader'] text-[14px] text-[#26241F]` — "Today's note"
  - Preview: `flex-1 truncate text-[13px] italic text-[#9A958A]` — first 40 chars of text, or `"Tap to add…"` if empty
  - Chevron: `ChevronDown` (rotate 180 when expanded), `h-[15px] w-[15px] text-[#B0AB9E]`
  - On tap: `setIsExpanded(true)`

Expanded state:
- Render a card with:
  ```
  ┌─────────────────────────────────────────┐
  │  TODAY'S NOTE  ·  Jun 13         [✓ Saved] │
  │                                         │
  │  [ auto-growing textarea ]              │
  │                                         │
  └─────────────────────────────────────────┘
  ```
  - Outer: `rounded-[20px] border border-[#EBE6DC] bg-white px-[15px] pt-[13px] pb-[15px] shadow-[0_1px_3px_rgba(40,36,31,0.04)]`
  - Header row: label `text-[10px] font-semibold uppercase tracking-[1.8px] text-[#9A958A]` + formatted date + save indicator on the right
  - Save indicator: show `"Saved"` with a `Check` icon (`h-[11px] w-[11px]`) in `text-[11px] text-[#5F7F67]` when `saveStatus === 'saved'`; show nothing when `'idle'`; show a `Loader2 animate-spin h-[11px] w-[11px] text-[#9A958A]` when `'saving'`.
  - Textarea: `w-full resize-none bg-transparent font-['Newsreader'] text-[16px] leading-[1.65] text-[#3A372F] placeholder:text-[#B0AB9E] focus:outline-none min-h-[90px]`. Placeholder: `"A verse, a word, a thought for today…"`. Auto-grows: `onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}`.
  - Collapse: tapping outside (onBlur on the textarea, after a 150ms delay to avoid race with save) OR a small `"Done"` button (`text-[13px] text-[#9A958A]` top-right) sets `isExpanded(false)`.

### 2C — Wire `DailyNoteStrip` into `DashboardPage.jsx`

1. Import `DailyNoteStrip` at the top.
2. Import `getTodayLocal` — it's already imported in `DashboardPage.jsx`, confirm.
3. Pull `user` from `useAuth()` — already done in the file, confirm.
4. Place `<DailyNoteStrip>` between `<HabitStrip>` and `<main>` (the queue section), wrapped in a `px-4 pt-3` div:

```jsx
<div className="px-4 pt-3">
  <DailyNoteStrip uid={user.uid} dateStr={today} />
</div>
```

That's it. The component is self-contained — no new context entries, no new actions needed.

### 2D — Firestore rules

In `firestore.rules`, add a rule for the new `dailyNotes` collection. The pattern matches the existing rules style:

```
match /dailyNotes/{noteId} {
  allow read, write: if request.auth != null
    && request.auth.uid == resource.data.uid;
  allow create: if request.auth != null
    && request.auth.uid == request.resource.data.uid;
}
```

---

## FINISHING UP

After both tasks are complete:

1. Run `npm run build` and confirm it exits cleanly with no errors.
2. Check that `watchJournalEntries` is correctly torn down in DataContext's cleanup (it should be in the `unsubs` array alongside the other three listeners).
3. Confirm `DailyNoteStrip` correctly unsubscribes its Firestore listener in a `useEffect` return.
4. List every file that was created or modified.
